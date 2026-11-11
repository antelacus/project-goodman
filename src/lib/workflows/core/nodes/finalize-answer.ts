/**
 * Finalize Answer Node
 *
 * Runs the citation post-processing on the final answer before it is saved,
 * so history holds what the user saw (REQ §5.4, §5.5).
 */

import { AIMessage } from "@langchain/core/messages";
import { finalizeAnswer } from "@/lib/citations";
import { BaseAgentState } from "../state/base-state";

export async function finalizeAnswerNode(
    state: BaseAgentState
): Promise<Partial<BaseAgentState>> {
    const { agent } = state;
    const last = agent.messages[agent.messages.length - 1];
    if (!last || last._getType() !== "ai" || typeof last.content !== "string") return {};

    const { search, evidence } = agent;
    const { text, cited, removed } = finalizeAnswer(last.content, {
        evidence,
        regulationSearched: search.regulationSearched,
        allRegulationSearchesFailed: search.regulationRuns > 0 && search.regulationFailed === search.regulationRuns,
    });

    return {
        agent: {
            ...agent,
            messages: [...agent.messages.slice(0, -1), new AIMessage(text)],
            cited,
            removedCitations: removed,
        },
    };
}
