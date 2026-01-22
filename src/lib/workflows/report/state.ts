/**
 * Report Workflow State
 *
 * State definition for the report generation workflow.
 * v4.2: Independent LangGraph workflow for financial analysis reports.
 */

import type {
  ReportContent,
  ReportSection,
  ReportSourceReference,
} from '@/types/report';

// ============================================================================
// Metric Result Types
// ============================================================================

/**
 * Result from executing a single financial metric tool
 */
export interface MetricResult {
  toolName: string;
  displayName: string;
  value: number;
  formatted: string;
  unit: string;
  interpretation?: string;
  warnings?: string[];
  sourceDocumentIds: string[];
  error?: string;
}

// ============================================================================
// State Component Interfaces
// ============================================================================

/**
 * Workflow input parameters
 */
export interface ReportWorkflowInput {
  year: string;
  comparisonYear?: string;
  ownerId: string;
  ownerType: 'admin' | 'user' | 'guest';
}

/**
 * Data availability check results
 */
export interface DataAvailabilityState {
  primaryYearAvailable: boolean;
  comparisonYearAvailable: boolean;
  partialComparison: boolean;
  availableYears: string[];
  status: 'pending' | 'checking' | 'checked' | 'error';
  error?: string;
}

/**
 * Metric collection results
 * Note: Using Record instead of Map for JSON serialization compatibility
 * (LangGraph checkpoints serialize state to JSON)
 */
export interface MetricResultsState {
  primary: Record<string, MetricResult>;
  comparison: Record<string, MetricResult>;
  status: 'pending' | 'gathering' | 'gathered' | 'error';
  error?: string;
}

/**
 * Context documents for LLM analysis
 */
export interface ContextDocumentsState {
  companyInfo?: string;
  companyProfile?: string;
  financialPolicy?: string;
  regulations?: string[];
  accountingStandards?: string[];
  sourceDocuments: ReportSourceReference[];
}

/**
 * Section analysis data (intermediate state before final assembly)
 */
export interface ReportSectionData {
  id: string;
  title: string;
  metrics: string[];  // Tool names for this section
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  result?: ReportSection;
  error?: string;
}

/**
 * Workflow metadata
 */
export interface ReportWorkflowMeta {
  startTime: number;
  currentPhase: 1 | 2 | 3 | 4;
  error?: Error;
  generationTimeMs?: number;
}

// ============================================================================
// Main State Interface
// ============================================================================

/**
 * Complete report workflow state
 */
export interface ReportWorkflowState {
  // Input parameters
  input: ReportWorkflowInput;

  // Phase 1: Data availability check
  dataAvailability: DataAvailabilityState;

  // Phase 2: Metric collection
  metricResults: MetricResultsState;

  // Phase 2b: Context documents
  contextDocuments: ContextDocumentsState;

  // Phase 3: Section analysis
  sections: ReportSectionData[];

  // Phase 4: Final report
  report?: ReportContent;

  // Metadata
  meta: ReportWorkflowMeta;
}

// ============================================================================
// State Defaults
// ============================================================================

/**
 * Create initial state with defaults
 */
export function createInitialState(
  input: ReportWorkflowInput
): ReportWorkflowState {
  return {
    input,
    dataAvailability: {
      primaryYearAvailable: false,
      comparisonYearAvailable: false,
      partialComparison: false,
      availableYears: [],
      status: 'pending',
    },
    metricResults: {
      primary: {},
      comparison: {},
      status: 'pending',
    },
    contextDocuments: {
      sourceDocuments: [],
    },
    sections: [],
    meta: {
      startTime: Date.now(),
      currentPhase: 1,
    },
  };
}
