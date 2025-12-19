import type { FinancialAnalysisState } from "../../types";
import { runFinancialAnalysisGraph } from "./graph";
import { createInitialMeta } from "../shared/graph-utils";

/**
 * Main workflow runner (Migrated to LangGraph)
 *
 * Executes all workflow steps using StateGraph with conditional edges
 */
export async function runFinancialAnalysisWorkflow(
  input: FinancialAnalysisState["input"]
): Promise<FinancialAnalysisState> {
  try {
    const result = await runFinancialAnalysisGraph(input);
    return result as FinancialAnalysisState;
  } catch (error: any) {
    console.error("[Financial Analysis Workflow] Error:", error);

    // Fallback error handling
    return {
      input,
      routing: { selectedFunction: null, functionArgs: {}, confidence: 0 },
      dataQuery: { requiredMetrics: [], availableMetrics: [], missingMetrics: [], dataMap: {}, sourceDocuments: [] },
      calculation: { functionName: "", functionDisplayName: "", formula: "", inputs: {}, result: { value: 0, formatted: "", unit: "" }, steps: [] },
      confidence: { score: 0, factors: [], threshold: 0.7, passed: false },
      output: {
        type: "no_function",
        answer: `处理财务分析请求时发生错误: ${error.message}`,
        confidence: 0,
        sourceDocuments: [],
      },
      meta: {
        ...createInitialMeta(), // Ideally we'd preserve meta if we had it, but input doesn't have it
        endTime: Date.now(),
        errors: [{
          code: "WORKFLOW_CRASH",
          message: error.message || "Unknown error",
          recoverable: false,
          context: { step: "graph_execution" },
        }],
      },
    };
  }
}
