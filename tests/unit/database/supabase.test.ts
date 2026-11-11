/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ client: true })),
}));

const originalEnv = { ...process.env };

describe('createServerSupabaseClient', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  it('uses the secret key, and only it', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'legacy-anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'legacy-service-role';

    const { createServerSupabaseClient } = await import('@/lib/database/supabase');
    expect(createServerSupabaseClient()).toEqual({ client: true });
    expect(createClient).toHaveBeenCalledWith('https://example.supabase.co', 'sb_secret_test', expect.objectContaining({
      auth: expect.objectContaining({ persistSession: false }),
    }));
  });

  it('throws naming the missing variable, without falling back to a legacy key', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    delete process.env.SUPABASE_SECRET_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'legacy-anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'legacy-service-role';

    const { createServerSupabaseClient } = await import('@/lib/database/supabase');
    expect(() => createServerSupabaseClient()).toThrow('SUPABASE_SECRET_KEY');
    expect(createClient).not.toHaveBeenCalled();
  });

  it('throws without the project URL', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
    const { createServerSupabaseClient } = await import('@/lib/database/supabase');
    expect(() => createServerSupabaseClient()).toThrow('NEXT_PUBLIC_SUPABASE_URL');
  });

  it('has no browser client', async () => {
    const database = await import('@/lib/database/supabase');
    expect('createBrowserSupabaseClient' in database).toBe(false);
  });
});
