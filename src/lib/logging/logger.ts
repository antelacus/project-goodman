/**
 * Structured Logging Utility
 *
 * Provides production-ready logging with:
 * - Log levels (debug, info, warn, error)
 * - Request context (requestId, route, duration)
 * - Sensitive data filtering
 * - JSON-formatted output for log aggregation
 */

// =============================================================================
// Types
// =============================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  userId?: string;
  route?: string;
  duration?: number;
  method?: string;
  status?: number;
  [key: string]: unknown;
}

// =============================================================================
// Sensitive Data Filtering
// =============================================================================

/**
 * Fields that should never be logged
 * Uses partial matching (case-insensitive)
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'apikey',
  'api_key',
  'secret',
  'authorization',
  'credential',
  'bearer',
  'cookie',
  'session',
];

/**
 * Remove sensitive fields from context object
 * Performs shallow filtering - does not recurse into nested objects
 */
function sanitizeContext(context: LogContext): LogContext {
  const sanitized: LogContext = {};

  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some((field) =>
      lowerKey.includes(field)
    );

    if (!isSensitive) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// =============================================================================
// Logger Class
// =============================================================================

class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  /**
   * Check if a message at the given level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  /**
   * Format log entry as structured JSON string
   */
  private format(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const sanitizedContext = context ? sanitizeContext(context) : undefined;

    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(sanitizedContext && Object.keys(sanitizedContext).length > 0
        ? sanitizedContext
        : {}),
    };

    return JSON.stringify(logEntry);
  }

  /**
   * Log at DEBUG level
   * Use for detailed debugging information
   */
  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.format('debug', message, context));
    }
  }

  /**
   * Log at INFO level
   * Use for general operational information
   */
  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.format('info', message, context));
    }
  }

  /**
   * Log at WARN level
   * Use for potentially harmful situations
   */
  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.format('warn', message, context));
    }
  }

  /**
   * Log at ERROR level
   * Use for error events that might still allow the app to continue
   */
  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      console.error(this.format('error', message, context));
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

/**
 * Global logger instance
 * - Production: info level (debug messages hidden)
 * - Development: debug level (all messages shown)
 */
export const logger = new Logger(
  process.env.NODE_ENV === 'production' ? 'info' : 'debug'
);

// =============================================================================
// Request Logging Helper
// =============================================================================

/**
 * Log an HTTP request with standard format
 *
 * @param requestId - Unique request identifier for tracing
 * @param method - HTTP method (GET, POST, etc.)
 * @param route - API route path
 * @param status - HTTP status code
 * @param durationMs - Request duration in milliseconds
 * @param context - Additional context (optional)
 */
export function logRequest(
  requestId: string,
  method: string,
  route: string,
  status: number,
  durationMs: number,
  context?: Omit<LogContext, 'requestId' | 'method' | 'route' | 'status' | 'duration'>
): void {
  const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
  const message = `${method} ${route} ${status} ${durationMs}ms`;

  const fullContext: LogContext = {
    requestId,
    method,
    route,
    status,
    duration: durationMs,
    ...context,
  };

  switch (level) {
    case 'error':
      logger.error(message, fullContext);
      break;
    case 'warn':
      logger.warn(message, fullContext);
      break;
    default:
      logger.info(message, fullContext);
  }
}

// =============================================================================
// Error Logging Helper
// =============================================================================

/**
 * Log an error with request context
 *
 * @param message - Error description
 * @param error - The error object
 * @param requestId - Request ID for tracing
 * @param context - Additional context (optional)
 */
export function logError(
  message: string,
  error: unknown,
  requestId?: string,
  context?: LogContext
): void {
  const errorMessage =
    error instanceof Error ? error.message : String(error);
  const errorStack =
    error instanceof Error ? error.stack?.split('\n').slice(0, 5).join('\n') : undefined;

  logger.error(message, {
    ...context,
    requestId,
    error: errorMessage,
    stack: errorStack,
  });
}
