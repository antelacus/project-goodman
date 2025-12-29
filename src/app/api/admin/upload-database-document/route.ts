/**
 * API Route: POST /api/admin/upload-database-document
 *
 * Admin-only endpoint for uploading documents to database with structured extraction.
 *
 * Features:
 * - Admin password authentication
 * - Type-specific structured extraction
 * - Dual storage: structured tables + vector embeddings
 * - Support for financial statements and regulations
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import * as XLSX from "xlsx";
import { createServerSupabaseClient } from "@/lib/database";
import {
  verifyAdminPassword,
  generateRequestId,
  createErrorResponse,
  validateFileByExtension,
} from "@/lib/security";
import {
  performStructuredExtraction,
  performColumnBasedExtraction,
  performAIExtraction,
  type DocumentType,
  type ExtractionResult,
  type FinancialExtractionResult,
  type RegulationExtractionResult,
  type ColumnMapping,
  type ColumnExtractionOptions,
} from "@/lib/extraction";
import {
  validateBalanceSheet,
  validateIncomeStatement,
  validateCashFlow,
} from "@/lib/financial";
import { uploadFileToStorage } from "@/lib/documents";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Supported file types for text extraction
const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const SUPPORTED_PDF_TYPE = 'application/pdf';
const SUPPORTED_EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Request body schema
 */
interface UploadRequest {
  documentText: string; // Can be actual text OR base64 file data
  fileName: string;
  documentType: DocumentType;
  year?: string;
  period?: string;
  startDate?: string;
  endDate?: string;
  columnMapping?: ColumnMapping;
  adminPassword: string;
  metadata?: Record<string, any>;
}

/**
 * Extract text from file based on type
 */
async function extractTextFromFile(
  fileData: string,
  fileName: string,
  openaiClient: OpenAI
): Promise<string> {
  // Detect file type from extension
  const ext = fileName.toLowerCase().split('.').pop();
  console.log(`[extractTextFromFile] Processing file: ${fileName}, extension: ${ext}, data length: ${fileData.length}`);

  if (ext === 'xlsx') {
    // Excel file - parse with xlsx library
    try {
      const buffer = Buffer.from(fileData, 'base64');
      console.log(`[extractTextFromFile] Buffer created, size: ${buffer.length} bytes`);

      const workbook = XLSX.read(buffer, { type: 'buffer' });
      console.log(`[extractTextFromFile] Workbook loaded, sheets: ${workbook.SheetNames.join(', ')}`);

      // Find the sheet with the most data (skip metadata sheets)
      let bestSheet = workbook.SheetNames[0];
      let bestRowCount = 0;

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        const rowCount = data.filter(row => row.some(cell => cell != null && cell !== '')).length;
        console.log(`[extractTextFromFile] Sheet "${sheetName}" has ${rowCount} non-empty rows`);

        if (rowCount > bestRowCount) {
          bestRowCount = rowCount;
          bestSheet = sheetName;
        }
      }

      console.log(`[extractTextFromFile] Using sheet: ${bestSheet} with ${bestRowCount} rows`);
      const sheet = workbook.Sheets[bestSheet];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      console.log(`[extractTextFromFile] Sheet parsed, rows: ${(jsonData as any[]).length}`);

      // Format as text
      const text = (jsonData as any[][])
        .filter(row => row.some(cell => cell != null && cell !== ''))
        .map(row => row.map(cell => cell ?? '').join('\t'))
        .join('\n');

      console.log(`[extractTextFromFile] Text extracted, length: ${text.length}`);
      return text;
    } catch (err) {
      console.error(`[extractTextFromFile] Excel parsing error:`, err);
      throw new Error(`Excel parsing failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  } else if (ext === 'pdf') {
    // PDF file - use unpdf for direct text extraction (serverless-friendly, no worker needed)
    try {
      const buffer = Buffer.from(fileData, 'base64');
      console.log(`[extractTextFromFile] PDF buffer created, size: ${buffer.length} bytes`);

      // Use unpdf which is designed for serverless environments
      const { extractText } = await import('unpdf');
      const result = await extractText(new Uint8Array(buffer));
      // unpdf returns text as array of strings (one per page), join them
      const textContent = Array.isArray(result.text) ? result.text.join('\n\n') : result.text;

      console.log(`[extractTextFromFile] PDF text extracted directly, length: ${textContent.length} chars, pages: ${result.totalPages}`);

      if (textContent.trim().length > 100) {
        // Successfully extracted text directly
        return textContent;
      }

      // If direct extraction yielded little text, it might be a scanned PDF
      // Fall back to OpenAI Vision API
      console.log(`[extractTextFromFile] PDF text too short, falling back to Vision API...`);
      const response = await openaiClient.responses.create({
        model: "gpt-5-mini",
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: "请完整提取这个PDF文档中的所有文本内容，保持原有的结构和格式。只返回文本内容，不要添加任何额外的解释。" },
            {
              type: "input_file",
              filename: fileName,
              file_data: `data:application/pdf;base64,${fileData}`
            }
          ]
        }]
      });
      return response.output_text || '';
    } catch (pdfError) {
      console.error(`[extractTextFromFile] PDF parse error:`, pdfError);
      // Fall back to OpenAI if pdf-parse fails
      console.log(`[extractTextFromFile] Falling back to Vision API due to error...`);
      const response = await openaiClient.responses.create({
        model: "gpt-5-mini",
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: "请完整提取这个PDF文档中的所有文本内容，保持原有的结构和格式。只返回文本内容，不要添加任何额外的解释。" },
            {
              type: "input_file",
              filename: fileName,
              file_data: `data:application/pdf;base64,${fileData}`
            }
          ]
        }]
      });
      return response.output_text || '';
    }
  } else if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext || '')) {
    // Image file - use Vision API
    const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    const response = await openaiClient.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "请完整提取这张图片中的所有文本内容，保持原有的结构和格式。只返回文本内容，不要添加任何额外的解释。" },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${fileData}`,
              detail: "high"
            }
          }
        ]
      }],
      max_completion_tokens: 4096
    });
    return response.choices[0]?.message?.content || '';
  } else if (ext === 'txt') {
    // Plain text - decode from base64
    return Buffer.from(fileData, 'base64').toString('utf-8');
  }

  // If no extension match, assume it's already text
  return fileData;
}

/**
 * Response schema
 */
interface UploadResponse {
  success: boolean;
  documentId?: string;
  message: string;
  structuredData?: {
    metrics?: Array<{
      name: string;
      value: number;
      unit: string;
    }>;
    articles?: Array<{
      number: string;
      title: string;
      content: string;
    }>;
  };
  processingTime?: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || generateRequestId();
  const startTime = Date.now();

  try {
    // Parse request body
    const body: UploadRequest = await request.json();
    const {
      documentText,
      fileName,
      documentType,
      year,
      period,
      startDate,
      endDate,
      columnMapping,
      adminPassword,
      metadata = {},
    } = body;

    // Validate required fields
    if (!documentText || !fileName || !documentType || !adminPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing required fields",
          error: "documentText, fileName, documentType, and adminPassword are required",
        } as UploadResponse,
        { status: 400 }
      );
    }

    // Verify admin password
    const isValidPassword = await verifyAdminPassword(adminPassword);
    if (!isValidPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid admin password",
          error: "Authentication failed",
        } as UploadResponse,
        { status: 401 }
      );
    }

    // Step 0.5: Validate file content (magic number check) for binary files
    // REQ-009: Prevent file masquerading attacks
    const fileExt = fileName.toLowerCase().split('.').pop();
    const isBinaryFile = ['pdf', 'xlsx', 'png', 'jpg', 'jpeg', 'webp', 'gif'].includes(fileExt || '');

    if (isBinaryFile) {
      try {
        // Check if documentText is base64-encoded
        const isBase64 = /^[A-Za-z0-9+/]+=*$/.test(documentText.replace(/\s/g, ''));
        if (isBase64 && documentText.length > 100) {
          const fileBuffer = Buffer.from(documentText, 'base64');
          const contentValidation = validateFileByExtension(fileBuffer, fileName);

          if (!contentValidation.valid) {
            console.warn(`[Admin Upload] File content validation failed for ${fileName}: ${contentValidation.error}`);
            return NextResponse.json(
              {
                success: false,
                message: contentValidation.error || "文件内容验证失败",
                error: "File content validation failed",
              } as UploadResponse,
              { status: 400 }
            );
          }
        }
      } catch (validationError) {
        console.error(`[Admin Upload] File validation error:`, validationError);
        // Don't fail on validation errors, just log them
      }
    }

    // Initialize Supabase client
    const supabase = createServerSupabaseClient();

    // Step 0: Extract text from file if needed
    console.log(`[Admin Upload] Extracting text from: ${fileName}`);
    const extractedText = await extractTextFromFile(documentText, fileName, openai);

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "无法从文件中提取文本",
          error: "Text extraction returned empty result",
        } as UploadResponse,
        { status: 400 }
      );
    }

    console.log(`[Admin Upload] Extracted ${extractedText.length} characters`);

    // Step 1: Perform structured extraction
    console.log(`[Admin Upload] Starting structured extraction for: ${fileName}`);
    const extractionResult: ExtractionResult = await performStructuredExtraction(
      extractedText,
      fileName,
      documentType
    );

    // Step 2: Chunk the document for vector storage
    const chunks = chunkDocument(extractedText, 1000, 200);
    console.log(`[Admin Upload] Created ${chunks.length} chunks`);

    // Step 3: Generate embeddings for all chunks
    console.log(`[Admin Upload] Generating embeddings...`);
    const embeddings = await generateEmbeddings(chunks);

    // Step 4: Store document metadata
    // Generate UUID for document
    const documentId = crypto.randomUUID();

    // Calculate document size in bytes
    const documentSize = Buffer.byteLength(extractedText, 'utf8');

    // Step 4.1: Upload original file to Storage
    let fileUrl: string | null = null;
    try {
      // Check if documentText is base64 (file upload) vs plain text
      const isBase64 = /^[A-Za-z0-9+/]+=*$/.test(documentText.replace(/\s/g, ''));
      if (isBase64 && documentText.length > 100) {
        console.log(`[Admin Upload] Uploading original file to storage...`);
        fileUrl = await uploadFileToStorage(documentId, fileName, documentText);
        console.log(`[Admin Upload] File uploaded: ${fileUrl}`);
      }
    } catch (storageError) {
      // Log but don't fail - file storage is optional
      console.error(`[Admin Upload] Storage upload failed (non-fatal):`, storageError);
    }

    const { data: documentData, error: docError } = await supabase
      .from("documents")
      .insert({
        id: documentId,
        name: fileName,
        doc_category: "knowledge",
        doc_type: documentType,
        status: "ready",
        size: documentSize,
        is_structured: true,
        year: year || (extractionResult as any).year,
        period: period || (extractionResult as any).period,
        file_url: fileUrl,
        extraction_status: "completed",
        extraction_metadata: {
          confidence: extractionResult.confidence,
          ...metadata,
        },
        processed_at: new Date().toISOString(),
      } as any)
      .select()
      .single();

    if (docError) {
      console.error("[Admin Upload] Document insert error:", docError);
      throw new Error(`Failed to insert document: ${docError.message}`);
    }

    console.log(`[Admin Upload] Document created with ID: ${documentId}`);

    // Step 5: Store vector chunks
    const chunkRecords = chunks.map((chunk, index) => ({
      id: crypto.randomUUID(),
      document_id: documentId,
      chunk_index: index,
      content: chunk,
      embedding: embeddings[index],
      chunk_type: "general",
    }));

    const { error: chunksError } = await supabase
      .from("document_chunks")
      .insert(chunkRecords as any);

    if (chunksError) {
      console.error("[Admin Upload] Chunks insert error:", chunksError);
      // Rollback document
      await supabase.from("documents").delete().eq("id", documentId);
      throw new Error(`Failed to insert chunks: ${chunksError.message}`);
    }

    console.log(`[Admin Upload] Stored ${chunks.length} vector chunks`);

    // Step 6: Store structured data based on document type
    let structuredDataSummary: UploadResponse["structuredData"] = {};

    // --- AI-Driven Extraction & Validation ---
    if (
      documentType === "balance_sheet" ||
      documentType === "income_statement" ||
      documentType === "cash_flow"
    ) {
      let aiResult;

      if (columnMapping) {
        console.log("[Admin Upload] Starting Column-based extraction...");
        // Convert base64 to buffer for column extraction
        const fileBuffer = Buffer.from(documentText, 'base64');

        // Pass year/period from form to column extraction
        const extractionOptions: ColumnExtractionOptions = {
          year: year,
          period: period,
          startDate: startDate,
          endDate: endDate
        };

        aiResult = await performColumnBasedExtraction(
          fileBuffer,
          columnMapping,
          startDate || '',
          endDate || '',
          documentType,
          extractionOptions
        );
        // Manually set type for column extraction result
        (aiResult as any).type = documentType;
      } else {
        console.log("[Admin Upload] Starting AI-driven extraction...");
        // Perform AI Extraction
        aiResult = await performAIExtraction(extractedText, fileName, openai);
      }

      let totalMetricsStored = 0;
      const validationReports: any[] = [];

      // 2. Process each extracted period (e.g., 2021, 2020)
      for (const item of aiResult.data) {
        console.log(`[Admin Upload] Processing data for ${item.year} (${item.period})...`);

        // 3. Validate Data
        let validationResult;
        if ((aiResult as any).type === 'balance_sheet') {
          validationResult = validateBalanceSheet(item.content as any);
        } else if ((aiResult as any).type === 'income_statement') {
          validationResult = validateIncomeStatement(item.content as any);
        } else {
          validationResult = validateCashFlow(item.content as any);
        }

        validationReports.push({
          year: item.year,
          period: item.period,
          isValid: validationResult.isValid,
          errors: validationResult.errors,
          warnings: validationResult.warnings
        });

        if (!validationResult.isValid) {
          console.warn(`[Admin Upload] Validation failed for ${item.year}:`, validationResult.errors);
          // Option: Throw error to reject upload, or store with warning flag
          // For now, we store it but log the errors in metadata
        }

        // 4. Transform to standard metrics format for DB storage
        // We need to flatten the object { "货币资金": 100 } -> [{ name: '货币资金', value: 100 }]
        const metrics: any[] = [];

        for (const [key, value] of Object.entries(item.content)) {
          if (value !== null && value !== undefined) {
            // The key is already the Chinese name (from the updated schema)
            metrics.push({
              name: key,
              value: value,
              unit: '元'
            });
          }
        }

        // 5. Store in Database
        // We reuse the existing storeFinancialMetrics logic but adapt the input
        const records = metrics.map((metric) => ({
          document_id: documentId,
          data_type: documentType,
          year: item.year,
          period: item.period,
          metric_name: metric.name, // This needs to be Chinese name
          metric_value: metric.value,
          unit: metric.unit,
          metadata: {
            confidence: columnMapping ? 1.0 : 0.9, // Higher confidence for column extraction
            validation_errors: validationResult.errors
          },
        }));

        if (records.length > 0) {
          const { error } = await supabase.from("financial_data").insert(records as any);
          if (error) throw error;
          totalMetricsStored += records.length;
        }
      }

      console.log(`[Admin Upload] Extraction complete. Stored ${totalMetricsStored} metrics.`);

      return NextResponse.json({
        success: true,
        documentId,
        message: columnMapping ? "Document processed successfully with Column-based extraction" : "Document processed successfully with AI extraction",
        validationReports // Return validation results to frontend
      });
    }
    else if (documentType === "regulation" || documentType === "accounting_standard" || documentType === "policy") {
      // Store regulation/standard/policy articles
      const regulationResult = extractionResult as RegulationExtractionResult;

      // Check if articles exist before processing
      if (regulationResult.articles && regulationResult.articles.length > 0) {
        const articlesCount = await storeRegulationArticles(
          supabase,
          documentId,
          regulationResult,
          fileName
        );

        console.log(`[Admin Upload] Stored ${articlesCount} regulation articles for type: ${documentType}`);

        structuredDataSummary.articles = regulationResult.articles.map((a) => ({
          number: a.articleNumber,
          title: a.title || "",
          content: a.content,
        }));
      } else {
        console.log(`[Admin Upload] No articles extracted for ${documentType}, storing as vector-only`);
      }
    }
    // Vector-only document types (no structured extraction needed)
    else if (documentType === "financial_report" || documentType === "business_info" || documentType === "general") {
      console.log(`[Admin Upload] Vector-only storage for document type: ${documentType}`);
      // No additional structured extraction - document is already chunked and embedded above
    }

    // Calculate processing time
    const processingTime = Date.now() - startTime;

    // Return success response
    const metricsCount = structuredDataSummary.metrics?.length || 0;
    const articlesCount = structuredDataSummary.articles?.length || 0;

    let message = "文档已成功上传并处理。";
    if (metricsCount > 0) {
      message += `提取了 ${metricsCount} 个财务指标。`;
    }
    if (articlesCount > 0) {
      message += `提取了 ${articlesCount} 个法规条款。`;
    }

    return NextResponse.json({
      success: true,
      documentId,
      message,
      structuredData: structuredDataSummary,
      processingTime,
    } as UploadResponse);

  } catch (error: unknown) {
    console.error("[Admin Upload] Error:", error);
    return createErrorResponse(error, requestId, 500);
  }
}

/**
 * Chunk document text into overlapping segments
 */
function chunkDocument(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }

  return chunks;
}

/**
 * Generate embeddings for text chunks
 */
async function generateEmbeddings(chunks: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];

  // Process in batches of 100 (OpenAI API limit)
  const batchSize = 100;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: batch,
    });

    embeddings.push(...response.data.map((item) => item.embedding));
  }

  return embeddings;
}

/**
 * Store regulation articles in structured table
 */
async function storeRegulationArticles(
  supabase: any,
  documentId: string,
  result: RegulationExtractionResult,
  regulationName: string
): Promise<number> {
  const records = result.articles.map((article) => ({
    document_id: documentId,
    regulation_name: regulationName.replace(".pdf", "").replace(".txt", ""),
    article_number: article.articleNumber,
    sub_article: article.subArticle || null,
    title: article.title || null,
    content: article.content,
    keywords: article.keywords || [],
    hierarchy: article.hierarchy || [],
    metadata: {
      effectiveDate: article.effectiveDate,
      confidence: 0.8, // Default confidence for regulation extraction
    },
  }));

  const { error } = await supabase
    .from("structured_regulations")
    .insert(records);

  if (error) {
    console.error("[Admin Upload] Regulations insert error:", error);
    throw new Error(`Failed to insert regulation articles: ${error.message}`);
  }

  return records.length;
}
