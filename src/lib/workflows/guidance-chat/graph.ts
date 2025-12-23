import { StateGraph, START, END } from "@langchain/langgraph";
import { GuidanceChatAnnotation, type GuidanceChatGraphState } from "./state";
import * as nodes from "./nodes";

const afterAgentNode = (state: GuidanceChatGraphState): string => {
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

const workflow = new StateGraph(GuidanceChatAnnotation)
    .addNode("loadMemory", nodes.loadMemoryNode)
    .addNode("searchNode", nodes.searchNode) // Renamed from "search" to "searchNode"
    .addNode("agentNode", nodes.agentNode)
    .addNode("toolNode", nodes.toolNode)
    .addNode("generateResponse", nodes.generateResponseNode)
    .addNode("saveMemory", nodes.saveMemoryNode)

    .addEdge(START, "loadMemory")
    .addEdge("loadMemory", "searchNode")
    .addEdge("searchNode", "agentNode")

    .addConditionalEdges("agentNode", afterAgentNode, {
        toolNode: "toolNode",
        generateResponse: "generateResponse",
    })
    .addConditionalEdges("toolNode", afterToolNode, {
        agentNode: "agentNode",
    })

    .addEdge("generateResponse", "saveMemory")
    .addEdge("saveMemory", END);

export const guidanceChatGraph = workflow.compile();

export async function runGuidanceChatWorkflow(
    input: GuidanceChatGraphState["input"] & { sessionId?: string }
): Promise<GuidanceChatGraphState> {
    const initialState = {
        input,
        sessionId: input.sessionId
    };

    const result = await guidanceChatGraph.invoke({
        input,
        sessionId: input.sessionId
    });
    return result as GuidanceChatGraphState;
}
