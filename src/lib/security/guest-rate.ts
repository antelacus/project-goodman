/**
 * Guest Rate Limiting
 *
 * Provides rate limiting for guest users on specific actions.
 * Uses Redis for distributed rate limit tracking.
 */

import { redis } from '@/lib/database/redis';

// =============================================================================
// Configuration
// =============================================================================

export const GUEST_RATE_LIMITS = {
    message: {
        limit: 20,
        windowMs: 60 * 60 * 1000,  // 1 hour
    },
    upload: {
        limit: 5,
        windowMs: 60 * 60 * 1000,
    },
    extract: {
        limit: 10,
        windowMs: 60 * 60 * 1000,
    },
    report: {
        limit: 3,
        windowMs: 60 * 60 * 1000,  // 3 reports per hour for guests
    },
} as const;

export type GuestAction = keyof typeof GUEST_RATE_LIMITS;

// =============================================================================
// Types
// =============================================================================

export interface GuestRateResult {
    allowed: boolean;
    remaining: number;
    total: number;
    resetsAt: number;  // Unix timestamp in milliseconds
}

interface RateLimitData {
    count: number;
    windowStart: number;
}

// =============================================================================
// Rate Limit Functions
// =============================================================================

/**
 * Get Redis key for guest rate limit
 */
function getRateLimitKey(sessionId: string, action: GuestAction): string {
    return `guest:rate:${sessionId}:${action}`;
}

/**
 * Check if a guest action is allowed
 */
export async function checkGuestRate(
    sessionId: string,
    action: GuestAction
): Promise<GuestRateResult> {
    const config = GUEST_RATE_LIMITS[action];
    const key = getRateLimitKey(sessionId, action);
    const now = Date.now();

    try {
        const data = await redis.get(key);

        if (!data) {
            // No rate limit data - allowed
            return {
                allowed: true,
                remaining: config.limit,
                total: config.limit,
                resetsAt: now + config.windowMs,
            };
        }

        const rateData: RateLimitData = JSON.parse(data);

        // Check if window has expired
        if (now - rateData.windowStart >= config.windowMs) {
            // Window expired - allowed
            return {
                allowed: true,
                remaining: config.limit,
                total: config.limit,
                resetsAt: now + config.windowMs,
            };
        }

        // Window still active - check count
        const remaining = Math.max(0, config.limit - rateData.count);
        const resetsAt = rateData.windowStart + config.windowMs;

        return {
            allowed: remaining > 0,
            remaining,
            total: config.limit,
            resetsAt,
        };
    } catch (error) {
        console.error('[GuestRate] Error checking rate limit:', error);
        // On error, allow the action but don't track
        return {
            allowed: true,
            remaining: config.limit,
            total: config.limit,
            resetsAt: now + config.windowMs,
        };
    }
}

/**
 * Increment the rate limit counter for an action
 * Call this after the action is successfully performed
 */
export async function incrementGuestRate(
    sessionId: string,
    action: GuestAction
): Promise<void> {
    const config = GUEST_RATE_LIMITS[action];
    const key = getRateLimitKey(sessionId, action);
    const now = Date.now();
    const ttlSeconds = Math.ceil(config.windowMs / 1000);

    try {
        const data = await redis.get(key);

        let rateData: RateLimitData;

        if (!data) {
            // Start new window
            rateData = { count: 1, windowStart: now };
        } else {
            rateData = JSON.parse(data);

            // Check if window has expired
            if (now - rateData.windowStart >= config.windowMs) {
                // Start new window
                rateData = { count: 1, windowStart: now };
            } else {
                // Increment count
                rateData.count += 1;
            }
        }

        await redis.set(key, JSON.stringify(rateData), ttlSeconds);
    } catch (error) {
        console.error('[GuestRate] Error incrementing rate limit:', error);
        // Don't fail the request on rate limit tracking errors
    }
}

/**
 * Get all rate limits for a guest session
 */
export async function getGuestRateLimits(
    sessionId: string
): Promise<Record<GuestAction, GuestRateResult>> {
    const results: Partial<Record<GuestAction, GuestRateResult>> = {};

    for (const action of Object.keys(GUEST_RATE_LIMITS) as GuestAction[]) {
        results[action] = await checkGuestRate(sessionId, action);
    }

    return results as Record<GuestAction, GuestRateResult>;
}

/**
 * Reset rate limit for a specific action (admin use)
 */
export async function resetGuestRate(
    sessionId: string,
    action: GuestAction
): Promise<void> {
    const key = getRateLimitKey(sessionId, action);
    await redis.del(key);
}

/**
 * Reset all rate limits for a session (admin use)
 */
export async function resetAllGuestRates(sessionId: string): Promise<void> {
    for (const action of Object.keys(GUEST_RATE_LIMITS) as GuestAction[]) {
        await resetGuestRate(sessionId, action);
    }
}
