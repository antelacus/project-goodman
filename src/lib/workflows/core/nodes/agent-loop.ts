/**
 * Agent Loop Node
 *
 * Core reasoning loop for the agent.
 * Sends current state to LLM and processes the response.
 */

import { BaseAgentState } from "../state/base-state";
import { BaseMessage, HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { toolRegistry } from "@/lib/tools/registry";
import { chatWithTools, type ChatMessage } from "@/lib/ai";

/**
 * Convert LangChain messages to OpenAI format
 * Properly handles AIMessage tool_calls and ToolMessage tool_call_id
 */
function convertToOpenAIMessages(
    messages: BaseMessage[]
): ChatMessage[] {
    return messages.map(msg => {
        const msgType = msg._getType();

        if (msgType === "human") {
            return {
                role: "user" as const,
                content: msg.content as string,
            };
        }

        if (msgType === "ai") {
            const aiMsg = msg as AIMessage;
            // Content can be empty string for tool-calling messages
            // Use null only when content is actually null/undefined, not for empty string
            const content = typeof aiMsg.content === "string" ? aiMsg.content : null;
            const result: Extract<ChatMessage, { role: "assistant" }> = {
                role: "assistant" as const,
                content: content,
            };

            // Preserve tool_calls if present
            if (aiMsg.tool_calls && aiMsg.tool_calls.length > 0) {
                result.tool_calls = aiMsg.tool_calls.map(tc => ({
                    id: tc.id || "",
                    type: "function" as const,
                    function: {
                        name: tc.name,
                        arguments: typeof tc.args === "string"
                            ? tc.args
                            : JSON.stringify(tc.args),
                    },
                }));
            }

            return result;
        }

        if (msgType === "tool") {
            const toolMsg = msg as ToolMessage;
            return {
                role: "tool" as const,
                tool_call_id: toolMsg.tool_call_id,
                content: toolMsg.content as string,
            };
        }

        // Fallback for system or unknown types
        return {
            role: "system" as const,
            content: msg.content as string,
        };
    });
}

/**
 * Executes one iteration of the agent loop
 */
export async function agentLoopNode(
    state: BaseAgentState,
    config: { systemPrompt: string }
): Promise<Partial<BaseAgentState>> {
    const { agent, input } = state;
    const { messages, currentIteration } = agent;

    // Convert LangChain messages to OpenAI format (preserves tool_calls and tool_call_id)
    const responseMessages: ChatMessage[] = convertToOpenAIMessages(messages);

    // If this is the very first turn of this execution, add user input
    // We check currentIteration === 0 because messages might contain history from DB
    if (currentIteration === 0) {
        responseMessages.push({ role: "user", content: input.question });
    }

    // 2. Call the model
    const reply = await chatWithTools({
        system: config.systemPrompt,
        messages: responseMessages,
        tools: toolRegistry.toOpenAIFunctionDefs(),
    });
    const langchainToolCalls = reply.toolCalls;

    const aiMessage = new AIMessage({
        content: reply.text,
        tool_calls: langchainToolCalls,
    });

    // 3. Update State
    const newMessages = [...messages];

    // Add User message to history if it was just legally added (first turn of this execution)
    // AND if it's not already the last message (to depend defensively against duplicates)
    if (currentIteration === 0) {
        const lastMsg = newMessages[newMessages.length - 1];
        const isDuplicate = lastMsg && lastMsg._getType() === 'human' && lastMsg.content === input.question;

        if (!isDuplicate) {
            newMessages.push(new HumanMessage(input.question));
        }
    }

    newMessages.push(aiMessage);

    // Convert langchainToolCalls to pendingToolCalls format
    // Reuse already-parsed data from langchainToolCalls
    const pendingToolCalls = langchainToolCalls.map(tc => ({
        id: tc.id,
        name: tc.name,
        arguments: tc.args,
    }));

    const isComplete = pendingToolCalls.length === 0;

    return {
        agent: {
            ...agent,
            messages: newMessages,
            currentIteration: currentIteration + 1,
            isComplete,
            pendingToolCalls,
        }
    };
}
