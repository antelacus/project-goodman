/**
 * API Route: POST /api/admin/upload-database-document
 *
 * Admin-only endpoint for uploading documents to database with structured extraction.
 *
 * Features:
 * - Admin password authentication
 * - Type-specific structured extraction
 * - Dual storage: structured tables + text chunks for keyword search
 * - Support for financial statements and regulations
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/database";
import type { InsertTables, Database } from "@/lib/database";
import { SupabaseClient } from "@supabase/supabase-js";
import { logWorkflowEvent } from "@/lib/logging";
import { AIUnavailableError, AI_FAILURE_TEXT } from "@/lib/ai";
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
  type ColumnMapping,
  type ColumnExtractionOptions,
  type FinancialExtractionWithType,
  type FinancialStatementType,
} from "@/lib/extraction";
import type { WorkflowErrorType } from "@/lib/errors";
import {
  validateBalanceSheet,
  validateIncomeStatement,
  validateCashFlow,
  type StandardBalanceSheet,
  type StandardIncomeStatement,
  type StandardCashFlow,
} from "@/lib/financial";
import { uploadFileToStorage } from "@/lib/documents/storage";
import { createSectionAwareChunks } from "@/lib/documents/chunker";
import { extractTextFromFile } from "@/lib/documents/extract-text";
import { isRegulation } from "@/lib/documents/constants";
import { articleStartsByLine } from "@/lib/extraction/article-lines";

const ARTICLE_NUMBERED_HINT = "提示：这份文档按“第X条”编号；回答中引用它的条款号时，条款号会被删去。";
import { splitRegulation, type SplitArticle, type SplitAnomaly } from "@/lib/extraction/regulation-splitter";



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
  metadata?: Record<string, unknown>;
}

/**
 * Type guard to check if extraction result has year/period (financial document)
 */
function isFinancialExtractionResult(
  result: ExtractionResult
): result is FinancialExtractionResult {
  return 'year' in result && 'period' in result;
}

type FinancialRow = Omit<InsertTables<'financial_data'>, 'document_id'>;

interface ValidationReport {
  year: string;
  period: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface FinancialRows {
  rows: FinancialRow[];
  validationReports: ValidationReport[];
}

function isFinancialStatementType(documentType: string): documentType is FinancialStatementType {
  return documentType === "balance_sheet" || documentType === "income_statement" || documentType === "cash_flow";
}

/**
 * Extracts every period of a financial statement and validates all of them.
 * Returns the rows to insert only when every period is valid, so a failing
 * period never leaves the others half-written (REQ §5.2).
 */
async function extractFinancialRows(req: {
  documentType: FinancialStatementType;
  extractedText: string;
  fileName: string;
  documentText: string;
  columnMapping?: ColumnMapping;
  year?: string;
  period?: string;
  startDate?: string;
  endDate?: string;
}): Promise<FinancialRows | { invalid: ValidationReport }> {
  const { documentType, columnMapping } = req;
  let aiResult: FinancialExtractionWithType;

  if (columnMapping) {
    console.log("[Admin Upload] Starting Column-based extraction...");
    const extractionOptions: ColumnExtractionOptions = {
      year: req.year,
      period: req.period,
      startDate: req.startDate,
      endDate: req.endDate,
    };
    const columnResult = await performColumnBasedExtraction(
      Buffer.from(req.documentText, 'base64'),
      columnMapping,
      req.startDate || '',
      req.endDate || '',
      documentType,
      extractionOptions
    );
    aiResult = { type: documentType, data: columnResult.data };
  } else {
    console.log("[Admin Upload] Starting AI-driven extraction...");
    aiResult = await performAIExtraction(req.extractedText, req.fileName);
  }

  const rows: FinancialRow[] = [];
  const validationReports: ValidationReport[] = [];

  for (const item of aiResult.data) {
    // REASON: AI extraction returns content keyed by the standard Chinese metric
    // names. Cast via `unknown` is safer than `any` for validation.
    let validationResult;
    if (aiResult.type === 'balance_sheet') {
      validationResult = validateBalanceSheet(item.content as unknown as StandardBalanceSheet);
    } else if (aiResult.type === 'income_statement') {
      validationResult = validateIncomeStatement(item.content as unknown as StandardIncomeStatement);
    } else {
      validationResult = validateCashFlow(item.content as unknown as StandardCashFlow);
    }

    const report: ValidationReport = {
      year: item.year,
      period: item.period,
      isValid: validationResult.isValid,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
    };
    if (!report.isValid) return { invalid: report };
    validationReports.push(report);

    for (const [name, value] of Object.entries(item.content)) {
      if (value === null || value === undefined) continue;
      rows.push({
        data_type: documentType,
        year: item.year,
        period: item.period,
        metric_name: name,
        metric_value: value,
        unit: '元',
        metadata: {
          confidence: columnMapping ? 1.0 : 0.9,
          validation_errors: validationResult.errors,
        },
      });
    }
  }

  return { rows, validationReports };
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
    anomalies?: SplitAnomaly[];
  };
  processingTime?: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || generateRequestId();
  const startTime = Date.now();
  const workflowContext = {
    workflow: 'admin_upload',
    requestId,
    route: '/api/admin/upload-database-document',
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

  const createJsonResponse = (payload: UploadResponse | Record<string, unknown>, status = 200) => {
    const responsePayload = { ...payload, requestId } as Record<string, unknown>;
    return NextResponse.json(
      responsePayload,
      { status, headers: { 'X-Request-ID': requestId } }
    );
  };

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
      logWorkflowFailure('VALIDATION');
      return createJsonResponse(
        {
          success: false,
          message: "Missing required fields",
          error: "documentText, fileName, documentType, and adminPassword are required",
        } as UploadResponse,
        400
      );
    }

    // Verify admin password
    const isValidPassword = await verifyAdminPassword(adminPassword);
    if (!isValidPassword) {
      logWorkflowFailure('AUTH');
      return createJsonResponse(
        {
          success: false,
          message: "Invalid admin password",
          error: "Authentication failed",
        } as UploadResponse,
        401
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
            logWorkflowFailure('VALIDATION');
            return createJsonResponse(
              {
                success: false,
                message: contentValidation.error || "文件内容验证失败",
                error: "File content validation failed",
              } as UploadResponse,
              400
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
    const { text: extractedText, pages: filePages } = await extractTextFromFile(documentText, fileName);
    logWorkflowEvent({
      ...workflowContext,
      step: 'extract',
      status: 'ok',
      duration: Date.now() - startTime,
    });

    if (!extractedText || extractedText.trim().length === 0) {
      logWorkflowFailure('EXTRACTION_FAILED');
      return createJsonResponse(
        {
          success: false,
          message: "无法从文件中提取文本",
          error: "Text extraction returned empty result",
        } as UploadResponse,
        400
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

    // Step 1b: Financial statements are extracted and every period validated
    // before anything is written, so a failure leaves the database untouched.
    let financialRows: FinancialRows | null = null;
    if (isFinancialStatementType(documentType)) {
      const result = await extractFinancialRows({
        documentType, extractedText, fileName, documentText, columnMapping, year, period, startDate, endDate,
      });
      if ('invalid' in result) {
        const { year: badYear, period: badPeriod, errors } = result.invalid;
        console.warn(`[Admin Upload] Validation failed for ${badYear}:`, errors);
        return createErrorResponse(
          new Error(`Validation failed for ${badYear} (${badPeriod}): ${errors.join('；')}`),
          requestId,
          400,
          { errorType: 'VALIDATION', route: '/api/admin/upload-database-document' }
        );
      }
      financialRows = result;
    }

    // Step 1c: Regulations are split before anything is written, so a split the
    // citations cannot trust never reaches the database (REQ §5.6).
    let regulationSplit: { articles: SplitArticle[]; anomalies: SplitAnomaly[] } | null = null;
    if (isRegulation(documentType)) {
      if (!filePages) {
        logWorkflowFailure('VALIDATION');
        return createJsonResponse(
          { success: false, message: '条款拆分异常：PDF 没有可提取的文字层，无法按页拆分', error: 'regulation_split' } as UploadResponse,
          400
        );
      }
      regulationSplit = splitRegulation(filePages.pages, filePages.pageCount);
      const blocking = regulationSplit.anomalies.find(
        a => a.kind === 'repeated_number' || a.kind === 'page_count_mismatch' || a.kind === 'no_articles'
      );
      if (blocking) {
        logWorkflowFailure('VALIDATION');
        const message =
          blocking.kind === 'repeated_number' ? `条款拆分异常：${blocking.articleNumber}重复`
          : blocking.kind === 'page_count_mismatch' ? `条款拆分异常：抽取页数（${blocking.extracted}）与 PDF 页数（${blocking.expected}）不一致`
          // Document search excludes regulations, so with no articles neither search could reach it.
          : '条款拆分异常：未拆出任何条款';
        return createJsonResponse({ success: false, message, error: 'regulation_split' } as UploadResponse, 400);
      }
    }

    // Step 2: Chunk the document for keyword search
    const chunks = createSectionAwareChunks(extractedText, []).map(c => c.content);
    console.log(`[Admin Upload] Created ${chunks.length} chunks`);

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
        logWorkflowEvent({
          ...workflowContext,
          step: 'upload',
          status: 'ok',
          duration: Date.now() - startTime,
        });
      }
    } catch (storageError) {
      // A regulation's citations link to its original file, so without the file
      // the upload fails; for other types the file is optional.
      if (isRegulation(documentType)) {
        console.error(`[Admin Upload] Storage upload failed:`, storageError);
        logWorkflowFailure('INTERNAL');
        return createJsonResponse(
          { success: false, message: "原文件存储失败，未写入任何数据", error: "storage_failed" } as UploadResponse,
          502
        );
      }
      console.error(`[Admin Upload] Storage upload failed (non-fatal):`, storageError);
    }

    // Build document insert with type-safe year/period extraction
    const docYear = year || (isFinancialExtractionResult(extractionResult) ? extractionResult.year : undefined);
    const docPeriod = period || (isFinancialExtractionResult(extractionResult) ? extractionResult.period : undefined);

    const documentInsert: InsertTables<'documents'> = {
      id: documentId,
      name: fileName,
      doc_category: "knowledge",
      doc_type: documentType,
      status: "ready",
      size: documentSize,
      is_structured: true,
      year: docYear,
      period: docPeriod,
      file_url: fileUrl,
      extraction_status: "completed",
      extraction_metadata: {
        confidence: extractionResult.confidence,
        ...metadata,
      },
      processed_at: new Date().toISOString(),
    };

    const { error: docError } = await supabase
      .from("documents")
      .insert(documentInsert)
      .select()
      .single();

    if (docError) {
      console.error("[Admin Upload] Document insert error:", docError);
      throw new Error(`Failed to insert document: ${docError.message}`);
    }

    console.log(`[Admin Upload] Document created with ID: ${documentId}`);

    // Step 5: Store text chunks with proper typing
    const chunkRecords: InsertTables<'document_chunks'>[] = chunks.map((chunk, index) => ({
      id: crypto.randomUUID(),
      document_id: documentId,
      chunk_index: index,
      content: chunk,
      chunk_type: "general",
    }));

    const { error: chunksError } = await supabase
      .from("document_chunks")
      .insert(chunkRecords);

    if (chunksError) {
      console.error("[Admin Upload] Chunks insert error:", chunksError);
      // Rollback document
      await supabase.from("documents").delete().eq("id", documentId);
      throw new Error(`Failed to insert chunks: ${chunksError.message}`);
    }

    console.log(`[Admin Upload] Stored ${chunks.length} chunks`);
    logWorkflowEvent({
      ...workflowContext,
      step: 'store',
      status: 'ok',
      duration: Date.now() - startTime,
    });

    // Step 6: Store structured data based on document type
    const structuredDataSummary: UploadResponse["structuredData"] = {};

    if (financialRows) {
      // All periods passed validation above; one insert writes them together.
      const records = financialRows.rows.map(row => ({ ...row, document_id: documentId }));
      if (records.length > 0) {
        const { error } = await supabase.from("financial_data").insert(records);
        if (error) {
          await supabase.from("documents").delete().eq("id", documentId);
          throw error;
        }
      }

      console.log(`[Admin Upload] Extraction complete. Stored ${records.length} metrics.`);

      logWorkflowSuccess();
      return createJsonResponse({
        success: true,
        documentId,
        message: columnMapping ? "Document processed successfully with Column-based extraction" : "Document processed successfully with AI extraction",
        validationReports: financialRows.validationReports,
      });
    }
    else if (regulationSplit) {
      if (regulationSplit.articles.length > 0) {
        await storeRegulationArticles(supabase, documentId, regulationSplit.articles, fileName);
        console.log(`[Admin Upload] Stored ${regulationSplit.articles.length} regulation articles for type: ${documentType}`);
        structuredDataSummary.articles = regulationSplit.articles.map(a => ({
          number: a.articleNumber,
          title: "",
          content: a.content,
        }));
        structuredDataSummary.anomalies = regulationSplit.anomalies;
      } else {
        console.log(`[Admin Upload] No articles extracted for ${documentType}, storing chunks only`);
      }
    }
    // Chunk-only document types (no structured extraction needed)
    else if (documentType === "financial_report" || documentType === "business_info" || documentType === "general") {
      console.log(`[Admin Upload] Chunk-only storage for document type: ${documentType}`);
      // No additional structured extraction - document is already chunked above
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
    // Document search results carry no evidence ids (a search returns chunks, and an
    // article can span two), so an answer citing this document's 第X条 loses the number.
    if (!isRegulation(documentType) && articleStartsByLine(extractedText.split('\n')).some(Boolean)) {
      message += ARTICLE_NUMBERED_HINT;
    }

    logWorkflowSuccess();
    return createJsonResponse({
      success: true,
      documentId,
      message,
      structuredData: structuredDataSummary,
      processingTime,
    } as UploadResponse);

  } catch (error: unknown) {
    console.error("[Admin Upload] Error:", error);
    if (error instanceof AIUnavailableError) {
      logWorkflowFailure('EXTRACTION_FAILED');
      return createJsonResponse(
        { success: false, message: AI_FAILURE_TEXT.extraction, error: 'ai_unavailable' } as UploadResponse,
        503
      );
    }
    logWorkflowFailure('INTERNAL');
    return createErrorResponse(error, requestId, 500, {
      errorType: 'INTERNAL',
      route: '/api/admin/upload-database-document',
    });
  }
}

/**
 * Store regulation articles in structured table
 */
async function storeRegulationArticles(
  supabase: SupabaseClient<Database>,
  documentId: string,
  articles: SplitArticle[],
  fileName: string
): Promise<number> {
  const records: InsertTables<'structured_regulations'>[] = articles.map((article) => ({
    document_id: documentId,
    regulation_name: fileName.replace(/\.(pdf|txt|md)$/i, ""),
    article_number: article.articleNumber,
    content: article.content,
    keywords: [],
    hierarchy: article.hierarchy,
    metadata: { firstPage: article.firstPage, lastPage: article.lastPage },
  }));

  const { error } = await supabase
    .from("structured_regulations")
    .insert(records);

  if (error) {
    console.error("[Admin Upload] Regulations insert error:", error);
    await supabase.from("documents").delete().eq("id", documentId);
    throw new Error(`Failed to insert regulation articles: ${error.message}`);
  }

  return records.length;
}
