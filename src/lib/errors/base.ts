/**
 * Workflow Error Type Hierarchy
 *
 * Structured error types for workflow error handling.
 * Errors bubble to workflow orchestrator for conditional routing.
 * Designed for LangGraph conditional edge compatibility.
 */

// ============================================================================
// Error Codes
// ============================================================================

export const WorkflowErrorCode = {
  // Tool errors
  TOOL_EXECUTION_ERROR: "TOOL_EXECUTION_ERROR",
  TOOL_NOT_FOUND: "TOOL_NOT_FOUND",
  TOOL_VALIDATION_ERROR: "TOOL_VALIDATION_ERROR",

  // Data errors
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
  DATA_QUERY_ERROR: "DATA_QUERY_ERROR",
  DATA_VALIDATION_ERROR: "DATA_VALIDATION_ERROR",

  // Confidence errors
  LOW_CONFIDENCE: "LOW_CONFIDENCE",
  NO_MATCH_FOUND: "NO_MATCH_FOUND",

  // General workflow errors
  WORKFLOW_TIMEOUT: "WORKFLOW_TIMEOUT",
  WORKFLOW_STEP_ERROR: "WORKFLOW_STEP_ERROR",
  INVALID_STATE: "INVALID_STATE",

  // External service errors
  LLM_ERROR: "LLM_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  STORAGE_ERROR: "STORAGE_ERROR",
} as const;

export type WorkflowErrorCode =
  (typeof WorkflowErrorCode)[keyof typeof WorkflowErrorCode];

// ============================================================================
// Error Context Types
// ============================================================================

export interface BaseErrorContext {
  step?: string;
  timestamp?: number;
  [key: string]: unknown;
}

export interface ToolErrorContext extends BaseErrorContext {
  toolName: string;
  input?: unknown;
  originalError?: string;
}

export interface DataErrorContext extends BaseErrorContext {
  missingMetrics?: string[];
  availableMetrics?: string[];
  query?: string;
}

export interface ConfidenceErrorContext extends BaseErrorContext {
  score: number;
  threshold: number;
  factors?: Record<string, number>;
}

// ============================================================================
// Base Workflow Error Class
// ============================================================================

/**
 * Abstract base class for all workflow errors.
 * Extends Error with structured properties for error handling.
 */
export abstract class WorkflowError extends Error {
  abstract readonly code: WorkflowErrorCode;
  abstract readonly recoverable: boolean;
  readonly context: BaseErrorContext;
  readonly timestamp: number;

  constructor(message: string, context: BaseErrorContext = {}) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = Date.now();
    this.context = {
      ...context,
      timestamp: this.timestamp,
    };

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serialize error for API response or logging
   */
  toJSON(): {
    code: string;
    message: string;
    recoverable: boolean;
    context: BaseErrorContext;
  } {
    return {
      code: this.code,
      message: this.message,
      recoverable: this.recoverable,
      context: this.context,
    };
  }

  /**
   * Check if error is of a specific type
   */
  static isWorkflowError(error: unknown): error is WorkflowError {
    return error instanceof WorkflowError;
  }
}

// ============================================================================
// Tool Errors
// ============================================================================

/**
 * Error during tool execution.
 * Recoverable: can try alternative tool or fallback strategy.
 */
export class ToolExecutionError extends WorkflowError {
  readonly code = WorkflowErrorCode.TOOL_EXECUTION_ERROR;
  readonly recoverable = true;
  override readonly context: ToolErrorContext;

  constructor(
    toolName: string,
    message: string,
    context: Partial<ToolErrorContext> = {}
  ) {
    super(`Tool '${toolName}' execution failed: ${message}`, {
      ...context,
      toolName,
    });
    this.context = {
      ...context,
      toolName,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Tool not found in registry.
 * Recoverable: can use fallback tool or direct query.
 */
export class ToolNotFoundError extends WorkflowError {
  readonly code = WorkflowErrorCode.TOOL_NOT_FOUND;
  readonly recoverable = true;
  override readonly context: ToolErrorContext;

  constructor(toolName: string, context: Partial<ToolErrorContext> = {}) {
    super(`Tool '${toolName}' not found in registry`, {
      ...context,
      toolName,
    });
    this.context = {
      ...context,
      toolName,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Tool input validation failed.
 * Recoverable: can request corrected input.
 */
export class ToolValidationError extends WorkflowError {
  readonly code = WorkflowErrorCode.TOOL_VALIDATION_ERROR;
  readonly recoverable = true;
  override readonly context: ToolErrorContext;

  constructor(
    toolName: string,
    message: string,
    context: Partial<ToolErrorContext> = {}
  ) {
    super(`Tool '${toolName}' validation failed: ${message}`, {
      ...context,
      toolName,
    });
    this.context = {
      ...context,
      toolName,
      timestamp: this.timestamp,
    };
  }
}

// ============================================================================
// Data Errors
// ============================================================================

/**
 * Required data not available.
 * Recoverable: can try alternative data sources or inform user.
 */
export class InsufficientDataError extends WorkflowError {
  readonly code = WorkflowErrorCode.INSUFFICIENT_DATA;
  readonly recoverable = true;
  override readonly context: DataErrorContext;

  constructor(
    missingMetrics: string[],
    context: Partial<DataErrorContext> = {}
  ) {
    const metricsList = missingMetrics.join(", ");
    super(`Insufficient data: missing metrics [${metricsList}]`, {
      ...context,
      missingMetrics,
    });
    this.context = {
      ...context,
      missingMetrics,
      timestamp: this.timestamp,
    };
  }

  getMissingMetrics(): string[] {
    return this.context.missingMetrics || [];
  }
}

/**
 * Data query failed.
 * Recoverable: can retry or use cached data.
 */
export class DataQueryError extends WorkflowError {
  readonly code = WorkflowErrorCode.DATA_QUERY_ERROR;
  readonly recoverable = true;
  override readonly context: DataErrorContext;

  constructor(message: string, context: Partial<DataErrorContext> = {}) {
    super(`Data query failed: ${message}`, context);
    this.context = {
      ...context,
      timestamp: this.timestamp,
    };
  }
}

// ============================================================================
// Confidence Errors
// ============================================================================

/**
 * Confidence score below threshold.
 * Recoverable: can request user confirmation or refine query.
 */
export class LowConfidenceError extends WorkflowError {
  readonly code = WorkflowErrorCode.LOW_CONFIDENCE;
  readonly recoverable = true;
  override readonly context: ConfidenceErrorContext;

  constructor(
    score: number,
    threshold: number,
    context: Partial<ConfidenceErrorContext> = {}
  ) {
    super(
      `Confidence score ${(score * 100).toFixed(1)}% below threshold ${(threshold * 100).toFixed(1)}%`,
      { ...context, score, threshold }
    );
    this.context = {
      ...context,
      score,
      threshold,
      timestamp: this.timestamp,
    };
  }

  getScore(): number {
    return this.context.score;
  }

  getThreshold(): number {
    return this.context.threshold;
  }
}

/**
 * No matching function or data found.
 * Recoverable: can use general response or ask for clarification.
 */
export class NoMatchFoundError extends WorkflowError {
  readonly code = WorkflowErrorCode.NO_MATCH_FOUND;
  readonly recoverable = true;

  constructor(message: string, context: BaseErrorContext = {}) {
    super(`No match found: ${message}`, context);
  }
}

// ============================================================================
// Workflow Errors
// ============================================================================

/**
 * Workflow step execution failed.
 * Recoverability depends on the step.
 */
export class WorkflowStepError extends WorkflowError {
  readonly code = WorkflowErrorCode.WORKFLOW_STEP_ERROR;
  readonly recoverable: boolean;

  constructor(
    stepName: string,
    message: string,
    recoverable: boolean = false,
    context: BaseErrorContext = {}
  ) {
    super(`Step '${stepName}' failed: ${message}`, { ...context, step: stepName });
    this.recoverable = recoverable;
  }
}

/**
 * Workflow timed out.
 * Generally not recoverable without user intervention.
 */
export class WorkflowTimeoutError extends WorkflowError {
  readonly code = WorkflowErrorCode.WORKFLOW_TIMEOUT;
  readonly recoverable = false;

  constructor(
    timeoutMs: number,
    stepName?: string,
    context: BaseErrorContext = {}
  ) {
    const stepInfo = stepName ? ` at step '${stepName}'` : "";
    super(`Workflow timed out after ${timeoutMs}ms${stepInfo}`, {
      ...context,
      step: stepName,
    });
  }
}

/**
 * Invalid workflow state.
 * Not recoverable: indicates a bug in workflow logic.
 */
export class InvalidStateError extends WorkflowError {
  readonly code = WorkflowErrorCode.INVALID_STATE;
  readonly recoverable = false;

  constructor(message: string, context: BaseErrorContext = {}) {
    super(`Invalid workflow state: ${message}`, context);
  }
}

// ============================================================================
// External Service Errors
// ============================================================================

/**
 * LLM API call failed.
 * Recoverable: can retry with backoff.
 */
export class LLMError extends WorkflowError {
  readonly code = WorkflowErrorCode.LLM_ERROR;
  readonly recoverable = true;

  constructor(message: string, context: BaseErrorContext = {}) {
    super(`LLM error: ${message}`, context);
  }
}

/**
 * Database operation failed.
 * Recoverable: can retry or use cached data.
 */
export class DatabaseError extends WorkflowError {
  readonly code = WorkflowErrorCode.DATABASE_ERROR;
  readonly recoverable = true;

  constructor(message: string, context: BaseErrorContext = {}) {
    super(`Database error: ${message}`, context);
  }
}

/**
 * Storage operation failed.
 * Recoverable: can retry.
 */
export class StorageError extends WorkflowError {
  readonly code = WorkflowErrorCode.STORAGE_ERROR;
  readonly recoverable = true;

  constructor(message: string, context: BaseErrorContext = {}) {
    super(`Storage error: ${message}`, context);
  }
}

// ============================================================================
// Error Utilities
// ============================================================================

/**
 * Convert any error to WorkflowError format for consistent API responses
 */
export function toWorkflowError(
  error: unknown,
  defaultCode: WorkflowErrorCode = WorkflowErrorCode.WORKFLOW_STEP_ERROR
): { code: string; message: string; recoverable: boolean; context: BaseErrorContext } {
  if (WorkflowError.isWorkflowError(error)) {
    return error.toJSON();
  }

  const message = error instanceof Error ? error.message : String(error);
  return {
    code: defaultCode,
    message,
    recoverable: false,
    context: { timestamp: Date.now() },
  };
}

/**
 * Check if an error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  if (WorkflowError.isWorkflowError(error)) {
    return error.recoverable;
  }
  return false;
}
