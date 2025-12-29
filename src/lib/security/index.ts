/**
 * Security Module
 *
 * Security and authentication utilities:
 * - admin-auth: Admin password verification and session management
 * - audit-logger: Audit logging for security events
 * - brute-force: Brute force attack prevention
 * - error-handler: Secure error handling
 * - file-validator: File upload validation
 * - password: Password hashing utilities
 * - rate-limiter: Request rate limiting
 * - session: Session management
 */

// Admin Auth
export {
  verifyAdminPassword,
  createAdminSession,
  verifyAdminSession,
  revokeAdminSession,
  getAdminSession,
  cleanupExpiredSessions,
  getActiveSessionCount,
  clearAllSessions,
  extractAdminToken,
  isAdminAuthenticated,
  getSessionRemainingTime as getAdminSessionRemainingTime,
  type AdminSession,
  type PasswordVerificationResult,
} from "./admin-auth";

// Session
export {
  createSession,
  verifySession,
  destroySession,
  renewSession,
  getSessionRemainingTime,
  COOKIE_NAME,
  COOKIE_OPTIONS,
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
export {
  generateRequestId,
  createErrorResponse,
} from "./error-handler";

// File Validator
export {
  validateFileByExtension,
} from "./file-validator";
