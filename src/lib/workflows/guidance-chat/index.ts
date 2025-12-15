/**
 * Guidance Chat Workflow Orchestrator
 *
 * This file exports the main workflow runner that coordinates the execution
 * of all step functions in the correct sequence.
 */

import type { GuidanceChatState } from "../../types";
import * as steps from "./steps";

/**
 * Initialize workflow state from API request input
 */
function initializeState(
  input: GuidanceChatState["input"]
): GuidanceChatState {
  return {
    input,
    search: {
      keywords: [],
      vectorResults: [],
      keywordResults: [],
      combinedResults: [],
      businessContext: undefined,
    },
    reasoning: {
      guidanceText: "",
      citations: [],
      toolCalls: undefined,
    },
    toolExecution: undefined,
    relatedArticles: {
      articles: [],
    },
    confidence: {
      score: 0,
      factors: [],
      threshold: 0.6,
      passed: false,
    },
    output: {
      type: "not_found",
      citations: [],
      confidence: 0,
    },
    meta: {
      startTime: Date.now(),
      currentStep: "init",
      errors: [],
    },
  };
}

/**
 * Main workflow runner
 *
 * Executes all workflow steps in sequence:
 * 1. Perform hybrid search
 * 2. Generate guidance (with tool execution)
 * 3. Find related articles
 * 4. Evaluate confidence
 * 5. Generate response
 *
 * @param input - Request input from API route
 * @returns Complete workflow state with output
 */
export async function runGuidanceChatWorkflow(
  input: GuidanceChatState["input"]
): Promise<GuidanceChatState> {
  let state = initializeState(input);

  try {
    // Step 1: Perform hybrid search
    state = await steps.performHybridSearch(state);

    // Early exit if no citations found
    if (state.search.combinedResults.length === 0) {
      state.output = {
        type: "not_found",
        citations: [],
        confidence: 0,
        warnings: ["未找到相关的法规或文档，请尝试更改问题或上传相关文档"],
      };
      state.meta.endTime = Date.now();
      return state;
    }

    // Step 2: Generate guidance (includes tool execution)
    state = await steps.generateGuidance(state);

    // Step 3: Find related articles
    state = await steps.findRelatedArticles(state);

    // Step 4: Evaluate confidence
    state = await steps.evaluateConfidence(state);

    // Step 5: Generate response
    state = await steps.generateResponse(state);

    return state;
  } catch (error: any) {
    console.error("[Guidance Chat Workflow] Error:", error);

    // Record error in state
    state.meta.errors.push({
      code: "WORKFLOW_ERROR",
      message: error.message || "Unknown error",
      recoverable: false,
      context: { step: state.meta.currentStep },
    });

    // Generate error response
    state.output = {
      type: "not_found",
      citations: [],
      confidence: 0,
      warnings: [`处理合规指导请求时发生错误: ${error.message}`],
    };

    state.meta.endTime = Date.now();

    return state;
  }
}
