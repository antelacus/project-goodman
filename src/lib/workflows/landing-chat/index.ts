/**
 * Landing Chat Workflow Orchestrator
 *
 * This file exports the main workflow runner that coordinates the execution
 * of all step functions in the correct sequence.
 */

import type { LandingChatState } from "../../types";
import * as steps from "./steps";

/**
 * Initialize workflow state from API request input
 */
function initializeState(
  input: LandingChatState["input"]
): LandingChatState {
  return {
    input,
    reply: {
      content: "",
      conversationHistory: [],
    },
    routing: {
      intentAnalysis: {
        extractionKeywords: 0,
        analysisKeywords: 0,
        guidanceKeywords: 0,
      },
      suggestedModule: undefined,
      confidence: 0,
    },
    suggestions: {
      questions: [],
    },
    output: {
      reply: "",
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
 * 1. Generate reply using LLM
 * 2. Analyze intent and route to module
 * 3. Generate suggested questions
 * 4. Build final response
 *
 * @param input - Request input from API route
 * @returns Complete workflow state with output
 */
export async function runLandingChatWorkflow(
  input: LandingChatState["input"]
): Promise<LandingChatState> {
  let state = initializeState(input);

  try {
    // Step 1: Generate reply
    state = await steps.generateReply(state);

    // Step 2: Analyze routing
    state = await steps.analyzeRouting(state);

    // Step 3: Generate suggestions
    state = await steps.generateSuggestions(state);

    // Step 4: Generate final response
    state = await steps.generateResponse(state);

    return state;
  } catch (error: any) {
    console.error("[Landing Chat Workflow] Error:", error);

    // Record error in state
    state.meta.errors.push({
      code: "WORKFLOW_ERROR",
      message: error.message || "Unknown error",
      recoverable: false,
      context: { step: state.meta.currentStep },
    });

    // Generate error response
    state.output = {
      reply: "抱歉，处理您的请求时发生错误，请稍后重试。",
      confidence: 0,
    };

    state.meta.endTime = Date.now();

    return state;
  }
}
