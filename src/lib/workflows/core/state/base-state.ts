/**
 * Base State Definitions for Unified Workflows
 *
 * Defines the common state structure used across the unified agent system.
 * This ensures consistency in how state is passed between nodes.
 */

import { BaseMessage } from "@langchain/core/messages";
import { ToolExecutionResult } from "@/lib/tools/types";

// ============================================================================
// Core State Interfaces
// ============================================================================

/**
 * Standard input for all workflows
 */
export interface WorkflowInput {
    /** User's question or command */
    question: string;
    /** Session ID for conversation history */
    sessionId?: string;
    /** Optional file uploads */
    files?: Array<{
        url: string;
        name: string;
        type: string;
    }>;
    /** Optional specific document context */
    documentIds?: number[];
    /** Optional workflow type override */
    workflowType?: string;
}

/**
 * Standard output structure
 */
export interface WorkflowOutput {
    /** Response type classification */
    type: 'success' | 'error' | 'need_clarification';
    /** The main text response */
    answer: string;
    /** Optional structured data (can be extended by specific workflows) */
    data?: Record<string, unknown>;
    /** Confidence score (0-1) */
    confidence?: number;
}

/**
 * Internal Agent State
 * Tracks the execution progress within the graph
 */
export interface AgentRuntimeState {
    /** Current session ID */
    sessionId: string;
    /** Conversation history (OpenAI format or LangChain BaseMessage) */
    messages: BaseMessage[];
    /** Current iteration count for loop control */
    currentIteration: number;
    /** Max allowed iterations */
    maxIterations: number;
    /** Count of messages initially loaded from DB */
    initialMessageCount: number;
    /** Flag to indicate if the agent has decided it's done */
    isComplete: boolean;
    /** Pending tool calls waiting for execution */
    pendingToolCalls: Array<{
        id: string;
        name: string;
        arguments: Record<string, unknown>;
    }>;
}

/**
 * Tool Result Entry
 * Stores the result of a single tool execution
 */
export interface ToolResultEntry {
    toolCallId: string;
    toolName: string;
    result: ToolExecutionResult;
    timestamp: number;
}

// ============================================================================
// Unified State Interface
// ============================================================================

/**
 * The complete state object passed through the LangGraph
 */
export interface BaseAgentState {
    /** Initial input */
    input: WorkflowInput;
    /** Dynamic runtime state */
    agent: AgentRuntimeState;
    /** Log of tool execution results */
    toolResults: ToolResultEntry[];
    /** Final output construction */
    output?: WorkflowOutput;
    /** System metadata (errors, logs, etc.) */
    meta?: {
        error?: Error;
        usage?: {
            promptTokens: number;
            completionTokens: number;
            totalTokens: number;
        };
    };
}
