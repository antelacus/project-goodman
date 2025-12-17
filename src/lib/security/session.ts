/**
 * Redis-Backed Session Management
 *
 * Provides secure session tokens stored in Redis with automatic expiry.
 * Uses HTTP-only cookies for security against XSS attacks.
 */

import { v4 as uuidv4 } from 'uuid';
import { redis } from '../redis';

// =============================================================================
// Types
// =============================================================================

export interface SessionData {
    token: string;
    createdAt: string;       // ISO 8601
    expiresAt: string;       // ISO 8601
    ip: string;
    userAgent: string;
    // V3.7 extension fields (for future multi-user support)
    userId?: string;
    role?: 'admin' | 'user' | 'guest';
}

// =============================================================================
// Constants
// =============================================================================

const SESSION_TTL = 24 * 60 * 60;  // 24 hours in seconds
const SESSION_KEY_PREFIX = 'session:';

export const COOKIE_NAME = 'session';

export const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: SESSION_TTL,
};

// =============================================================================
// Session Functions
// =============================================================================

/**
 * Create a new session and store in Redis
 * @param ip - Client IP address
 * @param userAgent - Client User-Agent string
 * @returns Session data including token
 */
export async function createSession(ip: string, userAgent: string): Promise<SessionData> {
    const token = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL * 1000);

    const session: SessionData = {
        token,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        ip,
        userAgent,
        role: 'admin',  // Current single-admin model
    };

    await redis.set(
        `${SESSION_KEY_PREFIX}${token}`,
        JSON.stringify(session),
        SESSION_TTL
    );

    return session;
}

/**
 * Verify a session token is valid and not expired
 * @param token - Session token from cookie
 * @returns Session data if valid, null otherwise
 */
export async function verifySession(token: string): Promise<SessionData | null> {
    if (!token) return null;

    const data = await redis.get(`${SESSION_KEY_PREFIX}${token}`);
    if (!data) return null;

    try {
        const session: SessionData = JSON.parse(data);

        // Check if session has expired
        if (new Date(session.expiresAt) < new Date()) {
            await redis.del(`${SESSION_KEY_PREFIX}${token}`);
            return null;
        }

        return session;
    } catch {
        // Invalid JSON in Redis
        await redis.del(`${SESSION_KEY_PREFIX}${token}`);
        return null;
    }
}

/**
 * Destroy a session (logout)
 * @param token - Session token to invalidate
 */
export async function destroySession(token: string): Promise<void> {
    if (token) {
        await redis.del(`${SESSION_KEY_PREFIX}${token}`);
    }
}

/**
 * Renew a session's TTL for active users
 * @param token - Session token to renew
 * @returns true if renewed, false if session not found
 */
export async function renewSession(token: string): Promise<boolean> {
    const session = await verifySession(token);
    if (!session) return false;

    const newExpiresAt = new Date(Date.now() + SESSION_TTL * 1000);
    session.expiresAt = newExpiresAt.toISOString();

    await redis.set(
        `${SESSION_KEY_PREFIX}${token}`,
        JSON.stringify(session),
        SESSION_TTL
    );

    return true;
}

/**
 * Get remaining session time in seconds
 * @param token - Session token
 * @returns Remaining seconds or null if session not found
 */
export async function getSessionRemainingTime(token: string): Promise<number | null> {
    const session = await verifySession(token);
    if (!session) return null;

    const remainingMs = new Date(session.expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(remainingMs / 1000));
}
