import * as steps from "./steps";
import type { LandingChatGraphState } from "./state";
import type { LandingChatState } from "@/lib/types/workflow-states";
import { conversationMemory } from "@/lib/memory/conversation-memory";

/**
 * Load Memory Node
 */
export const loadMemoryNode = async (
    state: LandingChatGraphState
): Promise<Partial<LandingChatGraphState>> => {
    const { sessionId } = state;
    // If no sessionId, just return inputs (stateless mode)
    if (!sessionId) {
        return { meta: { ...state.meta, currentStep: "load_memory" } };
    }

    const { sessionId: resolvedSessionId, messages: memoryMessages } =
        await conversationMemory.getOrCreateSession(sessionId, "landing-chat");

    // Map memory messages to ChatMessage format
    const history: any[] = memoryMessages.map(m => ({
        role: m.role,
        content: m.content
    }));

    return {
        input: {
            ...state.input,
            messages: history // Use backend memory as history
            // Note: currentMessage is still in state.input.currentMessage
        },
        sessionId: resolvedSessionId,
        meta: { ...state.meta, currentStep: "load_memory" },
    };
};

/**
 * Save Memory Node
 */
export const saveMemoryNode = async (
    state: LandingChatGraphState
): Promise<Partial<LandingChatGraphState>> => {
    const { sessionId } = state;
    const { currentMessage } = state.input;
    const { reply } = state.output;

    if (sessionId) {
        // Save User Message
        await conversationMemory.saveMessages(sessionId, [{
            role: "user",
            content: currentMessage
        }]);

        // Save Assistant Reply
        if (reply) {
            await conversationMemory.saveMessages(sessionId, [{
                role: "assistant",
                content: reply
            }]);
        }
    }

    return {
        meta: { ...state.meta, currentStep: "save_memory" }
    };
};


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
