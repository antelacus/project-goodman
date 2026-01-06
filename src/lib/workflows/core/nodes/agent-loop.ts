/**
 * Agent Loop Node
 *
 * Core reasoning loop for the agent.
 * Sends current state to LLM and processes the response.
 */

import { BaseAgentState } from "../state/base-state";
import { BaseMessage, HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { toolRegistry } from "@/lib/tools/registry";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
});

// Configurable model via environment variable with sensible default
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

/**
 * Convert LangChain messages to OpenAI format
 * Properly handles AIMessage tool_calls and ToolMessage tool_call_id
 */
function convertToOpenAIMessages(
    messages: BaseMessage[]
): OpenAI.Chat.ChatCompletionMessageParam[] {
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
            const result: OpenAI.Chat.ChatCompletionAssistantMessageParam = {
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
 * Safely parse tool arguments JSON with fallback
 */
function parseToolArguments(argsString: string, toolName: string): Record<string, unknown> {
    try {
        return JSON.parse(argsString);
    } catch (e) {
        console.warn(`[agent-loop] Failed to parse arguments for tool "${toolName}": ${e}`);
        return {};
    }
}

/**
 * Executes one iteration of the agent loop
 */
export async function agentLoopNode(
    state: BaseAgentState,
    config?: { systemPrompt?: string }
): Promise<Partial<BaseAgentState>> {
    const { agent, input } = state;
    const { messages, currentIteration } = agent;

    // 1. Prepare messages for OpenAI
    const systemPrompt = config?.systemPrompt || "You are a helpful assistant.";

    // Convert LangChain messages to OpenAI format (preserves tool_calls and tool_call_id)
    const responseMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...convertToOpenAIMessages(messages),
    ];

    // If this is the very first turn of this execution, add user input
    // We check currentIteration === 0 because messages might contain history from DB
    if (currentIteration === 0) {
        responseMessages.push({ role: "user", content: input.question });
    }

    // 2. Call OpenAI
    const tools = toolRegistry.toOpenAIFunctionDefs();

    const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: responseMessages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? "auto" : undefined,
    });

    const choice = completion.choices[0];
    const message = choice.message;

    // Convert OpenAI tool_calls format to LangChain format
    // OpenAI: { id, type, function: { name, arguments } }
    // LangChain: { id, name, args }
    const langchainToolCalls = message.tool_calls?.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        args: parseToolArguments(tc.function.arguments, tc.function.name),
    }));

    // Create AIMessage with properly formatted tool_calls
    const aiMessage = new AIMessage({
        content: message.content || "",
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
    const pendingToolCalls = (langchainToolCalls || []).map(tc => ({
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
