/**
 * Unified Agent Graph
 *
 * The main entry point for the Unified Agent workflow.
 */

import { StateGraph, START, END } from "@langchain/langgraph";
import { UnifiedAgentState } from "./state";
import {
    unifiedAgentLoop,
    unifiedForceAnswer,
    createLoadMemoryNode,
    toolExecutorNode,
    createSaveMemoryNode,
    finalizeAnswerNode,
} from "./nodes";
import { generateResponseNode } from "../core/nodes/generate-response";
import { afterAgentLoop, afterTools } from "../core/edges/routing";
import { newQuestionState } from "../core/state/base-state";
import { conversationMemory, type AgentMemory } from "@/lib/memory/conversation-memory";

/**
 * Builds the agent graph over a conversation store. Production passes the
 * Supabase-backed memory; the retrieval eval passes an in-memory one, so a run
 * of the full agent writes nothing to the shared database (DESIGN §9).
 */
export function createUnifiedGraph({ memory }: { memory: AgentMemory }) {
    // Define the graph with relaxed typing for node names
    // LangGraph's strict typing conflicts with dynamic node addition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workflow: any = new StateGraph<UnifiedAgentState>({
        channels: {
            input: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                value: (left?: any, right?: any) => right ? right : left,
                default: () => ({ question: "" }),
            },
            agent: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                value: (left?: any, right?: any) => right ? right : left,
                default: () => ({
                    sessionId: "",
                    messages: [],
                    currentIteration: 0,
                    maxIterations: 10,
                    initialMessageCount: 0,
                    isComplete: false,
                    pendingToolCalls: [],
                    ...newQuestionState(),
                }),
            },
            toolResults: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                value: (left?: any[], right?: any[]) => right ? right : (left || []),
                default: () => [],
            },
            output: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                value: (left?: any, right?: any) => right ? right : left,
                default: () => undefined,
            },
            meta: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                value: (left?: any, right?: any) => right ? right : left,
                default: () => undefined,
            },
        },
    });

    // Add Nodes
    workflow.addNode("loadMemory", createLoadMemoryNode(memory));
    workflow.addNode("agentLoop", unifiedAgentLoop);
    workflow.addNode("toolExecutor", toolExecutorNode);
    workflow.addNode("forceAnswer", unifiedForceAnswer);
    workflow.addNode("finalizeAnswer", finalizeAnswerNode);
    workflow.addNode("saveMemory", createSaveMemoryNode(memory));
    workflow.addNode("generateResponse", generateResponseNode);

    // loadMemory → agentLoop ⇄ toolExecutor → (forceAnswer) → finalizeAnswer → saveMemory → generateResponse
    workflow.addEdge(START, "loadMemory");
    workflow.addEdge("loadMemory", "agentLoop");
    workflow.addConditionalEdges("agentLoop", afterAgentLoop, {
        toolExecutor: "toolExecutor",
        forceAnswer: "forceAnswer",
        finalizeAnswer: "finalizeAnswer",
    });
    workflow.addConditionalEdges("toolExecutor", afterTools, {
        agentLoop: "agentLoop",
        forceAnswer: "forceAnswer",
    });
    workflow.addEdge("forceAnswer", "finalizeAnswer");
    workflow.addEdge("finalizeAnswer", "saveMemory");
    workflow.addEdge("saveMemory", "generateResponse");
    workflow.addEdge("generateResponse", END);

    return workflow.compile();
}

export const unifiedAgentGraph = createUnifiedGraph({ memory: conversationMemory });
