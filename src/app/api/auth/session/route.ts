export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import {
    generateRequestId,
    createErrorResponse,
    verifySession,
    renewSession,
    COOKIE_NAME,
} from "@/lib/security";

/**
 * GET /api/auth/session
 *
 * Get current session status.
 * Returns authenticated user info or guest session info.
 */
export async function GET(req: NextRequest) {
    const requestId = req.headers.get('x-request-id') || generateRequestId();

    try {
        const token = req.cookies.get(COOKIE_NAME)?.value;

        if (!token) {
            return NextResponse.json(
                { authenticated: false },
                { status: 200, headers: { 'X-Request-ID': requestId } }
            );
        }

        const session = await verifySession(token);

        if (!session) {
            // Session expired or invalid
            const response = NextResponse.json(
                { authenticated: false },
                { status: 200 }
            );

            // Clear invalid cookie
            response.cookies.set(COOKIE_NAME, '', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/',
                maxAge: 0,
            });

            response.headers.set('X-Request-ID', requestId);
            return response;
        }

        // Renew session TTL on activity
        await renewSession(token);

        // Return session info based on role
        if (session.role === 'admin' || session.role === 'user') {
            return NextResponse.json(
                {
                    authenticated: true,
                    user: {
                        id: session.userId,
                        username: session.username,
                        displayName: session.displayName,
                        role: session.role,
                    },
                    expiresAt: new Date(session.expiresAt).getTime(),
                },
                { status: 200, headers: { 'X-Request-ID': requestId } }
            );
        }

        // Guest session
        return NextResponse.json(
            {
                authenticated: true,
                user: null,
                role: 'guest',
                sessionId: session.sessionId,
                expiresAt: new Date(session.expiresAt).getTime(),
            },
            { status: 200, headers: { 'X-Request-ID': requestId } }
        );
    } catch (error: unknown) {
        console.error('Session check error:', error);
        return createErrorResponse(error, requestId, 500);
    }
}
