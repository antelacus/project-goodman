/**
 * Guest Session Management
 *
 * Provides utilities for automatic guest session creation and management.
 * Guest sessions are created on first interaction (chat, upload, extract).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    createGuestSession,
    verifySession,
    renewSession,
    getCookieOptions,
    COOKIE_NAME,
    type SessionData,
} from './session';

/**
 * Helper to extract client IP from request
 */
export function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return request.headers.get('x-real-ip') || '127.0.0.1';
}

/**
 * Result of ensureSession call
 */
export interface EnsureSessionResult {
    session: SessionData;
    isNewSession: boolean;
    setCookieHeader?: { name: string; value: string; options: ReturnType<typeof getCookieOptions> };
}

/**
 * Ensure a valid session exists for the request.
 * If no session exists, creates a new guest session.
 *
 * @param request - NextRequest object
 * @returns Session data and whether it's a new session
 */
export async function ensureSession(request: NextRequest): Promise<EnsureSessionResult> {
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (token) {
        const session = await verifySession(token);
        if (session) {
            // Renew session TTL on activity
            await renewSession(token);
            return { session, isNewSession: false };
        }
    }

    // Create new guest session
    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const session = await createGuestSession(ip, userAgent);

    return {
        session,
        isNewSession: true,
        setCookieHeader: {
            name: COOKIE_NAME,
            value: session.token,
            options: getCookieOptions('guest'),
        },
    };
}

/**
 * Apply session cookie to response if needed
 */
export function applySessionCookie(
    response: NextResponse,
    result: EnsureSessionResult
): NextResponse {
    if (result.setCookieHeader) {
        response.cookies.set(
            result.setCookieHeader.name,
            result.setCookieHeader.value,
            result.setCookieHeader.options
        );
    }
    return response;
}

/**
 * Get session from request (returns null if not authenticated)
 */
export async function getSession(request: NextRequest): Promise<SessionData | null> {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const session = await verifySession(token);
    if (session) {
        await renewSession(token);
    }
    return session;
}

/**
 * Check if request has admin role
 */
export async function isAdmin(request: NextRequest): Promise<boolean> {
    const session = await getSession(request);
    return session?.role === 'admin';
}

/**
 * Require admin role - returns error response if not admin
 */
export async function requireAdmin(request: NextRequest): Promise<SessionData | NextResponse> {
    const session = await getSession(request);

    if (!session) {
        return NextResponse.json(
            { error: '未授权访问' },
            { status: 401 }
        );
    }

    if (session.role !== 'admin') {
        return NextResponse.json(
            { error: '权限不足' },
            { status: 403 }
        );
    }

    return session;
}

/**
 * Check if result is an error response
 */
export function isErrorResponse(result: SessionData | NextResponse): result is NextResponse {
    return result instanceof NextResponse;
}
