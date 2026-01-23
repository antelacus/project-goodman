/* @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { resolveSessionRole } from '@/lib/security/session-client';

describe('resolveSessionRole', () => {
  it('returns admin when session response includes user role', () => {
    const role = resolveSessionRole({
      authenticated: true,
      user: { role: 'admin' },
    });

    expect(role).toBe('admin');
  });

  it('returns guest when response includes top-level role', () => {
    const role = resolveSessionRole({
      authenticated: true,
      role: 'guest',
    });

    expect(role).toBe('guest');
  });

  it('defaults to guest when response is missing', () => {
    const role = resolveSessionRole(null);

    expect(role).toBe('guest');
  });
});
