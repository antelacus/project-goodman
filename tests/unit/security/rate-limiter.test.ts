/* @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limiter';

describe('checkRateLimit', () => {
  it.each(['/api/reports/generate', '/api/reports/parse-config'])(
    'limits %s as an AI endpoint',
    async (pathname) => {
      const result = await checkRateLimit(`ai-${pathname}`, pathname);

      expect(result.limit).toBe(RATE_LIMITS.ai.maxRequests);
    }
  );

  it('leaves report reads on the default limit', async () => {
    const result = await checkRateLimit('reads', '/api/reports/123e4567-e89b-42d3-a456-426614174000');

    expect(result.limit).toBe(RATE_LIMITS.default.maxRequests);
  });
});
