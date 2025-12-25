/**
 * Workflow State Type Definitions
 *
 * Base types for workflow state management.
 */

// ============================================================================
// Serialized Error Interface
// ============================================================================

/**
 * Serialized form of WorkflowError for state storage.
 * This interface matches the return type of WorkflowError.toJSON().
 *
 * For throwing/catching errors, use the class hierarchy in src/lib/errors/:
 * - ToolExecutionError, InsufficientDataError, LowConfidenceError, etc.
 *
 * For storing errors in workflow state, use this interface (via toWorkflowError()).
 */
export interface SerializedWorkflowError {
  code: string;
  message: string;
  recoverable: boolean;
  context: Record<string, unknown>;
}

// ============================================================================
// Workflow Metadata
// ============================================================================

export interface WorkflowMeta {
  startTime: number;
  endTime?: number;
  currentStep: string;
  errors: SerializedWorkflowError[];
  debugInfo?: Record<string, unknown>;
}

// ============================================================================
// Base Workflow State Template
// ============================================================================

/**
 * Base workflow state template that all specific workflow states extend.
 * This pattern ensures:
 * - Consistent state structure across all workflows
 * - Type safety for workflow orchestration
 * - Easy migration to LangGraph StateGraph
 */
export interface WorkflowState {
  input: unknown;
  output: unknown;
  meta: WorkflowMeta;
  [stepName: string]: unknown;
}
