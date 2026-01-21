/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ client: true })),
}));

const originalEnv = { ...process.env };

describe('supabase client helpers', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  it('throws when server env vars are missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const { createServerSupabaseClient } = await import('@/lib/database/supabase');
    expect(() => createServerSupabaseClient()).toThrow('Missing Supabase environment variables');
  });

  it('creates server client when env vars exist', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    const { createServerSupabaseClient } = await import('@/lib/database/supabase');
    const client = createServerSupabaseClient();

    expect(client).toEqual({ client: true });
    expect(createClient).toHaveBeenCalledWith('https://example.supabase.co', 'anon-key');
  });

  it('rejects browser client creation in node context', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    const { createBrowserSupabaseClient } = await import('@/lib/database/supabase');
    expect(() => createBrowserSupabaseClient()).toThrow('browser context');
  });
});
