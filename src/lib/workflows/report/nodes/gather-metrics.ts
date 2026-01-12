/**
 * Gather Metrics Node
 *
 * Phase 2: Execute all financial metric tools in parallel.
 * v4.2: Collects 21+ metrics using Promise.all for performance.
 *
 * Implementation Note: When collecting sourceDocumentIds for metrics with
 * comparison years, ensure document IDs from BOTH the primary year AND
 * comparison year are pushed into the array for complete data lineage.
 */

import { toolRegistry, registerUnifiedTools } from '@/lib/tools';
import type { ReportWorkflowState, MetricResult } from '../state';
import {
  getAllMetricNames,
  getMetricDisplayName,
  formatMetricValue,
} from '../constants';

// ============================================================================
// Tool Registration (runs once per process)
// ============================================================================

let toolsRegistered = false;

function ensureToolsRegistered(): void {
  if (!toolsRegistered) {
    registerUnifiedTools();
    toolsRegistered = true;
  }
}

/**
 * Execute a single metric tool for a given year
 */
async function executeMetricTool(
  toolName: string,
  year: string,
  period: string = 'annual'
): Promise<MetricResult> {
  const displayName = getMetricDisplayName(toolName);

  try {
    const result = await toolRegistry.execute(toolName, { year, period });

    if (!result.success || !result.data) {
      return {
        toolName,
        displayName,
        value: 0,
        formatted: 'N/A',
        unit: '',
        error: result.error || '计算失败',
        sourceDocumentIds: [],
      };
    }

    // Extract data from tool result
    const data = result.data as {
      value: number;
      unit?: string;
      interpretation?: string;
      warnings?: string[];
      sourceDocuments?: Array<{ documentId: string }>;
    };

    const value = data.value;
    const formatted = formatMetricValue(toolName, value);
    const sourceDocumentIds = data.sourceDocuments?.map(d => d.documentId) || [];

    return {
      toolName,
      displayName,
      value,
      formatted,
      unit: data.unit || '',
      interpretation: data.interpretation,
      warnings: data.warnings,
      sourceDocumentIds,
    };
  } catch (error) {
    return {
      toolName,
      displayName,
      value: 0,
      formatted: 'N/A',
      unit: '',
      error: error instanceof Error ? error.message : '执行错误',
      sourceDocumentIds: [],
    };
  }
}

/**
 * Gather all metrics for a given year
 */
async function gatherMetricsForYear(
  year: string
): Promise<Record<string, MetricResult>> {
  const metricNames = getAllMetricNames();

  // Execute all metrics in parallel
  const results = await Promise.all(
    metricNames.map(name => executeMetricTool(name, year))
  );

  // Convert to Record
  const metricsRecord: Record<string, MetricResult> = {};
  for (const result of results) {
    metricsRecord[result.toolName] = result;
  }

  return metricsRecord;
}

/**
 * Gather metrics node - collects all financial metrics
 */
export async function gatherMetricsNode(
  state: ReportWorkflowState
): Promise<Partial<ReportWorkflowState>> {
  // Ensure tools are registered before execution
  ensureToolsRegistered();

  const { year, comparisonYear } = state.input;

  try {
    // Gather primary year metrics
    const primaryMetrics = await gatherMetricsForYear(year);

    // Gather comparison year metrics if available
    let comparisonMetrics: Record<string, MetricResult> = {};

    if (comparisonYear && state.dataAvailability.comparisonYearAvailable) {
      comparisonMetrics = await gatherMetricsForYear(comparisonYear);
    }

    // Count successful metrics
    const successCount = Object.values(primaryMetrics).filter(m => !m.error).length;
    const totalCount = Object.keys(primaryMetrics).length;

    // Determine status
    const hasErrors = successCount < totalCount;

    return {
      metricResults: {
        primary: primaryMetrics,
        comparison: comparisonMetrics,
        status: 'gathered',
        error: hasErrors
          ? `${totalCount - successCount}个指标计算失败`
          : undefined,
      },
      meta: {
        ...state.meta,
        currentPhase: 2,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return {
      metricResults: {
        ...state.metricResults,
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
