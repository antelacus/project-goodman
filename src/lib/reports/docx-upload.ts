/**
 * DOCX Upload Utilities for Reports
 *
 * Handles uploading generated DOCX to Supabase Storage and updating
 * the reports table with the storage path.
 *
 * v4.6: Created for performance-optimization DOCX export.
 *
 * ⚠️ SERVER-SIDE ONLY ⚠️
 */

import 'server-only';

if (typeof window !== 'undefined') {
  throw new Error('[SECURITY] docx-upload.ts must not be imported in client-side code.');
}

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { generateReportDocx, DOCX_CONTENT_TYPE } from './docx-generator';
import type { ReportContent } from '@/types/report';

const BUCKET_NAME = 'document-files';
const REPORTS_FOLDER = 'reports';
const FALLBACK_CONTENT_TYPE = 'application/octet-stream';

function shouldRetryMimeType(error: { message?: string; statusCode?: number; status?: number }): boolean {
  const message = error.message?.toLowerCase() ?? '';
  const status = error.statusCode ?? error.status;
  return status === 415 && message.includes('mime type');
}

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

function generateDocxFilename(reportId: string, year: string, comparisonYear?: string): string {
  const timestamp = Date.now();
  const yearPart = comparisonYear ? `${year}_vs_${comparisonYear}` : year;
  return `report_${yearPart}_${timestamp}.docx`;
}

export async function uploadReportDocx(
  reportId: string,
  docxBuffer: Buffer,
  year: string,
  comparisonYear?: string
): Promise<string> {
  const supabase = createStorageClient();

  const filename = generateDocxFilename(reportId, year, comparisonYear);
  const storagePath = `${REPORTS_FOLDER}/${reportId}/${filename}`;

  console.log(`[ReportDocx] Uploading DOCX: ${storagePath}, size: ${docxBuffer.length} bytes`);

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, docxBuffer, {
      contentType: DOCX_CONTENT_TYPE,
      upsert: true,
    });

  if (error) {
    console.error('[ReportDocx] Upload error:', error);
    if (shouldRetryMimeType(error)) {
      console.warn('[ReportDocx] Retrying DOCX upload with fallback content type');
      const { data: retryData, error: retryError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, docxBuffer, {
          contentType: FALLBACK_CONTENT_TYPE,
          upsert: true,
        });

      if (retryError) {
        console.error('[ReportDocx] Retry upload error:', retryError);
        throw new Error(`DOCX 上传失败: ${retryError.message}`);
      }

      if (!retryData?.path) {
        throw new Error('DOCX 上传失败: 未返回存储路径');
      }

      console.log(`[ReportDocx] DOCX uploaded successfully after retry: ${retryData.path}`);
      return retryData.path;
    }

    throw new Error(`DOCX 上传失败: ${error.message}`);
  }

  console.log(`[ReportDocx] DOCX uploaded successfully: ${data.path}`);

  return data.path;
}

async function updateReportDocxPath(reportId: string, storagePath: string): Promise<void> {
  const supabase = createStorageClient();

  const { error } = await supabase
    .from('reports')
    .update({ docx_storage_path: storagePath })
    .eq('id', reportId);

  if (error) {
    console.error('[ReportDocx] Update error:', error);
    throw new Error(`更新报告路径失败: ${error.message}`);
  }

  console.log(`[ReportDocx] Report ${reportId} updated with DOCX path`);
}

export async function generateAndSaveReportDocx(
  reportId: string,
  content: ReportContent,
  year: string,
  comparisonYear?: string
): Promise<string> {
  console.log('[ReportDocx] Starting DOCX generation');
  const startTime = Date.now();

  try {
    const docxBuffer = await generateReportDocx(content);
    const storagePath = await uploadReportDocx(reportId, docxBuffer, year, comparisonYear);
    await updateReportDocxPath(reportId, storagePath);

    const duration = Date.now() - startTime;
    console.log(`[ReportDocx] DOCX workflow finished in ${duration}ms`);

    return storagePath;
  } catch (error) {
    console.error('[ReportDocx] DOCX workflow failed:', error);
    throw error;
  }
}
