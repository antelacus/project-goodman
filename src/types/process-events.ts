/**
 * Process event types for AI Agent transparency
 * v4.0: Process transparency feature
 *
 * These types define the structure of events emitted by the agent workflow
 * to show users what the agent is doing (thinking, tool calls, data fetches, etc.)
 */

/**
 * Types of process events the agent can emit
 */
export type ProcessEventType =
  | 'thinking'      // Agent thinking/reasoning
  | 'tool_call'     // Tool invocation started
  | 'tool_result'   // Tool returned result
  | 'data_fetch'    // Data retrieved (with source)
  | 'calculation'   // Calculation step
  | 'error';        // Error occurred

/**
 * Reference to the source document for data traceability
 */
export interface SourceReference {
  documentId: string;
  documentName: string;
  documentType: string;
  year?: string;
  period?: string;
  fileUrl?: string;
}

/**
 * A single process event emitted by the agent workflow
 */
export interface ProcessEvent {
  id: string;                         // UUID v4 for React key
  timestamp: number;                  // Unix timestamp (ms)
  type: ProcessEventType;
  content: string;                    // Human-friendly description (Chinese)
  details?: Record<string, unknown>;  // Raw technical info (for advanced users)
  sourceReference?: SourceReference;  // Data source (if applicable)
}

/**
 * SSE event payload for process events
 */
export interface SSEProcessEventPayload {
  type: 'process';
  data: ProcessEvent;
}
