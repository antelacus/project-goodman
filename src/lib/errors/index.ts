/**
 * Workflow Errors Module
 *
 * Centralized exports for workflow error handling.
 */

// Error codes
export { WorkflowErrorCode } from "./base";
export type { WorkflowErrorCode as WorkflowErrorCodeType } from "./base";

// Workflow error types
export { WorkflowErrorType, WORKFLOW_ERROR_MESSAGES } from "./workflow-error-types";
export type { WorkflowErrorType as WorkflowErrorTypeType } from "./workflow-error-types";

// Context types
export type {
  BaseErrorContext,
  ToolErrorContext,
  DataErrorContext,
  ConfidenceErrorContext,
} from "./base";

// Base class
export { WorkflowError } from "./base";

// Tool errors
export {
  ToolExecutionError,
  ToolNotFoundError,
  ToolValidationError,
} from "./base";

// Data errors
export { InsufficientDataError, DataQueryError } from "./base";

// Confidence errors
export { LowConfidenceError, NoMatchFoundError } from "./base";

// Workflow errors
export {
  WorkflowStepError,
  WorkflowTimeoutError,
  InvalidStateError,
} from "./base";

// External service errors
export { LLMError, DatabaseError, StorageError } from "./base";

// Utilities
export { toWorkflowError, isRecoverableError } from "./base";
