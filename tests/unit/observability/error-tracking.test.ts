// @vitest-environment node
import { parseTraceSampleRate, sanitizeEvent, withSentrySpan } from '@/lib/observability/error-tracking';
import type { ErrorEvent } from '@sentry/types';

test('sanitizeEvent removes request and redacts secrets', () => {
  const baseEvent: ErrorEvent = {
    message: 'password=secret',
    request: { headers: { authorization: 'Bearer token' } },
    extra: { token: 'abc', safe: 'ok' },
    exception: {
      values: [
        {
          value: 'Bearer token',
          stacktrace: { frames: [{ filename: '$DEPLOY_HOME/app.js' }] },
        },
      ],
    },
  };

  const sanitized = sanitizeEvent(baseEvent);

  expect(sanitized?.request).toBeUndefined();
  expect(sanitized?.message).toContain('[REDACTED]');
  expect(sanitized?.extra?.token).toBeUndefined();
  expect(sanitized?.extra?.safe).toBe('ok');
  expect(sanitized?.exception?.values?.[0]?.value).toContain('[REDACTED]');
});

test('parseTraceSampleRate defaults and clamps values', () => {
  expect(parseTraceSampleRate()).toBe(0);
  expect(parseTraceSampleRate('')).toBe(0);
  expect(parseTraceSampleRate('not-a-number')).toBe(0);
  expect(parseTraceSampleRate('-1')).toBe(0);
  expect(parseTraceSampleRate('0.25')).toBe(0.25);
  expect(parseTraceSampleRate('1.5')).toBe(1);
});

test('withSentrySpan returns callback result when disabled', async () => {
  const result = await withSentrySpan({ name: 'test-span' }, async () => 'ok');
  expect(result).toBe('ok');
});
