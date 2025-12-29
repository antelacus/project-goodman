/**
 * Admin Authentication Utilities
 *
 * Provides secure password verification and session management for admin features.
 * Admin password is stored in environment variable ADMIN_PASSWORD.
 *
 * V3.2: Uses bcrypt for password hashing with migration support.
 * Sessions are now primarily handled by Redis (see security/session.ts).
 * Legacy in-memory sessions kept for backward compatibility during transition.
 */

import { randomBytes } from 'crypto';
import { verifyPassword } from './password';

// Types
export interface AdminSession {
  token: string;
  createdAt: number;
  expiresAt: number;
}

export interface PasswordVerificationResult {
  valid: boolean;
  needsRehash: boolean;
}

// Constants
const SESSION_DURATION_MS = 60 * 60 * 1000; // 1 hour

// In-memory session storage (legacy - prefer Redis sessions for new code)
const activeSessions = new Map<string, AdminSession>();

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

    // DEBUG: Log what we're working with (remove after debugging)
    console.log('[DEBUG] verifyAdminPassword called');
    console.log('[DEBUG] ADMIN_PASSWORD set:', !!adminPassword);
    console.log('[DEBUG] ADMIN_PASSWORD length:', adminPassword?.length);
    console.log('[DEBUG] ADMIN_PASSWORD starts with $2:', adminPassword?.startsWith('$2'));
    console.log('[DEBUG] Input password length:', password?.length);

    if (!adminPassword) {
      console.error('ADMIN_PASSWORD environment variable is not set');
      return { valid: false, needsRehash: false };
    }

    // Use bcrypt verification with migration support
    const result = await verifyPassword(password, adminPassword);

    console.log('[DEBUG] verifyPassword result:', result);

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

/**
 * Create a new admin session and return the session token
 * @returns Session token and expiration timestamp
 */
export function createAdminSession(): AdminSession {
  const token = randomBytes(32).toString('hex');
  const createdAt = Date.now();
  const expiresAt = createdAt + SESSION_DURATION_MS;

  const session: AdminSession = {
    token,
    createdAt,
    expiresAt,
  };

  activeSessions.set(token, session);

  // Clean up expired sessions
  cleanupExpiredSessions();

  return session;
}

/**
 * Verify if a session token is valid and not expired
 * @param token - Session token to verify
 * @returns True if session is valid, false otherwise
 */
export function verifyAdminSession(token: string): boolean {
  const session = activeSessions.get(token);

  if (!session) {
    return false;
  }

  // Check if session has expired
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return false;
  }

  return true;
}

/**
 * Revoke an admin session
 * @param token - Session token to revoke
 */
export function revokeAdminSession(token: string): void {
  activeSessions.delete(token);
}

/**
 * Get session information
 * @param token - Session token
 * @returns Session info or null if not found
 */
export function getAdminSession(token: string): AdminSession | null {
  const session = activeSessions.get(token);

  if (!session) {
    return null;
  }

  // Check if expired
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }

  return session;
}

/**
 * Clean up all expired sessions from memory
 */
export function cleanupExpiredSessions(): void {
  const now = Date.now();
  const expiredTokens: string[] = [];

  for (const [token, session] of activeSessions.entries()) {
    if (now > session.expiresAt) {
      expiredTokens.push(token);
    }
  }

  expiredTokens.forEach(token => activeSessions.delete(token));
}

/**
 * Get the number of active sessions (for debugging/monitoring)
 * @returns Number of active sessions
 */
export function getActiveSessionCount(): number {
  cleanupExpiredSessions();
  return activeSessions.size;
}

/**
 * Clear all active sessions (for testing or emergency logout)
 */
export function clearAllSessions(): void {
  activeSessions.clear();
}

/**
 * Extract admin token from request headers
 * @param headers - Request headers
 * @returns Admin token or null
 */
export function extractAdminToken(headers: Headers): string | null {
  const authHeader = headers.get('authorization');

  if (!authHeader) {
    return null;
  }

  // Expected format: "Bearer <token>"
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}

/**
 * Middleware helper to verify admin authentication
 * @param headers - Request headers
 * @returns True if authenticated, false otherwise
 */
export function isAdminAuthenticated(headers: Headers): boolean {
  const token = extractAdminToken(headers);

  if (!token) {
    return false;
  }

  return verifyAdminSession(token);
}

/**
 * Get remaining session time in seconds
 * @param token - Session token
 * @returns Remaining seconds or null if session not found
 */
export function getSessionRemainingTime(token: string): number | null {
  const session = getAdminSession(token);

  if (!session) {
    return null;
  }

  const remainingMs = session.expiresAt - Date.now();
  return Math.max(0, Math.floor(remainingMs / 1000));
}
