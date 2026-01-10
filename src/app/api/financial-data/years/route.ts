import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/database';
import { createErrorResponse, generateRequestId } from '@/lib/security';

export const runtime = 'nodejs';

/**
 * GET /api/financial-data/years
 * Returns distinct years available in financial_data table
 */
export async function GET(req: NextRequest) {
  const requestId = req.headers.get('x-request-id') || generateRequestId();

  try {
    const supabase = createServerSupabaseClient();

    // Query distinct years from financial_data
    const { data, error } = await supabase
      .from('financial_data')
      .select('year')
      .not('year', 'is', null);

    if (error) {
      console.error(`[${requestId}] Failed to fetch financial data years:`, error);
      return createErrorResponse(new Error('获取可用年份失败'), requestId, 500);
    }

    // Extract unique years and sort descending (most recent first)
    const uniqueYears = [...new Set(data.map(d => d.year))]
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a));

    return NextResponse.json({
      success: true,
      data: {
        years: uniqueYears,
      },
    });
  } catch (error) {
    console.error(`[${requestId}] Unexpected error fetching years:`, error);
    return createErrorResponse(error, requestId, 500);
  }
}
