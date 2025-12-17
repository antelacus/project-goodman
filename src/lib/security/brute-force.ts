/**
 * Brute-Force Protection
 *
 * Implements rate limiting for authentication attempts using Redis.
 * Uses exponential delay after initial failures, then account lockout.
 *
 * Thresholds (per user request):
 * - 3 failures: 2-second delay before next attempt
 * - 5 failures: 15-minute lockout
 */

import { redis } from '../redis';

// =============================================================================
// Types
// =============================================================================

interface BruteForceState {
    count: number;
    lastAttempt: number;  // Unix timestamp (ms)
    lockedUntil?: number; // Unix timestamp (ms)
}

export interface BruteForceCheckResult {
    allowed: boolean;
    waitSeconds?: number;  // How long to wait before next attempt
    locked?: boolean;      // Whether account is locked
}

export interface RecordFailureResult {
    locked: boolean;
    lockDuration?: number;  // Lock duration in seconds
}

// =============================================================================
// Constants
// =============================================================================

const LOCKOUT_THRESHOLDS = {
    DELAY_AFTER: 3,          // Start 2s delay after 3 failures
    LOCK_AFTER: 5,           // Lock after 5 failures (per user request)
    DELAY_SECONDS: 2,        // Delay between attempts after threshold
    LOCK_DURATION: 15 * 60,  // 15 minutes lockout
};

const BRUTEFORCE_KEY_PREFIX = 'bruteforce:';
const BRUTEFORCE_TTL = 15 * 60;  // 15 minutes

// =============================================================================
// Functions
// =============================================================================

/**
 * Check if an authentication attempt is allowed
 * @param ip - Client IP address
 * @param identifier - Account identifier (default: 'admin' for single-admin model)
 * @returns Whether attempt is allowed and any required wait time
 */
export async function checkBruteForce(
    ip: string,
    identifier: string = 'admin'
): Promise<BruteForceCheckResult> {
    const key = `${BRUTEFORCE_KEY_PREFIX}${ip}:${identifier}`;
    const data = await redis.get(key);

    if (!data) {
        return { allowed: true };
    }

    try {
        const state: BruteForceState = JSON.parse(data);

        // Check if currently locked
        if (state.lockedUntil && Date.now() < state.lockedUntil) {
            const waitSeconds = Math.ceil((state.lockedUntil - Date.now()) / 1000);
            return { allowed: false, waitSeconds, locked: true };
        }

        // If lock has expired, allow but still count failures
        if (state.lockedUntil && Date.now() >= state.lockedUntil) {
            return { allowed: true };
        }

        // Check if needs delay (after DELAY_AFTER failures but before lockout)
        if (state.count >= LOCKOUT_THRESHOLDS.DELAY_AFTER) {
            const waitSeconds = LOCKOUT_THRESHOLDS.DELAY_SECONDS;
            return { allowed: true, waitSeconds };  // Allowed but should wait
        }

        return { allowed: true };
    } catch {
        // Invalid data, allow attempt
        return { allowed: true };
    }
}

/**
 * Record a failed authentication attempt
 * @param ip - Client IP address
 * @param identifier - Account identifier
 * @returns Whether account is now locked and for how long
 */
export async function recordFailedAttempt(
    ip: string,
    identifier: string = 'admin'
): Promise<RecordFailureResult> {
    const key = `${BRUTEFORCE_KEY_PREFIX}${ip}:${identifier}`;
    const data = await redis.get(key);

    let state: BruteForceState;
    try {
        state = data ? JSON.parse(data) : { count: 0, lastAttempt: 0 };
    } catch {
        state = { count: 0, lastAttempt: 0 };
    }

    state.count += 1;
    state.lastAttempt = Date.now();

    // Check if should lock
    if (state.count >= LOCKOUT_THRESHOLDS.LOCK_AFTER) {
        state.lockedUntil = Date.now() + LOCKOUT_THRESHOLDS.LOCK_DURATION * 1000;
        await redis.set(key, JSON.stringify(state), LOCKOUT_THRESHOLDS.LOCK_DURATION);
        return { locked: true, lockDuration: LOCKOUT_THRESHOLDS.LOCK_DURATION };
    }

    await redis.set(key, JSON.stringify(state), BRUTEFORCE_TTL);
    return { locked: false };
}

/**
 * Reset brute-force counter after successful login
 * @param ip - Client IP address
 * @param identifier - Account identifier
 */
export async function resetBruteForce(
    ip: string,
    identifier: string = 'admin'
): Promise<void> {
    const key = `${BRUTEFORCE_KEY_PREFIX}${ip}:${identifier}`;
    await redis.del(key);
}

/**
 * Get current brute-force state (for debugging/monitoring)
 * @param ip - Client IP address
 * @param identifier - Account identifier
 * @returns Current state or null if no attempts recorded
 */
export async function getBruteForceState(
    ip: string,
    identifier: string = 'admin'
): Promise<BruteForceState | null> {
    const key = `${BRUTEFORCE_KEY_PREFIX}${ip}:${identifier}`;
    const data = await redis.get(key);

    if (!data) return null;

    try {
        return JSON.parse(data);
    } catch {
        return null;
    }
}
