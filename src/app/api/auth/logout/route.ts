export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import {
    generateRequestId,
    createErrorResponse,
    verifySession,
    destroySession,
    COOKIE_NAME,
    logAuthEvent,
} from "@/lib/security";

/**
 * Helper to extract client IP from request
 */
function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return request.headers.get('x-real-ip') || '127.0.0.1';
}

/**
 * POST /api/auth/logout
 *
 * Destroy current session and clear cookie.
 */
export async function POST(req: NextRequest) {
    const requestId = req.headers.get('x-request-id') || generateRequestId();
    const clientIP = getClientIP(req);
    const userAgent = req.headers.get('user-agent') || 'unknown';

    try {
        // Get session token from cookie
        const token = req.cookies.get(COOKIE_NAME)?.value;

        if (token) {
            // Get session info for logging before destroying
            const session = await verifySession(token);

            if (session) {
                logAuthEvent('logout', clientIP, userAgent, {
                    requestId,
                    userId: session.userId,
                    username: session.username,
                });
            }

            // Destroy session in Redis
            await destroySession(token);
        }

        // Build response with cookie cleared
        const response = NextResponse.json(
            { success: true },
            { status: 200 }
        );

        // Clear the cookie
        response.cookies.set(COOKIE_NAME, '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
            maxAge: 0,
        });

        response.headers.set('X-Request-ID', requestId);

        return response;
    } catch (error: unknown) {
        console.error('Logout error:', error);
        return createErrorResponse(error, requestId, 500);
    }
}
