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
import { loadDocumentText } from "@/lib/documents/text";
import { isSelectableBy } from "@/lib/documents/access";
import { numberDocuments, type DocumentForNumbering, type Evidence } from "@/lib/citations";

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

    // 2. The selected documents: only the requester's own uploads are read. Anyone
    // else's, and library documents (whose regulations would be numbered as the
    // user's own), are reported as not loaded, the same as a missing one.
    let contextMessage: SystemMessage | null = null;
    const documentLoadErrors: DocumentLoadError[] = [];
    let documentEvidence: Evidence[] = [];

    if (documentIds && documentIds.length > 0) {
        try {
            const supabase = createServerSupabaseClient();
            const { data: rows, error } = await supabase
                .from("documents")
                .select("id, name, file_url, doc_category, owner_type, owner_id")
                .in("id", documentIds);
            if (error) throw new Error(error.message);

            const loaded = await Promise.all(documentIds.map(async (docId): Promise<DocumentForNumbering | null> => {
                const doc = rows?.find(r => r.id === docId);
                if (!doc || !isSelectableBy(doc, { ownerType, ownerId })) {
                    documentLoadErrors.push({ documentId: docId, error: "Document not found" });
                    return null;
                }
                let text: string | null;
                try {
                    text = await loadDocumentText(supabase, docId);
                } catch (error) {
                    console.error(`Failed to fetch chunks for doc ${docId}:`, error);
                    documentLoadErrors.push({
                        documentId: docId,
                        error: error instanceof Error ? error.message : "Unknown database error",
                    });
                    return null;
                }
                if (text === null) {
                    documentLoadErrors.push({ documentId: docId, error: "Document has no content chunks" });
                    return null;
                }
                return { id: doc.id, name: doc.name, fileUrl: doc.file_url, text };
            }));

            const documents = loaded.filter((d): d is DocumentForNumbering => d !== null);
            if (documents.length > 0) {
                const numbered = numberDocuments(documents);
                documentEvidence = numbered.evidence;
                const combinedContext = documents
                    .map((doc, i) => `Document ID: ${doc.id}\nFile name: ${doc.name}\n\n${numbered.texts[i]}`)
                    .join("\n\n---\n\n");
                contextMessage = new SystemMessage(
                    `[Active Document Context]\nThe user has provided the following document content for reference in this conversation. If you need to perform specific extraction tools, use the provided Document IDs. Articles marked [Dn] are cited by that id only.\n\n${combinedContext}\n\n[End of Document Context]`
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
            evidence: documentEvidence,
        },
        // Reset tool results for this turn
        toolResults: [],
        // Propagate any document loading errors for downstream handling
        documentLoadErrors: documentLoadErrors.length > 0 ? documentLoadErrors : undefined,
    };
};
