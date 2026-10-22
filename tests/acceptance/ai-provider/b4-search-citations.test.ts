// @vitest-environment node
// Acceptance tests for docs/features/ai-provider/REQ.md, one per §-id, one file per
// batch (TRACK 二) so each batch's mocks stay its own. A batch writes its bodies
// first (red), then builds until they pass; the version cannot close while a todo
// is left.
// Asserted elsewhere: §keyword-match, §doc-search — supabase/tests/*.sql (transaction,
// rolled back); §retrieval-quality and the eval half of §out-of-library —
// scripts/eval-retrieval.ts (B5); §vector-removed — Phase 6 schema check.

import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { installFakeRelay, chatReply, type RelayRequest } from '../../stubs/fake-relay';
import { searchRegulations } from '@/lib/search';
import { finalizeAnswer, type Evidence } from '@/lib/citations';
import { createUnifiedGraph, unifiedAgentGraph } from '@/lib/workflows/unified/graph';
import { createInMemoryMemory } from '@/lib/memory/in-memory';
import * as security from '@/lib/security';
import { POST as chatPOST } from '@/app/api/chat/stream/route';
import { POST as uploadPOST } from '@/app/api/documents/upload-temp/route';
import { GET as previewGET } from '@/app/api/documents/preview-url/route';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { ProcessLog } from '@/components/chat/ProcessLog';

const db = vi.hoisted(() => ({
  regulationRows: [] as Array<Record<string, unknown>>,
  chunks: [] as Array<{ document_id: string; content: string }>,
  rpcCalls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
  failRpc: false,
  inserts: {} as Record<string, unknown[]>,
}));

vi.mock('@/lib/database', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/database')>()),
  createServerSupabaseClient: () => ({
    rpc: async (fn: string, args: Record<string, unknown>) => {
      db.rpcCalls.push({ fn, args });
      if (db.failRpc) return { data: null, error: { message: 'database down' } };
      return { data: fn === 'search_regulation_articles' ? db.regulationRows : [], error: null };
    },
    from: (table: string) => ({
      insert: (rows: unknown) => {
        (db.inserts[table] ??= []).push(rows);
        const done = Promise.resolve({ error: null });
        return Object.assign(done, { select: () => ({ single: () => done }) });
      },
      select: () => ({
        eq: (column: 'document_id', value: string) => ({
          order: async () => ({ data: db.chunks.filter(c => c[column] === value), error: null }),
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
    new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error), requestId }), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
}));
vi.mock('@/lib/documents/storage', () => ({
  uploadFileToStorage: vi.fn().mockResolvedValue('doc/file.txt'),
  getSignedFileUrl: vi.fn(async (path: string) => `https://storage.test/signed/${path}`),
  deleteFileFromStorage: vi.fn(),
}));

const relay = installFakeRelay();
const isChat = (r: RelayRequest) => r.path.endsWith('/chat/completions');

const ARTICLE = {
  id: '00000000-0000-0000-0000-000000000001',
  document_id: 'doc-synthetic-standard',
  regulation_name: '企业会计准则第99号-示例业务-2026',
  article_number: '第一条',
  content: '第一条 合成金融资产应当计提减值准备。',
  file_url: 'doc-synthetic-standard/file.pdf',
  score: 12.5,
};

const EVIDENCE: Evidence[] = [
  { id: 'R1', regulationName: '企业会计准则第99号-示例业务-2026', articleNumber: '第一条', documentId: 'doc-1', fileUrl: 'doc-1/file.pdf' },
  { id: 'R2', regulationName: '中华人民共和国示例法-2024', articleNumber: '第十二条', documentId: 'doc-2', fileUrl: 'doc-2/file.pdf' },
];

const guest = {
  session: {
    token: 't', createdAt: '', expiresAt: '', ip: '127.0.0.1', userAgent: 'vitest',
    sessionId: '550e8400-e29b-41d4-a716-446655440000', role: 'guest' as const,
  },
  isNewSession: false,
};

beforeEach(() => {
  relay.reset();
  db.regulationRows = [ARTICLE];
  db.chunks = [];
  db.rpcCalls = [];
  db.failRpc = false;
  db.inserts = {};
  vi.mocked(security.ensureSession).mockResolvedValue(guest);
  vi.mocked(security.checkGuestRate).mockResolvedValue({ allowed: true, remaining: 4, total: 5, resetsAt: Date.now() + 3600_000 });
});

function searchCall(id: string, keywords = ['合成金融资产', '减值']) {
  return chatReply(null, { toolCalls: [{ id, name: 'search_regulations', arguments: JSON.stringify({ keywords }) }] });
}

/** Every assistant tool call in saved history has its tool result, and every tool result its call. */
function unpaired(messages: Array<{ role: string; tool_calls?: Array<{ id: string }>; tool_call_id?: string }>) {
  const calls = messages.flatMap(m => (m.role === 'assistant' ? (m.tool_calls ?? []).map(c => c.id) : []));
  const results = messages.filter(m => m.role === 'tool').map(m => m.tool_call_id);
  return [...calls.filter(c => !results.includes(c)), ...results.filter(r => !calls.includes(r!))];
}

describe('B4 keyword search and citations', () => {
  it('§reg-search-citation every regulation search result has a regulation name, article number and source document id', async () => {
    const hits = await searchRegulations(['合成金融资产']);
    expect(hits.length).toBeGreaterThan(0);
    for (const hit of hits) {
      expect(hit.regulationName).toBeTruthy();
      expect(hit.articleNumber).toBeTruthy();
      expect(hit.documentId).toBeTruthy();
    }
    expect(db.rpcCalls[0]).toEqual({ fn: 'search_regulation_articles', args: { p_keywords: ['合成金融资产'], p_limit: 5 } });
  });

  it('§search-rounds the 4th search returns budget_exhausted without searching, the answer turn offers no tools, and saved history has no unpaired tool call', async () => {
    let turn = 0;
    relay.reply(() => {
      turn += 1;
      return { body: turn <= 4 ? searchCall(`call-${turn}`) : chatReply('根据[R1]，应当计提减值准备。') };
    });
    const memory = createInMemoryMemory();
    const state = await createUnifiedGraph({ memory }).invoke({ input: { question: '合成资产减值怎么处理？' } });

    expect(db.rpcCalls.filter(c => c.fn === 'search_regulation_articles')).toHaveLength(3);
    const toolContents = state.agent.messages.filter((m: { _getType(): string }) => m._getType() === 'tool').map((m: { content: string }) => JSON.parse(m.content));
    expect(toolContents[3]).toEqual({ status: 'budget_exhausted' });

    const chats = relay.requests.filter(isChat);
    expect(chats).toHaveLength(5);
    expect(chats[3].body.tools).toBeDefined();
    expect(chats[4].body.tools).toBeUndefined();

    const saved = memory.messagesOf(state.agent.sessionId);
    expect(unpaired(saved)).toEqual([]);
    expect(state.output.answer).toBe('根据《企业会计准则第99号——示例业务》第一条，应当计提减值准备。');
  });

  it('§search-rounds a regulation search refused by the budget still counts as a regulation question, so the answer is labelled', async () => {
    let turn = 0;
    relay.reply(() => {
      turn += 1;
      if (turn <= 3) return { body: chatReply(null, { toolCalls: [{ id: `doc-${turn}`, name: 'search_documents', arguments: '{"keywords":["合成制度"]}' }] }) };
      return { body: turn === 4 ? searchCall('call-4') : chatReply('一般应计提减值。') };
    });
    const state = await createUnifiedGraph({ memory: createInMemoryMemory() }).invoke({ input: { question: '合成资产要不要减值？' } });
    expect(db.rpcCalls.filter(c => c.fn === 'search_regulation_articles')).toHaveLength(0);
    expect(state.output.answer.startsWith('以下内容不是来自资料库，未经条款核对')).toBe(true);
  });

  it('§citation-text a later question does not see the evidence ids of earlier questions', async () => {
    const memory = createInMemoryMemory();
    let turn = 0;
    relay.reply(() => ({ body: ++turn === 1 ? searchCall('call-1') : chatReply(turn === 2 ? '依据[R1]，应当计提减值准备。' : '好的。') }));
    const first = await createUnifiedGraph({ memory }).invoke({ input: { question: '合成资产减值怎么处理？' } });

    relay.reset();
    relay.reply(() => ({ body: chatReply('好的。') }));
    await createUnifiedGraph({ memory }).invoke({ input: { question: '那还有别的要求吗？', sessionId: first.agent.sessionId } });
    const messages = relay.requests.filter(isChat)[0].body.messages as Array<{ role: string; content: string | null; tool_calls?: unknown[] }>;
    expect(messages.some(m => m.role === 'tool' || (m.tool_calls?.length ?? 0) > 0)).toBe(false);
    expect(JSON.stringify(messages)).not.toMatch(/"R1"|\[R1\]/);
    expect(messages.some(m => m.role === 'assistant' && m.content?.includes('《企业会计准则第99号——示例业务》第一条'))).toBe(true);
  });

  it('§search-rounds reaching the iteration limit forces an answer and leaves no unpaired tool call in history', async () => {
    relay.reply(req =>
      req.body.tools
        ? { body: chatReply(null, { toolCalls: [{ id: `calc-${relay.requests.length}`, name: 'evaluate_expression', arguments: '{"expression":"1+1"}' }] }) }
        : { body: chatReply('结果是 2。') }
    );
    const memory = createInMemoryMemory();
    const state = await createUnifiedGraph({ memory }).invoke({ input: { question: '算一下一加一' } });
    expect(state.output.answer).toBe('结果是 2。');
    expect(unpaired(memory.messagesOf(state.agent.sessionId))).toEqual([]);
  });

  it('§citation-text every article number sent to the user comes from this question\'s evidence; self-written numbers and unknown ids are removed with a notice', () => {
    const answer = '根据[R1]，应当计提减值准备。另外第五条也有规定。[R9]也提到了这一点。\n按照[R2]，纳税人应当申报。';
    const { text, cited, removed } = finalizeAnswer(answer, { evidence: EVIDENCE, regulationSearched: true, allSearchesFailed: false });
    expect(text).toBe(
      '根据《企业会计准则第99号——示例业务》第一条，应当计提减值准备。\n按照《中华人民共和国示例法》第十二条，纳税人应当申报。\n\n（已删去 2 处未经资料库核实的条款引用）'
    );
    expect(cited.map(e => e.id)).toEqual(['R1', 'R2']);
    expect(removed).toBe(2);
  });

  it('§citation-text a valid id cannot carry a paragraph, item or sub-article the model added', () => {
    for (const tail of ['第二款', '第 3 项', '之二']) {
      const { text, removed } = finalizeAnswer(`依据[R1]${tail}，应当复核。按照[R2]，纳税人应当申报。`, { evidence: EVIDENCE, regulationSearched: true, allSearchesFailed: false });
      expect(removed).toBe(1);
      expect(text).not.toContain(tail);
      expect(text).toContain('《中华人民共和国示例法》第十二条');
    }
  });

  it('§citation-text article numbers are caught whatever the numerals or formatting, since the page renders them alike', () => {
    for (const written of ['第**十九**条', '**第十九条**', '第３条', '第叁条', '第&#51;条', '第`3`条']) {
      const { text, removed } = finalizeAnswer(`依据${written}，企业可以免税。`, { evidence: EVIDENCE, regulationSearched: true, allSearchesFailed: false });
      expect(removed, written).toBe(1);
      expect(text, written).not.toContain('免税');
    }
  });

  it('§citation-text an id is either a well-formed citation of this question\'s evidence or the sentence is removed', () => {
    const ctx = { evidence: EVIDENCE, regulationSearched: true, allSearchesFailed: false };
    // Spacing and full-width brackets are still the same id.
    expect(finalizeAnswer('依据[R 1]，应当计提。', ctx).text).toBe('依据《企业会计准则第99号——示例业务》第一条，应当计提。');
    expect(finalizeAnswer('依据［R1］，应当计提。', ctx).text).toBe('依据《企业会计准则第99号——示例业务》第一条，应当计提。');
    for (const stray of ['[R 99]', 'R1', '[R1-R2]', '［R99］']) {
      const { text, removed } = finalizeAnswer(`依据${stray}可以免税。依据[R2]应当申报。`, ctx);
      expect(removed, stray).toBe(1);
      expect(text, stray).not.toContain('免税');
    }
  });

  it('§citation-text a sentence broken across lines is judged whole; separate list items stay separate', () => {
    const ctx = { evidence: EVIDENCE, regulationSearched: true, allSearchesFailed: false };
    const conditional = finalizeAnswer('第十九条所述情形才适用以下结论，\n企业无需计提减值。', ctx);
    expect(conditional.text).not.toContain('无需计提减值');
    expect(finalizeAnswer('依据第\n3条可以免税。', ctx).removed).toBe(1);

    const list = finalizeAnswer('处理如下：\n- 依据[R1]，应当计提减值。\n- 第五条也有规定\n- 按照[R2]申报', ctx);
    expect(list.removed).toBe(1);
    expect(list.text).toContain('- 依据《企业会计准则第99号——示例业务》第一条，应当计提减值。');
    expect(list.text).toContain('- 按照《中华人民共和国示例法》第十二条申报');
    expect(list.text).not.toContain('第五条');
  });

  it('§citation-link a regulation search event links to the preview of the article source file, and the link opens that file', async () => {
    vi.spyOn(unifiedAgentGraph, 'streamEvents').mockImplementation(async function* () {
      yield {
        event: 'on_chain_end',
        name: 'toolExecutor',
        data: {
          output: {
            toolResults: [{
              toolName: 'search_regulations',
              result: {
                success: true,
                data: {
                  status: 'ok',
                  results: [{ id: 'R1', regulation: '《企业会计准则第99号——示例业务》', articleNumber: '第一条', content: ARTICLE.content, documentId: ARTICLE.document_id, fileUrl: ARTICLE.file_url }],
                },
              },
            }],
          },
        },
      };
      yield { event: 'on_chain_end', name: 'generateResponse', data: { output: { output: { answer: '好', type: 'success' } } } };
    } as never);

    const response = await chatPOST(new NextRequest('http://localhost/api/chat/stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: '合成资产减值？' }),
    }));
    const reader = response.body!.getReader();
    let text = '';
    for (let r = await reader.read(); !r.done; r = await reader.read()) {
      text += typeof r.value === 'string' ? r.value : new TextDecoder().decode(r.value);
    }
    const processEvents = text.split('\n\n')
      .filter(b => b.startsWith('event: process'))
      .map(b => JSON.parse(b.split('\n').find(l => l.startsWith('data: '))!.slice(6)));
    const searchEvent = processEvents.find(e => e.details?.tool === 'search_regulations');
    expect(searchEvent.sourceReferences).toEqual([{
      documentId: ARTICLE.document_id,
      documentName: '《企业会计准则第99号——示例业务》',
      documentType: 'regulation',
      fileUrl: ARTICLE.file_url,
      article: '第一条',
    }]);

    // The process log renders the link; following it opens the article's own file.
    const html = renderToStaticMarkup(createElement(ProcessLog, { events: [searchEvent], defaultExpanded: true }));
    expect(html).toContain('《企业会计准则第99号——示例业务》第一条');
    const href = html.match(/href="([^"]+)"/)![1].replace(/&amp;/g, '&');
    const opened = await previewGET(new NextRequest(`http://localhost${href}`));
    expect(opened.status).toBe(307);
    expect(opened.headers.get('location')).toBe(`https://storage.test/signed/${ARTICLE.file_url}`);
  });

  it('§out-of-library an answer without a valid evidence id after a regulation search starts with the out-of-library label and has no article numbers', () => {
    const { text } = finalizeAnswer('一般来说，第三条要求企业计提减值。这是常见做法。', {
      evidence: EVIDENCE, regulationSearched: true, allSearchesFailed: false,
    });
    expect(text.startsWith('以下内容不是来自资料库，未经条款核对')).toBe(true);
    expect(text).not.toMatch(/第[零〇一二三四五六七八九十百千\d]+条/);

    // Not repeated when the model already wrote it; absent when no regulation search ran.
    for (const written of ['以下内容不是来自资料库，未经条款核对\n\n这是常见做法。', '**以下内容不是来自资料库，未经条款核对**\n\n这是常见做法。', '以下内容**不是来自资料库**，未经条款核对：这是常见做法。']) {
      const once = finalizeAnswer(written, { evidence: [], regulationSearched: true, allSearchesFailed: false });
      expect(once.text.replace(/\*/g, '').split('以下内容不是来自资料库').length, written).toBe(2);
      expect(once.text, written).toContain('这是常见做法。');
    }
    // The label's words quoted inside the answer are left alone.
    const quoted = finalizeAnswer('回答开头若有“以下内容不是来自资料库，未经条款核对”，说明没有出处。', { evidence: [], regulationSearched: true, allSearchesFailed: false });
    expect(quoted.text).toContain('回答开头若有“以下内容不是来自资料库，未经条款核对”，说明没有出处。');
    expect(finalizeAnswer('流动比率是 1.5。', { evidence: [], regulationSearched: false, allSearchesFailed: false }).text).toBe('流动比率是 1.5。');
  });

  it('§retrieval-error when every search of the question errored, the label is the retrieval-failure one', async () => {
    const { text } = finalizeAnswer('这是常见做法。', { evidence: [], regulationSearched: true, allSearchesFailed: true });
    expect(text.startsWith('法规检索暂时失败，以下内容未经资料库核对')).toBe(true);
    expect(text).not.toContain('以下内容不是来自资料库');

    // Through the graph: the database is down, the model answers from its own knowledge.
    db.failRpc = true;
    let turn = 0;
    relay.reply(() => ({ body: ++turn === 1 ? searchCall('call-1') : chatReply('一般来说应当计提减值。') }));
    const state = await createUnifiedGraph({ memory: createInMemoryMemory() }).invoke({ input: { question: '合成资产减值？' } });
    expect(state.output.answer.startsWith('法规检索暂时失败，以下内容未经资料库核对')).toBe(true);
  });

  it('§upload-no-embedding a user upload succeeds, writes chunks, makes no embedding call, and its content reaches the model when selected', async () => {
    const response = await uploadPOST(new NextRequest('http://localhost/api/documents/upload-temp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        fileData: Buffer.from('合成差旅制度：出差乘坐高铁二等座。').toString('base64'),
        fileName: 'synthetic-travel.txt',
        fileType: 'text/plain',
      }),
    }));
    expect(response.status).toBe(200);
    expect(db.inserts.document_chunks?.length).toBeGreaterThan(0);
    expect(relay.requests.some(r => r.path.endsWith('/embeddings'))).toBe(false);

    // Read back what the upload stored, by the id it returned.
    const { documentId } = await response.json();
    db.chunks = (db.inserts.document_chunks as Array<Array<{ document_id: string; content: string }>>).flat();
    expect(db.chunks.every(c => c.document_id === documentId)).toBe(true);
    const ask = async (documentIds: string[]) => {
      relay.reset();
      relay.reply(() => ({ body: chatReply('乘坐高铁二等座。') }));
      await createUnifiedGraph({ memory: createInMemoryMemory() }).invoke({ input: { question: '出差坐什么？', documentIds } });
      return JSON.stringify(relay.requests.filter(isChat)[0].body.messages);
    };
    expect(await ask([documentId])).toContain('出差乘坐高铁二等座');
    expect(await ask(['00000000-0000-0000-0000-00000000dead'])).not.toContain('出差乘坐高铁二等座');
  });

  it('§no-embedding-calls src/ has no embedding API call or embedding model config', () => {
    const files = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
        e.isDirectory() ? files(path.join(dir, e.name)) : /\.(ts|tsx)$/.test(e.name) ? [path.join(dir, e.name)] : []
      );
    const offenders = files(path.join(process.cwd(), 'src'))
      .filter(f => !f.endsWith('database.types.ts'))
      .filter(f => /embeddings\.create|EMBEDDING_MODEL|text-embedding|query_embedding/.test(fs.readFileSync(f, 'utf8')))
      .map(f => path.relative(process.cwd(), f));
    expect(offenders).toEqual([]);
  });
});
