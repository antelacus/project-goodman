/**
 * Save Memory Node
 *
 * Persists conversation state to database.
 */

import { BaseAgentState } from "../state/base-state";
import { conversationMemory, ConversationMessage, ToolCall } from "@/lib/memory/conversation-memory";
import { AIMessage, HumanMessage, ToolMessage, BaseMessage } from "@langchain/core/messages";

/**
 * Saves new messages to the database
 */
export async function saveMemoryNode(
    state: BaseAgentState
): Promise<Partial<BaseAgentState>> {
    const { agent } = state;
    const { sessionId, messages, initialMessageCount } = agent;

    if (!sessionId) return {};

    const totalMessages = messages.length;
    // If no new messages, return
    if (totalMessages <= initialMessageCount) return {};

    // Slice out the new messages
    const newMessages = messages.slice(initialMessageCount);

    // Convert LangChain messages to ConversationMessage format
    const dbMessages: ConversationMessage[] = newMessages.map(msg => {
        let role: "user" | "assistant" | "tool" | "system" = "user";
        let tool_calls: ToolCall[] | undefined = undefined;
        let tool_call_id: string | undefined = undefined;

        const type = msg._getType();
        if (type === "human") {
            role = "user";
        } else if (type === "ai") {
            role = "assistant";
            const aiMsg = msg as AIMessage;
            if (aiMsg.tool_calls && aiMsg.tool_calls.length > 0) {
                tool_calls = aiMsg.tool_calls.map(tc => ({
                    id: tc.id || "",
                    type: "function",
                    function: {
                        name: tc.name, // LangChain stores name in .name often? No, .function.name usually but tc is abstract
                        arguments: JSON.stringify(tc.args), // args is object
                    }
                })) as any; // Cast because types might mismatch slightly
            }
        } else if (type === "tool") {
            role = "tool";
            const toolMsg = msg as ToolMessage;
            tool_call_id = toolMsg.tool_call_id;
        } else if (type === "system") {
            role = "system";
        }

        return {
            role,
            content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
            tool_calls,
            tool_call_id,
        };
    });

    // Save to DB
    console.log(`Saving ${dbMessages.length} new messages to session ${sessionId}`);
    await conversationMemory.saveMessages(sessionId, dbMessages);

    // Update initialMessageCount so we don't save them again if this node runs multiple times
    // (Though typically saveMemory is at the end)
    return {
        agent: {
            ...agent,
            initialMessageCount: totalMessages,
        }
    };
}
