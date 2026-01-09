/**
 * Report Workflow Module
 *
 * v4.2: Independent LangGraph workflow for financial analysis reports.
 *
 * Exports:
 * - reportWorkflowGraph: Compiled LangGraph workflow
 * - State types and utilities
 * - Constants for sections and metrics
 */

// Main graph
export { reportWorkflowGraph } from './graph';

// State types
export type {
  ReportWorkflowState,
  ReportWorkflowInput,
  MetricResult,
  DataAvailabilityState,
  MetricResultsState,
  ContextDocumentsState,
  ReportSectionData,
  ReportWorkflowMeta,
} from './state';

export { createInitialState } from './state';

// Constants
export {
  REPORT_SECTIONS,
  TOTAL_METRICS_COUNT,
  METRIC_DISPLAY_NAMES,
  METRIC_UNITS,
  getAllMetricNames,
  getSectionById,
  getSectionByMetric,
  getMetricDisplayName,
  formatMetricValue,
  calculateChange,
} from './constants';

export type { SectionConfig } from './constants';

// Edge utilities
export { shouldProceed, hasError, getCurrentPhaseName } from './edges';
