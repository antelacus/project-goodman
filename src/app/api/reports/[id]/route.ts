/**
 * API Route: /api/reports/[id]
 *
 * Get a single report by ID.
 * v4.2: Report detail endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/database';
import {
  ensureSession,
  generateRequestId,
  createErrorResponse,
} from '@/lib/security';
import type { ReportRecord, ReportContent, ReportOwnerType } from '@/types/report';

export const runtime = 'nodejs';

// ============================================================================
// GET Handler - Get Single Report
// ============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = req.headers.get('x-request-id') || generateRequestId();

  try {
    const { id: reportId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(reportId)) {
      return NextResponse.json(
        { error: '无效的报告 ID 格式' },
        { status: 400 }
      );
    }

    // Ensure session exists
    const sessionResult = await ensureSession(req);
    const { session, isNewSession } = sessionResult;

    // Determine owner info
    const ownerId = session.userId || session.sessionId;
    const ownerType = session.role;

    // Query the report
    const supabase = createServerSupabaseClient();

    const { data: report, error } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: '报告不存在' },
          { status: 404 }
        );
      }
      console.error('[ReportDetail] Query error:', error);
      throw new Error(`获取报告失败: ${error.message}`);
    }

    if (!report) {
      return NextResponse.json(
        { error: '报告不存在' },
        { status: 404 }
      );
    }

    // Verify ownership (unless admin)
    const isOwner = report.owner_id === ownerId && report.owner_type === ownerType;
    const isAdmin = session.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: '无权访问此报告' },
        { status: 403 }
      );
    }

    // Transform to API response format
    const reportRecord: ReportRecord = {
      id: report.id,
      title: report.title,
      reportType: report.report_type as ReportRecord['reportType'],
      year: report.year,
      comparisonYear: report.comparison_year || undefined,
      content: report.content as unknown as ReportContent,
      summaryText: report.summary_text || undefined,
      pdfStoragePath: report.pdf_storage_path || undefined,
      generationTimeMs: report.generation_time_ms || undefined,
      createdAt: report.created_at || new Date().toISOString(),
      updatedAt: report.updated_at || new Date().toISOString(),
      ownerId: report.owner_id || undefined,
      ownerType: report.owner_type as ReportOwnerType,
    };

    // Build response
    const response = NextResponse.json({
      success: true,
      data: {
        report: reportRecord,
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
    console.error('[ReportDetail] Error:', error);
    return createErrorResponse(error, requestId, 500);
  }
}
