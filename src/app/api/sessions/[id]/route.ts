/**
 * Session Detail API
 *
 * Retrieves messages for a specific conversation session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ensureSession } from '@/lib/security';
import { conversationMemory } from '@/lib/memory';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: sessionId } = await params;

        // Get current auth session
        const sessionResult = await ensureSession(req);
        const { session: authSession } = sessionResult;

        // Determine owner info
        const ownerId = authSession.userId || authSession.sessionId;
        const ownerType = authSession.role;

        // Load the conversation session
        const conversationSession = await conversationMemory.loadSession(sessionId);

        if (!conversationSession) {
            return NextResponse.json(
                { error: 'Session not found' },
                { status: 404 }
            );
        }

        // Verify ownership - only allow access to own sessions
        if (conversationSession.ownerId !== ownerId || conversationSession.ownerType !== ownerType) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Filter messages to only return user and assistant messages (not tool/system)
        const displayMessages = conversationSession.messages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({
                role: m.role,
                content: m.content,
                id: m.id,
            }));

        // Build response
        const response = NextResponse.json({
            session: {
                id: conversationSession.id,
                title: conversationSession.title || '新对话',
                createdAt: conversationSession.createdAt,
                updatedAt: conversationSession.updatedAt,
            },
            messages: displayMessages,
        });

        // Set cookie for new sessions
        if (sessionResult.isNewSession && sessionResult.setCookieHeader) {
            response.cookies.set(
                sessionResult.setCookieHeader.name,
                sessionResult.setCookieHeader.value,
                sessionResult.setCookieHeader.options
            );
        }

        return response;
    } catch (error: any) {
        console.error('Error fetching session:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch session' },
            { status: 500 }
        );
    }
}
