import { StateGraph, START, END } from "@langchain/langgraph";
import { LandingChatAnnotation, type LandingChatGraphState } from "./state";
import * as nodes from "./nodes";
import { withLogging } from "../shared/graph-utils";

const GRAPH_NAME = "LandingChat";

// 构建图
const workflow = new StateGraph(LandingChatAnnotation)
    // Add memory nodes
    .addNode("loadMemory", nodes.loadMemoryNode)
    .addNode("saveMemory", nodes.saveMemoryNode)

    // Existing nodes
    .addNode("generateReply", withLogging(GRAPH_NAME, "generateReply", nodes.generateReplyNode))
    .addNode("analyzeRouting", withLogging(GRAPH_NAME, "analyzeRouting", nodes.analyzeRoutingNode))
    .addNode("generateSuggestions", withLogging(GRAPH_NAME, "generateSuggestions", nodes.generateSuggestionsNode))
    .addNode("generateResponse", withLogging(GRAPH_NAME, "generateResponse", nodes.generateResponseNode))

    // Edges
    .addEdge(START, "loadMemory")
    .addEdge("loadMemory", "generateReply")
    .addEdge("generateReply", "analyzeRouting")
    .addEdge("analyzeRouting", "generateSuggestions")
    .addEdge("generateSuggestions", "generateResponse")
    .addEdge("generateResponse", "saveMemory")
    .addEdge("saveMemory", END);

// 编译并导出
export const landingChatGraph = workflow.compile();

// 便捷运行函数
export async function runLandingChatWorkflowGraph(
    input: LandingChatGraphState["input"] & { sessionId?: string }
): Promise<LandingChatGraphState> {
    const result = await landingChatGraph.invoke({
        input,
        sessionId: input.sessionId
    });
    return result as LandingChatGraphState;
}
