/**
 * PDF Upload Utilities for Reports
 *
 * Handles uploading generated PDFs to Supabase Storage and updating
 * the reports table with the storage path.
 *
 * v4.2: Created for report-generation feature
 *
 * ⚠️ SERVER-SIDE ONLY ⚠️
 */

// Runtime check to prevent client-side import
if (typeof window !== 'undefined') {
  throw new Error(
    '[SECURITY] pdf-upload.ts must not be imported in client-side code.'
  );
}

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { generateReportPDF } from './pdf-generator';
import type { ReportContent } from '@/types/report';

const BUCKET_NAME = 'document-files';
const REPORTS_FOLDER = 'reports';

/**
 * Create a Supabase client with service role key for storage operations
 */
function createStorageClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Generate a safe filename for the PDF
 */
function generatePdfFilename(reportId: string, year: string, comparisonYear?: string): string {
  const timestamp = Date.now();
  const yearPart = comparisonYear ? `${year}_vs_${comparisonYear}` : year;
  return `report_${yearPart}_${timestamp}.pdf`;
}

/**
 * Upload a PDF buffer to Supabase Storage
 *
 * @param reportId - The report ID (used in storage path)
 * @param pdfBuffer - The PDF content as a Buffer
 * @param year - The primary analysis year
 * @param comparisonYear - Optional comparison year
 * @returns The storage path
 */
export async function uploadReportPdf(
  reportId: string,
  pdfBuffer: Buffer,
  year: string,
  comparisonYear?: string
): Promise<string> {
  const supabase = createStorageClient();

  const filename = generatePdfFilename(reportId, year, comparisonYear);
  const storagePath = `${REPORTS_FOLDER}/${reportId}/${filename}`;

  console.log(`[ReportPdf] Uploading PDF: ${storagePath}, size: ${pdfBuffer.length} bytes`);

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) {
    console.error('[ReportPdf] Upload error:', error);
    throw new Error(`PDF 上传失败: ${error.message}`);
  }

  console.log(`[ReportPdf] PDF uploaded successfully: ${data.path}`);

  return data.path;
}

/**
 * Update the report record with the PDF storage path
 */
async function updateReportPdfPath(reportId: string, storagePath: string): Promise<void> {
  const supabase = createStorageClient();

  const { error } = await supabase
    .from('reports')
    .update({ pdf_storage_path: storagePath })
    .eq('id', reportId);

  if (error) {
    console.error('[ReportPdf] Update error:', error);
    throw new Error(`更新报告路径失败: ${error.message}`);
  }

  console.log(`[ReportPdf] Report ${reportId} updated with PDF path`);
}

/**
 * Generate PDF and save to storage in one operation
 *
 * This is the main function to call from the save route.
 * It generates the PDF, uploads to storage, and updates the database.
 *
 * @param reportId - The report ID (already saved to database)
 * @param content - The report content
 * @param year - The primary analysis year
 * @param comparisonYear - Optional comparison year
 * @returns The storage path
 */
export async function generateAndSaveReportPdf(
  reportId: string,
  content: ReportContent,
  year: string,
  comparisonYear?: string
): Promise<string> {
  console.log(`[ReportPdf] Starting PDF generation for report: ${reportId}`);
  const startTime = Date.now();

  try {
    // Step 1: Generate PDF
    const pdfBuffer = await generateReportPDF(content);

    // Step 2: Upload to storage
    const storagePath = await uploadReportPdf(reportId, pdfBuffer, year, comparisonYear);

    // Step 3: Update database record
    await updateReportPdfPath(reportId, storagePath);

    const duration = Date.now() - startTime;
    console.log(`[ReportPdf] Complete PDF workflow finished in ${duration}ms`);

    return storagePath;
  } catch (error) {
    console.error('[ReportPdf] PDF workflow failed:', error);
    throw error;
  }
}
