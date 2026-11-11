// @vitest-environment node
// Acceptance tests for docs/features/public-readiness/REQ.md, one per §-id, one file per
// batch (TRACK 二). Each todo names its batch; a batch is done when its tests run
// unmarked and green, and the version cannot close while a todo is left.
// Asserted elsewhere: §anon-denied, §default-privileges, §rls-all — supabase/tests/access.sql
// (in a transaction on the live database, B2); §legacy-keys-disabled, §env-smoke,
// §history-*, §audit-findings, §actions-cleared, §deploy-after-rewrite, §public-settings —
// release checks recorded as Phase 4 / Phase 6 evidence (DESIGN §9, B8).

import fs from 'fs';
import path from 'path';

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? sourceFiles(path.join(dir, e.name)) : /\.(ts|tsx)$/.test(e.name) ? [path.join(dir, e.name)] : []
  );

describe('B1 one database entry on the secret key', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
    vi.resetModules();
  });

  it('§server-secret-key the server client reads SUPABASE_SECRET_KEY and no legacy key variable; without it the first database call throws naming the variable, with no fallback', async () => {
    const files = sourceFiles(path.join(process.cwd(), 'src')).filter(f => !f.endsWith('database.types.ts'));
    const matching = (pattern: RegExp) => files.filter(f => pattern.test(fs.readFileSync(f, 'utf8'))).map(f => path.relative(process.cwd(), f));
    expect(matching(/NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY/)).toEqual([]);
    // The one place that creates a database client is the entry itself.
    expect(matching(/\bcreateClient\s*[<(]/)).toEqual(['src/lib/database/supabase.ts']);

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    delete process.env.SUPABASE_SECRET_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'legacy-anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'legacy-service-role';
    const { createServerSupabaseClient } = await import('@/lib/database');
    expect(() => createServerSupabaseClient()).toThrow('Missing SUPABASE_SECRET_KEY environment variable');
  });
});
