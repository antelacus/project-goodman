/**
 * Sessions API
 *
 * Lists conversation sessions for the current user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ensureSession, generateRequestId, createErrorResponse } from '@/lib/security';
import { conversationMemory } from '@/lib/memory';

export async function GET(req: NextRequest) {
    const requestId = req.headers.get('x-request-id') || generateRequestId();

    try {
        // Get current session
        const sessionResult = await ensureSession(req);
        const { session } = sessionResult;

        // Determine owner info
        // For admin/user: use userId as owner
        // For guest: use auth sessionId as owner
        const ownerId = session.userId || session.sessionId;
        const ownerType = session.role;

        // Fetch sessions for this owner
        const sessions = await conversationMemory.listSessionsByOwner(
            ownerId,
            ownerType,
            50 // Limit to 50 most recent sessions
        );

        // Build response
        const response = NextResponse.json({
            sessions: sessions.map(s => ({
                id: s.id,
                title: s.title || '新对话',
                createdAt: s.createdAt,
                updatedAt: s.updatedAt,
            })),
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
    } catch (error: unknown) {
        console.error('Error fetching sessions:', error);
        return createErrorResponse(error, requestId, 500);
    }
}
