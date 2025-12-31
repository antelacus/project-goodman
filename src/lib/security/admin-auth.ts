/**
 * Admin Authentication Utilities
 *
 * Provides secure password verification for admin features.
 * Admin password is stored in environment variable ADMIN_PASSWORD.
 *
 * V3.2: Uses bcrypt for password hashing with migration support.
 * V3.9: Removed legacy in-memory sessions (replaced by Redis sessions in session.ts).
 */

import { verifyPassword } from './password';

// Types
export interface PasswordVerificationResult {
  valid: boolean;
  needsRehash: boolean;
}

/**
 * Verify a password against the stored admin password
 * Supports both bcrypt hashes and plaintext (for migration)
 *
 * @param password - Plain text password to verify
 * @returns Verification result with needsRehash flag
 */
export async function verifyAdminPassword(password: string): Promise<PasswordVerificationResult> {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      console.error('ADMIN_PASSWORD environment variable is not set');
      return { valid: false, needsRehash: false };
    }

    // Use bcrypt verification with migration support
    const result = await verifyPassword(password, adminPassword);

    if (result.needsRehash) {
      console.warn(
        'SECURITY: Admin password should be upgraded to bcrypt hash. ' +
        'Generate with: node -e "require(\'bcryptjs\').hash(\'PASSWORD\', 12).then(console.log)"'
      );
    }

    return result;
  } catch (error) {
    console.error('Error verifying admin password:', error);
    return { valid: false, needsRehash: false };
  }
}
