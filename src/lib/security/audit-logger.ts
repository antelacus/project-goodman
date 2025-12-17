/**
 * Audit Logger
 * REQ-010: Structured JSON audit logging for security events
 * 
 * @module security/audit-logger
 * @description Provides structured audit logging for authentication,
 * security, and administrative events with log rotation support.
 */

import fs from 'fs';
import path from 'path';

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
    timestamp: string;        // ISO 8601 format
    eventType: 'auth' | 'data' | 'security' | 'admin';
    action: string;
    ip: string;
    userAgent: string;
    userId?: string;          // Reserved for V3.7 user management
    requestId?: string;
    details?: Record<string, unknown>;
}

/**
 * Logger configuration
 */
const LOG_DIR = process.env.AUDIT_LOG_DIR || '/var/log/goodman';
const LOG_FILE = 'audit.log';
const MAX_LOG_SIZE = 10 * 1024 * 1024;  // 10MB

/**
 * Audit Logger class with file rotation support
 */
class AuditLogger {
    private logFile: string;
    private isInitialized: boolean = false;
    private useConsoleOnly: boolean = false;

    constructor() {
        this.logFile = path.join(LOG_DIR, LOG_FILE);
        this.initializeLogDir();
    }

    /**
     * Initialize log directory (create if needed)
     */
    private initializeLogDir(): void {
        try {
            if (!fs.existsSync(LOG_DIR)) {
                fs.mkdirSync(LOG_DIR, { recursive: true });
            }

            // Test write access
            const testFile = path.join(LOG_DIR, '.write-test');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);

            this.isInitialized = true;
            console.log(`[AuditLogger] Initialized with log file: ${this.logFile}`);
        } catch (error) {
            // Cannot write to log directory, use console only
            console.warn(`[AuditLogger] Cannot write to ${LOG_DIR}, using console fallback:`, error);
            this.useConsoleOnly = true;
            this.isInitialized = true;
        }
    }

    /**
     * Log an audit entry
     */
    async log(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
        const fullEntry: AuditLogEntry = {
            timestamp: new Date().toISOString(),
            ...entry,
        };

        const line = JSON.stringify(fullEntry) + '\n';

        // Always log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`[Audit] ${fullEntry.eventType}.${fullEntry.action}:`, fullEntry);
        }

        // If using console only, just log and return
        if (this.useConsoleOnly) {
            console.log(`[Audit] ${line.trim()}`);
            return;
        }

        try {
            // Check for log rotation
            await this.rotateIfNeeded();

            // Append to log file
            fs.appendFileSync(this.logFile, line, 'utf-8');
        } catch (error) {
            // Log to console if file write fails
            console.error('[AuditLogger] Failed to write to log file:', error);
            console.log(`[Audit] ${line.trim()}`);
        }
    }

    /**
     * Rotate log file if it exceeds max size
     */
    private async rotateIfNeeded(): Promise<void> {
        try {
            if (!fs.existsSync(this.logFile)) {
                return;
            }

            const stats = fs.statSync(this.logFile);

            if (stats.size >= MAX_LOG_SIZE) {
                // Generate rotated file name with date
                const dateSuffix = new Date().toISOString().slice(0, 10);
                const timestamp = Date.now();
                const rotatedName = `audit.${dateSuffix}.${timestamp}.log`;
                const rotatedPath = path.join(LOG_DIR, rotatedName);

                // Rename current log to rotated name
                fs.renameSync(this.logFile, rotatedPath);
                console.log(`[AuditLogger] Log rotated: ${rotatedName}`);
            }
        } catch (error) {
            console.warn('[AuditLogger] Log rotation error:', error);
        }
    }

    /**
     * Get log directory path (for verification)
     */
    getLogDirectory(): string {
        return LOG_DIR;
    }

    /**
     * Get log file path (for verification)
     */
    getLogFile(): string {
        return this.logFile;
    }

    /**
     * Check if logger is using console only mode
     */
    isConsoleOnly(): boolean {
        return this.useConsoleOnly;
    }
}

// Singleton instance
export const auditLogger = new AuditLogger();

// ============================================================================
// Convenience functions for specific event types
// ============================================================================

/**
 * Log authentication events (login, logout, failed attempts)
 * 
 * @example
 * ```typescript
 * logAuthEvent('login_success', '192.168.1.1', 'Mozilla/5.0...', { 
 *   method: 'password' 
 * });
 * ```
 */
export function logAuthEvent(
    action: string,
    ip: string,
    userAgent: string,
    details?: Record<string, unknown>
): void {
    auditLogger.log({
        eventType: 'auth',
        action,
        ip,
        userAgent,
        details,
    });
}

/**
 * Log security events (rate limiting, lockouts, validation failures)
 * 
 * @example
 * ```typescript
 * logSecurityEvent('rate_limit_exceeded', '192.168.1.1', 'Mozilla/5.0...', {
 *   endpoint: '/api/financial-analysis',
 *   limit: 20
 * });
 * ```
 */
export function logSecurityEvent(
    action: string,
    ip: string,
    userAgent: string,
    details?: Record<string, unknown>
): void {
    auditLogger.log({
        eventType: 'security',
        action,
        ip,
        userAgent,
        details,
    });
}

/**
 * Log data access events (for future use)
 */
export function logDataEvent(
    action: string,
    ip: string,
    userAgent: string,
    details?: Record<string, unknown>
): void {
    auditLogger.log({
        eventType: 'data',
        action,
        ip,
        userAgent,
        details,
    });
}

/**
 * Log administrative actions (for future use)
 */
export function logAdminEvent(
    action: string,
    ip: string,
    userAgent: string,
    details?: Record<string, unknown>
): void {
    auditLogger.log({
        eventType: 'admin',
        action,
        ip,
        userAgent,
        details,
    });
}
