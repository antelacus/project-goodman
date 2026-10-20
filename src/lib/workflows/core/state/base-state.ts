/**
 * Base State Definitions for Unified Workflows
 *
 * Defines the common state structure used across the unified agent system.
 * This ensures consistency in how state is passed between nodes.
 */

import { BaseMessage } from "@langchain/core/messages";
import { ToolExecutionResult } from "@/lib/tools/types";
import type { Evidence } from "@/lib/citations";

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
    /** Optional specific document context (UUIDs) */
    documentIds?: string[];
    /** Optional workflow type override */
    workflowType?: string;
    /** Owner ID for session ownership (auth sessionId or userId) */
    ownerId?: string;
    /** Owner type for session ownership */
    ownerType?: 'admin' | 'user' | 'guest';
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
    /** Source documents or references */
    sources?: Array<{
        id?: string;
        name?: string;
        type?: string;
    }>;
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
    /** Searches run for this question; the budget is SEARCH_BUDGET (REQ §5.3). */
    search: SearchStats;
    /** Regulation search results numbered R1…Rn across this question's rounds. */
    evidence: Evidence[];
    /** A search request went over budget: the next turn answers with no tools. */
    mustAnswer: boolean;
    /** Evidence the final answer cites, for the response's sources. */
    cited: Evidence[];
}

export interface SearchStats {
    /** Searches executed (requests over budget are not counted). */
    used: number;
    /** Executed searches that errored. */
    failed: number;
    regulationSearched: boolean;
}

export function newQuestionState(): Pick<AgentRuntimeState, "search" | "evidence" | "mustAnswer" | "cited"> {
    return { search: { used: 0, failed: 0, regulationSearched: false }, evidence: [], mustAnswer: false, cited: [] };
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

/**
 * Document Load Error Entry
 * Records errors encountered when loading document context
 */
export interface DocumentLoadError {
    /** Document ID that failed to load (null for general errors) */
    documentId: string | null;
    error: string;
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
    /** Errors encountered while loading document context */
    documentLoadErrors?: DocumentLoadError[];
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
