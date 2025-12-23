/**
 * Routing Edges
 *
 * Conditional edges for the Unified Agent Graph.
 * Decides whether to invoke tools or finish.
 */

import { BaseAgentState } from "../state/base-state";

/**
 * Decides the next node after the Agent Loop
 *
 * @param state Current graph state
 * @returns 'toolNode' | 'generateResponse' | 'end'
 */
export function shouldContinue(state: BaseAgentState): "toolNode" | "generateResponse" | "end" {
    const { agent } = state;
    const { currentIteration, maxIterations, isComplete, pendingToolCalls } = agent;

    // 1. Check for max iterations validation
    if (currentIteration >= maxIterations) {
        console.warn(`Agent reached max iterations (${maxIterations})`);
        return "generateResponse"; // Force a response (Agent should have concluded or we force it)
    }

    // 2. If tools are requested, go to tool executor
    if (pendingToolCalls && pendingToolCalls.length > 0) {
        return "toolNode";
    }

    // 3. If explicit complete flag (or no tools and no complete flag, usually implies text response)
    // In the loop node, we set isComplete = toolCalls.length === 0
    // So if we are here, isComplete is true.

    return "generateResponse";
}
