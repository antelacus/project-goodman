import { Annotation } from "@langchain/langgraph";
import type { FinancialAnalysisState, WorkflowMeta } from "@/lib/types/workflow-states";

export const FinancialAnalysisAnnotation = Annotation.Root({
    // 输入：保留最新值
    input: Annotation<{
        question: string;
        year?: string;
        period?: string;
        documentIds?: string[];
        autoSelect?: { enabled: boolean; maxDocuments?: number };
    }>({
        reducer: (prev, next) => next ?? prev,
        default: () => ({ question: "" }),
    }),

    // 文档选择结果：保留最新值
    documentSelection: Annotation<{ selectedDocuments: any[]; totalTokens: number } | undefined>({
        reducer: (prev, next) => next ?? prev,
        default: () => undefined,
    }),

    //路由：合并
    routing: Annotation<{
        selectedFunction: string | null;
        functionArgs: Record<string, unknown>;
        confidence: number;
        error?: { code: string; message: string }; // Result Pattern
    }>({
        reducer: (prev, next) => ({ ...prev, ...next }),
        default: () => ({
            selectedFunction: null,
            functionArgs: {},
            confidence: 0,
        }),
    }),

    // 数据查询：深度合并（关键）
    dataQuery: Annotation<{
        requiredMetrics: string[];
        availableMetrics: string[];
        missingMetrics: string[];
        dataMap: Record<string, any>; // Complex map
        sourceDocuments: any[];
        error?: { code: string; message: string; details?: any }; // Result Pattern
    }>({
        reducer: (prev, next) => ({
            ...prev,
            ...next,
            // dataMap 需要特殊处理吗？
            // FinancialAnalysisState 的 dataMap 是一次性查询出来的，
            // 如果分步查询可能需要合并。但在当前逻辑中，queryData 是一次性返回完整 map。
            // 所以简单的 shallow merge ...prev, ...next 的 dataMap 属性覆盖是安全的，
            // 只要 next.dataMap 是完整的。
            // 如果 queryData 是增量更新，则需要 deep merge。
            // 检查 steps.ts: queryData 函数是构建了一个新的 dataMap 并返回。
            // 所以浅合并整个 dataQuery 对象是安全的。
        }),
        default: () => ({
            requiredMetrics: [],
            availableMetrics: [],
            missingMetrics: [],
            dataMap: {},
            sourceDocuments: [],
        }),
    }),

    // 计算结果：合并
    calculation: Annotation<{
        functionName: string;
        functionDisplayName: string;
        formula: string;
        inputs: Record<string, number>;
        result: { value: number; formatted: string; unit: string };
        steps: string[];
        warnings?: string[];
        error?: { code: string; message: string }; // Result Pattern
    }>({
        reducer: (prev, next) => ({ ...prev, ...next }),
        default: () => ({
            functionName: "",
            functionDisplayName: "",
            formula: "",
            inputs: {},
            result: { value: 0, formatted: "", unit: "" },
            steps: [],
        }),
    }),

    // 置信度：合并
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
            threshold: 0.7,
            passed: false,
        }),
    }),

    // 输出：保留最新值
    output: Annotation<{
        type: string;
        answer: string;
        confidence: number;
        sourceDocuments: any[];
        missingData?: string[];
        suggestion?: string;
        warnings?: string[];
        calculation?: any;
    }>({
        reducer: (prev, next) => next ?? prev,
        default: () => ({
            type: "init",
            answer: "",
            confidence: 0,
            sourceDocuments: [],
        }),
    }),

    // Meta：合并
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

// 类型检查：确保 Annotation State 兼容 FinancialAnalysisState
export type FinancialAnalysisGraphState = typeof FinancialAnalysisAnnotation.State;
// const _typeCheck: FinancialAnalysisGraphState extends FinancialAnalysisState ? true : never = true;
