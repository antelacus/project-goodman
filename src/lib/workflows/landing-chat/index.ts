/**
 * Landing Chat Workflow Orchestrator
 *
 * This file exports the main workflow runner that coordinates the execution
 * of all step functions in the correct sequence.
 */

import type { LandingChatState } from "../../types";
import * as steps from "./steps";

import type { LandingChatState } from "../../types";
import { runLandingChatWorkflowGraph } from "./graph";
import { createInitialMeta } from "../shared/graph-utils";

/**
 * Main workflow runner (Migrated to LangGraph)
 *
 * Executes all workflow steps using StateGraph
 */
export async function runLandingChatWorkflow(
  input: LandingChatState["input"]
): Promise<LandingChatState> {
  try {
    // Run the graph
    const result = await runLandingChatWorkflowGraph(input);
    return result as LandingChatState;
  } catch (error: any) {
    console.error("[Landing Chat Workflow] Error:", error);

    // Fallback error handling if graph crashes
    // Note: Graph should generally handle its own errors, but this is a failsafe
    return {
      input,
      reply: { content: "", conversationHistory: [] },
      routing: {
        intentAnalysis: { extractionKeywords: 0, analysisKeywords: 0, guidanceKeywords: 0 },
        confidence: 0,
        suggestedModule: undefined
      },
      suggestions: { questions: [] },
      output: {
        reply: "抱歉，处理您的请求时发生错误，请稍后重试。",
        confidence: 0
      },
      meta: {
        ...createInitialMeta(),
        endTime: Date.now(),
        errors: [{
          code: "WORKFLOW_CRASH",
          message: error.message || "Unknown error",
          recoverable: false,
          context: { step: "graph_execution" }
        }]
      }
    };
  }
}
