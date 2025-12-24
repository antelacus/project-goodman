/**
 * Agent Loop Node
 *
 * Core reasoning loop for the agent.
 * Sends current state to LLM and processes the response.
 */

import { BaseAgentState } from "../state/base-state";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { toolRegistry } from "@/lib/tools/registry";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
});

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
    // Add system prompt if not present at start
    const systemPrompt = config?.systemPrompt || "You are a helpful assistant.";

    const responseMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...messages.map(msg => {
            // Basic conversion - in production may need more robust handling
            const role = msg._getType() === "human" ? "user" :
                msg._getType() === "ai" ? "assistant" : "system";

            // Handle tool calls if retained in some way, but simplified here
            // Real implementation needs to handle ToolMessages properly
            // For now assuming messages are cleaned or compatible
            return { role, content: msg.content } as any;
        })
    ];

    // If this is the very first turn of this execution, add user input
    // We check currentIteration === 0 because messages might contain history from DB
    if (currentIteration === 0) {
        responseMessages.push({ role: "user", content: input.question });
    }

    // 2. Call OpenAI
    const tools = toolRegistry.toOpenAIFunctionDefs();

    const completion = await openai.chat.completions.create({
        model: "gpt-4o", // Or config.model
        messages: responseMessages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? "auto" : undefined,
    });

    const choice = completion.choices[0];
    const message = choice.message;

    // Create AIMessage
    const aiMessage = new AIMessage({
        content: message.content || "",
        tool_calls: message.tool_calls as any,
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

    const toolCalls = message.tool_calls || [];

    // Update pending tool calls
    const pendingToolCalls = toolCalls.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
    }));

    const isComplete = toolCalls.length === 0;

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
