import { describe, it, expect } from 'vitest';
import {
  WorkflowError,
  WorkflowErrorCode,
  ToolExecutionError,
  ToolNotFoundError,
  ToolValidationError,
  InsufficientDataError,
  DataQueryError,
  LowConfidenceError,
  NoMatchFoundError,
  WorkflowTimeoutError,
  WorkflowStepError,
  InvalidStateError,
  LLMError,
  DatabaseError,
  StorageError,
  toWorkflowError,
  isRecoverableError,
} from '@/lib/errors/base';

describe('workflow error hierarchy', () => {
  it('serializes workflow errors with context and recoverability', () => {
    const error = new ToolExecutionError('calc', 'failed', { input: { year: '2024' } });

    expect(WorkflowError.isWorkflowError(error)).toBe(true);
    expect(error.code).toBe(WorkflowErrorCode.TOOL_EXECUTION_ERROR);
    expect(error.recoverable).toBe(true);
    expect(error.context.toolName).toBe('calc');
    expect(typeof error.context.timestamp).toBe('number');

    const json = error.toJSON();
    expect(json.code).toBe(WorkflowErrorCode.TOOL_EXECUTION_ERROR);
    expect(json.message).toContain("Tool 'calc' execution failed");
    expect(json.recoverable).toBe(true);
    expect(json.context.toolName).toBe('calc');
  });

  it('exposes helper getters on data and confidence errors', () => {
    const dataError = new InsufficientDataError(['metric_a', 'metric_b']);
    expect(dataError.getMissingMetrics()).toEqual(['metric_a', 'metric_b']);

    const confidenceError = new LowConfidenceError(0.4, 0.9);
    expect(confidenceError.getScore()).toBe(0.4);
    expect(confidenceError.getThreshold()).toBe(0.9);
  });

  it('formats workflow timeout errors with optional step names', () => {
    const withStep = new WorkflowTimeoutError(1200, 'ingest');
    const withoutStep = new WorkflowTimeoutError(800);

    expect(withStep.message).toContain("step 'ingest'");
    expect(withoutStep.message).not.toContain("step '");
  });

  it('marks recoverability correctly across error types', () => {
    expect(isRecoverableError(new ToolNotFoundError('missing'))).toBe(true);
    expect(isRecoverableError(new InvalidStateError('bad state'))).toBe(false);
    expect(isRecoverableError(new Error('plain error'))).toBe(false);
  });

  it('converts non-workflow errors into default workflow format', () => {
    const workflowError = new NoMatchFoundError('no tools');
    const workflowJson = toWorkflowError(workflowError);
    expect(workflowJson.code).toBe(WorkflowErrorCode.NO_MATCH_FOUND);
    expect(workflowJson.recoverable).toBe(true);

    const fallback = toWorkflowError('boom');
    expect(fallback.code).toBe(WorkflowErrorCode.WORKFLOW_STEP_ERROR);
    expect(fallback.message).toBe('boom');
    expect(fallback.recoverable).toBe(false);
    expect(typeof fallback.context.timestamp).toBe('number');
  });

  it('builds messages for tool, data, workflow, and external errors', () => {
    expect(new ToolNotFoundError('tool-x').message).toContain('tool-x');
    expect(new ToolValidationError('tool-y', 'invalid').message).toContain('invalid');
    expect(new DataQueryError('timeout').message).toContain('timeout');
    expect(new WorkflowStepError('route', 'oops', true).recoverable).toBe(true);
    expect(new WorkflowStepError('route', 'oops').recoverable).toBe(false);
    expect(new LLMError('down').message).toContain('LLM');
    expect(new DatabaseError('down').message).toContain('Database');
    expect(new StorageError('down').message).toContain('Storage');
  });
});
