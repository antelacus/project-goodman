/**
 * Redis-Backed Session Management
 *
 * Provides secure session tokens stored in Redis with automatic expiry.
 * Uses HTTP-only cookies for security against XSS attacks.
 */

import { v4 as uuidv4 } from 'uuid';
import { redis } from '@/lib/database/redis';

// =============================================================================
// Types
// =============================================================================

export interface SessionData {
    token: string;
    createdAt: string;       // ISO 8601
    expiresAt: string;       // ISO 8601
    ip: string;
    userAgent: string;
    // V3.10: User management fields
    sessionId: string;                      // UUID for document association
    role: 'admin' | 'user' | 'guest';       // User role
    userId?: string;                        // users.id for admin/user (undefined for guest)
    username?: string;                      // For admin/user
    displayName?: string;                   // Display name
}

// =============================================================================
// Constants
// =============================================================================

// V3.10: Different TTLs for admin and guest sessions
const ADMIN_SESSION_TTL = 24 * 60 * 60;  // 24 hours in seconds
const GUEST_SESSION_TTL = 60 * 60;       // 1 hour in seconds
const SESSION_KEY_PREFIX = 'session:';

export const COOKIE_NAME = 'session';

export function getCookieOptions(role: 'admin' | 'user' | 'guest') {
    const ttl = role === 'guest' ? GUEST_SESSION_TTL : ADMIN_SESSION_TTL;
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path: '/',
        maxAge: ttl,
    };
}

// =============================================================================
// Session Functions
// =============================================================================

/**
 * Create the session for a logged-in account. Its role is the account's role in
 * the database: only an admin account gets an admin session (REQ §5.8).
 */
export async function createAccountSession(
    ip: string,
    userAgent: string,
    user: { id: string; username: string; role: string; displayName?: string | null }
): Promise<SessionData> {
    const token = uuidv4();
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ADMIN_SESSION_TTL * 1000);

    const session: SessionData = {
        token,
        sessionId,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        ip,
        userAgent,
        role: user.role === 'admin' ? 'admin' : 'user',
        userId: user.id,
        username: user.username,
        displayName: user.displayName || undefined,
    };

    await redis.set(
        `${SESSION_KEY_PREFIX}${token}`,
        JSON.stringify(session),
        ADMIN_SESSION_TTL
    );

    return session;
}

/**
 * Create a guest session (auto-created on first interaction)
 * @param ip - Client IP address
 * @param userAgent - Client User-Agent string
 * @returns Session data including token
 */
export async function createGuestSession(ip: string, userAgent: string): Promise<SessionData> {
    const token = uuidv4();
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + GUEST_SESSION_TTL * 1000);

    const session: SessionData = {
        token,
        sessionId,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        ip,
        userAgent,
        role: 'guest',
    };

    await redis.set(
        `${SESSION_KEY_PREFIX}${token}`,
        JSON.stringify(session),
        GUEST_SESSION_TTL
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
 * Uses appropriate TTL based on session role
 * @param token - Session token to renew
 * @returns true if renewed, false if session not found
 */
export async function renewSession(token: string): Promise<boolean> {
    const session = await verifySession(token);
    if (!session) return false;

    const ttl = session.role === 'guest' ? GUEST_SESSION_TTL : ADMIN_SESSION_TTL;
    const newExpiresAt = new Date(Date.now() + ttl * 1000);
    session.expiresAt = newExpiresAt.toISOString();

    await redis.set(
        `${SESSION_KEY_PREFIX}${token}`,
        JSON.stringify(session),
        ttl
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

/**
 * List all active sessions (admin only)
 * @returns Array of session data
 */
export async function listAllSessions(): Promise<SessionData[]> {
    const keys = await redis.keys(`${SESSION_KEY_PREFIX}*`);
    if (keys.length === 0) return [];

    const values = await redis.mget(keys);
    const sessions: SessionData[] = [];

    for (const value of values) {
        if (!value) continue;
        try {
            const session: SessionData = JSON.parse(value);
            // Skip expired sessions
            if (new Date(session.expiresAt) > new Date()) {
                sessions.push(session);
            }
        } catch {
            // Skip invalid entries
        }
    }

    // Sort by createdAt descending (newest first)
    sessions.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return sessions;
}

/**
 * Destroy a session by its sessionId (not token)
 * Used by admin to terminate specific sessions
 * @param sessionId - The sessionId field (not the token)
 * @returns true if session was found and destroyed
 */
export async function destroySessionById(sessionId: string): Promise<boolean> {
    const keys = await redis.keys(`${SESSION_KEY_PREFIX}*`);
    if (keys.length === 0) return false;

    const values = await redis.mget(keys);

    for (let i = 0; i < values.length; i++) {
        const value = values[i];
        if (!value) continue;

        try {
            const session: SessionData = JSON.parse(value);
            if (session.sessionId === sessionId) {
                await redis.del(keys[i]);
                return true;
            }
        } catch {
            // Skip invalid entries
        }
    }

    return false;
}
