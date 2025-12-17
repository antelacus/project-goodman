/**
 * Password Hashing Utilities
 *
 * Provides secure bcrypt password hashing with support for migrating
 * from plaintext passwords. Uses cost factor 12 for security/performance balance.
 */

import bcrypt from 'bcryptjs';

// Cost factor 12: ~300ms on modern hardware, secure against brute-force
const BCRYPT_COST = 12;

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
    const valid = plaintext === stored;
    // If valid, signal that password should be upgraded to bcrypt
    return { valid, needsRehash: valid };
}
