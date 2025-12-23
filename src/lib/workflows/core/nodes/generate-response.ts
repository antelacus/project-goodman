/**
 * Generate Response Node
 *
 * Extracts the final response from the agent state to the workflow output.
 */

import { BaseAgentState } from "../state/base-state";
import { AIMessage } from "@langchain/core/messages";

export async function generateResponseNode(
    state: BaseAgentState
): Promise<Partial<BaseAgentState>> {
    const { agent } = state;
    const { messages } = agent;

    if (messages.length === 0) {
        return {
            output: {
                answer: "No response generated.",
                type: "error",
                confidence: 0,
                sources: []
            }
        };
    }

    // Get last message
    const lastMsg = messages[messages.length - 1];
    let answer = "";

    if (lastMsg._getType() === "ai") {
        answer = typeof lastMsg.content === "string" ? lastMsg.content : JSON.stringify(lastMsg.content);
    } else {
        answer = "Unexpected end of conversation.";
    }

    return {
        output: {
            answer,
            type: "success",
            confidence: 1.0, // Placeholder
            sources: [] // We could extract citations here if we structured them
        }
    };
}
