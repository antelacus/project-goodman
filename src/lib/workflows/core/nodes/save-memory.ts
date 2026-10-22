/**
 * Save Memory Node
 *
 * Persists conversation state to database.
 */

import { BaseAgentState } from "../state/base-state";
import type { AgentMemory, ConversationMessage } from "@/lib/memory/conversation-memory";
import { generateSessionTitle } from "@/lib/memory/session-title";
import { AIMessage, ToolMessage } from "@langchain/core/messages";
import type { DbToolCall, MessageRole } from "@/lib/database/types";
import { convertToolCallsToDb } from "@/lib/database/helpers";
import { dropUnpairedToolCalls } from "./history";

/**
 * Saves new messages to the conversation store. Tool calls without results are
 * not saved: the next question would send them back and the model API rejects
 * an unpaired call.
 */
export const createSaveMemoryNode = (memory: AgentMemory) => async function saveMemoryNode(
    state: BaseAgentState
): Promise<Partial<BaseAgentState>> {
    const { agent } = state;
    const { sessionId, messages, initialMessageCount } = agent;

    if (!sessionId) return {};

    const totalMessages = messages.length;
    // If no new messages, return
    if (totalMessages <= initialMessageCount) return {};

    // Slice out the new messages
    const newMessages = dropUnpairedToolCalls(messages.slice(initialMessageCount));

    // Convert LangChain messages to ConversationMessage format
    const dbMessages: ConversationMessage[] = newMessages.map(msg => {
        let role: MessageRole = "user";
        let tool_calls: DbToolCall[] | undefined = undefined;
        let tool_call_id: string | undefined = undefined;

        const type = msg._getType();
        if (type === "human") {
            role = "user";
        } else if (type === "ai") {
            role = "assistant";
            const aiMsg = msg as AIMessage;
            if (aiMsg.tool_calls && aiMsg.tool_calls.length > 0) {
                tool_calls = convertToolCallsToDb(aiMsg.tool_calls);
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
    await memory.saveMessages(sessionId, dbMessages);

    // Generate session title if none exists yet.
    // Avoid relying on initialMessageCount because system/context messages can preload history.
    try {
        const existingTitle = await memory.getSessionTitle(sessionId);
        if (!existingTitle) {
            const firstUserMessage = messages.find(msg => msg._getType() === "human");
            if (firstUserMessage) {
                const content = typeof firstUserMessage.content === "string"
                    ? firstUserMessage.content
                    : JSON.stringify(firstUserMessage.content);
                if (content.trim().length > 0) {
                    const title = await generateSessionTitle(content);
                    await memory.updateSessionTitle(sessionId, title);
                    console.log(`Generated session title: ${title}`);
                }
            }
        }
    } catch (err) {
        // Don't fail the whole save if title generation fails
        console.error("Error generating session title:", err);
    }

    // Update initialMessageCount so we don't save them again if this node runs multiple times
    // (Though typically saveMemory is at the end)
    return {
        agent: {
            ...agent,
            initialMessageCount: totalMessages,
        }
    };
};
