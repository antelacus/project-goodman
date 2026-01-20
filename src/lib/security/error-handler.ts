/**
 * Error Handler with Sanitization
 *
 * Provides environment-aware error handling that strips sensitive
 * information in production while preserving details in development.
 */

import { WORKFLOW_ERROR_MESSAGES } from '@/lib/errors';

// =============================================================================
// Types
// =============================================================================

export interface SanitizedError {
    error: string;       // User-friendly message
    requestId: string;   // For log correlation
    details?: string;    // Only in development
}

// =============================================================================
// Configuration
// =============================================================================

// Patterns that indicate sensitive information (should be filtered)
const SENSITIVE_PATTERNS = [
    /api[_-]?key/i,
    /secret/i,
    /password/i,
    /token/i,
    /supabase/i,
    /openai/i,
    /bearer/i,
    /authorization/i,
    /credential/i,
    /\/home\/\w+/,                    // Server paths
    /\/var\/\w+/,                     // Server paths
    /Error: connect ECONNREFUSED/,    // Connection errors with IPs
    /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, // IP addresses
];

// Generic error messages by error type
const GENERIC_MESSAGES: Record<string, string> = {
    ...WORKFLOW_ERROR_MESSAGES,
    NOT_FOUND: '请求的资源不存在',
    SERVER: '处理请求时出错，请稍后重试',
    DEFAULT: '发生错误，请稍后重试',
};

// =============================================================================
// Error Sanitization
// =============================================================================

/**
 * Check if a string contains sensitive information
 */
function containsSensitiveInfo(message: string): boolean {
    return SENSITIVE_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Get error message from unknown error type
 */
function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return '未知错误';
}

/**
 * Get error stack trace if available
 */
function getErrorStack(error: unknown): string | undefined {
    if (error instanceof Error && error.stack) {
        return error.stack;
    }
    return undefined;
}

/**
 * Determine the error type from the error
 */
function getErrorType(error: unknown): string {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes('validation') || message.includes('invalid')) {
            return 'VALIDATION';
        }
        if (message.includes('unauthorized') || message.includes('authentication')) {
            return 'AUTH';
        }
        if (message.includes('forbidden') || message.includes('permission')) {
            return 'FORBIDDEN';
        }
        if (message.includes('not found')) {
            return 'NOT_FOUND';
        }
        if (message.includes('timeout') || message.includes('timed out')) {
            return 'TIMEOUT';
        }
        if (message.includes('rate') || message.includes('limit')) {
            return 'RATE_LIMIT';
        }
    }

    return 'SERVER';
}

/**
 * Sanitize an error for safe client response
 *
 * In production: Returns generic message without sensitive details
 * In development: Includes full error details for debugging
 */
export function sanitizeError(
    error: unknown,
    requestId: string,
    options?: { isDev?: boolean; errorType?: string }
): SanitizedError {
    const isDev = options?.isDev ?? process.env.NODE_ENV === 'development';
    const errorType = options?.errorType ?? getErrorType(error);
    const originalMessage = getErrorMessage(error);

    if (isDev) {
        // Development: include full details
        return {
            error: GENERIC_MESSAGES[errorType] || GENERIC_MESSAGES.DEFAULT,
            requestId,
            details: originalMessage,
        };
    }

    // Production: generic message only

    // Log the full error server-side for debugging
    const stack = getErrorStack(error);
    console.error(`[Error] RequestID: ${requestId}`, {
        type: errorType,
        message: originalMessage,
        stack: stack?.split('\n').slice(0, 5).join('\n'), // First 5 lines
        hasSensitiveInfo: containsSensitiveInfo(originalMessage),
    });

    return {
        error: GENERIC_MESSAGES[errorType] || GENERIC_MESSAGES.DEFAULT,
        requestId,
    };
}

/**
 * Create a standardized error response for API routes
 */
export function createErrorResponse(
    error: unknown,
    requestId: string,
    statusCode: number = 500,
    options?: { isDev?: boolean; errorType?: string; route?: string }
): Response {
    const sanitized = sanitizeError(error, requestId, options);

    // Use dynamic import to avoid webpack bundling @sentry/node for client
    if (statusCode >= 500 && typeof window === 'undefined') {
        import('@/lib/observability/error-tracking')
            .then(({ captureError }) => {
                captureError(error, { requestId, route: options?.route });
            })
            .catch(() => {
                // Silently fail if error tracking not available
            });
    }

    return new Response(JSON.stringify(sanitized), {
        status: statusCode,
        headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
        },
    });
}

// =============================================================================
// Error Type Helpers
// =============================================================================

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class AuthError extends Error {
    constructor(message: string = '认证失败') {
        super(message);
        this.name = 'AuthError';
    }
}

export class RateLimitError extends Error {
    constructor(message: string = '请求过于频繁') {
        super(message);
        this.name = 'RateLimitError';
    }
}
