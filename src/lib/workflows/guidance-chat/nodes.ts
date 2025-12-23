import OpenAI from "openai";
import { toolRegistry } from "@/lib/tools";
import { GuidanceChatGraphState } from "./state";
import { conversationMemory } from "@/lib/memory/conversation-memory";
import { performHybridSearch as originalPerformHybridSearch, queryStructuredFinancialData } from "./steps";
import { getGuidanceChatPrompt } from "@/lib/prompts";
import { executeFunction } from "@/lib/preset-functions";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Load Memory Node
 */
export const loadMemoryNode = async (
    state: GuidanceChatGraphState
): Promise<Partial<GuidanceChatGraphState>> => {
    const sessionId = state.sessionId;

    const { sessionId: resolvedSessionId, messages } =
        await conversationMemory.getOrCreateSession(sessionId, "guidance-chat");

    return {
        agent: {
            ...state.agent,
            messages: messages.map(m => ({
                ...m,
                role: m.role as "user" | "assistant" | "tool" | "system"
            })),
        },
        sessionId: resolvedSessionId,
        meta: { ...state.meta, currentStep: "load_memory" },
    };
};

/**
 * Search Node: Wrapper for hybrid search
 */
export const searchNode = async (
    state: GuidanceChatGraphState
): Promise<Partial<GuidanceChatGraphState>> => {
    const result = await originalPerformHybridSearch(state as any);
    return {
        search: result.search,
        meta: { ...state.meta, currentStep: "search" }
    };
};

/**
 * Agent Node: Reasoning
 */
export const agentNode = async (
    state: GuidanceChatGraphState
): Promise<Partial<GuidanceChatGraphState>> => {
    const { input, search, agent } = state;
    const { question } = input;
    const { combinedResults, businessContext } = search;

    // Build System Prompt
    const citationsText = combinedResults
        .map((citation: any, index: number) => {
            return `【引用 ${index + 1}】${citation.regulation} ${citation.article}\n${citation.content}\n相关度: ${(citation.relevance * 100).toFixed(1)}%`;
        })
        .join("\n\n");

    const systemPromptTemplate = getGuidanceChatPrompt({
        retrievedRegulations: citationsText || "未找到相关文档",
        uploadedDocument: "",
        businessContext: businessContext || "",
    });

    // Tools
    const tools = toolRegistry.toOpenAIFunctionDefs({
        category: "financial",
        detailed: true
    }).filter(t => ['query_financial_data', 'calculate_financial_metric'].includes(t.function.name));

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
        }))
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

    newMessages.push({
        role: "assistant",
        content: responseMessage.content || "",
        tool_calls: responseMessage.tool_calls?.map(tc => ({
            id: tc.id,
            type: tc.type,
            function: { name: tc.function.name, arguments: tc.function.arguments }
        })),
        created_at: new Date().toISOString(),
    });

    const pendingToolCalls = responseMessage.tool_calls?.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
    })) || [];

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
    state: GuidanceChatGraphState
): Promise<Partial<GuidanceChatGraphState>> => {
    const { agent, input } = state;
    const newMessages = [...agent.messages];
    const { documentIds } = input;

    for (const toolCall of agent.pendingToolCalls) {
        try {
            let toolResultString = "";

            if (toolCall.name === 'query_financial_data') {
                const args = toolCall.arguments;
                const structuredDocIds = documentIds?.filter((id: string) => id) || [];

                const result = await queryStructuredFinancialData(
                    args.metric_names,
                    args.year,
                    args.period,
                    structuredDocIds.length > 0 ? structuredDocIds : undefined
                );

                if (result.error) {
                    toolResultString = JSON.stringify({ error: result.error });
                } else if (Object.keys(result.metrics).length === 0) {
                    toolResultString = JSON.stringify({
                        error: `未找到以下指标的数据: ${args.metric_names.join(", ")}`,
                        hint: "请确保选择的文档包含所需的财务数据，或者指标名称正确。"
                    });
                } else {
                    toolResultString = JSON.stringify({
                        data: result.metrics,
                        found_metrics: Object.keys(result.metrics),
                        missing_metrics: args.metric_names.filter((m: string) => !result.metrics[m])
                    });
                }

            } else if (toolCall.name === 'calculate_financial_metric') {
                const args = toolCall.arguments;
                if (!args.inputs || typeof args.inputs !== "object") {
                    toolResultString = JSON.stringify({
                        error: '请先使用 query_financial_data 获取所需数据...'
                    });
                } else {
                    try {
                        const result = executeFunction(args.metric_name, args.inputs);
                        toolResultString = JSON.stringify({
                            result: result.result,
                            warnings: result.result.warnings,
                            displayName: result.displayName,
                            formula: result.formulaDisplay
                        });
                    } catch (e: any) {
                        toolResultString = JSON.stringify({ error: e.message });
                    }
                }
            } else {
                toolResultString = JSON.stringify({ error: "Unknown tool" });
            }

            newMessages.push({
                role: "tool" as const,
                tool_call_id: toolCall.id,
                content: toolResultString,
                created_at: new Date().toISOString()
            });

        } catch (e: any) {
            newMessages.push({
                role: "tool" as const,
                tool_call_id: toolCall.id,
                content: JSON.stringify({ error: e.message || "Execution failed" }),
                created_at: new Date().toISOString()
            });
        }
    }

    return {
        agent: {
            ...agent,
            messages: newMessages,
            pendingToolCalls: []
        },
        meta: { ...state.meta, currentStep: "tool_node" }
    };
};

/**
 * Save Memory Node
 */
export const saveMemoryNode = async (
    state: GuidanceChatGraphState
): Promise<Partial<GuidanceChatGraphState>> => {
    const { agent, sessionId } = state;
    if (!sessionId) return { meta: { ...state.meta, currentStep: "save_memory" } };

    const newMessages = agent.messages.filter(m => !m.id);
    if (newMessages.length > 0) {
        await conversationMemory.saveMessages(sessionId, newMessages);
    }
    return { meta: { ...state.meta, currentStep: "save_memory" } };
};

/**
 * Generate Response Node (Final Output Mapping)
 */
export const generateResponseNode = async (
    state: GuidanceChatGraphState
): Promise<Partial<GuidanceChatGraphState>> => {
    // Map agent last message to output.guidance / output.answer
    const lastMsg = state.agent.messages[state.agent.messages.length - 1];
    const guidance = lastMsg.role === 'assistant' ? lastMsg.content : "";

    return {
        output: {
            ...state.output,
            type: "success",
            guidance, // Populate guidance field
            confidence: 1.0,
            citations: state.search.combinedResults
        },
        meta: { ...state.meta, currentStep: "generate_response" }
    };
};
