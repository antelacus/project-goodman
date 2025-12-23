import OpenAI from "openai";
import { toolRegistry, registerFinancialTools } from "@/lib/tools";
import { FinancialAgentGraphState } from "./state";
import { conversationMemory } from "@/lib/memory/conversation-memory";
import { buildFinancialAgentSystemPrompt } from "@/lib/prompts/agent-prompts";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Load Memory Node
 */
export const loadMemoryNode = async (
    state: FinancialAgentGraphState
): Promise<Partial<FinancialAgentGraphState>> => {
    const { sessionId } = state.input;

    const { sessionId: resolvedSessionId, messages } =
        await conversationMemory.getOrCreateSession(sessionId, "financial-analysis");

    console.log(`[DEBUG] Memory Loaded for Session ${resolvedSessionId}: ${messages.length} messages`);

    return {
        agent: {
            ...state.agent,
            sessionId: resolvedSessionId,
            messages: messages.map(m => ({
                ...m,
                role: m.role as "user" | "assistant" | "tool" | "system"
            })),
        },
        meta: { ...state.meta, currentStep: "load_memory" },
    };
};

/**
 * Agent Node: Reasoning
 */
export const agentNode = async (
    state: FinancialAgentGraphState
): Promise<Partial<FinancialAgentGraphState>> => {
    const { input, agent } = state;
    const { question } = input;

    // Build System Prompt
    const systemPromptTemplate = await buildFinancialAgentSystemPrompt();

    // Ensure tools are registered
    registerFinancialTools();

    // Tools
    const tools = toolRegistry.toOpenAIFunctionDefs({ detailed: true });

    const formattedTools: OpenAI.ChatCompletionTool[] = tools.map((t: any) => ({
        type: 'function',
        function: t.function
    }));

    // Build Messages
    const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPromptTemplate },
        ...agent.messages.map(m => ({
            role: m.role as "user" | "assistant" | "tool",
            content: m.content || "",
            ...(m.tool_calls && { tool_calls: m.tool_calls }),
            ...(m.tool_call_id && { tool_call_id: m.tool_call_id }),
        })) as any
    ];

    if (agent.currentIteration === 0) {
        const lastMsg = messages[messages.length - 1];
        if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== question) {
            messages.push({ role: "user", content: question });
        }
    }

    const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages,
        tools: formattedTools.length > 0 ? formattedTools : undefined,
        tool_choice: formattedTools.length > 0 ? "auto" : undefined,
    });

    const responseMessage = completion.choices[0].message;
    console.log("[DEBUG] Raw Model Response Content:", responseMessage.content);
    console.log("[DEBUG] Raw Model Tool Calls:", JSON.stringify(responseMessage.tool_calls, null, 2));

    const newMessages = [...agent.messages];

    // Persist user message if new
    if (agent.currentIteration === 0) {
        const lastMsg = newMessages[newMessages.length - 1];
        if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== question) {
            newMessages.push({
                role: "user",
                content: question,
                created_at: new Date().toISOString(),
            });
        }
    }

    const pendingToolCalls = responseMessage.tool_calls?.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
    })) || [];

    const assistantMessage = {
        role: "assistant" as const,
        content: responseMessage.content || "",
        tool_calls: responseMessage.tool_calls?.map(tc => ({
            id: tc.id,
            type: tc.type,
            function: { name: tc.function.name, arguments: tc.function.arguments }
        })),
        created_at: new Date().toISOString(),
    };

    newMessages.push(assistantMessage as any);

    // If no tool calls and we have content, we are complete.
    // HOWEVER, if the content is just a plan ("I will do X") and no tool calls, 
    // we want to catch that via prompt engineering, but here we just mark complete.
    // The system prompt fix will ensure it calls tools.
    const isComplete = pendingToolCalls.length === 0 && !!responseMessage.content;

    return {
        agent: {
            ...agent,
            messages: newMessages,
            currentIteration: agent.currentIteration + 1,
            isComplete,
            pendingToolCalls,
        },
        meta: { ...state.meta, currentStep: "agent_node" },
    };
};

/**
 * Tool Node
 */
export const toolNode = async (
    state: FinancialAgentGraphState
): Promise<Partial<FinancialAgentGraphState>> => {
    const { agent } = state;
    const newMessages = [...agent.messages];
    const toolResults = [];

    for (const toolCall of agent.pendingToolCalls) {
        try {
            const result = await toolRegistry.execute(toolCall.name, toolCall.arguments);

            const resultMessage = {
                role: "tool" as const,
                tool_call_id: toolCall.id,
                content: JSON.stringify(result), // Registry results are standardized
                created_at: new Date().toISOString()
            };

            newMessages.push(resultMessage as any);
            toolResults.push({
                toolCallId: toolCall.id,
                toolName: toolCall.name,
                success: result.success,
                data: result.data,
                error: result.error
            });

        } catch (e: any) {
            const errorMessage = {
                role: "tool" as const,
                tool_call_id: toolCall.id,
                content: JSON.stringify({ error: e.message || "Execution failed" }),
                created_at: new Date().toISOString()
            };
            newMessages.push(errorMessage as any);
            toolResults.push({
                toolCallId: toolCall.id,
                toolName: toolCall.name,
                success: false,
                error: e.message
            });
        }
    }

    return {
        agent: {
            ...agent,
            messages: newMessages,
            pendingToolCalls: []
        },
        toolResults: [...(state.toolResults || []), ...toolResults],
        meta: { ...state.meta, currentStep: "tool_node" }
    };
};

/**
 * Save Memory Node
 */
export const saveMemoryNode = async (
    state: FinancialAgentGraphState
): Promise<Partial<FinancialAgentGraphState>> => {
    const { agent } = state;
    const sessionId = agent.sessionId;

    if (!sessionId) return { meta: { ...state.meta, currentStep: "save_memory" } };

    const newMessages = agent.messages.filter(m => !m.id);
    if (newMessages.length > 0) {
        // Map to ConversationMessage format if needed, but saveMessages handles it if structure matches
        await conversationMemory.saveMessages(sessionId, newMessages as any);
    }
    return { meta: { ...state.meta, currentStep: "save_memory" } };
};

/**
 * Generate Response Node (Final Output Mapping)
 */
export const generateResponseNode = async (
    state: FinancialAgentGraphState
): Promise<Partial<FinancialAgentGraphState>> => {
    // Map agent last message to output
    const lastMsg = state.agent.messages[state.agent.messages.length - 1];
    const answer = lastMsg.role === 'assistant' ? lastMsg.content : "";

    return {
        output: {
            ...state.output,
            type: "success",
            answer,
            sessionId: state.agent.sessionId || "",
            confidence: 1.0,
            iterationCount: state.agent.currentIteration
        },
        meta: { ...state.meta, currentStep: "generate_response" }
    };
};
