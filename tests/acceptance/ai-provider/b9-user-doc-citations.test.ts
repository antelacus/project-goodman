// @vitest-environment node
// Acceptance tests for docs/features/ai-provider/REQ.md §5.4, §5.5, §5.7 as changed in
// v4.8.0 (docs/features/public-readiness/TRACK.md, batch B4; B5 is in b10-chunks.test.ts).
// The deletion marker replacing whole-sentence removal is asserted with the other
// §citation-text cases in b4-search-citations.test.ts.

import { NextRequest } from 'next/server';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { installFakeRelay, chatReply, type RelayRequest } from '../../stubs/fake-relay';
import { finalizeAnswer, numberDocuments, REMOVED_MARKER, OUT_OF_LIBRARY_LABEL, type Evidence } from '@/lib/citations';
import { articleStartsByLine } from '@/lib/extraction/article-lines';
import { splitRegulation } from '@/lib/extraction/regulation-splitter';
import { createUnifiedGraph, unifiedAgentGraph } from '@/lib/workflows/unified/graph';
import { createInMemoryMemory } from '@/lib/memory/in-memory';
import * as security from '@/lib/security';
import { POST as uploadPOST } from '@/app/api/documents/upload-temp/route';
import { POST as chatPOST } from '@/app/api/chat/stream/route';
import { POST as adminUploadPOST } from '@/app/api/admin/upload-database-document/route';
import { ProcessLog } from '@/components/chat/ProcessLog';

type Row = Record<string, unknown>;
const db = vi.hoisted(() => ({ inserts: {} as Record<string, unknown[]> }));
const rows = (table: string) => ((db.inserts[table] ?? []) as Array<Row | Row[]>).flat();

vi.mock('@/lib/database', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/database')>()),
  createServerSupabaseClient: () => ({
    rpc: async () => ({ data: [], error: null }),
    from: (table: string) => ({
      insert: (inserted: unknown) => {
        (db.inserts[table] ??= []).push(inserted);
        const done = Promise.resolve({ error: null });
        return Object.assign(done, { select: () => ({ single: () => done }) });
      },
      select: () => ({
        eq: (column: string, value: string) => ({
          order: async () => ({
            data: rows(table).filter(r => r[column] === value).sort((a, b) => Number(a.chunk_index) - Number(b.chunk_index)),
            error: null,
          }),
        }),
        in: async (column: string, ids: string[]) => ({ data: rows(table).filter(r => ids.includes(String(r[column]))), error: null }),
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
// The admin upload route requires an admin session (v4.7.4).
vi.mock('@/lib/security/guest-session', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/security/guest-session')>()),
  requireAdmin: vi.fn(async () => ({ role: 'admin', sessionId: 's', userId: 'u' })),
}));
vi.mock('@/lib/security', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/security')>()),
  ensureSession: vi.fn(),
  checkGuestRate: vi.fn(),
  incrementGuestRate: vi.fn(),
  verifyAdminPassword: vi.fn(async () => ({ valid: true, needsRehash: false })),
  generateRequestId: () => 'req-1',
}));
vi.mock('@/lib/documents/storage', () => ({
  uploadFileToStorage: vi.fn().mockResolvedValue('doc/file.md'),
  getSignedFileUrl: vi.fn(async (path: string) => `https://storage.test/signed/${path}`),
  deleteFileFromStorage: vi.fn(),
}));
vi.mock('@/lib/extraction', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/extraction')>()),
  performStructuredExtraction: vi.fn(async () => ({ type: 'policy', confidence: 1, data: {} })),
}));

const relay = installFakeRelay();
const isChat = (r: RelayRequest) => r.path.endsWith('/chat/completions');
const GUEST_ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_GUEST = '660e8400-e29b-41d4-a716-446655440000';
const ctx = (evidence: Evidence[], regulationSearched = false) => ({ evidence, regulationSearched, allRegulationSearchesFailed: false });

const CONTRACT = [
  '合成采购合同',
  '第一条 合同标的为办公设备一批。',
  '第二条 合同总价为人民币十万元。',
  '第三条 甲方应于验收后三十日内付款。',
  '第四条 乙方应于签约后十日内交货。',
  '第五条 任何一方逾期履行的，按日支付合同总价万分之五的违约金。',
  '',
].join('\n');

function guestSession(sessionId: string) {
  return {
    session: { token: 't', createdAt: '', expiresAt: '', ip: '127.0.0.1', userAgent: 'vitest', sessionId, role: 'guest' as const },
    isNewSession: false,
  };
}

beforeEach(() => {
  relay.reset();
  db.inserts = {};
  vi.mocked(security.ensureSession).mockResolvedValue(guestSession(GUEST_ID));
  vi.mocked(security.checkGuestRate).mockResolvedValue({ allowed: true, remaining: 4, total: 5, resetsAt: Date.now() + 3600_000 });
});

async function uploadAsGuest(text: string, fileName: string) {
  const response = await uploadPOST(new NextRequest('http://localhost/api/documents/upload-temp', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fileData: Buffer.from(text).toString('base64'), fileName, fileType: 'text/markdown' }),
  }));
  expect(response.status).toBe(200);
  return (await response.json()).documentId as string;
}

async function ask(documentIds: string[], reply: string, ownerId = GUEST_ID) {
  relay.reply(() => ({ body: chatReply(reply) }));
  const state = await createUnifiedGraph({ memory: createInMemoryMemory() }).invoke({
    input: { question: '违约金怎么算？', documentIds, ownerId, ownerType: 'guest' },
  });
  const sent = JSON.stringify(relay.requests.filter(isChat)[0].body.messages);
  return { state, sent, answer: String(state.output?.answer ?? '') };
}

async function streamProcessEvents(events: unknown[]) {
  vi.spyOn(unifiedAgentGraph, 'streamEvents').mockImplementation(async function* () {
    for (const e of events) yield e;
    yield { event: 'on_chain_end', name: 'generateResponse', data: { output: { output: { answer: '好', type: 'success' } } } };
  } as never);
  const response = await chatPOST(new NextRequest('http://localhost/api/chat/stream', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question: '违约金怎么算？' }),
  }));
  let text = '';
  const reader = response.body!.getReader();
  for (let r = await reader.read(); !r.done; r = await reader.read()) {
    text += typeof r.value === 'string' ? r.value : new TextDecoder().decode(r.value);
  }
  const blocks = text.split('\n\n');
  const data = (b: string) => JSON.parse(b.split('\n').find(l => l.startsWith('data: '))!.slice(6));
  return {
    process: blocks.filter(b => b.startsWith('event: process')).map(data),
    complete: blocks.filter(b => b.startsWith('event: complete')).map(data)[0],
  };
}

describe('B4 user-document citations and the deletion marker', () => {
  it('§citation-text a bare 第五条 is removed even when a selected document has a 第五条: only [Dn] cites it', () => {
    const { evidence } = numberDocuments([{ id: 'doc-c', name: '合成采购合同.md', fileUrl: null, text: CONTRACT }]);
    const { text, removed } = finalizeAnswer('按第五条，逾期按日计违约金。', ctx(evidence));
    expect(text).toBe(`按${REMOVED_MARKER}，逾期按日计违约金。`);
    expect(removed).toBe(1);
  });

  it('§user-doc-citation a [Dn] citation of a selected document shows as 《name》（您上传的文档）第X条 with a link to that document; a self-written 会计准则第五条 is removed even though the document has a 第五条', async () => {
    const documentId = await uploadAsGuest(CONTRACT, '合成采购合同.md');
    const { sent, answer, state } = await ask([documentId], '根据[D5]，逾期按日支付万分之五的违约金。另据会计准则第五条，计入营业外支出。');
    expect(sent).toContain('[D5] 第五条 任何一方逾期履行的');
    expect(answer).toBe(`根据《合成采购合同》（您上传的文档）第五条，逾期按日支付万分之五的违约金。另据会计准则${REMOVED_MARKER}，计入营业外支出。`);

    // The process log links the cited article to its document.
    const { process } = await streamProcessEvents([{ event: 'on_chain_end', name: 'finalizeAnswer', data: { output: { agent: state.agent } } }]);
    const event = process.find(e => e.content.startsWith('出处核对'));
    expect(event.sourceReferences).toEqual([{ documentId, documentName: '《合成采购合同》（您上传的文档）', documentType: 'user_document', article: '第五条' }]);
    const html = renderToStaticMarkup(createElement(ProcessLog, { events: [event], defaultExpanded: true }));
    expect(html).toContain('《合成采购合同》（您上传的文档）第五条');
    expect(html).toContain(`/api/documents/preview-url?id=${documentId}`);
  });

  it('§user-doc-duplicate article numbers repeated within one document get no id and their citations are removed; the other articles of that document cite normally', () => {
    const withAppendix = CONTRACT + '附件一 验收标准\n第一条 设备应当完好。\n';
    const { texts, evidence } = numberDocuments([
      { id: 'doc-c', name: '合成采购合同.md', fileUrl: null, text: withAppendix },
      { id: 'doc-d', name: '合成补充协议.md', fileUrl: null, text: '第一条 交货期延长十日。\n' },
    ]);
    expect(evidence.filter(e => e.documentId === 'doc-c').map(e => e.articleNumber)).toEqual(['第二条', '第三条', '第四条', '第五条']);
    // Repeats are judged within a document: the other document's 第一条 is numbered.
    expect(evidence.find(e => e.documentId === 'doc-d')).toMatchObject({ id: 'D5', articleNumber: '第一条' });
    expect(texts[0]).not.toMatch(/\[D\d+\] 第一条/);
    const { text } = finalizeAnswer('依据[D1]与第一条，应当按时付款。', ctx(evidence));
    expect(text).toBe(`依据《合成采购合同》（您上传的文档）第二条与${REMOVED_MARKER}，应当按时付款。`);
  });

  it('§user-doc-duplicate the selected document is numbered by the same article-start rule as the regulation splitter', () => {
    const regulationLike = [
      '第一章 总则',
      '第一条 为了规范合成业务，制定本准则。',
      '第二条本准则适用于所有企业。',
      '第三条 企业应当按照本准则',
      '第二十五条的规定处理。',
      '第四条 本准则自发布之日起施行。',
      '',
    ].join('\n');
    const split = splitRegulation([regulationLike], 1).articles.map(a => a.articleNumber);
    const numbered = articleStartsByLine(regulationLike.match(/[^\n]*\n|[^\n]+$/g)!).filter(Boolean).map(s => s!.articleNumber);
    expect(numbered).toEqual(split);
    expect(numbered).toEqual(['第一条', '第二条', '第三条', '第四条']);
  });

  it('§removal-count the number of removed places is a process-log event; the answer has no closing notice', async () => {
    const { text, removed } = finalizeAnswer('依据第五条，以及[R7]，应当付款。', ctx([]));
    expect(removed).toBe(2);
    expect(text).not.toMatch(/已删去 \d+ 处/);
    const { process } = await streamProcessEvents([{ event: 'on_chain_end', name: 'finalizeAnswer', data: { output: { agent: { cited: [], removedCitations: removed } } } }]);
    expect(process.find(e => e.content.startsWith('出处核对'))).toMatchObject({ content: '出处核对：删去 2 处未经核实的引用', details: { removedCitations: 2 } });
    const quiet = await streamProcessEvents([{ event: 'on_chain_end', name: 'finalizeAnswer', data: { output: { agent: { cited: [], removedCitations: 0 } } } }]);
    expect(quiet.process.some(e => e.content.startsWith('出处核对'))).toBe(false);
  });

  it('§doc-article-hint an admin upload of a non-regulation knowledge document with line-start 第X条 returns the hint; one without does not', async () => {
    const upload = async (text: string) => {
      const response = await adminUploadPOST(new NextRequest('http://localhost/api/admin/upload-database-document', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ documentText: Buffer.from(text).toString('base64'), fileName: '合成财务制度.md', documentType: 'policy', adminPassword: 'x' }),
      }));
      return (await response.json()).message as string;
    };
    expect(await upload('合成财务制度\n第一条 报销须附发票。\n第二条 差旅按标准执行。\n')).toContain('按“第X条”编号');
    expect(await upload('合成财务制度\n1. 报销须附发票。\n2. 差旅按标准执行。\n')).not.toContain('按“第X条”编号');
  });

  it('§out-of-library an answer that cites only a selected document after a regulation search carries the out-of-library label', () => {
    const { evidence } = numberDocuments([{ id: 'doc-c', name: '合成采购合同.md', fileUrl: null, text: CONTRACT }]);
    const labelled = finalizeAnswer('根据[D5]，违约金计入营业外支出。', ctx(evidence, true));
    expect(labelled.text.startsWith(OUT_OF_LIBRARY_LABEL)).toBe(true);
    expect(labelled.text).toContain('《合成采购合同》（您上传的文档）第五条');
    // No regulation search: no label, whatever is cited.
    expect(finalizeAnswer('根据[D5]，违约金按日计算。', ctx(evidence)).text.startsWith(OUT_OF_LIBRARY_LABEL)).toBe(false);
  });

  it('§selected-doc-owner a documentId owned by someone else, or a knowledge-library document, is not read and reports a document load error; the requester\'s own document is read', async () => {
    const own = await uploadAsGuest(CONTRACT, '合成采购合同.md');
    db.inserts.documents!.push({ id: 'lib-1', name: '合成准则.pdf', file_url: 'lib-1/file.pdf', owner_type: 'system', owner_id: null });
    db.inserts.document_chunks!.push({ document_id: 'lib-1', chunk_index: 0, content: '第一条 合成准则正文。\n' });

    const mine = await ask([own], '好。');
    expect(mine.sent).toContain('合同标的为办公设备一批');
    expect(mine.state.documentLoadErrors).toBeUndefined();

    relay.reset();
    const others = await ask([own], '好。', OTHER_GUEST);
    expect(others.sent).not.toContain('合同标的为办公设备一批');
    expect(others.state.documentLoadErrors).toEqual([{ documentId: own, error: 'Document not found' }]);

    relay.reset();
    const library = await ask(['lib-1'], '好。');
    expect(library.sent).not.toContain('合成准则正文');
    expect(library.state.documentLoadErrors).toEqual([{ documentId: 'lib-1', error: 'Document not found' }]);

    // The user is told the document was not read.
    const { complete } = await streamProcessEvents([{ event: 'on_chain_end', name: 'loadMemory', data: { output: { agent: { sessionId: 's' }, documentLoadErrors: [{ documentId: own, error: 'Document not found' }] } } }]);
    expect(complete.warnings).toContainEqual({ type: 'DOCUMENT_UNAVAILABLE', message: '所选文档无法读取，回答未参考它' });
  });
});
