/**
 * Tool Executor Node
 *
 * Executes pending tool calls for the agent. Searches are budgeted per question
 * (REQ §5.3): a request over the budget is not run and gets its own result,
 * "budget_exhausted", which is not "nothing found"; the next turn then answers
 * with no tools. Regulation results are numbered R1…Rn across rounds and kept as
 * the evidence the answer may cite.
 */

import { BaseAgentState, ToolResultEntry } from "../state/base-state";
import { toolRegistry } from "@/lib/tools/registry";
import { ToolMessage } from "@langchain/core/messages";
import type { ToolExecutionResult } from "@/lib/tools/types";
import type { Evidence } from "@/lib/citations";
import type { SearchRegulationsData, RegulationResult } from "@/lib/tools/search/search-regulations";
import type { SearchDocumentsData } from "@/lib/tools/search/search-documents";

export const SEARCH_BUDGET = 3;
const SEARCH_TOOLS = new Set(["search_regulations", "search_documents"]);

export async function toolExecutorNode(
    state: BaseAgentState
): Promise<Partial<BaseAgentState>> {
    const { agent } = state;
    const { pendingToolCalls, messages } = agent;

    if (pendingToolCalls.length === 0) {
        return { agent: { ...agent, pendingToolCalls: [] } };
    }

    const search = { ...agent.search };
    const evidence = [...agent.evidence];
    let mustAnswer = agent.mustAnswer;
    const newToolResults: ToolResultEntry[] = [];
    const newMessages = [...messages];

    // Sequential on purpose: several searches in one reply are counted in order.
    for (const call of pendingToolCalls) {
        console.log(`Executing tool: ${call.name}`);
        let result: ToolExecutionResult;

        if (SEARCH_TOOLS.has(call.name) && search.used >= SEARCH_BUDGET) {
            result = { success: true, data: { status: "budget_exhausted" } };
            mustAnswer = true;
            // Asked for, it is a regulation question: the answer gets its label.
            if (call.name === "search_regulations") search.regulationSearched = true;
        } else {
            result = await toolRegistry.execute(call.name, call.arguments);
            if (SEARCH_TOOLS.has(call.name)) search.used += 1;
            if (call.name === "search_regulations") {
                search.regulationSearched = true;
                // Badly worded input never reached the database, so it is not a retrieval failure.
                if (!result.invalidInput) {
                    search.regulationRuns += 1;
                    if (!result.success) search.regulationFailed += 1;
                }
            }
            if (call.name === "search_regulations" && result.success) {
                result = { ...result, data: numberResults(result.data as SearchRegulationsData, evidence) };
            }
        }

        newToolResults.push({
            toolCallId: call.id,
            toolName: call.name,
            result,
            timestamp: Date.now(),
        });

        // Add ToolMessage to history (required for OpenAI to know tool finished)
        newMessages.push(new ToolMessage({
            tool_call_id: call.id,
            content: JSON.stringify(modelView(call.name, result)),
            name: call.name
        }));
    }

    return {
        agent: {
            ...agent,
            messages: newMessages,
            pendingToolCalls: [],
            search,
            evidence,
            mustAnswer,
        },
        toolResults: [...state.toolResults, ...newToolResults],
    };
}

function numberResults(data: SearchRegulationsData, evidence: Evidence[]): SearchRegulationsData {
    const results: RegulationResult[] = data.results.map(r => {
        // R ids count regulation evidence only: the selected documents' D ids share the list.
        const id = `R${evidence.filter(e => e.kind === "regulation").length + 1}`;
        evidence.push({
            id,
            kind: "regulation",
            name: r.regulationName,
            articleNumber: r.articleNumber,
            documentId: r.documentId,
            fileUrl: r.fileUrl,
        });
        return { ...r, id };
    });
    return { ...data, results };
}

/** What the model reads: search results without the storage fields it has no use for. */
function modelView(toolName: string, result: ToolExecutionResult): unknown {
    if (!result.success) return result.error;
    if (toolName === "search_regulations" && (result.data as SearchRegulationsData).results) {
        const data = result.data as SearchRegulationsData;
        return {
            status: data.status,
            ...(data.reason && { reason: data.reason }),
            results: data.results.map(r => ({ id: r.id, regulation: r.regulation, articleNumber: r.articleNumber, content: r.content })),
        };
    }
    if (toolName === "search_documents" && (result.data as SearchDocumentsData).results) {
        const data = result.data as SearchDocumentsData;
        return {
            status: data.status,
            ...(data.reason && { reason: data.reason }),
            results: data.results.map(r => ({ document: r.document, year: r.year, section: r.section, content: r.content })),
        };
    }
    return result.data !== undefined ? result.data : result.error;
}
