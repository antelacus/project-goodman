/**
 * Logging Module
 *
 * Structured logging utilities for production observability:
 * - logger: Singleton logger instance with log levels
 * - logRequest: HTTP request logging helper
 * - logError: Error logging helper with context
 */

export {
  logger,
  logRequest,
  logWorkflowEvent,
  logError,
  type LogContext,
  type WorkflowLogContext,
  type WorkflowStep,
  type WorkflowStatus,
} from './logger';
