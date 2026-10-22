/**
 * Load Memory Node
 *
 * Initializes the agent session and loads conversation history.
 * Standardized for use in Unified Agent.
 */

import { BaseAgentState, DocumentLoadError, newQuestionState } from "../state/base-state";
import type { AgentMemory } from "@/lib/memory/conversation-memory";
import { SystemMessage, HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { createServerSupabaseClient } from "@/lib/database";

/**
 * Loads memory and initializes agent state
 *
 * @param state Current graph state (mostly empty at start)
 * @returns Partial state update
 */
export const createLoadMemoryNode = (memory: AgentMemory) => async function loadMemoryNode(
    state: BaseAgentState
): Promise<Partial<BaseAgentState>> {
    if (!state.input) {
        console.error("State.input is undefined!");
        // Fallback or throw
        throw new Error("State.input is undefined in loadMemoryNode");
    }
    const { sessionId: requestedSessionId, workflowType, documentIds, ownerId, ownerType } = state.input;

    // 1. Get or create session
    // Default to 'unified' if not specified
    const effectiveWorkflowType = workflowType || "unified";

    const { sessionId: activeSessionId, messages: history } = await memory.getOrCreateSession(
        requestedSessionId,
        effectiveWorkflowType,
        ownerId,
        ownerType
    );

    // 2. Fetch Document Context if documentIds are present
    let contextMessage: SystemMessage | null = null;
    const documentLoadErrors: DocumentLoadError[] = [];

    if (documentIds && documentIds.length > 0) {
        try {
            const supabase = createServerSupabaseClient();
            const docsContentPromises = documentIds.map(async (docId) => {
                const { data: chunks, error } = await supabase
                    .from("document_chunks")
                    .select("content")
                    .eq("document_id", docId)
                    .order("chunk_index", { ascending: true });

                if (error) {
                    console.error(`Failed to fetch chunks for doc ${docId}:`, error);
                    documentLoadErrors.push({
                        documentId: docId,
                        error: error.message || "Unknown database error",
                    });
                    return null;
                }
                if (!chunks || chunks.length === 0) {
                    documentLoadErrors.push({
                        documentId: docId,
                        error: "Document has no content chunks",
                    });
                    return null;
                }

                return `Document ID: ${docId}\n\n${chunks.map((c: { content: string }) => c.content).join("\n")}`;
            });

            const docsContents = await Promise.all(docsContentPromises);
            const validContents = docsContents.filter(c => c !== null);

            if (validContents.length > 0) {
                const combinedContext = validContents.join("\n\n---\n\n");
                contextMessage = new SystemMessage(
                    `[Active Document Context]\nThe user has provided the following document content for reference in this conversation. If you need to perform specific extraction tools, use the provided Document IDs.\n\n${combinedContext}\n\n[End of Document Context]`
                );
            }
        } catch (err) {
            console.error("Error fetching document context:", err);
            // Add a general error for the entire operation
            documentLoadErrors.push({
                documentId: null, // null indicates general error (not document-specific)
                error: err instanceof Error ? err.message : "Failed to fetch document context",
            });
        }
    }

    // 3. Convert DB messages to LangChain BaseMessage[]. Earlier questions come back
    // as their questions and final answers only: their tool results carry evidence
    // ids (R1…) that this question numbers afresh, so an old [R1] would cite a new article.
    const conversation = history.filter(msg =>
        msg.role === "user" || (msg.role === "assistant" && !(msg.tool_calls?.length))
    );
    const messages: BaseMessage[] = conversation.map(msg =>
        msg.role === "user" ? new HumanMessage(msg.content || "") : new AIMessage(msg.content || "")
    );

    // Append context message if it exists
    if (contextMessage) {
        messages.push(contextMessage);
    }

    // 4. Initialize Agent Runtime State
    return {
        agent: {
            sessionId: activeSessionId,
            messages: messages,
            currentIteration: 0,
            maxIterations: 10,  // Default max iterations
            initialMessageCount: messages.length,
            isComplete: false,
            pendingToolCalls: [],
            ...newQuestionState(),
        },
        // Reset tool results for this turn
        toolResults: [],
        // Propagate any document loading errors for downstream handling
        documentLoadErrors: documentLoadErrors.length > 0 ? documentLoadErrors : undefined,
    };
};
