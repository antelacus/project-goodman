import { AIMessage, BaseMessage, ToolMessage } from "@langchain/core/messages";

/**
 * Drops tool calls that have no tool result, and tool results that answer no
 * call. An unpaired call is left when a turn ends before its tools ran (the
 * iteration limit); the model API rejects such a history on the next request,
 * so it must not be sent or saved.
 */
export function dropUnpairedToolCalls(messages: BaseMessage[]): BaseMessage[] {
    const resultIds = new Set(
        messages.filter(m => m._getType() === "tool").map(m => (m as ToolMessage).tool_call_id)
    );
    const callIds = new Set<string>();
    const kept: BaseMessage[] = [];

    for (const msg of messages) {
        if (msg._getType() === "ai" && (msg as AIMessage).tool_calls?.length) {
            const ai = msg as AIMessage;
            const paired = ai.tool_calls!.filter(tc => tc.id && resultIds.has(tc.id));
            paired.forEach(tc => callIds.add(tc.id!));
            if (paired.length === ai.tool_calls!.length) {
                kept.push(msg);
            } else if (paired.length > 0 || (typeof ai.content === "string" && ai.content.trim())) {
                kept.push(new AIMessage({ content: ai.content, tool_calls: paired }));
            }
            continue;
        }
        if (msg._getType() === "tool" && !callIds.has((msg as ToolMessage).tool_call_id)) continue;
        kept.push(msg);
    }
    return kept;
}
