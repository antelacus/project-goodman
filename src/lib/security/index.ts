/**
 * Security Module
 *
 * Security and authentication utilities:
 * - admin-auth: Admin password verification and session management
 * - audit-logger: Audit logging for security events
 * - brute-force: Brute force attack prevention
 * - error-handler: Secure error handling
 * - request-id: Request ID generation
 * - file-validator: File upload validation
 * - password: Password hashing utilities
 * - rate-limiter: Request rate limiting
 * - session: Session management
 */

// Admin Auth (V3.9: Legacy in-memory sessions removed, use session.ts for Redis sessions)
export {
  verifyAdminPassword,
  type PasswordVerificationResult,
} from "./admin-auth";

// Session (V3.10: Redis-backed sessions with role support)
export {
  createAccountSession,
  createGuestSession,
  verifySession,
  destroySession,
  renewSession,
  getSessionRemainingTime,
  getCookieOptions,
  COOKIE_NAME,
  type SessionData,
} from "./session";

// Brute Force Protection
export {
  checkBruteForce,
  recordFailedAttempt,
  resetBruteForce,
  getBruteForceState,
  type BruteForceCheckResult,
  type RecordFailureResult,
} from "./brute-force";

// Audit Logger
export {
  auditLogger,
  logAuthEvent,
  logSecurityEvent,
  logDataEvent,
  logAdminEvent,
  type AuditLogEntry,
} from "./audit-logger";

// Error Handler
export { generateRequestId } from "./request-id";
export { createErrorResponse } from "./error-handler";

// File Validator
export {
  validateFileByExtension,
} from "./file-validator";

// Guest Session (V3.10)
export {
  ensureSession,
  applySessionCookie,
  getSession,
  isAdmin,
  requireAdmin,
  isErrorResponse,
  getClientIP,
  type EnsureSessionResult,
} from "./guest-session";

// Guest Rate Limiting (V3.10)
export {
  checkGuestRate,
  incrementGuestRate,
  getGuestRateLimits,
  resetGuestRate,
  resetAllGuestRates,
  GUEST_RATE_LIMITS,
  type GuestAction,
  type GuestRateResult,
} from "./guest-rate";

// CSRF Protection (V3.9)
export {
  generateCsrfToken,
  setCsrfCookie,
  getCsrfTokenFromCookie,
  getCsrfTokenFromHeader,
  validateCsrf,
  requiresCsrfProtection,
  createCsrfErrorResponse,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from "./csrf";
