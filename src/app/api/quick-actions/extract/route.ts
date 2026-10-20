/**
 * Standalone Data Extraction Quick Action
 *
 * Extracts structured data from files (images, PDFs, Excel).
 * This is a quick-action, separate from the conversational agent.
 * V3.10: Supports guest sessions with rate limiting
 *
 * @route POST /api/quick-actions/extract
 */
export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { z } from "zod";
import { getPromptContent } from "@/lib/ai/prompts";
import { generateJSON } from "@/lib/ai";
import { logWorkflowEvent } from "@/lib/logging";
import {
  generateRequestId,
  createErrorResponse,
  ensureSession,
  checkGuestRate,
  incrementGuestRate,
} from "@/lib/security";
import { createServerSupabaseClient } from "@/lib/database";
import { ExtractRequestSchema, validateRequest } from "@/lib/validation/api-schemas";
import { downloadFileAsBase64, getFirstFileForDocument } from "@/lib/documents/storage";
import { withSentrySpan } from "@/lib/observability/error-tracking";
import { isPerfTestRequest } from "@/lib/quality-gates/perf-test";
import type { WorkflowErrorType } from "@/lib/errors";

// Field names depend on the document (invoice, contract, statement…), so the
// shape is checked only as an object with Chinese keys.
const ExtractedFieldsSchema = z.record(z.string(), z.unknown());

// Supported file types
const SUPPORTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif'
];

const SUPPORTED_PDF_TYPE = 'application/pdf';
const SUPPORTED_EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const ALL_SUPPORTED_TYPES = [...SUPPORTED_IMAGE_TYPES, SUPPORTED_PDF_TYPE, SUPPORTED_EXCEL_TYPE];

// Max file size: 2MB (Base64 is ~1.37x larger)
const MAX_BASE64_SIZE = 2 * 1024 * 1024 * 1.4;

export async function POST(req: NextRequest) {
  const spanContext = {
    name: "api.quick-actions.extract",
    op: "http.server",
    attributes: {
      "http.route": "/api/quick-actions/extract",
      "http.method": "POST",
    },
  };

  return withSentrySpan(spanContext, async () => {
    if (isPerfTestRequest(req)) {
      await req.arrayBuffer();
      return NextResponse.json({
        success: true,
        perfTest: true,
        data: { status: "ok" },
        fileType: "application/json",
        fileName: "perf-test.json",
      });
    }

    const requestId = req.headers.get('x-request-id') || generateRequestId();
    const startTime = Date.now();
    const workflowContext = {
      workflow: 'quick_action_extract',
      requestId,
      route: '/api/quick-actions/extract',
    };
    let workflowCompleted = false;

    logWorkflowEvent({ ...workflowContext, step: 'start', status: 'ok' });

    const logWorkflowSuccess = () => {
      if (workflowCompleted) return;
      workflowCompleted = true;
      logWorkflowEvent({
        ...workflowContext,
        step: 'success',
        status: 'ok',
        duration: Date.now() - startTime,
      });
    };

    const logWorkflowFailure = (errorType: WorkflowErrorType) => {
      if (workflowCompleted) return;
      workflowCompleted = true;
      logWorkflowEvent({
        ...workflowContext,
        step: 'failure',
        status: 'error',
        errorType,
        duration: Date.now() - startTime,
      });
    };

    const createJsonResponse = (payload: Record<string, unknown>, status = 200) => {
      return NextResponse.json(
        { ...payload, requestId },
        { status, headers: { 'X-Request-ID': requestId } }
      );
    };

    try {
      // V3.10: Ensure session exists (creates guest session if needed)
      const sessionResult = await ensureSession(req);
      const { session, isNewSession } = sessionResult;

      // V3.10: Check rate limit for guest users
      if (session.role === 'guest') {
        const rateCheck = await checkGuestRate(session.sessionId, 'extract');
        if (!rateCheck.allowed) {
          logWorkflowFailure('RATE_LIMIT');
          const response = createJsonResponse(
            {
              success: false,
              error: 'rate_limit',
              message: '已达到数据提取限制，请1小时后重试',
              resetsAt: rateCheck.resetsAt,
              remaining: rateCheck.remaining,
              total: rateCheck.total,
            },
            429
          );

          if (isNewSession && sessionResult.setCookieHeader) {
            response.cookies.set(
              sessionResult.setCookieHeader.name,
              sessionResult.setCookieHeader.value,
              sessionResult.setCookieHeader.options
            );
          }

          return response;
        }
      }

      const body = await req.json();

      // Validate request body structure with Zod
      const validationResult = validateRequest(ExtractRequestSchema, body);
      if (!validationResult.success) {
        logWorkflowFailure('VALIDATION');
        return createJsonResponse({
          success: false,
          error: 'validation_error',
          message: validationResult.error
        }, 400);
      }

      const { documentId } = validationResult.data;
      let { fileData, fileType, fileName } = validationResult.data;

      // Logic: If documentId is provided, fetch fileData from storage
      if (documentId) {
        console.log(`[Extraction API] Fetching document from storage: ${documentId}`);
        const supabase = createServerSupabaseClient();

        // V3.10: Fetch document with ownership check
        const { data: doc, error: docError } = await supabase
          .from('documents')
          .select('file_url, name, doc_type, owner_id, owner_type, doc_category')
          .eq('id', documentId)
          .single<{ file_url: string | null; name: string; doc_type: string; owner_id: string | null; owner_type: string | null; doc_category: string }>();

        if (docError || !doc) {
          logWorkflowFailure('RETRIEVAL_EMPTY');
          return createJsonResponse({ success: false, error: 'document_not_found', message: '找不到指定文档' }, 404);
        }

        // V3.10: Check document access permission
        // Admin can access all; Others can only access knowledge or own documents
        if (session.role !== 'admin' && doc.doc_category !== 'knowledge') {
          const ownerId = session.role === 'guest' ? session.sessionId : session.userId;
          if (doc.owner_id !== ownerId) {
            logWorkflowFailure('FORBIDDEN');
            return createJsonResponse({ success: false, error: 'forbidden', message: '无权访问此文档' }, 403);
          }
        }

        let storagePath = doc.file_url;
        // Fallback: If file_url is missing in DB, check storage for files
        if (!storagePath) {
          console.log(`[Extraction API] file_url missing in DB for ${documentId}, attempting fallback lookup...`);
          const fileInfo = await getFirstFileForDocument(documentId);
          if (fileInfo) {
            storagePath = fileInfo.path;
            // Also update fileName if not present or generic
            if (!fileName) fileName = fileInfo.name;
          }
        }

        if (!storagePath) {
          logWorkflowFailure('RETRIEVAL_EMPTY');
          return createJsonResponse({ success: false, error: 'file_not_found', message: '文档原始文件不存在，无法进行提取' }, 404);
        }

        // Fetch file content
        try {
          fileData = await downloadFileAsBase64(storagePath);
          // If name wasn't updated above, use doc name
          if (!fileName) fileName = doc.name;

          // Infer mime type from extension if not explicitly known (though we usually know it)
          const ext = fileName.split('.').pop()?.toLowerCase();
          if (ext === 'pdf') fileType = 'application/pdf';
          else if (['png', 'jpg', 'jpeg'].includes(ext || '')) fileType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
          else if (ext === 'xlsx') fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          else fileType = 'application/octet-stream'; // Fallback

        } catch (storageError) {
          console.error(`[Extraction API] Failed to download file:`, storageError);
          logWorkflowFailure('EXTRACTION_FAILED');
          return createJsonResponse({ success: false, error: 'storage_error', message: '无法读取文档文件' }, 500);
        }
      }

      // Validate required fields
      if (!fileData || !fileType) {
        logWorkflowFailure('VALIDATION');
        return createJsonResponse({
          success: false,
          error: 'missing_fields',
          message: '缺少必要参数'
        }, 400);
      }

      // Validate file type
      if (!ALL_SUPPORTED_TYPES.includes(fileType)) {
        logWorkflowFailure('VALIDATION');
        return createJsonResponse({
          success: false,
          error: 'invalid_file_type',
          message: '不支持的文件格式，请上传 PDF、PNG、JPG、JPEG、WEBP、GIF 或 Excel(.xlsx) 文件'
        }, 400);
      }

      // Validate file size
      if (fileData.length > MAX_BASE64_SIZE) {
        logWorkflowFailure('VALIDATION');
        return createJsonResponse({
          success: false,
          error: 'file_too_large',
          message: '文件大小超过 2MB 限制'
        }, 400);
      }

      const system = getPromptContent('data-extract.md');

      let parsedResult: Record<string, unknown> | null = null;

      // Handle different file types
      if (SUPPORTED_IMAGE_TYPES.includes(fileType) || fileType === SUPPORTED_PDF_TYPE) {
        parsedResult = await generateJSON({
          purpose: 'extraction',
          system,
          prompt: '提取这份文档中的财务信息，以 JSON 对象返回。',
          schema: ExtractedFieldsSchema,
          attachment: { fileName: fileName || 'document', mimeType: fileType, base64: fileData },
        });
      } else if (fileType === SUPPORTED_EXCEL_TYPE) {
        // Excel processing - parse with exceljs library then send to LLM
        const buffer = Buffer.from(fileData, 'base64');
        const workbook = new ExcelJS.Workbook();
        // REASON: exceljs types expect Buffer but Node.js 22+ returns Buffer<ArrayBuffer>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await workbook.xlsx.load(buffer as any);

        // Get first sheet only (single sheet support)
        const worksheet = workbook.worksheets[0];

        // Convert to array of arrays for better structure
        const rows: (string | number | null)[][] = [];
        worksheet.eachRow((row) => {
          const rowData: (string | number | null)[] = [];
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            while (rowData.length < colNumber - 1) {
              rowData.push(null);
            }
            const value = cell.value;
            if (value === null || value === undefined) {
              rowData.push(null);
            } else if (typeof value === 'object' && 'result' in value) {
              rowData.push(value.result as string | number | null);
            } else if (typeof value === 'object' && 'text' in value) {
              rowData.push(value.text as string);
            } else {
              rowData.push(value as string | number);
            }
          });
          rows.push(rowData);
        });

        // Format as text for LLM processing
        const textContent = rows
          .filter(row => row.some(cell => cell != null && cell !== ''))
          .map(row => row.map(cell => cell ?? '').join('\t'))
          .join('\n');

        parsedResult = await generateJSON({
          purpose: 'extraction',
          system,
          prompt: `以下是Excel表格内容（制表符分隔），提取其中的财务信息，以 JSON 对象返回：\n\n${textContent}`,
          schema: ExtractedFieldsSchema,
        });
      }

      if (!parsedResult) {
        throw new Error("AI extraction returned no result");
      }

      // V3.10: Increment rate limit for guest after successful extraction
      if (session.role === 'guest') {
        await incrementGuestRate(session.sessionId, 'extract');
      }

      const response = createJsonResponse({
        success: true,
        data: parsedResult,
        fileType: fileType,
        fileName: fileName || 'unknown'
      });

      // V3.10: Set session cookie for new guests
      if (isNewSession && sessionResult.setCookieHeader) {
        response.cookies.set(
          sessionResult.setCookieHeader.name,
          sessionResult.setCookieHeader.value,
          sessionResult.setCookieHeader.options
        );
      }

      logWorkflowSuccess();
      return response;

    } catch (error: unknown) {
      console.error("Data Extract Tool API Error:", error);
      logWorkflowFailure('EXTRACTION_FAILED');
      return createErrorResponse(error, requestId, 500, {
        errorType: 'EXTRACTION_FAILED',
        route: '/api/quick-actions/extract',
      });
    }
  });
}
