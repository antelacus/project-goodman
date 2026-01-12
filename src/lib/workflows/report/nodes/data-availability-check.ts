/**
 * Check Data Availability Node
 *
 * Phase 1: Verify financial data exists for the requested year(s).
 * v4.2: Queries financial_data table to check data availability.
 */

import { createServerSupabaseClient } from '@/lib/database/supabase';
import type { ReportWorkflowState } from '../state';

/**
 * Check if financial data is available for the requested years
 */
export async function checkDataAvailabilityNode(
  state: ReportWorkflowState
): Promise<Partial<ReportWorkflowState>> {
  const { year, comparisonYear } = state.input;

  try {
    // Query distinct years with data
    const { data: yearsData, error: yearsError } = await createServerSupabaseClient()
      .from('financial_data')
      .select('year')
      .order('year', { ascending: false });

    if (yearsError) {
      return {
        dataAvailability: {
          ...state.dataAvailability,
          status: 'error',
          error: `数据库查询失败: ${yearsError.message}`,
        },
        meta: {
          ...state.meta,
          error: new Error(yearsError.message),
        },
      };
    }

    // Get unique years
    const availableYears = [...new Set(yearsData?.map(d => d.year) || [])];

    // Check primary year
    const primaryYearAvailable = availableYears.includes(year);

    // Check comparison year if specified
    let comparisonYearAvailable = false;
    let partialComparison = false;

    if (comparisonYear) {
      comparisonYearAvailable = availableYears.includes(comparisonYear);

      // Check if comparison year has partial data
      if (comparisonYearAvailable) {
        const { count: primaryCount } = await createServerSupabaseClient()
          .from('financial_data')
          .select('*', { count: 'exact', head: true })
          .eq('year', year);

        const { count: comparisonCount } = await createServerSupabaseClient()
          .from('financial_data')
          .select('*', { count: 'exact', head: true })
          .eq('year', comparisonYear);

        // If comparison year has significantly less data, mark as partial
        if (comparisonCount && primaryCount && comparisonCount < primaryCount * 0.8) {
          partialComparison = true;
        }
      }
    }

    // Return updated state
    return {
      dataAvailability: {
        primaryYearAvailable,
        comparisonYearAvailable,
        partialComparison,
        availableYears,
        status: 'checked',
        error: !primaryYearAvailable
          ? `未找到${year}年度的财务数据`
          : undefined,
      },
      meta: {
        ...state.meta,
        currentPhase: primaryYearAvailable ? 2 : 1,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return {
      dataAvailability: {
        ...state.dataAvailability,
        status: 'error',
        error: errorMessage,
      },
      meta: {
        ...state.meta,
        error: error instanceof Error ? error : new Error(errorMessage),
      },
    };
  }
}
