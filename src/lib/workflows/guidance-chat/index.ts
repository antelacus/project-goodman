/**
 * Guidance Chat Workflow Orchestrator
 *
 * This file exports the main workflow runner that coordinates the execution
 * of all step functions in the correct sequence.
 */

/**
 * Initialize workflow state from API request input
 */
import type { GuidanceChatState } from "../../types";
import { runGuidanceChatGraph } from "./graph";
import { createInitialMeta } from "../shared/graph-utils";

/**
 * Main workflow runner (Migrated to LangGraph)
 *
 * Executes all workflow steps using StateGraph with conditional edges
 */
export async function runGuidanceChatWorkflow(
  input: GuidanceChatState["input"]
): Promise<GuidanceChatState> {
  try {
    const result = await runGuidanceChatGraph(input);
    return result as GuidanceChatState;
  } catch (error: any) {
    console.error("[Guidance Chat Workflow] Error:", error);

    // Fallback logic
    return {
      input,
      search: { keywords: [], vectorResults: [], keywordResults: [], combinedResults: [] },
      reasoning: { guidanceText: "", citations: [] },
      relatedArticles: { articles: [] },
      confidence: { score: 0, factors: [], threshold: 0.6, passed: false },
      output: {
        type: "not_found",
        citations: [],
        confidence: 0,
        warnings: [`处理合规指导请求时发生错误: ${error.message}`],
      },
      meta: {
        ...createInitialMeta(),
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
