import { Annotation } from "@langchain/langgraph";
import type { WorkflowMeta } from "@/lib/types/workflow-states";

export interface AgentMessage {
    id?: string;
    role: "user" | "assistant" | "tool" | "system";
    content: string;
    tool_calls?: Array<{
        id: string;
        type: string;
        function: { name: string; arguments: string };
    }>;
    tool_call_id?: string;
    created_at?: string;
}

export interface ToolCall {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
}

export interface ToolResult {
    toolCallId: string;
    toolName: string;
    success: boolean;
    data?: unknown;
    error?: string;
}

export const FinancialAgentAnnotation = Annotation.Root({
    // Input
    input: Annotation<{
        question: string;
        sessionId?: string;
        year?: string;
        period?: string;
        documentIds?: string[];
    }>({
        reducer: (prev, next) => next ?? prev,
        default: () => ({ question: "" }),
    }),

    // Agent State
    agent: Annotation<{
        sessionId?: string;
        messages: AgentMessage[];
        currentIteration: number;
        maxIterations: number;
        isComplete: boolean;
        pendingToolCalls: ToolCall[];
    }>({
        reducer: (prev, next) => ({ ...prev, ...next }),
        default: () => ({
            messages: [],
            currentIteration: 0,
            maxIterations: 5,
            isComplete: false,
            pendingToolCalls: [],
        }),
    }),

    // Tool Execution Results
    toolResults: Annotation<ToolResult[]>({
        reducer: (prev, next) => [...(prev ?? []), ...(next ?? [])],
        default: () => [],
    }),

    // Output
    output: Annotation<{
        type: "success" | "partial" | "error" | "no_data";
        answer: string;
        sessionId: string;
        calculations?: Array<{
            name: string;
            result: { value: number; formatted: string; unit: string };
            formula: string;
        }>;
        confidence: number;
        sourceDocuments: Array<{ id: string; name: string }>;
        iterationCount: number;
    }>({
        reducer: (prev, next) => next ?? prev,
        default: () => ({
            type: "error",
            answer: "",
            sessionId: "",
            confidence: 0,
            sourceDocuments: [],
            iterationCount: 0,
        }),
    }),

    // Metadata
    meta: Annotation<WorkflowMeta>({
        reducer: (prev, next) => ({
            ...prev,
            ...next,
            errors: [...(prev?.errors ?? []), ...(next?.errors ?? [])],
        }),
        default: () => ({
            startTime: Date.now(),
            currentStep: "init",
            errors: [],
        }),
    }),
});

export type FinancialAgentGraphState = typeof FinancialAgentAnnotation.State;
