import type { WorkflowMeta } from "@/lib/types/workflow-states";

/**
 * 创建步骤日志记录器
 * 在每个节点执行后打印节点名称和关键状态
 */
export function createStepLogger(graphName: string) {
    return (nodeName: string, state: Record<string, unknown>) => {
        const timestamp = new Date().toISOString();
        console.log(`[${graphName}] ${timestamp} | Node: ${nodeName}`);

        // 只打印关键字段，避免输出过大
        const summary: Record<string, unknown> = {};

        if (state.routing) {
            summary.routing = {
                selectedFunction: (state.routing as any).selectedFunction,
                confidence: (state.routing as any).confidence,
                reasoning: (state.routing as any).functionArgs?._reasoning,
            };
        }

        if (state.dataQuery) {
            summary.dataQuery = {
                missingMetrics: (state.dataQuery as any).missingMetrics?.length ?? 0,
                hasError: !!(state.dataQuery as any).error,
            };
        }

        if (state.confidence) {
            summary.confidence = {
                score: (state.confidence as any).score,
                passed: (state.confidence as any).passed,
            };
        }

        if (state.output) {
            summary.output = {
                type: (state.output as any).type,
            };
        }

        console.log(`[${graphName}] State summary:`, JSON.stringify(summary, null, 2));
        console.log("---");
    };
}

/**
 * 为节点函数添加日志包装
 */
export function withLogging<TState extends Record<string, unknown>>(
    graphName: string,
    nodeName: string,
    nodeFunction: (state: TState) => Promise<Partial<TState>>
): (state: TState) => Promise<Partial<TState>> {
    const logger = createStepLogger(graphName);

    return async (state: TState) => {
        console.log(`[${graphName}] Entering node: ${nodeName}`);
        const result = await nodeFunction(state);

        // Merge result with input state for logging purposes to see the whole picture
        // Note: We only return the partial result, but we log the potential next state context
        // This is an approximation since we don't have the reducer logic here, 
        // but it's good enough for debugging the "result" of this node.
        logger(nodeName, { ...state, ...result });

        return result;
    };
}

/**
 * 生成人类可读的错误消息
 */
export function generateHumanReadableError(error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}): string {
    const templates: Record<string, (e: typeof error) => string> = {
        INSUFFICIENT_DATA: (e) =>
            `未找到${(e.details?.missingItems as string[])?.join("、") || "必需数据"}，请确认已上传相关文档。`,
        DOCUMENT_NOT_FOUND: (e) =>
            `未找到${e.details?.year || ""}年的${e.details?.docType || "财务报表"}。`,
        QUERY_FAILED: (e) => `数据查询失败：${e.message}。请稍后重试。`,
        CALCULATION_FAILED: (e) => `计算执行失败：${e.message}。`,
        SEARCH_FAILED: (e) => `搜索失败：${e.message}。请稍后重试。`,
    };

    return templates[error.code]?.(error) || error.message;
}

/**
 * 创建初始元数据
 */
export function createInitialMeta(): WorkflowMeta {
    return {
        startTime: Date.now(),
        currentStep: "init",
        errors: [],
    };
}
