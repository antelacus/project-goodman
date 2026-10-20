// @vitest-environment node
// Acceptance tests for docs/features/ai-provider/REQ.md, one per §-id.
// A batch writes its bodies first (red), then builds until they pass; the version
// cannot close while a todo is left here. Criteria that need the relay or the real
// database are asserted elsewhere:
//   §retrieval-quality and the eval half of §out-of-library — scripts/eval-retrieval.ts
//   §keyword-match, §doc-search — supabase/tests/*.sql (transaction, rolled back)
//   §reg-integrity on the 45 real documents — scripts/resplit-regulations.ts
//   §vector-removed — Phase 6 schema check

import { z } from 'zod';
import { installFakeRelay, chatReply, responsesReply } from '../stubs/fake-relay';
import * as ai from '@/lib/ai';
import { PURPOSES, type AIPurpose } from '@/lib/ai/config';

const TEXT_PURPOSES = Object.keys(PURPOSES) as AIPurpose[];

const relay = installFakeRelay();

describe('B1 AI entry point', () => {
  const file = { fileName: 'scan.png', mimeType: 'image/png', base64: 'aGVsbG8=' };
  const Summary = z.object({ findings: z.array(z.string()) });

  // One call per function, and per purpose where the function takes one.
  async function callEverything() {
    for (const purpose of TEXT_PURPOSES) {
      relay.reply(() => ({ body: chatReply('文字') }));
      await ai.generateText({ purpose, system: '系统', prompt: '问题' });
    }
    relay.reply(() => ({ body: chatReply('{"findings":[]}') }));
    await ai.generateJSON({ purpose: 'reportSummary', system: '系统', prompt: '问题', schema: Summary });
    relay.reply(() => ({ body: responsesReply('{"findings":[]}') }));
    await ai.generateJSON({ purpose: 'extraction', system: '系统', prompt: '问题', schema: Summary, attachment: file });
    relay.reply(() => ({ body: chatReply('回答') }));
    await ai.chatWithTools({ system: '系统', messages: [{ role: 'user', content: '问题' }], tools: [] });
    relay.reply(() => ({ body: responsesReply('识别出的文字') }));
    await ai.readDocumentText(file);
  }

  const chatBodies = () => relay.requests.filter(r => r.path.endsWith('/chat/completions')).map(r => r.body);
  const responsesBodies = () => relay.requests.filter(r => r.path.endsWith('/responses')).map(r => r.body);

  beforeEach(() => relay.reset());

  it('§relay-model every AI purpose resolves to gpt-6.1-sol', async () => {
    await callEverything();
    expect(relay.requests.length).toBe(TEXT_PURPOSES.length + 4);
    for (const r of relay.requests) expect(r.body.model).toBe('gpt-6.1-sol');
  });

  it('§relay-params Chat Completions sends max_completion_tokens, Responses sends max_output_tokens; neither sends max_tokens or temperature', async () => {
    await callEverything();
    for (const body of chatBodies()) {
      expect(body.max_completion_tokens).toBeGreaterThan(0);
      expect(body).not.toHaveProperty('max_tokens');
      expect(body).not.toHaveProperty('temperature');
    }
    for (const body of responsesBodies()) {
      expect(body.max_output_tokens).toBeGreaterThan(0);
      expect(body).not.toHaveProperty('max_tokens');
      expect(body).not.toHaveProperty('max_completion_tokens');
      expect(body).not.toHaveProperty('temperature');
    }
  });

  it('§system-prompt every Chat Completions call starts with a non-empty system message; every Responses call has non-empty instructions', async () => {
    await callEverything();
    expect(chatBodies().length).toBeGreaterThan(0);
    expect(responsesBodies().length).toBeGreaterThan(0);
    for (const body of chatBodies()) {
      const [first] = body.messages as Array<{ role: string; content: string }>;
      expect(first.role).toBe('system');
      expect(first.content.trim()).not.toBe('');
    }
    for (const body of responsesBodies()) {
      expect(String(body.instructions).trim()).not.toBe('');
    }
    await expect(ai.generateText({ purpose: 'title', system: '  ', prompt: '问题' })).rejects.toThrow();
  });

  it('§ai-outcome length, refusal, content_filter, blank text and schema-invalid JSON fail; a tool-calls-only reply succeeds', async () => {
    const text = () => ai.generateText({ purpose: 'reportSection', system: '系统', prompt: '问题' });
    const failing = [
      chatReply('半截', { finish: 'length' }),
      chatReply(null, { refusal: '不能回答' }),
      chatReply('', { finish: 'content_filter' }),
      chatReply('   '),
    ];
    for (const body of failing) {
      relay.reply(() => ({ body }));
      await expect(text()).rejects.toBeInstanceOf(ai.AIUnavailableError);
    }

    relay.reply(() => ({ body: chatReply('{"findings":"不是数组"}') }));
    await expect(
      ai.generateJSON({ purpose: 'reportSummary', system: '系统', prompt: '问题', schema: Summary })
    ).rejects.toBeInstanceOf(ai.AIUnavailableError);

    relay.reply(() => ({ body: responsesReply('半截', { status: 'incomplete', incompleteReason: 'max_output_tokens' }) }));
    await expect(ai.readDocumentText(file)).rejects.toBeInstanceOf(ai.AIUnavailableError);

    const chat = () => ai.chatWithTools({ system: '系统', messages: [{ role: 'user', content: '问题' }], tools: [] });
    relay.reply(() => ({ body: chatReply(null, { toolCalls: [{ id: 'c1', name: 'search', arguments: '{"keywords":["金融资产"]}' }] }) }));
    await expect(chat()).resolves.toEqual({
      text: '',
      toolCalls: [{ id: 'c1', name: 'search', args: { keywords: ['金融资产'] } }],
    });
    relay.reply(() => ({ body: chatReply(null, { toolCalls: [{ id: 'c1', name: 'search', arguments: '{"keywords":' }] }) }));
    await expect(chat()).rejects.toBeInstanceOf(ai.AIUnavailableError);
  });

  it('§ai-timeout a relay that never answers fails within the purpose time limit', async () => {
    vi.useFakeTimers();
    try {
      relay.reply(() => 'hang');
      const call = ai.chatWithTools({ system: '系统', messages: [{ role: 'user', content: '问题' }], tools: [] });
      const settled = expect(call).rejects.toBeInstanceOf(ai.AIUnavailableError);
      await vi.advanceTimersByTimeAsync(PURPOSES.chat.timeoutMs + 1);
      await settled;
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('B2 failures are shown, never fabricated', () => {
  it.todo('§report-section-failure a failed section keeps its metrics table and shows the failure text; no fallback analysis anywhere in the report');
  it.todo('§report-summary-failure a failed section or a failed summary call yields "摘要未生成" with empty key findings');
  it.todo('§chat-failure an AI failure in chat reaches the user as "AI 服务暂时不可用，请稍后再试"');
  it.todo('§extract-failure an extraction failure, or a second period failing validation, fails both upload routes and writes no financial_data rows');
  it.todo('§smoke-report the staging smoke check fails when any report section failed');
});

describe('B3 regulation re-split', () => {
  it.todo('§reg-split-rule an in-text "按照本准则第X条的规定" does not start a new article');
  it.todo('§reg-integrity articles are consecutive with no duplicates, page count matches, and no body line is left unassigned');
  it.todo('§reg-upload-dup an admin upload whose split repeats an article number fails and writes no articles');
  it.todo('§reg-upload-storage an admin regulation upload whose file storage fails writes no document and no articles');
});

describe('B4 keyword search and citations', () => {
  it.todo('§reg-search-citation every regulation search result has a regulation name, article number and source document id');
  it.todo('§search-rounds the 4th search returns budget_exhausted without searching, the answer turn offers no tools, and saved history has no unpaired tool call');
  it.todo('§citation-text every article number sent to the user comes from this question\'s evidence; self-written numbers and unknown ids are removed with a notice');
  it.todo('§citation-link a regulation search event links to the preview of the article source file');
  it.todo('§out-of-library an answer without a valid evidence id after a regulation search starts with the out-of-library label and has no article numbers');
  it.todo('§retrieval-error when every search of the question errored, the label is the retrieval-failure one');
  it.todo('§upload-no-embedding a user upload succeeds, writes chunks, makes no embedding call, and its content reaches the model when selected');
  it.todo('§no-embedding-calls src/ has no embedding API call or embedding model config');
});
