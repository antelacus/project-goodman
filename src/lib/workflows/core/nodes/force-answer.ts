/**
 * Force Answer Node
 *
 * Reached when a search went over budget or the iteration limit was hit: one
 * more model turn with no tools offered, so every question ends in an answer
 * (DESIGN §4). Tool calls left without results are dropped first; the model API
 * rejects them, and history must not keep them.
 */

import { AIMessage } from "@langchain/core/messages";
import { chatWithTools } from "@/lib/ai";
import { BaseAgentState } from "../state/base-state";
import { convertToOpenAIMessages } from "./agent-loop";
import { dropUnpairedToolCalls } from "./history";

const ANSWER_NOW =
    "不能再调用任何工具（检索次数已用完，或已达到步骤上限）。请基于以上已有的结果直接回答用户的问题；引用法规条款时只写结果编号（如 [R1]）。";

export async function forceAnswerNode(
    state: BaseAgentState,
    config: { systemPrompt: string }
): Promise<Partial<BaseAgentState>> {
    const { agent } = state;
    const messages = dropUnpairedToolCalls(agent.messages);

    const reply = await chatWithTools({
        system: config.systemPrompt,
        messages: [...convertToOpenAIMessages(messages), { role: "system", content: ANSWER_NOW }],
        tools: [],
    });

    return {
        agent: {
            ...agent,
            messages: [...messages, new AIMessage(reply.text)],
            pendingToolCalls: [],
            isComplete: true,
        },
    };
}
