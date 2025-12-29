import { createServerSupabaseClient } from "@/lib/database";

export interface ConversationMessage {
    id?: string;
    role: "user" | "assistant" | "tool" | "system";
    content: string;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
    created_at?: string;
    sequence_number?: number;
}

export interface ToolCall {
    id: string;
    type: string;
    function: {
        name: string;
        arguments: string;
    };
}

export interface ConversationSession {
    id: string;
    workflowType: string;
    messages: ConversationMessage[];
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

/**
 * Service for managing conversation history and state persistence.
 *
 * Note: Uses type assertions for tables not yet in generated Supabase types.
 * The tables were created via migration (20251222_conversation_memory.sql).
 */
export class ConversationMemory {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private supabase: any = createServerSupabaseClient();

    /**
     * Creates a new conversation session.
     */
    async createSession(
        workflowType: string,
        metadata: Record<string, unknown> = {}
    ): Promise<string> {
        const { data, error } = await this.supabase
            .from("conversation_sessions")
            .insert({
                workflow_type: workflowType,
                metadata,
            })
            .select("id")
            .single();

        if (error) {
            console.error("Error creating session:", error);
            throw new Error(`Failed to create session: ${error.message}`);
        }
        return data.id;
    }

    /**
     * Loads a session and its recent messages.
     * @param sessionId The UUID of the session
     * @param limit Number of most recent messages to load (default 10)
     */
    async loadSession(
        sessionId: string,
        limit: number = 50
    ): Promise<ConversationSession | null> {
        // 1. Get session details
        const { data: session, error: sessionError } = await this.supabase
            .from("conversation_sessions")
            .select("*")
            .eq("id", sessionId)
            .single();

        if (sessionError || !session) {
            if (sessionError && sessionError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
                console.error("Error loading session:", sessionError);
            }
            return null;
        }

        // 2. Get messages
        const { data: messages, error: messagesError } = await this.supabase
            .from("conversation_messages")
            .select("*")
            .eq("session_id", sessionId)
            .order("sequence_number", { ascending: false })
            .limit(limit);

        if (messagesError) {
            console.error("Error loading messages:", messagesError);
            return null;
        }

        // Messages are returned in descending order (newest first), reverse to get chronological order
        const orderedMessages = (messages || []).reverse();

        return {
            id: session.id,
            workflowType: session.workflow_type,
            messages: orderedMessages.map((m: any) => ({
                id: m.id,
                role: m.role as any,
                content: m.content,
                tool_calls: m.tool_calls ? (m.tool_calls as any) : undefined,
                tool_call_id: m.tool_call_id,
                created_at: m.created_at,
                sequence_number: m.sequence_number,
            })),
            metadata: session.metadata as Record<string, unknown>,
            createdAt: session.created_at,
            updatedAt: session.updated_at,
        };
    }

    /**
     * Saves new messages to the session.
     */
    async saveMessages(
        sessionId: string,
        messages: ConversationMessage[]
    ): Promise<void> {
        if (messages.length === 0) return;

        // Get current max sequence number to append correctly
        const { data: maxSeq } = await this.supabase
            .from("conversation_messages")
            .select("sequence_number")
            .eq("session_id", sessionId)
            .order("sequence_number", { ascending: false })
            .limit(1)
            .single();

        let nextSequence = (maxSeq?.sequence_number || 0) + 1;

        const messagesToInsert = messages.map(m => ({
            session_id: sessionId,
            role: m.role,
            content: m.content,
            tool_calls: m.tool_calls ? JSON.parse(JSON.stringify(m.tool_calls)) : null, // Ensure JSONB compatibility
            tool_call_id: m.tool_call_id || null,
            sequence_number: nextSequence++,
        }));

        const { error } = await this.supabase
            .from("conversation_messages")
            .insert(messagesToInsert);

        if (error) {
            console.error("Error saving messages:", error);
            throw new Error(`Failed to save messages: ${error.message}`);
        }

        // Update conversation updated_at
        await this.supabase
            .from("conversation_sessions")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", sessionId);
    }

    /**
     * Helper to get an existing session or start a new one.
     */
    async getOrCreateSession(
        sessionId: string | undefined,
        workflowType: string
    ): Promise<{ sessionId: string; messages: ConversationMessage[]; isNew: boolean }> {
        if (sessionId) {
            const session = await this.loadSession(sessionId);
            if (session) {
                return {
                    sessionId: session.id,
                    messages: session.messages,
                    isNew: false,
                };
            }
        }

        const newSessionId = await this.createSession(workflowType);
        return {
            sessionId: newSessionId,
            messages: [],
            isNew: true,
        };
    }
}

export const conversationMemory = new ConversationMemory();
