// @vitest-environment node
import { sanitizeEvent } from '@/lib/observability/error-tracking';
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
          stacktrace: { frames: [{ filename: '/home/deploy/app.js' }] },
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
