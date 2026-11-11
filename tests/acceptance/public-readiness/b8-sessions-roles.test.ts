// @vitest-environment node
// Acceptance tests for docs/features/public-readiness/REQ.md §5.8 (Codex pre-deploy review, access).

import { existsSync } from 'node:fs';
import { NextRequest } from 'next/server';
import * as auth from '@/lib/auth';
import * as security from '@/lib/security';
import { POST as loginPOST } from '@/app/api/auth/login/route';
import { GET as sessionGET } from '@/app/api/sessions/[id]/route';
import { GET as adminStatsGET } from '@/app/api/admin/stats/route';
import { verifySession } from '@/lib/security/session';
import { ConversationMemory } from '@/lib/memory/conversation-memory';
import { isReadableBy, requesterOf } from '@/lib/documents/access';

const store = vi.hoisted(() => new Map<string, string>());
vi.mock('@/lib/database/redis', () => ({
  redis: {
    get: async (k: string) => store.get(k) ?? null,
    set: async (k: string, v: string) => void store.set(k, v),
    del: async (k: string) => void store.delete(k),
    expire: async () => undefined,
    incr: async () => 1,
    keys: async () => [...store.keys()],
    mget: async (ks: string[]) => ks.map(k => store.get(k) ?? null),
  },
}));

type SessionRow = { id: string; workflow_type: string; owner_id: string | null; owner_type: string | null; title: null; metadata: object; created_at: string; updated_at: string };
const db = vi.hoisted(() => ({
  sessions: [] as SessionRow[],
  messages: [] as Array<{ id: string; session_id: string; role: string; content: string; sequence_number: number; created_at: string }>,
}));

vi.mock('@/lib/database', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/database')>()),
  createServerSupabaseClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: (_column: string, value: string) => ({
          single: async () => {
            const row = db.sessions.find(s => s.id === value);
            return row ? { data: row, error: null } : { data: null, error: { code: 'PGRST116' } };
          },
          order: () => ({ limit: async () => ({ data: db.messages.filter(m => m.session_id === value).reverse(), error: null }) }),
        }),
      }),
      insert: (row: { owner_id: string; owner_type: string; workflow_type: string }) => ({
        select: () => ({
          single: async () => {
            const id = `new-${db.sessions.length}`;
            db.sessions.push({ id, workflow_type: row.workflow_type, owner_id: row.owner_id, owner_type: row.owner_type, title: null, metadata: {}, created_at: '', updated_at: '' });
            return { data: { id }, error: null };
          },
        }),
      }),
      table,
    }),
  }),
}));
vi.mock('@/lib/auth', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/auth')>()),
  authenticateUser: vi.fn(),
}));
vi.mock('@/lib/security', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/security')>()),
  ensureSession: vi.fn(),
  setCsrfCookie: vi.fn(),
  checkBruteForce: vi.fn(async () => ({ allowed: true })),
  resetBruteForce: vi.fn(),
  recordFailedAttempt: vi.fn(),
}));

const ALICE = '1e5f6a7b-8c9d-4eaf-8b10-2c3d4e5f6a7b';
const BOB = '2f6a7b8c-9d0e-4fb0-9c21-3d4e5f6a7b8c';
const BOBS_SESSION = '3a7b8c9d-0e1f-4a0b-8d32-4e5f6a7b8c9d';
const account = (id: string, role: 'admin' | 'user') => ({
  success: true,
  user: { id, username: id.slice(0, 4), role, displayName: null, email: null, isActive: true, createdAt: '', updatedAt: '', lastLoginAt: '' },
});

async function logIn(id: string, role: 'admin' | 'user') {
  vi.mocked(auth.authenticateUser).mockResolvedValue(account(id, role) as Awaited<ReturnType<typeof auth.authenticateUser>>);
  const response = await loginPOST(new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'someone', password: 'a-password' }),
  }));
  expect(response.status).toBe(200);
  const token = response.cookies.get(security.COOKIE_NAME)!.value;
  return (await verifySession(token))!;
}

beforeEach(() => {
  store.clear();
  db.sessions = [{ id: BOBS_SESSION, workflow_type: 'unified', owner_id: BOB, owner_type: 'user', title: null, metadata: {}, created_at: '', updated_at: '' }];
  db.messages = [{ id: 'm1', session_id: BOBS_SESSION, role: 'user', content: '鲍勃的私人问题', sequence_number: 1, created_at: '' }];
});

describe('B8 sessions and roles', () => {
  it('§session-owner a conversation started with someone else\'s session id loads none of its history and goes into a new session; viewing it is 404', async () => {
    const memory = new ConversationMemory();
    const started = await memory.getOrCreateSession(BOBS_SESSION, 'unified', ALICE, 'user');
    expect(started.isNew).toBe(true);
    expect(started.messages).toEqual([]);
    expect(started.sessionId).not.toBe(BOBS_SESSION);
    expect(db.sessions.find(s => s.id === started.sessionId)).toMatchObject({ owner_id: ALICE, owner_type: 'user' });

    const resumed = await memory.getOrCreateSession(BOBS_SESSION, 'unified', BOB, 'user');
    expect(resumed).toMatchObject({ sessionId: BOBS_SESSION, isNew: false });
    expect(resumed.messages.map(m => m.content)).toEqual(['鲍勃的私人问题']);

    vi.mocked(security.ensureSession).mockResolvedValue({
      session: { token: 't', createdAt: '', expiresAt: '', ip: '', userAgent: '', sessionId: 's', role: 'user', userId: ALICE },
      isNew: false,
    } as Awaited<ReturnType<typeof security.ensureSession>>);
    const viewed = await sessionGET(new NextRequest(`http://localhost/api/sessions/${BOBS_SESSION}`), { params: Promise.resolve({ id: BOBS_SESSION }) });
    expect(viewed.status).toBe(404);
  });

  it('§account-role a user account gets a user session that cannot read others\' documents or reach admin routes; an admin account gets an admin session', async () => {
    const user = await logIn(ALICE, 'user');
    expect(user).toMatchObject({ role: 'user', userId: ALICE });
    const bobsUpload = { doc_category: 'business', owner_type: 'user', owner_id: BOB };
    expect(isReadableBy(bobsUpload, requesterOf(user))).toBe(false);
    const stats = await adminStatsGET(new NextRequest('http://localhost/api/admin/stats', { headers: { cookie: `${security.COOKIE_NAME}=${user.token}` } }));
    expect(stats.status).toBe(403);

    const admin = await logIn(BOB, 'admin');
    expect(admin).toMatchObject({ role: 'admin', userId: BOB });
  });

  it('§no-password-session the password-only admin entry is gone', () => {
    expect(existsSync('src/app/api/admin/verify-password/route.ts')).toBe(false);
    expect(Object.keys(security)).not.toContain('createSession');
  });
});
