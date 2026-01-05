/**
 * Password Hashing Utilities
 *
 * Provides secure bcrypt password hashing with support for migrating
 * from plaintext passwords. Uses cost factor 12 for security/performance balance.
 *
 * V3.9: Added constant-time comparison for plaintext migration path
 */

import bcrypt from 'bcryptjs';
import { timingSafeEqual } from 'crypto';

// Cost factor 12: ~300ms on modern hardware, secure against brute-force
const BCRYPT_COST = 12;

/**
 * Constant-time string comparison to prevent timing attacks
 * Always takes the same time regardless of where strings differ
 */
function constantTimeCompare(a: string, b: string): boolean {
    // If lengths differ, perform dummy comparison to maintain constant time
    if (a.length !== b.length) {
        const dummy = Buffer.alloc(32);
        timingSafeEqual(dummy, dummy);
        return false;
    }

    try {
        return timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
        return false;
    }
}

/**
 * Hash a plaintext password using bcrypt
 * @param plaintext - Password to hash
 * @returns bcrypt hash string
 */
export async function hashPassword(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, BCRYPT_COST);
}

/**
 * Verify a password against a stored hash or plaintext
 * Supports migration from plaintext to bcrypt hashes
 *
 * @param plaintext - Password attempt
 * @param stored - Stored password (bcrypt hash or plaintext)
 * @returns Object with validation result and rehash flag
 */
export async function verifyPassword(
    plaintext: string,
    stored: string
): Promise<{ valid: boolean; needsRehash: boolean }> {
    // Check if stored password is a bcrypt hash ($2a$, $2b$, or $2y$ prefix)
    if (stored.startsWith('$2')) {
        const valid = await bcrypt.compare(plaintext, stored);
        return { valid, needsRehash: false };
    }

    // Plaintext comparison (for migration from MVP)
    // Uses constant-time comparison to prevent timing attacks
    const valid = constantTimeCompare(plaintext, stored);
    // If valid, signal that password should be upgraded to bcrypt
    return { valid, needsRehash: valid };
}
