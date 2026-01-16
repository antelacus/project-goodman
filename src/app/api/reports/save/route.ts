/**
 * API Route: /api/reports/save
 *
 * Save a generated report to the database and generate PDF.
 * v4.2: Report persistence with PDF generation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, type Json } from '@/lib/database';
import {
  ensureSession,
  generateRequestId,
  createErrorResponse,
  validateCsrf,
  createCsrfErrorResponse,
} from '@/lib/security';
import { ReportSaveSchema, validateRequest } from '@/lib/validation/api-schemas';
import type { ReportContent, ReportOwnerType } from '@/types/report';
import { generateAndSaveReportPdf } from '@/lib/reports';
import { getSignedFileUrl } from '@/lib/documents/storage';

export const runtime = 'nodejs';

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || generateRequestId();

  try {
    // Validate CSRF token
    const csrfValid = await validateCsrf(req);
    if (!csrfValid) {
      return createCsrfErrorResponse();
    }

    // Ensure session exists
    const sessionResult = await ensureSession(req);
    const { session, isNewSession } = sessionResult;

    // Parse and validate request body
    const body = await req.json();
    const validation = validateRequest(ReportSaveSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { content, year, comparisonYear, generationTimeMs } = validation.data;
    const reportContent = content as ReportContent;

    // Determine owner info
    const ownerId = session.userId || session.sessionId;
    const ownerType = session.role as ReportOwnerType;

    // Generate summary text from key findings
    const summaryText = reportContent.summary.keyFindings.slice(0, 3).join('；');

    // Calculate expiration (guests: 24h, admin/user: null)
    const expiresAt = ownerType === 'guest'
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Insert report into database
    const supabase = createServerSupabaseClient();

    const { data: insertedReport, error: insertError } = await supabase
      .from('reports')
      .insert({
        owner_id: ownerId,
        owner_type: ownerType,
        title: reportContent.title,
        report_type: 'comprehensive_financial',
        year,
        comparison_year: comparisonYear || null,
        content: reportContent as unknown as Json,
        summary_text: summaryText,
        pdf_storage_path: null, // Will be set when PDF is generated
        generation_time_ms: generationTimeMs ?? null,
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[ReportSave] Insert error:', insertError);
      throw new Error(`保存报告失败: ${insertError.message}`);
    }

    const reportId = insertedReport.id;

    // Generate PDF and upload to storage
    let pdfUrl: string | null = null;
    try {
      const storagePath = await generateAndSaveReportPdf(
        reportId,
        reportContent,
        year,
        comparisonYear
      );

      // Generate signed URL for immediate download (1 hour expiry)
      pdfUrl = await getSignedFileUrl(storagePath, 3600);
    } catch (pdfError) {
      // Log error but don't fail the request - report is already saved
      console.error('[ReportSave] PDF generation failed:', pdfError);
      // User can still access the report, PDF can be generated later
    }

    // Build response
    const response = NextResponse.json({
      success: true,
      data: {
        reportId,
        pdfUrl,
      },
    });

    // Set cookie for new sessions
    if (isNewSession && sessionResult.setCookieHeader) {
      response.cookies.set(
        sessionResult.setCookieHeader.name,
        sessionResult.setCookieHeader.value,
        sessionResult.setCookieHeader.options
      );
    }

    return response;

  } catch (error: unknown) {
    console.error('[ReportSave] Error:', error);
    return createErrorResponse(error, requestId, 500);
  }
}
