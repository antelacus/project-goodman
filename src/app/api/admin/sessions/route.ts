/**
 * Admin Sessions API
 *
 * GET  - List all active sessions
 * DELETE - Terminate a session by sessionId
 *
 * Both endpoints require admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isErrorResponse } from '@/lib/security/guest-session';
import { listAllSessions, destroySessionById } from '@/lib/security/session';
import { getGuestRateLimits } from '@/lib/security/guest-rate';
import { logSecurityEvent } from '@/lib/security/audit-logger';
import { getClientIP } from '@/lib/security/guest-session';
import { validateCsrf, createCsrfErrorResponse } from '@/lib/security/csrf';
import { generateRequestId, createErrorResponse } from '@/lib/security';
import { SessionTerminateSchema, validateRequest } from '@/lib/validation/api-schemas';

/**
 * GET /api/admin/sessions
 * List all active sessions with their rate limit info
 */
export async function GET(request: NextRequest) {
    const requestId = request.headers.get('x-request-id') || generateRequestId();

    const adminResult = await requireAdmin(request);
    if (isErrorResponse(adminResult)) {
        return adminResult;
    }

    try {
        const sessions = await listAllSessions();

        // Enhance guest sessions with rate limit info
        const enhancedSessions = await Promise.all(
            sessions.map(async (session) => {
                const baseInfo = {
                    sessionId: session.sessionId,
                    role: session.role,
                    ip: session.ip,
                    userAgent: session.userAgent,
                    createdAt: session.createdAt,
                    expiresAt: session.expiresAt,
                    username: session.username,
                    displayName: session.displayName,
                };

                // Add rate limits for guest sessions
                if (session.role === 'guest') {
                    const limits = await getGuestRateLimits(session.sessionId);
                    return {
                        ...baseInfo,
                        limits: {
                            messageCount: 20 - limits.message.remaining,
                            uploadCount: 5 - limits.upload.remaining,
                            extractCount: 10 - limits.extract.remaining,
                        },
                    };
                }

                return baseInfo;
            })
        );

        // Count by role
        const adminCount = sessions.filter(s => s.role === 'admin').length;
        const guestCount = sessions.filter(s => s.role === 'guest').length;

        return NextResponse.json({
            sessions: enhancedSessions,
            summary: {
                total: sessions.length,
                admin: adminCount,
                guest: guestCount,
            },
        });
    } catch (error: unknown) {
        console.error('[Admin Sessions] Failed to list sessions:', error);
        return createErrorResponse(error, requestId, 500);
    }
}

/**
 * DELETE /api/admin/sessions
 * Terminate a session by sessionId (passed in body)
 */
export async function DELETE(request: NextRequest) {
    const requestId = request.headers.get('x-request-id') || generateRequestId();

    // V3.9: Validate CSRF token
    const csrfValid = await validateCsrf(request);
    if (!csrfValid) {
        return createCsrfErrorResponse();
    }

    const adminResult = await requireAdmin(request);
    if (isErrorResponse(adminResult)) {
        return adminResult;
    }

    try {
        const body = await request.json();

        // V3.9: Validate request with Zod schema
        const validation = validateRequest(SessionTerminateSchema, body);
        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error },
                { status: 400 }
            );
        }

        const { sessionId } = validation.data;

        // Prevent admin from terminating their own session
        if (sessionId === adminResult.sessionId) {
            return NextResponse.json(
                { error: '不能终止当前会话' },
                { status: 400 }
            );
        }

        const success = await destroySessionById(sessionId);

        if (!success) {
            return NextResponse.json(
                { error: '会话不存在或已过期' },
                { status: 404 }
            );
        }

        // Log the termination
        logSecurityEvent('session_terminated', getClientIP(request), adminResult.userId || 'admin', {
            targetSessionId: sessionId,
            adminUsername: adminResult.username,
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('[Admin Sessions] Failed to terminate session:', error);
        return createErrorResponse(error, requestId, 500);
    }
}
