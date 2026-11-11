// @vitest-environment node
// Acceptance tests for docs/features/public-readiness/REQ.md, one per §-id, one file per
// batch (TRACK 二). Each todo names its batch; a batch is done when its tests run
// unmarked and green, and the version cannot close while a todo is left.
// Asserted elsewhere: §anon-denied, §default-privileges, §rls-all — supabase/tests/access.sql
// (in a transaction on the live database, B2); §legacy-keys-disabled, §env-smoke,
// §history-*, §audit-findings, §actions-cleared, §deploy-after-rewrite, §public-settings —
// release checks recorded as Phase 4 / Phase 6 evidence (DESIGN §9, B8).

describe('B1 one database entry on the secret key', () => {
  it.todo('§server-secret-key the server client reads SUPABASE_SECRET_KEY and no legacy key variable; without it the first database call throws naming the variable, with no fallback');
});
