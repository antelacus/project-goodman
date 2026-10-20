/**
 * Routing Edges
 *
 * Conditional edges for the Unified Agent Graph. Every path ends in an answer
 * that has gone through citation post-processing: when the loop would stop
 * with tool calls still pending (iteration limit) or a search went over
 * budget, forceAnswer gets one turn with no tools (DESIGN §4).
 */

import { BaseAgentState } from "../state/base-state";

export function afterAgentLoop(state: BaseAgentState): "toolExecutor" | "forceAnswer" | "finalizeAnswer" {
    const { currentIteration, maxIterations, pendingToolCalls } = state.agent;
    if (pendingToolCalls.length === 0) return "finalizeAnswer";
    if (currentIteration >= maxIterations) {
        console.warn(`Agent reached max iterations (${maxIterations})`);
        return "forceAnswer";
    }
    return "toolExecutor";
}

export function afterTools(state: BaseAgentState): "agentLoop" | "forceAnswer" {
    const { mustAnswer, currentIteration, maxIterations } = state.agent;
    return mustAnswer || currentIteration >= maxIterations ? "forceAnswer" : "agentLoop";
}
