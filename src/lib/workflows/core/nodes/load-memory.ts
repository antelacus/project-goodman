/**
 * Load Memory Node
 *
 * Initializes the agent session and loads conversation history.
 * Standardized for use in Unified Agent.
 */

import { BaseAgentState } from "../state/base-state";
import { conversationMemory } from "@/lib/memory/conversation-memory";
import { SystemMessage, HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";

/**
 * Loads memory and initializes agent state
 *
 * @param state Current graph state (mostly empty at start)
 * @returns Partial state update
 */
export async function loadMemoryNode(
    state: BaseAgentState
): Promise<Partial<BaseAgentState>> {
    console.log("loadMemoryNode State:", JSON.stringify(state, null, 2));
    if (!state.input) {
        console.error("State.input is undefined!");
        // Fallback or throw
        throw new Error("State.input is undefined in loadMemoryNode");
    }
    const { sessionId: requestedSessionId, question, workflowType } = state.input;

    // 1. Get or create session
    // Default to 'unified' if not specified
    const effectiveWorkflowType = workflowType || "unified";

    const { sessionId: activeSessionId, messages: history } = await conversationMemory.getOrCreateSession(
        requestedSessionId,
        effectiveWorkflowType
    );

    // 3. Convert DB messages to LangChain BaseMessage[]
    const messages: BaseMessage[] = history.map((msg) => {
        if (msg.role === "user") {
            return new HumanMessage(msg.content);
        } else if (msg.role === "assistant") {
            return new AIMessage(msg.content);
        } else {
            return new SystemMessage(msg.content);
        }
    });

    // 4. Initialize Agent Runtime State
    return {
        agent: {
            sessionId: activeSessionId,
            messages: messages,
            currentIteration: 0,
            maxIterations: 10,  // Default max iterations
            initialMessageCount: messages.length,
            isComplete: false,
            pendingToolCalls: [],
        },
        // Reset tool results for this turn
        toolResults: [],
    };
}
