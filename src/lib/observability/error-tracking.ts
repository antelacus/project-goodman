import 'server-only';

import * as Sentry from '@sentry/node';
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

export function initErrorTracking(): void {
  if (initialized || !isServerRuntime()) return;
  const dsn = process.env.GLITCHTIP_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.GLITCHTIP_ENV || process.env.NODE_ENV,
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend: sanitizeEvent,
  });

  initialized = true;
  enabled = true;
}

export function captureError(error: unknown, context?: ErrorContext): void {
  if (!enabled || !isServerRuntime()) return;

  Sentry.withScope((scope) => {
    if (context?.requestId) scope.setTag('requestId', context.requestId);
    if (context?.route) scope.setTag('route', context.route);
    if (context?.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value);
      }
    }

    Sentry.captureException(error);
  });
}
