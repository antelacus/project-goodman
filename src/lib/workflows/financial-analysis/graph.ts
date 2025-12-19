import { StateGraph, START, END } from "@langchain/langgraph";
import { FinancialAnalysisAnnotation, type FinancialAnalysisGraphState } from "./state";
import * as nodes from "./nodes";
import { withLogging } from "../shared/graph-utils";

const GRAPH_NAME = "FinancialAnalysis";

// --- Conditional Edge Functions ---

const shouldQueryData = (state: FinancialAnalysisGraphState) => {
    // Check for routing errors or failures
    if ((state.routing as any)?.error) {
        return "generateResponse";
    }
    if (!state.routing.selectedFunction) {
        return "generateResponse";
    }
    return "queryData";
};

const afterQueryData = (state: FinancialAnalysisGraphState) => {
    // Check for query errors
    if ((state.dataQuery as any)?.error) {
        return "generateResponse";
    }
    // Check for missing metrics (business logic failure)
    if (state.dataQuery.missingMetrics.length > 0) {
        return "generateResponse";
    }
    return "executeCalculation";
};

const afterCalculation = (state: FinancialAnalysisGraphState) => {
    // Check for calculation errors
    if ((state.calculation as any)?.error) {
        return "generateResponse";
    }
    return "evaluateConfidence";
}

// --- Graph Definition ---

const workflow = new StateGraph(FinancialAnalysisAnnotation)
    // Add Nodes
    .addNode("routeToFunction", withLogging(GRAPH_NAME, "routeToFunction", nodes.routeToFunctionNode))
    .addNode("queryData", withLogging(GRAPH_NAME, "queryData", nodes.queryDataNode))
    .addNode("executeCalculation", withLogging(GRAPH_NAME, "executeCalculation", nodes.executeCalculationNode))
    .addNode("evaluateConfidence", withLogging(GRAPH_NAME, "evaluateConfidence", nodes.evaluateConfidenceNode))
    .addNode("generateResponse", withLogging(GRAPH_NAME, "generateResponse", nodes.generateResponseNode))

    // Add Edges
    .addEdge(START, "routeToFunction")

    // Conditional: Route -> Query OR Response
    .addConditionalEdges("routeToFunction", shouldQueryData)

    // Conditional: Query -> Calc OR Response
    .addConditionalEdges("queryData", afterQueryData)

    // Conditional: Calc -> Confidence OR Response (on error)
    .addConditionalEdges("executeCalculation", afterCalculation)

    // Linear: Confidence -> Response
    // (Both success and failure in confidence evaluation lead to response generation, just with different content)
    .addEdge("evaluateConfidence", "generateResponse")

    // End
    .addEdge("generateResponse", END);

// Compile
export const financialAnalysisGraph = workflow.compile();

// Runner
export async function runFinancialAnalysisGraph(
    input: FinancialAnalysisGraphState["input"]
): Promise<FinancialAnalysisGraphState> {
    const result = await financialAnalysisGraph.invoke({ input });
    return result as FinancialAnalysisGraphState;
}
