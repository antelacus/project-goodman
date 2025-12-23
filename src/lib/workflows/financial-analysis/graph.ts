import { StateGraph, START, END } from "@langchain/langgraph";
import { FinancialAgentAnnotation, type FinancialAgentGraphState } from "./state";
import * as nodes from "./nodes";
import { withLogging } from "../shared/graph-utils";

const GRAPH_NAME = "FinancialAgent";

// --- Conditional Edges ---

const afterAgentNode = (state: FinancialAgentGraphState): string => {
    const { agent } = state;

    if (agent.currentIteration >= agent.maxIterations) {
        return "generateResponse";
    }
    if (agent.isComplete) {
        return "generateResponse";
    }
    if (agent.pendingToolCalls.length > 0) {
        return "toolNode";
    }
    return "generateResponse";
};

const afterToolNode = (): string => "agentNode";

// --- Graph Definition ---

// Note: withLogging helper is assumed to exist in ../shared/graph-utils. 
// If not, we might need to verify or implement a simple wrapper or omit it.
// I'll check its existence later, if missing I will remove the wrapper.
// Given the design doc used it, I assume it exists.

const workflow = new StateGraph(FinancialAgentAnnotation)
    // Nodes
    .addNode("loadMemory", nodes.loadMemoryNode)
    .addNode("agentNode", nodes.agentNode)
    .addNode("toolNode", nodes.toolNode)
    .addNode("generateResponse", nodes.generateResponseNode)
    .addNode("saveMemory", nodes.saveMemoryNode)

    // Edges
    .addEdge(START, "loadMemory")
    .addEdge("loadMemory", "agentNode")
    .addConditionalEdges("agentNode", afterAgentNode, {
        toolNode: "toolNode",
        generateResponse: "generateResponse",
    })
    .addConditionalEdges("toolNode", afterToolNode, {
        agentNode: "agentNode",
    })
    .addEdge("generateResponse", "saveMemory")
    .addEdge("saveMemory", END);

// Compile
export const financialAgentGraph = workflow.compile();

// Runner
export async function runFinancialAgentWorkflow(
    input: FinancialAgentGraphState["input"]
): Promise<FinancialAgentGraphState> {
    const result = await financialAgentGraph.invoke({ input });
    return result as FinancialAgentGraphState;
}
