import 'server-only';

import type { ErrorEvent } from '@sentry/types';

type ErrorContext = {
  requestId?: string;
  route?: string;
  tags?: Record<string, string>;
};

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
];

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

let initialized = false;
let enabled = false;

function redact(value: string): string {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(value))
    ? '[REDACTED]'
    : value;
}

function sanitizeExtras(
  extras?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!extras) return undefined;
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(extras)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some((field) => lowerKey.includes(field));
    if (isSensitive) continue;

    sanitized[key] = typeof value === 'string' ? redact(value) : value;
  }

  return sanitized;
}

export function sanitizeEvent(event: ErrorEvent): ErrorEvent | null {
  const sanitized: ErrorEvent = {
    ...event,
    request: undefined,
    user: undefined,
    extra: sanitizeExtras(event.extra),
    message: event.message ? redact(event.message) : event.message,
  };

  if (sanitized.exception?.values) {
    sanitized.exception.values = sanitized.exception.values.map((value) => ({
      ...value,
      value: value.value ? redact(value.value) : value.value,
    }));
  }

  return sanitized;
}

function isServerRuntime(): boolean {
  return typeof window === 'undefined' && process.env.NEXT_RUNTIME !== 'edge';
}

export async function initErrorTracking(): Promise<void> {
  if (initialized || !isServerRuntime()) return;
  const dsn = process.env.GLITCHTIP_DSN;
  if (!dsn) return;

  // Lazy-load @sentry/node only in Node.js runtime to avoid webpack bundling issues
  // This uses require() which is evaluated at runtime, not build time
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.GLITCHTIP_ENV || process.env.NODE_ENV,
      tracesSampleRate: 0,
      sendDefaultPii: false,
      beforeSend: sanitizeEvent,
    });
    initialized = true;
    enabled = true;
    console.log('[ErrorTracking] Initialized with GlitchTip');
  } catch (error) {
    console.error('[ErrorTracking] Failed to initialize:', error);
  }
}

export function captureError(error: unknown, context?: ErrorContext): void {
  if (!enabled || !isServerRuntime()) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/node');
    Sentry.withScope((scope: { setTag: (key: string, value: string) => void }) => {
      if (context?.requestId) scope.setTag('requestId', context.requestId);
      if (context?.route) scope.setTag('route', context.route);
      if (context?.tags) {
        for (const [key, value] of Object.entries(context.tags)) {
          scope.setTag(key, value);
        }
      }
      Sentry.captureException(error);
    });
  } catch {
    // Silently fail if Sentry not available
  }
}
