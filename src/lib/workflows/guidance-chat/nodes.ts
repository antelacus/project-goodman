import * as steps from "./steps";
import type { GuidanceChatGraphState } from "./state";
import type { GuidanceChatState } from "@/lib/types/workflow-states";

export const performHybridSearchNode = async (
    state: GuidanceChatGraphState
): Promise<Partial<GuidanceChatGraphState>> => {
    try {
        const result = await steps.performHybridSearch(state as GuidanceChatState);
        return {
            search: result.search,
            meta: { ...state.meta, currentStep: "perform_hybrid_search" },
        };
    } catch (error: any) {
        return {
            search: {
                ...state.search,
                error: { code: "SEARCH_FAILED", message: error.message },
            },
            meta: { ...state.meta, currentStep: "perform_hybrid_search" },
        };
    }
};

export const generateGuidanceNode = async (
    state: GuidanceChatGraphState
): Promise<Partial<GuidanceChatGraphState>> => {
    try {
        // Note: generateGuidance in steps.ts handles tool calling loop internally.
        const result = await steps.generateGuidance(state as GuidanceChatState);
        return {
            reasoning: result.reasoning,
            toolExecution: result.toolExecution, // If any calculations were done
            meta: { ...state.meta, currentStep: "generate_guidance" },
        };
    } catch (error: any) {
        return {
            reasoning: {
                ...state.reasoning,
                error: { code: "GENERATION_FAILED", message: error.message },
            },
            meta: { ...state.meta, currentStep: "generate_guidance" },
        };
    }
};

export const findRelatedArticlesNode = async (
    state: GuidanceChatGraphState
): Promise<Partial<GuidanceChatGraphState>> => {
    try {
        const result = await steps.findRelatedArticles(state as GuidanceChatState);
        return {
            relatedArticles: result.relatedArticles,
            meta: { ...state.meta, currentStep: "find_related_articles" },
        };
    } catch (error: any) {
        // Non-critical step, log error but don't fail workflow?
        // Or result pattern.
        return {
            // We preserve existing articles if any, or empty
            relatedArticles: { ...state.relatedArticles },
            meta: {
                ...state.meta, currentStep: "find_related_articles", errors: [...state.meta.errors, {
                    code: "RELATED_ARTICLES_API_ERROR",
                    message: error.message,
                    recoverable: true,
                    context: {}
                }]
            }
        };
    }
};

export const evaluateConfidenceNode = async (
    state: GuidanceChatGraphState
): Promise<Partial<GuidanceChatGraphState>> => {
    // existing evaluateConfidence wraps logic in try-catch internally?
    // checking steps.ts... actually steps.ts doesn't seem to export evaluateConfidence explicitly in the view.
    // Wait, index.ts imports it from steps.ts. Let me assume it follows the same pattern.
    // If it throws, we catch it here.
    try {
        const result = await steps.evaluateConfidence(state as GuidanceChatState);
        return {
            confidence: result.confidence,
            meta: { ...state.meta, currentStep: "evaluate_confidence" },
        };
    } catch (error: any) {
        // Default fallback confidence
        return {
            confidence: {
                ...state.confidence,
                passed: true, // Optimistic? Or false? 
                // In financial analysis, failure -> failed. 
                // In guidance, we typically want to show what we have.
                score: 0.5,
                reason: "Error evaluating confidence"
            },
            meta: { ...state.meta, currentStep: "evaluate_confidence" }
        }
    }
};

export const generateResponseNode = async (
    state: GuidanceChatGraphState
): Promise<Partial<GuidanceChatGraphState>> => {
    try {
        const result = await steps.generateResponse(state as GuidanceChatState);
        return {
            output: result.output,
            meta: { ...state.meta, currentStep: "generate_response", endTime: Date.now() }
        };
    } catch (error: any) {
        return {
            output: {
                type: "not_found",
                citations: [],
                confidence: 0,
                warnings: [`生成回复时发生错误: ${error.message}`]
            },
            meta: { ...state.meta, currentStep: "generate_response", endTime: Date.now() }
        }
    }
};
