import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { withLogging } from "../src/lib/workflows/shared/graph-utils";

// 1. Define State
const StateAnnotation = Annotation.Root({
    count: Annotation<number>({
        reducer: (x, y) => x + y,
        default: () => 0,
    }),
    message: Annotation<string>({
        reducer: (x, y) => y ?? x,
        default: () => "",
    }),
});

// 2. Define Nodes
const nodeA = async (state: typeof StateAnnotation.State) => {
    return { count: 1, message: "Hello from Node A" };
};

const nodeB = async (state: typeof StateAnnotation.State) => {
    return { count: 1, message: "Hello from Node B" };
};

// 3. Define Graph
const builder = new StateGraph(StateAnnotation)
    .addNode("nodeA", withLogging("POC_Graph", "nodeA", nodeA))
    .addNode("nodeB", withLogging("POC_Graph", "nodeB", nodeB))
    .addEdge(START, "nodeA")
    .addEdge("nodeA", "nodeB")
    .addEdge("nodeB", END);

// 4. Compile
const graph = builder.compile();

// 5. Run
async function run() {
    console.log("Starting POC Graph...");
    const result = await graph.invoke({ count: 0, message: "Init" });
    console.log("Final Result:", JSON.stringify(result, null, 2));
}

run().catch(console.error);
