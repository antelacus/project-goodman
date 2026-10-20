/**
 * A conversation store that lives in memory, for runs that must not write the
 * shared production database: the retrieval eval and graph tests (DESIGN §9).
 */

import { randomUUID } from "crypto";
import type { AgentMemory, ConversationMessage } from "./conversation-memory";

export function createInMemoryMemory(): AgentMemory & { messagesOf(sessionId: string): ConversationMessage[] } {
    const sessions = new Map<string, { title: string | null; messages: ConversationMessage[] }>();

    return {
        async getOrCreateSession(sessionId) {
            const existing = sessionId ? sessions.get(sessionId) : undefined;
            if (sessionId && existing) return { sessionId, messages: [...existing.messages], isNew: false };
            const id = randomUUID();
            sessions.set(id, { title: null, messages: [] });
            return { sessionId: id, messages: [], isNew: true };
        },
        async saveMessages(sessionId, messages) {
            sessions.get(sessionId)?.messages.push(...messages);
        },
        async getSessionTitle(sessionId) {
            return sessions.get(sessionId)?.title ?? null;
        },
        async updateSessionTitle(sessionId, title) {
            const session = sessions.get(sessionId);
            if (session) session.title = title;
        },
        messagesOf(sessionId) {
            return sessions.get(sessionId)?.messages ?? [];
        },
    };
}
