// @vitest-environment node
// Acceptance tests for docs/features/ai-provider/REQ.md §5.7 as changed in v4.8.0
// (docs/features/public-readiness/TRACK.md, batch B5): chunks join back into the
// document, and tables are never split. Asserted elsewhere: the same two properties on
// the production library after the re-chunk (DESIGN §9 step 1, Phase 4 evidence).

import { NextRequest } from 'next/server';
import { installFakeRelay, chatReply, type RelayRequest } from '../../stubs/fake-relay';
import { createUnifiedGraph } from '@/lib/workflows/unified/graph';
import { createInMemoryMemory } from '@/lib/memory/in-memory';
import * as security from '@/lib/security';
import { POST as uploadPOST } from '@/app/api/documents/upload-temp/route';

type Chunk = { document_id: string; chunk_index: number; content: string };
const db = vi.hoisted(() => ({ chunks: [] as Chunk[], inserts: {} as Record<string, unknown[]> }));

vi.mock('@/lib/database', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/database')>()),
  createServerSupabaseClient: () => ({
    rpc: async () => ({ data: [], error: null }),
    from: (table: string) => ({
      insert: (rows: unknown) => {
        (db.inserts[table] ??= []).push(rows);
        const done = Promise.resolve({ error: null });
        return Object.assign(done, { select: () => ({ single: () => done }) });
      },
      select: () => ({
        eq: (column: 'document_id', value: string) => ({
          order: async () => ({
            data: db.chunks.filter(c => c[column] === value).sort((a, b) => a.chunk_index - b.chunk_index),
            error: null,
          }),
        }),
        in: async (_column: 'id', ids: string[]) => ({
          data: ((db.inserts.documents ?? []) as Array<Record<string, unknown> | Array<Record<string, unknown>>>).flat().filter(d => ids.includes(String(d.id))),
          error: null,
        }),
      }),
    }),
  }),
}));
vi.mock('@/lib/logging', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  logRequest: vi.fn(),
  logError: vi.fn(),
  logWorkflowEvent: vi.fn(),
}));
vi.mock('@/lib/security', () => ({
  ensureSession: vi.fn(),
  checkGuestRate: vi.fn(),
  incrementGuestRate: vi.fn(),
  generateRequestId: () => 'req-1',
  createErrorResponse: (error: unknown, requestId: string, status = 500) =>
    new Response(JSON.stringify({ error: String(error), requestId }), { status }),
}));
vi.mock('@/lib/documents/storage', () => ({
  uploadFileToStorage: vi.fn().mockResolvedValue('doc/file.md'),
  getSignedFileUrl: vi.fn(async (path: string) => `https://storage.test/signed/${path}`),
  deleteFileFromStorage: vi.fn(),
}));

const GUEST_ID = '550e8400-e29b-41d4-a716-446655440000';
const relay = installFakeRelay();
const isChat = (r: RelayRequest) => r.path.endsWith('/chat/completions');

const TABLE = [
  '| 客户 | 付款账期 | 信用额度 |',
  '| --- | --- | --- |',
  ...Array.from({ length: 14 }, (_, i) => `| 合成客户${i} | ${30 + i}天 | ${100 + i}万元 |`),
].join('\n') + '\n';
const PLAIN_TABLE = ['项目 | 金额', '--- | ---', '差旅费 | 12万元', '招待费 | 8万元'].join('\n') + '\n';
const para = (tag: string, n: number) =>
  Array.from({ length: n }, (_, i) => `${tag}第${i}段：合成制度正文，用于检验切块边界，内容不重复${i}。\n`).join('');
const DOCUMENT =
  '合成公司档案\n\n# 一、基本情况\n' + para('基本', 34) + TABLE +
  '# 二、费用\n' + para('费用', 30) + PLAIN_TABLE + para('结尾', 20);

beforeEach(() => {
  relay.reset();
  db.chunks = [];
  db.inserts = {};
  vi.mocked(security.ensureSession).mockResolvedValue({
    session: {
      token: 't', createdAt: '', expiresAt: '', ip: '127.0.0.1', userAgent: 'vitest',
      sessionId: GUEST_ID, role: 'guest' as const,
    },
    isNewSession: false,
  });
  vi.mocked(security.checkGuestRate).mockResolvedValue({ allowed: true, remaining: 4, total: 5, resetsAt: Date.now() + 3600_000 });
});

async function upload(text: string) {
  const response = await uploadPOST(new NextRequest('http://localhost/api/documents/upload-temp', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fileData: Buffer.from(text).toString('base64'), fileName: 'synthetic-profile.md', fileType: 'text/markdown' }),
  }));
  expect(response.status).toBe(200);
  const { documentId } = await response.json();
  db.chunks = (db.inserts.document_chunks as Chunk[][]).flat();
  return documentId as string;
}

describe('B5 non-overlapping chunks', () => {
  it('§chunk-partition the chunks of a document concatenate to its full text with no overlap, and the selected-document text sent to the model has no repeated fragment', async () => {
    const documentId = await upload(DOCUMENT);
    const stored = db.chunks.map(c => c.content);
    expect(stored.length).toBeGreaterThan(2);
    expect(stored.join('')).toBe(DOCUMENT);

    relay.reply(() => ({ body: chatReply('已阅读。') }));
    await createUnifiedGraph({ memory: createInMemoryMemory() }).invoke({ input: { question: '账期是多少？', documentIds: [documentId], ownerId: GUEST_ID, ownerType: 'guest' } });
    const sent = JSON.stringify(relay.requests.filter(isChat)[0].body.messages);
    expect(sent).toContain(JSON.stringify(DOCUMENT).slice(1, -1));
    for (const line of DOCUMENT.split('\n').filter(l => l.length > 12)) {
      const escaped = JSON.stringify(line).slice(1, -1);
      expect(sent.indexOf(escaped)).toBe(sent.lastIndexOf(escaped));
    }
  });

  it('§table-chunk every Markdown table lies whole in one chunk, also when longer than the chunk size', async () => {
    const LONG_TABLE = ['| 科目 | 说明 |', '|---|---|', ...Array.from({ length: 60 }, (_, i) => `| 合成科目${i} | 合成说明文字${i} |`)].join('\n') + '\n';
    expect(LONG_TABLE.length).toBeGreaterThan(1000);
    await upload(DOCUMENT + LONG_TABLE + para('补充', 3));
    for (const table of [TABLE, PLAIN_TABLE, LONG_TABLE]) {
      expect(db.chunks.filter(c => c.content.includes(table))).toHaveLength(1);
    }
  });
});
