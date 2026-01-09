/**
 * Report Workflow Edges
 *
 * Conditional edge functions for routing in the report workflow graph.
 * v4.2: Handles data availability checks and error routing.
 */

import type { ReportWorkflowState } from './state';

/**
 * Determine if workflow should proceed after data availability check
 *
 * Returns:
 * - 'proceed': Continue to gather metrics
 * - 'error': Stop workflow, data not available
 */
export function shouldProceed(
  state: ReportWorkflowState
): 'proceed' | 'error' {
  const { dataAvailability } = state;

  // If there's an error or primary year data not available, stop
  if (dataAvailability.status === 'error' || !dataAvailability.primaryYearAvailable) {
    return 'error';
  }

  return 'proceed';
}

/**
 * Check if workflow has encountered an error
 */
export function hasError(state: ReportWorkflowState): boolean {
  return (
    state.dataAvailability.status === 'error' ||
    state.metricResults.status === 'error' ||
    state.meta.error !== undefined
  );
}

/**
 * Get current phase name for logging/events
 */
export function getCurrentPhaseName(state: ReportWorkflowState): string {
  switch (state.meta.currentPhase) {
    case 1:
      return 'check';
    case 2:
      return 'gather';
    case 3:
      return 'analyze';
    case 4:
      return 'generate';
    default:
      return 'unknown';
  }
}
