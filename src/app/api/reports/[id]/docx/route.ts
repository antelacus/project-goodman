/**
 * API Route: /api/reports/[id]/docx
 *
 * Get a signed URL for downloading the report DOCX.
 * v4.6: DOCX download endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/database';
import {
  ensureSession,
  generateRequestId,
  createErrorResponse,
} from '@/lib/security';
import { ReportIdParamSchema, validateRequest } from '@/lib/validation/api-schemas';
import { getSignedFileUrl } from '@/lib/documents/storage';

export const runtime = 'nodejs';

// ============================================================================
// GET Handler - Get DOCX Download URL
// ============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = req.headers.get('x-request-id') || generateRequestId();

  try {
    const { id: reportId } = await params;

    // Validate UUID format using schema
    const validation = validateRequest(ReportIdParamSchema, { id: reportId });
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
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
      .select('id, owner_id, owner_type, docx_storage_path')
      .eq('id', reportId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: '报告不存在' },
          { status: 404 }
        );
      }
      console.error('[ReportDocx] Query error:', error);
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

    // Check if DOCX exists
    if (!report.docx_storage_path) {
      return NextResponse.json(
        { error: 'DOCX 文件尚未生成' },
        { status: 404 }
      );
    }

    // Generate signed URL (1 hour expiry)
    const signedUrl = await getSignedFileUrl(report.docx_storage_path, 3600);

    if (!signedUrl) {
      return NextResponse.json(
        { error: '无法生成下载链接' },
        { status: 500 }
      );
    }

    // Build response
    const response = NextResponse.json({
      success: true,
      data: {
        url: signedUrl,
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
    console.error('[ReportDocx] Error:', error);
    return createErrorResponse(error, requestId, 500);
  }
}
