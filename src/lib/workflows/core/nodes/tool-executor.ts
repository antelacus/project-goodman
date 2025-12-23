/**
 * Tool Executor Node
 *
 * Executes pending tool calls for the agent.
 */

import { BaseAgentState, ToolResultEntry } from "../state/base-state";
import { toolRegistry } from "@/lib/tools/registry";
import { ToolMessage } from "@langchain/core/messages";

/**
 * Executes pending tool calls
 */
export async function toolExecutorNode(
    state: BaseAgentState
): Promise<Partial<BaseAgentState>> {
    const { agent } = state;
    const { pendingToolCalls, messages } = agent;

    if (pendingToolCalls.length === 0) {
        return {
            agent: {
                ...agent,
                pendingToolCalls: [], // Ensure it's cleared
            }
        };
    }

    const newToolResults: ToolResultEntry[] = [];
    const newMessages = [...messages];

    // Execute all pending tools
    for (const call of pendingToolCalls) {
        console.log(`Executing tool: ${call.name}`);

        // Execute tool
        const result = await toolRegistry.execute(call.name, call.arguments);

        // Record result
        newToolResults.push({
            toolCallId: call.id,
            toolName: call.name,
            result,
            timestamp: Date.now(),
        });

        // Add ToolMessage to history (required for OpenAI to know tool finished)
        newMessages.push(new ToolMessage({
            tool_call_id: call.id,
            content: JSON.stringify(result.data !== undefined ? result.data : result.error),
            name: call.name
        }));
    }

    return {
        agent: {
            ...agent,
            messages: newMessages,
            pendingToolCalls: [], // Clear pending
        },
        // Append new tool results to the main log
        toolResults: [...state.toolResults, ...newToolResults],
    };
}
