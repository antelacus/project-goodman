import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';

/**
 * The server's only database and Storage client, on the project's secret key
 * (public-readiness REQ §5.1). The anon and authenticated roles have no rights
 * and no key reaches them; a missing secret key fails loudly rather than falling
 * back to a legacy key, which would make "switched over" look true when checked.
 * Server-only: the secret key must never reach a browser (Supabase also refuses
 * it on a browser User-Agent).
 */
export function createServerSupabaseClient(): SupabaseClient<Database> {
  if (typeof window !== 'undefined') {
    throw new Error('createServerSupabaseClient is server-only: the secret key must never reach the browser');
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  if (!key) throw new Error('Missing SUPABASE_SECRET_KEY environment variable');
  return createClient<Database>(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
