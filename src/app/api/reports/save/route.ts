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

    const { content, year, comparisonYear } = validation.data;
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
        generation_time_ms: null, // TODO: track from workflow
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[ReportSave] Insert error:', insertError);
      throw new Error(`保存报告失败: ${insertError.message}`);
    }

    const reportId = insertedReport.id;

    // TODO: Task 5 - Generate PDF and upload to storage
    // For now, return without PDF URL
    // const pdfUrl = await generateAndUploadPdf(reportId, reportContent);

    // Build response
    const response = NextResponse.json({
      success: true,
      data: {
        reportId,
        pdfUrl: null, // Will be available after Task 5
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
