import { createServerSupabaseClient } from "@/lib/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
    Database,
    MessageRole,
    DbToolCall,
} from "@/lib/database/types";

export interface ConversationMessage {
    id?: string;
    role: MessageRole;
    content: string;
    tool_calls?: DbToolCall[];
    tool_call_id?: string;
    created_at?: string;
    sequence_number?: number;
}

export interface ConversationSession {
    id: string;
    workflowType: string;
    title?: string;
    ownerId?: string;
    ownerType?: 'admin' | 'user' | 'guest';
    messages: ConversationMessage[];
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

export interface SessionListItem {
    id: string;
    title: string | null;
    workflowType: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * Service for managing conversation history and state persistence.
 */
export class ConversationMemory {
    private supabase: SupabaseClient<Database> = createServerSupabaseClient();

    /**
     * Creates a new conversation session.
     */
    async createSession(
        workflowType: string,
        metadata: Record<string, unknown> = {},
        ownerId?: string,
        ownerType?: 'admin' | 'user' | 'guest'
    ): Promise<string> {
        const { data, error } = await this.supabase
            .from("conversation_sessions")
            .insert({
                workflow_type: workflowType,
                metadata: metadata as Database['public']['Tables']['conversation_sessions']['Insert']['metadata'],
                owner_id: ownerId || null,
                owner_type: ownerType || null,
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
            title: session.title || undefined,
            ownerId: session.owner_id || undefined,
            ownerType: session.owner_type as ConversationSession['ownerType'],
            messages: orderedMessages.map((m) => ({
                id: m.id,
                role: m.role as MessageRole,
                content: m.content,
                // REASON: Database JSONB column returns generic Json type,
                // but structure is validated as DbToolCall[] on insert.
                tool_calls: m.tool_calls ? (m.tool_calls as unknown as DbToolCall[]) : undefined,
                tool_call_id: m.tool_call_id ?? undefined,
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
        workflowType: string,
        ownerId?: string,
        ownerType?: 'admin' | 'user' | 'guest'
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

        const newSessionId = await this.createSession(workflowType, {}, ownerId, ownerType);
        return {
            sessionId: newSessionId,
            messages: [],
            isNew: true,
        };
    }

    /**
     * Updates the title of a session.
     */
    async updateSessionTitle(sessionId: string, title: string): Promise<void> {
        const { error } = await this.supabase
            .from("conversation_sessions")
            .update({ title })
            .eq("id", sessionId);

        if (error) {
            console.error("Error updating session title:", error);
            throw new Error(`Failed to update session title: ${error.message}`);
        }
    }

    /**
     * Gets the title of a session (null if not set).
     */
    async getSessionTitle(sessionId: string): Promise<string | null> {
        const { data, error } = await this.supabase
            .from("conversation_sessions")
            .select("title")
            .eq("id", sessionId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Session not found
            console.error("Error getting session title:", error);
            return null;
        }
        return data?.title || null;
    }

    /**
     * Lists sessions for a specific owner, ordered by most recent first.
     */
    async listSessionsByOwner(
        ownerId: string,
        ownerType: 'admin' | 'user' | 'guest',
        limit: number = 20
    ): Promise<SessionListItem[]> {
        const { data, error } = await this.supabase
            .from("conversation_sessions")
            .select("id, title, workflow_type, created_at, updated_at")
            .eq("owner_id", ownerId)
            .eq("owner_type", ownerType)
            .order("updated_at", { ascending: false })
            .limit(limit);

        if (error) {
            console.error("Error listing sessions:", error);
            return [];
        }

        return (data || []).map((s) => ({
            id: s.id,
            title: s.title,
            workflowType: s.workflow_type,
            createdAt: s.created_at,
            updatedAt: s.updated_at,
        }));
    }
}

export const conversationMemory = new ConversationMemory();
