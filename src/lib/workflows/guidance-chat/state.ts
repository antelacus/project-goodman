import { Annotation } from "@langchain/langgraph";
import type { GuidanceChatState, WorkflowMeta } from "@/lib/types/workflow-states";

export const GuidanceChatAnnotation = Annotation.Root({
    // Input: Keep latest
    input: Annotation<{
        question: string;
        uploadedDocument?: any;
        documentIds?: string[];
        regulationCategories?: string[];
        autoSelect?: { enabled: boolean; maxDocuments?: number };
    }>({
        reducer: (prev, next) => next ?? prev,
        default: () => ({ question: "" }),
    }),

    // Session ID
    sessionId: Annotation<string | undefined>({
        reducer: (prev, next) => next ?? prev,
        default: () => undefined,
    }),

    // Agent State
    agent: Annotation<{
        messages: any[]; // Define proper type if possible, or use any[]
        currentIteration: number;
        maxIterations: number;
        isComplete: boolean;
        pendingToolCalls: any[];
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

    // Doc Selection: Keep latest (Phase C integration)
    documentSelection: Annotation<{ selectedDocuments: any[]; totalTokens: number } | undefined>({
        reducer: (prev, next) => next ?? prev,
        default: () => undefined,
    }),

    // Search results: Merge
    search: Annotation<{
        keywords: string[];
        vectorResults: any[];
        keywordResults: any[];
        combinedResults: any[];
        businessContext?: string;
        error?: { code: string; message: string };
    }>({
        reducer: (prev, next) => ({ ...prev, ...next }),
        default: () => ({
            keywords: [],
            vectorResults: [],
            keywordResults: [],
            combinedResults: [],
        }),
    }),

    // Reasoning & Guidance: Merge
    reasoning: Annotation<{
        guidanceText: string;
        citations: any[];
        toolCalls?: any[];
        error?: { code: string; message: string };
    }>({
        reducer: (prev, next) => ({ ...prev, ...next }),
        default: () => ({
            guidanceText: "",
            citations: [],
        }),
    }),

    // Tool Execution (Calculations): Merge (Optional)
    toolExecution: Annotation<{
        calculations: any[];
    } | undefined>({
        reducer: (prev, next) => (next ? { ...prev, ...next } : prev),
        default: () => undefined,
    }),

    // Related Articles: Merge
    relatedArticles: Annotation<{
        articles: any[];
    }>({
        reducer: (prev, next) => ({ ...prev, ...next }),
        default: () => ({
            articles: [],
        }),
    }),

    // Confidence: Merge
    confidence: Annotation<{
        score: number;
        factors: any[];
        threshold: number;
        passed: boolean;
        reason?: string;
    }>({
        reducer: (prev, next) => ({ ...prev, ...next }),
        default: () => ({
            score: 0,
            factors: [],
            threshold: 0.6,
            passed: false,
        }),
    }),

    // Output: Keep latest
    output: Annotation<{
        type: string;
        guidance?: string;
        citations: any[];
        confidence: number;
        relatedArticles?: any[];
        warnings?: string[];
        calculations?: any[];
        documentSelection?: any;
    }>({
        reducer: (prev, next) => next ?? prev,
        default: () => ({
            type: "not_found",
            citations: [],
            confidence: 0,
        }),
    }),

    // Meta: Merge errors
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

export type GuidanceChatGraphState = typeof GuidanceChatAnnotation.State;
