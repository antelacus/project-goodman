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
import OpenAI from "openai";
import * as XLSX from "xlsx";
import { getDataExtractPrompt } from "@/lib/prompts";
import {
  generateRequestId,
  createErrorResponse,
  ensureSession,
  checkGuestRate,
  incrementGuestRate,
} from "@/lib/security";
import { createServerSupabaseClient } from "@/lib/database";
import { downloadFileAsBase64, getFirstFileForDocument } from "@/lib/documents/storage";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  const requestId = req.headers.get('x-request-id') || generateRequestId();

  try {
    // V3.10: Ensure session exists (creates guest session if needed)
    const sessionResult = await ensureSession(req);
    const { session, isNewSession } = sessionResult;

    // V3.10: Check rate limit for guest users
    if (session.role === 'guest') {
      const rateCheck = await checkGuestRate(session.sessionId, 'extract');
      if (!rateCheck.allowed) {
        const response = NextResponse.json(
          {
            success: false,
            error: 'rate_limit',
            message: '已达到数据提取限制，请1小时后重试',
            resetsAt: rateCheck.resetsAt,
            remaining: rateCheck.remaining,
            total: rateCheck.total,
          },
          { status: 429 }
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
    let { fileData, fileType, fileName, documentId } = body;

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
        return NextResponse.json({ success: false, error: 'document_not_found', message: '找不到指定文档' }, { status: 404 });
      }

      // V3.10: Check document access permission
      // Admin can access all; Others can only access knowledge or own documents
      if (session.role !== 'admin' && doc.doc_category !== 'knowledge') {
        const ownerId = session.role === 'guest' ? session.sessionId : session.userId;
        if (doc.owner_id !== ownerId) {
          return NextResponse.json({ success: false, error: 'forbidden', message: '无权访问此文档' }, { status: 403 });
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
        return NextResponse.json({ success: false, error: 'file_not_found', message: '文档原始文件不存在，无法进行提取' }, { status: 404 });
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
        return NextResponse.json({ success: false, error: 'storage_error', message: '无法读取文档文件' }, { status: 500 });
      }
    }

    // Validate required fields
    if (!fileData || !fileType) {
      return NextResponse.json({
        success: false,
        error: 'missing_fields',
        message: '缺少必要参数'
      }, { status: 400 });
    }

    // Validate file type
    if (!ALL_SUPPORTED_TYPES.includes(fileType)) {
      return NextResponse.json({
        success: false,
        error: 'invalid_file_type',
        message: '不支持的文件格式，请上传 PDF、PNG、JPG、JPEG、WEBP、GIF 或 Excel(.xlsx) 文件'
      }, { status: 400 });
    }

    // Validate file size
    if (fileData.length > MAX_BASE64_SIZE) {
      return NextResponse.json({
        success: false,
        error: 'file_too_large',
        message: '文件大小超过 2MB 限制'
      }, { status: 400 });
    }

    const prompt = getDataExtractPrompt();

    let result: string | null = null;

    // Handle different file types
    if (SUPPORTED_IMAGE_TYPES.includes(fileType)) {
      // Image processing with Vision API
      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${fileType};base64,${fileData}`,
                detail: "auto"
              }
            }
          ]
        }],
        response_format: { type: "json_object" },
        max_completion_tokens: 4096
      });

      result = response.choices[0]?.message?.content;
    } else if (fileType === SUPPORTED_PDF_TYPE) {
      // PDF processing using Responses API with file input
      // Chat completions API doesn't support PDF, must use responses API
      const response = await openai.responses.create({
        model: "gpt-5-mini",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              {
                type: "input_file",
                filename: fileName || "document.pdf",
                file_data: `data:${fileType};base64,${fileData}`
              }
            ]
          }
        ],
        text: {
          format: {
            type: "json_object"
          }
        }
      });

      result = response.output_text;
    } else if (fileType === SUPPORTED_EXCEL_TYPE) {
      // Excel processing - parse with xlsx library then send to LLM
      const buffer = Buffer.from(fileData, 'base64');
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      // Get first sheet only (single sheet support)
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // Convert to array of arrays for better structure
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // Format as text for LLM processing
      const textContent = (jsonData as any[][])
        .filter(row => row.some(cell => cell != null && cell !== ''))
        .map(row => row.map(cell => cell ?? '').join('\t'))
        .join('\n');

      // Send to LLM for structured extraction
      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [{
          role: "user",
          content: `${prompt}\n\n以下是Excel表格内容（制表符分隔）：\n\n${textContent}`
        }],
        response_format: { type: "json_object" },
        max_tokens: 4096
      });

      result = response.choices[0]?.message?.content;
    }

    if (!result) {
      throw new Error("AI extraction returned no result");
    }

    // V3.10: Increment rate limit for guest after successful extraction
    if (session.role === 'guest') {
      await incrementGuestRate(session.sessionId, 'extract');
    }

    // Parse and return the result
    const parsedResult = JSON.parse(result);

    const response = NextResponse.json({
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

    return response;

  } catch (error: unknown) {
    console.error("Data Extract Tool API Error:", error);
    return createErrorResponse(error, requestId, 500);
  }
}
