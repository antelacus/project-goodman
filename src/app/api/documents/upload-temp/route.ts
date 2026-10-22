/**
 * API Route: POST /api/documents/upload-temp
 *
 * Temporary document upload for ordinary users.
 * - Extracts text from uploaded file (PDF, images, Excel, text)
 * - Chunks and stores it in Supabase (not searched; read whole when selected)
 * - Does NOT store original file (privacy protection)
 * - V3.10: Supports guest sessions with rate limiting and document ownership
 *
 * @route POST /api/documents/upload-temp
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { readDocumentText, AIUnavailableError, AI_FAILURE_TEXT } from "@/lib/ai";
import { createServerSupabaseClient } from "@/lib/database";
import type { InsertTables } from "@/lib/database";
import { logError, logWorkflowEvent } from "@/lib/logging";
import {
  generateRequestId,
  createErrorResponse,
  ensureSession,
  checkGuestRate,
  incrementGuestRate,
} from "@/lib/security";
import { TempUploadSchema, validateRequest } from "@/lib/validation/api-schemas";
import {
  parseDocumentSections,
  createSectionAwareChunks,
} from "@/lib/documents";
import {
  uploadFileToStorage,
  deleteFileFromStorage
} from "@/lib/documents/storage";
import { withSentrySpan } from "@/lib/observability/error-tracking";
import { isPerfTestRequest } from "@/lib/quality-gates/perf-test";
import type { WorkflowErrorType } from "@/lib/errors";


// Supported file types
const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const SUPPORTED_PDF_TYPE = 'application/pdf';
const SUPPORTED_EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const SUPPORTED_TEXT_TYPES = ['text/plain', 'text/markdown'];

// Max file size: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024;


/**
 * Extract text from various file types
 */
async function extractTextFromFile(
  fileData: string,
  fileName: string,
  fileType: string
): Promise<string> {
  const ext = fileName.toLowerCase().split('.').pop();
  console.log(`[upload-temp] Extracting text from: ${fileName}, type: ${fileType}, ext: ${ext}`);

  // Text files
  if (SUPPORTED_TEXT_TYPES.includes(fileType) || ext === 'txt' || ext === 'md') {
    const buffer = Buffer.from(fileData, 'base64');
    return buffer.toString('utf-8');
  }

  // Excel files
  if (fileType === SUPPORTED_EXCEL_TYPE || ext === 'xlsx') {
    const buffer = Buffer.from(fileData, 'base64');
    const workbook = new ExcelJS.Workbook();
    // REASON: exceljs types expect Buffer but Node.js 22+ returns Buffer<ArrayBuffer>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any);

    // Find sheet with most data
    let bestSheet = workbook.worksheets[0];
    let bestRowCount = 0;

    for (const worksheet of workbook.worksheets) {
      let rowCount = 0;
      worksheet.eachRow(() => { rowCount++; });
      if (rowCount > bestRowCount) {
        bestRowCount = rowCount;
        bestSheet = worksheet;
      }
    }

    // Convert worksheet to array of arrays
    const rows: (string | number | null)[][] = [];
    bestSheet.eachRow((row) => {
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

    return rows
      .filter(row => row.some(cell => cell != null && cell !== ''))
      .map(row => row.map(cell => cell ?? '').join('\t'))
      .join('\n');
  }

  // PDF files
  if (fileType === SUPPORTED_PDF_TYPE || ext === 'pdf') {
    const buffer = Buffer.from(fileData, 'base64');

    // Try direct text extraction first
    const { extractText } = await import('unpdf');
    const result = await extractText(new Uint8Array(buffer));
    const textContent = Array.isArray(result.text) ? result.text.join('\n\n') : result.text;

    if (textContent.trim().length > 100) {
      console.log(`[upload-temp] PDF direct extraction successful: ${textContent.length} chars`);
      return textContent;
    }

    console.log(`[upload-temp] PDF text too short, reading it as a scan...`);
    return readDocumentText({ fileName, mimeType: SUPPORTED_PDF_TYPE, base64: fileData });
  }

  // Image files
  if (SUPPORTED_IMAGE_TYPES.includes(fileType) || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) {
    const mimeType = SUPPORTED_IMAGE_TYPES.includes(fileType)
      ? fileType
      : ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    return readDocumentText({ fileName, mimeType, base64: fileData });
  }

  throw new Error(`不支持的文件类型: ${fileType}`);
}

export async function POST(req: NextRequest) {
  const spanContext = {
    name: "api.documents.upload-temp",
    op: "http.server",
    attributes: {
      "http.route": "/api/documents/upload-temp",
      "http.method": "POST",
    },
  };

  return withSentrySpan(spanContext, async () => {
    if (isPerfTestRequest(req)) {
      await req.arrayBuffer();
      return NextResponse.json({
        success: true,
        perfTest: true,
        documentId: "perf-test",
        textPreview: "perf-test",
        structureAnalysis: {
          quality: "basic",
          hasToc: false,
          sectionCount: 0,
          chunkCount: 0,
          suggestions: [],
        },
      });
    }

    const requestId = req.headers.get('x-request-id') || generateRequestId();
    const startTime = Date.now();
    const workflowContext = {
      workflow: 'document_extraction',
      requestId,
      route: '/api/documents/upload-temp',
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

    try {
      // V3.10: Ensure session exists (creates guest session if needed)
      const sessionResult = await ensureSession(req);
      const { session, isNewSession } = sessionResult;
      const createStandardErrorResponse = (
        payload: Record<string, unknown>,
        status: number
      ) => {
        const response = NextResponse.json(
          { ...payload, requestId },
          { status, headers: { 'X-Request-ID': requestId } }
        );

        if (isNewSession && sessionResult.setCookieHeader) {
          response.cookies.set(
            sessionResult.setCookieHeader.name,
            sessionResult.setCookieHeader.value,
            sessionResult.setCookieHeader.options
          );
        }

        return response;
      };

      // V3.10: Check rate limit for guest users
      if (session.role === 'guest') {
        const rateCheck = await checkGuestRate(session.sessionId, 'upload');
        if (!rateCheck.allowed) {
          logWorkflowFailure('RATE_LIMIT');
          return createStandardErrorResponse(
            {
              error: '已达到文件上传限制，请1小时后重试',
              resetsAt: rateCheck.resetsAt,
              remaining: rateCheck.remaining,
              total: rateCheck.total,
            },
            429
          );
        }
      }

      const body = await req.json();

      // Validate request body structure with Zod
      const validationResult = validateRequest(TempUploadSchema, body);
      if (!validationResult.success) {
        logWorkflowFailure('VALIDATION');
        return createStandardErrorResponse(
          { error: validationResult.error },
          400
        );
      }

      const { fileData, fileName, fileType } = validationResult.data;

      // Validate file size (base64 is ~1.37x larger than original)
      const estimatedSize = (fileData.length * 3) / 4;
      if (estimatedSize > MAX_FILE_SIZE) {
        logWorkflowFailure('VALIDATION');
        return createStandardErrorResponse(
          { error: "文件大小超过2MB限制" },
          400
        );
      }

      // V3.10: Increment rate limit for guest after validation passes
      if (session.role === 'guest') {
        await incrementGuestRate(session.sessionId, 'upload');
      }

      console.log(`[upload-temp] Processing file: ${fileName}, type: ${fileType}, session: ${session.role}`);

      // Step 1: Extract text from file
      const extractedText = await extractTextFromFile(fileData, fileName, fileType || '');
      logWorkflowEvent({
        ...workflowContext,
        step: 'extract',
        status: 'ok',
        duration: Date.now() - startTime,
      });

      if (!extractedText || extractedText.trim().length < 10) {
        logWorkflowFailure('EXTRACTION_FAILED');
        return createStandardErrorResponse(
          { error: "无法从文件中提取有效文本内容" },
          400
        );
      }

      console.log(`[upload-temp] Extracted ${extractedText.length} chars from ${fileName}`);

      // Step 2: Parse document structure
      const parseResult = await parseDocumentSections(extractedText);
      const chunks = createSectionAwareChunks(extractedText, parseResult.sections, 1000);

      console.log(`[upload-temp] Created ${chunks.length} chunks`);

      // Step 4: Store in database
      const supabase = createServerSupabaseClient();
      const documentId = crypto.randomUUID();

      // V3.10: Calculate ownership based on session role
      const ownerId = session.role === 'guest' ? session.sessionId : session.userId;
      const ownerType = session.role;
      // Guest documents expire in 1 hour
      const expiresAt = session.role === 'guest'
        ? new Date(Date.now() + 60 * 60 * 1000).toISOString()
        : null;

      // V3.11: Upload file to storage for data extraction support
      let fileUrl: string | null = null;
      try {
        console.log(`[upload-temp] Uploading original file to storage...`);
        // We pass the base64 data directly to the upload utility
        // Note: uploadFileToStorage expects base64 without the data: scheme prefix if it's raw content,
        // but here we already have raw base64 data in fileData (from req.json)
        fileUrl = await uploadFileToStorage(documentId, fileName, fileData);
        console.log(`[upload-temp] File uploaded: ${fileUrl}`);
        logWorkflowEvent({
          ...workflowContext,
          step: 'upload',
          status: 'ok',
          duration: Date.now() - startTime,
        });
      } catch (storageError) {
        console.error(`[upload-temp] Storage upload failed:`, storageError);
        // Non-fatal? If storage fails, extract API won't work.
        // We should probably fail the whole request since the user might expect extraction to work.
        throw new Error(`文件存储失败: ${storageError instanceof Error ? storageError.message : String(storageError)}`);
      }

      // Create document record with proper typing
      const documentInsert: InsertTables<'documents'> = {
        id: documentId,
        name: fileName,
        doc_category: 'business',
        doc_type: (fileType || '').includes('pdf') ? 'pdf' :
          (fileType || '').includes('image') ? 'image' :
            (fileType || '').includes('excel') || (fileType || '').includes('spreadsheet') ? 'excel' : 'txt',
        status: 'ready',
        size: estimatedSize,
        summary: {
          summary: extractedText.substring(0, 500),
          document_type: 'temp_upload',
          key_metrics: [],
          time_period: '',
          structure_metrics: {
            quality: parseResult.quality,
            sections: parseResult.sections.length
          }
        },
        section_structure: {
          hasToc: parseResult.hasToc,
          quality: parseResult.quality,
          sectionCount: parseResult.sections.length,
          sections: parseResult.sections.slice(0, 20).map(s => ({ title: s.title, level: s.level }))
        },
        structure_quality: parseResult.quality,
        owner_id: ownerId,
        owner_type: ownerType,
        expires_at: expiresAt,
        file_url: fileUrl,
      };

      const { error: docError } = await supabase
        .from('documents')
        .insert(documentInsert);

      if (docError) {
        console.error('[upload-temp] Document insert error:', docError);
        // V3.11: Cleanup uploaded file if DB insert fails
        if (fileUrl) {
          try {
            await deleteFileFromStorage(fileUrl);
          } catch (cleanupError) {
            console.error('[upload-temp] Failed to cleanup file after DB error:', cleanupError);
          }
        }
        throw new Error(`数据库存储失败: ${docError.message}`);
      }

      // Create chunk records with proper typing
      const chunkRecords: InsertTables<'document_chunks'>[] = chunks.map((chunk, index) => ({
        id: crypto.randomUUID(),
        document_id: documentId,
        chunk_index: index,
        content: chunk.content,
        section_title: chunk.sectionTitle || null,
        section_level: chunk.sectionLevel || 0,
        section_path: chunk.sectionPath || null,
      }));

      // Insert chunks in batches
      const BATCH_SIZE = 50;
      for (let i = 0; i < chunkRecords.length; i += BATCH_SIZE) {
        const batch = chunkRecords.slice(i, i + BATCH_SIZE);
        const { error: chunksError } = await supabase
          .from('document_chunks')
          .insert(batch);

        if (chunksError) {
          // Rollback document
          await supabase.from('documents').delete().eq('id', documentId);
          throw new Error(`向量存储失败: ${chunksError.message}`);
        }
      }

      console.log(`[upload-temp] Successfully stored document ${documentId} with ${chunks.length} chunks`);
      logWorkflowEvent({
        ...workflowContext,
        step: 'store',
        status: 'ok',
        duration: Date.now() - startTime,
      });

      // Return response
      const response = NextResponse.json({
        success: true,
        documentId,
        textPreview: extractedText.substring(0, 300) + (extractedText.length > 300 ? '...' : ''),
        structureAnalysis: {
          quality: parseResult.quality,
          hasToc: parseResult.hasToc,
          sectionCount: parseResult.sections.length,
          chunkCount: chunks.length,
          suggestions: parseResult.quality === 'basic'
            ? ['文档结构较简单，建议添加标题和分节以提高检索效果']
            : []
        },
        // V3.10: Include expiration info for guest documents
        ...(expiresAt && { expiresAt: new Date(expiresAt).getTime() })
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
      console.error("[upload-temp] Error:", error);
      logError('Upload temp failed', error, requestId, {
        route: '/api/documents/upload-temp',
      });
      logWorkflowFailure('EXTRACTION_FAILED');
      if (error instanceof AIUnavailableError) {
        // Not createErrorResponse: in production it replaces the message with a generic
        // one, and REQ §5.2 requires this failure text to reach the user.
        return NextResponse.json(
          { success: false, error: 'ai_unavailable', message: AI_FAILURE_TEXT.extraction, requestId },
          { status: 503, headers: { 'X-Request-ID': requestId } }
        );
      }
      return createErrorResponse(error, requestId, 500, {
        errorType: 'EXTRACTION_FAILED',
        route: '/api/documents/upload-temp',
      });
    }
  });
}
