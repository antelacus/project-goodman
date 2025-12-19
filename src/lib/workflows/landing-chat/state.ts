import { Annotation } from "@langchain/langgraph";
import type { WorkflowMeta } from "@/lib/types/workflow-states";
import type { ChatMessage, IntentAnalysis, SuggestedModule } from "@/lib/types/domain-types";

/**
 * Landing Chat 状态注解
 *
 * 线性流程，无复杂条件边，Reducer 策略相对简单
 */
export const LandingChatAnnotation = Annotation.Root({
    // 输入：保留最新值
    input: Annotation<{
        messages: ChatMessage[];
        currentMessage: string;
    }>({
        reducer: (prev, next) => next ?? prev,
        default: () => ({ messages: [], currentMessage: "" }),
    }),

    // 步骤 1: 生成回复
    reply: Annotation<{
        content: string;
        conversationHistory: ChatMessage[];
    }>({
        reducer: (prev, next) => ({ ...prev, ...next }),
        default: () => ({ content: "", conversationHistory: [] }),
    }),

    // 步骤 2: 路由分析
    routing: Annotation<{
        intentAnalysis: IntentAnalysis;
        suggestedModule?: SuggestedModule;
        confidence: number;
    }>({
        reducer: (prev, next) => ({ ...prev, ...next }),
        default: () => ({
            intentAnalysis: { extractionKeywords: 0, analysisKeywords: 0, guidanceKeywords: 0 },
            confidence: 0,
        }),
    }),

    // 步骤 3: 建议问题
    suggestions: Annotation<{
        questions: string[];
    }>({
        reducer: (prev, next) => ({ ...prev, ...next }),
        default: () => ({ questions: [] }),
    }),

    // 最终输出
    output: Annotation<{
        reply: string;
        suggestedModule?: SuggestedModule;
        suggestedQuestions?: string[];
        confidence: number;
    }>({
        reducer: (prev, next) => next ?? prev,
        default: () => ({ reply: "", confidence: 0 }),
    }),

    // 元数据：errors 需要追加
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

// 类型导出（用于节点函数签名）
export type LandingChatGraphState = typeof LandingChatAnnotation.State;
