import * as steps from "./steps";
import type { FinancialAnalysisGraphState } from "./state";
import type { FinancialAnalysisState } from "@/lib/types/workflow-states";

export const routeToFunctionNode = async (
    state: FinancialAnalysisGraphState
): Promise<Partial<FinancialAnalysisGraphState>> => {
    try {
        const result = await steps.routeToFunction(state as FinancialAnalysisState);
        return {
            routing: result.routing,
            meta: { ...state.meta, currentStep: "route_to_function" },
        };
    } catch (error: any) {
        return {
            routing: {
                ...state.routing,
                error: { code: "ROUTING_FAILED", message: error.message },
            },
            meta: { ...state.meta, currentStep: "route_to_function" },
        };
    }
};

export const queryDataNode = async (
    state: FinancialAnalysisGraphState
): Promise<Partial<FinancialAnalysisGraphState>> => {
    try {
        const result = await steps.queryData(state as FinancialAnalysisState);
        return {
            dataQuery: result.dataQuery,
            meta: { ...state.meta, currentStep: "query_data" },
        };
    } catch (error: any) {
        return {
            dataQuery: {
                ...state.dataQuery,
                error: {
                    code: "QUERY_FAILED",
                    message: error.message,
                    details: error,
                },
            },
            meta: { ...state.meta, currentStep: "query_data" },
        };
    }
};

export const executeCalculationNode = async (
    state: FinancialAnalysisGraphState
): Promise<Partial<FinancialAnalysisGraphState>> => {
    try {
        const result = await steps.executeCalculation(state as FinancialAnalysisState);
        return {
            calculation: result.calculation,
            meta: { ...state.meta, currentStep: "execute_calculation" },
        };
    } catch (error: any) {
        return {
            calculation: {
                ...state.calculation,
                error: { code: "CALCULATION_FAILED", message: error.message },
            },
            meta: { ...state.meta, currentStep: "execute_calculation" },
        };
    }
};

export const evaluateConfidenceNode = async (
    state: FinancialAnalysisGraphState
): Promise<Partial<FinancialAnalysisGraphState>> => {
    const result = await steps.evaluateConfidence(state as FinancialAnalysisState);
    return {
        confidence: result.confidence,
        meta: { ...state.meta, currentStep: "evaluate_confidence" },
    };
};

export const generateResponseNode = async (
    state: FinancialAnalysisGraphState
): Promise<Partial<FinancialAnalysisGraphState>> => {
    // If we arrived here via an error path, the existing generateResponse step
    // might not natively handle the `error` fields we just added to the state.
    // HOWEVER, the `generateResponse` step in `steps.ts` checks for `missingMetrics`, `no function`, etc.
    // It doesn't explicitly check `dataQuery.error`.
    //
    // STRATEGY: We will let the existing `generateResponse` run.
    // If it fails because of missing data structures (due to upstream errors), we catch it here
    // and construct a fallback error response manually.
    //
    // Ideally, we would update `steps.ts` to handle `state.dataQuery.error`, but we are trying to minimize changes to original files.
    // So we'll inject a "Patch" here: if there are errors, we might skip calling the original step or shim it.

    // Check for upstream errors first
    const routingError = (state.routing as any)?.error;
    const queryError = (state.dataQuery as any)?.error;
    const calcError = (state.calculation as any)?.error;

    const error = routingError || queryError || calcError;

    if (error) {
        return {
            output: {
                type: "error",
                answer: `处理请求时发生错误 (${error.code})：${error.message}`,
                confidence: 0,
                sourceDocuments: [],
                // details: error // Optional, if output schema supports it
            },
            meta: { ...state.meta, currentStep: "generate_response", endTime: Date.now() }
        };
    }

    try {
        const result = await steps.generateResponse(state as FinancialAnalysisState);
        return {
            output: result.output,
            meta: { ...state.meta, currentStep: "generate_response", endTime: Date.now() },
        };
    } catch (error: any) {
        return {
            output: {
                type: "error",
                answer: `生成回复时发生意外错误: ${error.message}`,
                confidence: 0,
                sourceDocuments: []
            },
            meta: { ...state.meta, currentStep: "generate_response", endTime: Date.now() }
        };
    }
};
