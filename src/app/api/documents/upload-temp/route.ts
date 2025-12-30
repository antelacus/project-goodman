/**
 * API Route: POST /api/documents/upload-temp
 *
 * Temporary document upload for ordinary users.
 * - Extracts text from uploaded file (PDF, images, Excel, text)
 * - Vectorizes and stores temporarily in Supabase
 * - Does NOT store original file (privacy protection)
 *
 * @route POST /api/documents/upload-temp
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import * as XLSX from "xlsx";
import { createServerSupabaseClient } from "@/lib/database";
import { generateRequestId, createErrorResponse } from "@/lib/security";
import { parseDocumentSections, createSectionAwareChunks } from "@/lib/documents";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Supported file types
const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const SUPPORTED_PDF_TYPE = 'application/pdf';
const SUPPORTED_EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const SUPPORTED_TEXT_TYPES = ['text/plain', 'text/markdown'];

// Max file size: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024;

interface UploadRequest {
  fileData: string;      // Base64 encoded file content
  fileName: string;
  fileType: string;
  source?: string;       // 'guidance-chat' or other sources
}

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
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Find sheet with most data
    let bestSheet = workbook.SheetNames[0];
    let bestRowCount = 0;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      const rowCount = data.filter(row => row.some(cell => cell != null && cell !== '')).length;
      if (rowCount > bestRowCount) {
        bestRowCount = rowCount;
        bestSheet = sheetName;
      }
    }

    const sheet = workbook.Sheets[bestSheet];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    return jsonData
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

    // Fallback to Vision API for scanned PDFs
    console.log(`[upload-temp] PDF text too short, using Vision API...`);
    const response = await openai.responses.create({
      model: "gpt-5-mini",
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: "请完整提取这个PDF文档中的所有文本内容，保持原有的结构和格式。只返回文本内容，不要添加任何额外的解释。" },
          {
            type: "input_file",
            filename: fileName,
            file_data: `data:${fileType};base64,${fileData}`
          }
        ]
      }]
    });

    return response.output_text || '';
  }

  // Image files
  if (SUPPORTED_IMAGE_TYPES.includes(fileType) || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext || '')) {
    console.log(`[upload-temp] Using Vision API for image: ${fileName}`);
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "请完整提取这张图片中的所有文本内容，保持原有的结构和格式。只返回文本内容，不要添加任何额外的解释。" },
          {
            type: "image_url",
            image_url: {
              url: `data:${fileType};base64,${fileData}`,
              detail: "high"
            }
          }
        ]
      }],
      max_completion_tokens: 4096
    });

    return response.choices[0]?.message?.content || '';
  }

  throw new Error(`不支持的文件类型: ${fileType}`);
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || generateRequestId();

  try {
    const body: UploadRequest = await req.json();
    const { fileData, fileName, fileType } = body;

    // Validate required fields
    if (!fileData || !fileName) {
      return NextResponse.json(
        { error: "缺少必要参数 (fileData, fileName)" },
        { status: 400 }
      );
    }

    // Validate file size (base64 is ~1.37x larger than original)
    const estimatedSize = (fileData.length * 3) / 4;
    if (estimatedSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "文件大小超过2MB限制" },
        { status: 400 }
      );
    }

    console.log(`[upload-temp] Processing file: ${fileName}, type: ${fileType}`);

    // Step 1: Extract text from file
    const extractedText = await extractTextFromFile(fileData, fileName, fileType);

    if (!extractedText || extractedText.trim().length < 10) {
      return NextResponse.json(
        { error: "无法从文件中提取有效文本内容" },
        { status: 400 }
      );
    }

    console.log(`[upload-temp] Extracted ${extractedText.length} chars from ${fileName}`);

    // Step 2: Parse document structure
    const parseResult = await parseDocumentSections(extractedText);
    const chunks = createSectionAwareChunks(extractedText, parseResult.sections, 1000);

    console.log(`[upload-temp] Created ${chunks.length} chunks`);

    // Step 3: Generate embeddings
    const embeddings: number[][] = [];
    for (const chunk of chunks) {
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk.content,
        encoding_format: "float",
      });
      embeddings.push(embeddingResponse.data[0].embedding);
    }

    // Step 4: Store in database
    const supabase = createServerSupabaseClient();
    const documentId = crypto.randomUUID();

    // Create document record (NO file_url - privacy protection)
    const { error: docError } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        name: fileName,
        doc_category: 'business',
        doc_type: fileType.includes('pdf') ? 'pdf' :
                  fileType.includes('image') ? 'image' :
                  fileType.includes('excel') || fileType.includes('spreadsheet') ? 'excel' : 'txt',
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
        section_structure: JSON.stringify({
          hasToc: parseResult.hasToc,
          quality: parseResult.quality,
          sectionCount: parseResult.sections.length,
          sections: parseResult.sections.slice(0, 20).map(s => ({ title: s.title, level: s.level }))
        }),
        structure_quality: parseResult.quality,
        // file_url is intentionally NOT set - no original file storage
      } as any);

    if (docError) {
      console.error('[upload-temp] Document insert error:', docError);
      throw new Error(`数据库存储失败: ${docError.message}`);
    }

    // Create chunk records
    const chunkRecords = chunks.map((chunk, index) => ({
      id: crypto.randomUUID(),
      document_id: documentId,
      chunk_index: index,
      content: chunk.content,
      embedding: embeddings[index],
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
        .insert(batch as any);

      if (chunksError) {
        // Rollback document
        await supabase.from('documents').delete().eq('id', documentId);
        throw new Error(`向量存储失败: ${chunksError.message}`);
      }
    }

    console.log(`[upload-temp] Successfully stored document ${documentId} with ${chunks.length} chunks`);

    // Return response
    return NextResponse.json({
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
      }
    });

  } catch (error: unknown) {
    console.error("[upload-temp] Error:", error);
    return createErrorResponse(error, requestId, 500);
  }
}
