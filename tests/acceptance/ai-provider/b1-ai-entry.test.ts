// @vitest-environment node
// Acceptance tests for docs/features/ai-provider/REQ.md, one per §-id, one file per
// batch (TRACK 二) so each batch's mocks stay its own. A batch writes its bodies
// first (red), then builds until they pass; the version cannot close while a todo
// is left.

import { z } from 'zod';
import { installFakeRelay, chatReply, responsesReply } from '../../stubs/fake-relay';
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
      expect(typeof body.instructions).toBe('string');
      expect((body.instructions as string).trim()).not.toBe('');
    }
    await expect(ai.generateText({ purpose: 'title', system: '  ', prompt: '问题' })).rejects.toThrow();
  });

  it('§ai-outcome length, refusal, content_filter, blank text, schema-invalid JSON and malformed replies fail; a tool-calls-only reply succeeds only when tools were offered', async () => {
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
    // The response says completed, but its message did not finish.
    relay.reply(() => ({ body: responsesReply('半截', { messageStatus: 'incomplete' }) }));
    await expect(ai.readDocumentText(file)).rejects.toBeInstanceOf(ai.AIUnavailableError);

    const tool: ai.ToolDefinition = { type: 'function', function: { name: 'search', parameters: { type: 'object' } } };
    const chat = (tools: ai.ToolDefinition[] = [tool]) =>
      ai.chatWithTools({ system: '系统', messages: [{ role: 'user', content: '问题' }], tools });
    const searchCall = (args: string) => ({ body: chatReply(null, { toolCalls: [{ id: 'c1', name: 'search', arguments: args }] }) });
    relay.reply(() => searchCall('{"keywords":["金融资产"]}'));
    await expect(chat()).resolves.toEqual({
      text: '',
      toolCalls: [{ id: 'c1', name: 'search', args: { keywords: ['金融资产'] } }],
    });
    // Asked for a final answer, the relay calls a tool anyway.
    await expect(chat([])).rejects.toBeInstanceOf(ai.AIUnavailableError);
    for (const args of ['{"keywords":', '']) {
      relay.reply(() => searchCall(args));
      await expect(chat()).rejects.toBeInstanceOf(ai.AIUnavailableError);
    }
    // A custom (non-function) tool call, which no request of ours offers.
    relay.reply(() => {
      const reply = chatReply(null, { toolCalls: [{ id: 'c1', name: 'search', arguments: '{}' }] });
      reply.choices[0].message.tool_calls = [{ id: 'c1', type: 'custom', custom: { name: 'search', input: '{}' } }] as never;
      return { body: reply };
    });
    await expect(chat()).rejects.toBeInstanceOf(ai.AIUnavailableError);
    // A relay that drops the optional `type` field still delivers a function call.
    relay.reply(() => {
      const reply = chatReply(null, { toolCalls: [{ id: 'c1', name: 'search', arguments: '{}' }] });
      delete (reply.choices[0].message.tool_calls![0] as { type?: string }).type;
      return { body: reply };
    });
    await expect(chat()).resolves.toEqual({ text: '', toolCalls: [{ id: 'c1', name: 'search', args: {} }] });

    // HTTP 200 with a body that is cut off, or with no choices at all.
    for (const reply of [{ raw: '{"choices":' }, { body: {} }]) {
      relay.reply(() => reply);
      await expect(text()).rejects.toBeInstanceOf(ai.AIUnavailableError);
    }
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

  it('§ai-timeout the time limit holds while the SDK waits to retry', async () => {
    vi.useFakeTimers();
    try {
      // A 503 arrives late and asks for a retry that would start after the limit.
      const limit = PURPOSES.chat.timeoutMs;
      relay.reply(() => ({ status: 503, body: { error: { message: '忙' } }, headers: { 'retry-after': '50' }, delayMs: limit - 10_000 }));
      let settledAt: number | undefined;
      const started = Date.now();
      const call = ai.chatWithTools({ system: '系统', messages: [{ role: 'user', content: '问题' }], tools: [] });
      const settled = expect(call.finally(() => { settledAt = Date.now() - started; })).rejects.toBeInstanceOf(ai.AIUnavailableError);
      await vi.advanceTimersByTimeAsync(limit + 1);
      expect(settledAt).toBeDefined();
      expect(settledAt!).toBeLessThanOrEqual(limit + 1);
      await vi.advanceTimersByTimeAsync(60_000);
      await settled;
    } finally {
      vi.useRealTimers();
    }
  });
});
