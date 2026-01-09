/**
 * API Route: /api/reports
 *
 * Get list of reports for the current user.
 * v4.2: Report listing endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/database';
import {
  ensureSession,
  generateRequestId,
  createErrorResponse,
} from '@/lib/security';
import type { ReportListItem } from '@/types/report';

export const runtime = 'nodejs';

// ============================================================================
// GET Handler - List Reports
// ============================================================================

export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || generateRequestId();

  try {
    // Ensure session exists
    const sessionResult = await ensureSession(req);
    const { session, isNewSession } = sessionResult;

    // Determine owner info
    const ownerId = session.userId || session.sessionId;
    const ownerType = session.role;

    // Query reports for this owner
    const supabase = createServerSupabaseClient();

    const { data: reports, error } = await supabase
      .from('reports')
      .select('id, title, year, comparison_year, summary_text, created_at')
      .eq('owner_id', ownerId)
      .eq('owner_type', ownerType)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[ReportList] Query error:', error);
      throw new Error(`获取报告列表失败: ${error.message}`);
    }

    // Transform to API response format
    const reportList: ReportListItem[] = (reports || []).map(r => ({
      id: r.id,
      title: r.title,
      year: r.year,
      comparisonYear: r.comparison_year || undefined,
      summaryText: r.summary_text || undefined,
      createdAt: r.created_at || new Date().toISOString(),
    }));

    // Build response
    const response = NextResponse.json({
      success: true,
      data: {
        reports: reportList,
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
    console.error('[ReportList] Error:', error);
    return createErrorResponse(error, requestId, 500);
  }
}
