/**
 * Financial Analysis Workflow Orchestrator
 *
 * This file exports the main workflow runner that coordinates the execution
 * of all step functions in the correct sequence.
 */

import type { FinancialAnalysisState } from "../../types";
import * as steps from "./steps";

/**
 * Initialize workflow state from API request input
 */
function initializeState(input: FinancialAnalysisState["input"]): FinancialAnalysisState {
  return {
    input,
    routing: {
      selectedFunction: null,
      functionArgs: {},
      confidence: 0,
    },
    dataQuery: {
      requiredMetrics: [],
      availableMetrics: [],
      missingMetrics: [],
      dataMap: {},
      sourceDocuments: [],
    },
    calculation: {
      functionName: "",
      functionDisplayName: "",
      formula: "",
      inputs: {},
      result: {
        value: 0,
        formatted: "",
        unit: "",
      },
      steps: [],
    },
    confidence: {
      score: 0,
      factors: [],
      threshold: 0.7,
      passed: false,
    },
    output: {
      type: "no_function",
      answer: "",
      confidence: 0,
      sourceDocuments: [],
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
 * 1. Route to function
 * 2. Query data
 * 3. Execute calculation
 * 4. Evaluate confidence
 * 5. Generate response
 *
 * @param input - Request input from API route
 * @returns Complete workflow state with output
 */
export async function runFinancialAnalysisWorkflow(
  input: FinancialAnalysisState["input"]
): Promise<FinancialAnalysisState> {
  let state = initializeState(input);

  try {
    // Step 1: Route to function
    state = await steps.routeToFunction(state);

    // Early exit if no function selected
    if (!state.routing.selectedFunction) {
      state = await steps.generateResponse(state);
      return state;
    }

    // Step 2: Query data
    state = await steps.queryData(state);

    // Early exit if missing data
    if (state.dataQuery.missingMetrics.length > 0) {
      state = await steps.generateResponse(state);
      return state;
    }

    // Step 3: Execute calculation
    state = await steps.executeCalculation(state);

    // Step 4: Evaluate confidence
    state = await steps.evaluateConfidence(state);

    // Early exit if low confidence
    if (!state.confidence.passed) {
      state = await steps.generateResponse(state);
      return state;
    }

    // Step 5: Generate response
    state = await steps.generateResponse(state);

    return state;
  } catch (error: any) {
    console.error("[Financial Analysis Workflow] Error:", error);

    // Record error in state
    state.meta.errors.push({
      code: "WORKFLOW_ERROR",
      message: error.message || "Unknown error",
      recoverable: false,
      context: { step: state.meta.currentStep },
    });

    // Generate error response
    state.output = {
      type: "no_function",
      answer: `处理财务分析请求时发生错误: ${error.message}`,
      confidence: 0,
      sourceDocuments: [],
    };

    state.meta.endTime = Date.now();

    return state;
  }
}
