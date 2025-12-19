import { StateGraph, START, END } from "@langchain/langgraph";
import { GuidanceChatAnnotation, type GuidanceChatGraphState } from "./state";
import * as nodes from "./nodes";
import { withLogging } from "../shared/graph-utils";

const GRAPH_NAME = "GuidanceChat";

// --- Conditional Edge Functions ---

const afterSearch = (state: GuidanceChatGraphState) => {
    // Check for search errors
    if ((state.search as any)?.error) {
        return "generateResponse";
    }

    // Check if citations were found
    if (state.search.combinedResults.length === 0) {
        // No relevant documents -> Skip reasoning and go straight to response (which will return "Not Found")
        return "generateResponse";
    }

    return "generateGuidance";
};

// --- Graph Definition ---

const workflow = new StateGraph(GuidanceChatAnnotation)
    // Add Nodes
    .addNode("performHybridSearch", withLogging(GRAPH_NAME, "performHybridSearch", nodes.performHybridSearchNode))
    .addNode("generateGuidance", withLogging(GRAPH_NAME, "generateGuidance", nodes.generateGuidanceNode))
    .addNode("findRelatedArticles", withLogging(GRAPH_NAME, "findRelatedArticles", nodes.findRelatedArticlesNode))
    .addNode("evaluateConfidence", withLogging(GRAPH_NAME, "evaluateConfidence", nodes.evaluateConfidenceNode))
    .addNode("generateResponse", withLogging(GRAPH_NAME, "generateResponse", nodes.generateResponseNode))

    // Add Edges
    .addEdge(START, "performHybridSearch")

    // Conditional: Search -> Guidance OR Response (if no docs)
    .addConditionalEdges("performHybridSearch", afterSearch)

    // Linear flow from there
    .addEdge("generateGuidance", "findRelatedArticles")
    .addEdge("findRelatedArticles", "evaluateConfidence")
    .addEdge("evaluateConfidence", "generateResponse")
    .addEdge("generateResponse", END);

// Compile
export const guidanceChatGraph = workflow.compile();

// Runner
export async function runGuidanceChatGraph(
    input: GuidanceChatGraphState["input"]
): Promise<GuidanceChatGraphState> {
    const result = await guidanceChatGraph.invoke({ input });
    return result as GuidanceChatGraphState;
}
