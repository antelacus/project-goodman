/**
 * Unified Agent Graph
 *
 * The main entry point for the Unified Agent workflow.
 */

import { StateGraph, START, END } from "@langchain/langgraph";
import { UnifiedAgentState } from "./state";
import {
    unifiedAgentLoop,
    loadMemoryNode,
    toolExecutorNode,
    saveMemoryNode
} from "./nodes";
import { generateResponseNode } from "../core/nodes/generate-response";
import { shouldContinue } from "../core/edges/routing";

// Define the graph
const workflow = new StateGraph<UnifiedAgentState>({
    channels: {
        input: {
            value: (left?: any, right?: any) => right ? right : left,
            default: () => ({ question: "" }),
        },
        agent: {
            value: (left?: any, right?: any) => right ? right : left,
            default: () => ({
                sessionId: "",
                messages: [],
                currentIteration: 0,
                maxIterations: 10,
                initialMessageCount: 0,
                isComplete: false,
                pendingToolCalls: [],
            }),
        },
        toolResults: {
            value: (left?: any[], right?: any[]) => right ? right : (left || []),
            default: () => [],
        },
        output: {
            value: (left?: any, right?: any) => right ? right : left,
            default: () => undefined,
        },
        meta: {
            value: (left?: any, right?: any) => right ? right : left,
            default: () => undefined,
        },
    },
});

// Add Nodes
workflow.addNode("loadMemory", loadMemoryNode);
workflow.addNode("agentLoop", unifiedAgentLoop);
workflow.addNode("toolExecutor", toolExecutorNode);
workflow.addNode("saveMemory", saveMemoryNode);
workflow.addNode("generateResponse", generateResponseNode);

// Add Edges
workflow.addEdge(START, "loadMemory");
workflow.addEdge("loadMemory", "agentLoop");

// Conditional Edge from Agent Loop
workflow.addConditionalEdges(
    "agentLoop",
    shouldContinue,
    {
        toolNode: "toolExecutor",
        generateResponse: "saveMemory", // If done, go to save -> generate -> end
        end: "saveMemory"
    }
);

// Tool execution goes back to agent loop
workflow.addEdge("toolExecutor", "agentLoop");

// Save memory -> Generate Response -> End
workflow.addEdge("saveMemory", "generateResponse");
workflow.addEdge("generateResponse", END);

// Compile
export const unifiedAgentGraph = workflow.compile();
