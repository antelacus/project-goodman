import * as steps from "./steps";
import type { LandingChatGraphState } from "./state";
import type { LandingChatState } from "@/lib/types/workflow-states";

/**
 * 节点适配器工厂
 * 将完整状态步骤函数转换为 LangGraph 节点函数
 */

export const generateReplyNode = async (
    state: LandingChatGraphState
): Promise<Partial<LandingChatGraphState>> => {
    const result = await steps.generateReply(state as LandingChatState);
    return {
        reply: result.reply,
        meta: { ...state.meta, currentStep: "generate_reply" },
    };
};

export const analyzeRoutingNode = async (
    state: LandingChatGraphState
): Promise<Partial<LandingChatGraphState>> => {
    const result = await steps.analyzeRouting(state as LandingChatState);
    return {
        routing: result.routing,
        meta: { ...state.meta, currentStep: "analyze_routing" },
    };
};

export const generateSuggestionsNode = async (
    state: LandingChatGraphState
): Promise<Partial<LandingChatGraphState>> => {
    const result = await steps.generateSuggestions(state as LandingChatState);
    return {
        suggestions: result.suggestions,
        meta: { ...state.meta, currentStep: "generate_suggestions" },
    };
};

export const generateResponseNode = async (
    state: LandingChatGraphState
): Promise<Partial<LandingChatGraphState>> => {
    const result = await steps.generateResponse(state as LandingChatState);
    return {
        output: result.output,
        meta: { ...state.meta, currentStep: "generate_response", endTime: Date.now() },
    };
};
