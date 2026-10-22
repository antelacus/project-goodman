// A stand-in for the relay at the fetch level: the real OpenAI SDK runs, so tests
// see the exact request bodies and the SDK's own error classes. Install it before
// `@/lib/ai` first creates its client (the SDK captures fetch at construction).

// `raw` sends a body that is not valid JSON; `delayMs` answers late (under fake
// timers too), honouring the abort signal like a real connection.
type Reply =
  | { status?: number; body?: unknown; raw?: string; headers?: Record<string, string>; delayMs?: number }
  | 'hang';

export interface RelayRequest {
  path: string;
  body: Record<string, unknown>;
}

export function installFakeRelay() {
  const requests: RelayRequest[] = [];
  let reply: (req: RelayRequest) => Reply = () => ({ body: chatReply('ok') });

  const fakeFetch = async (url: string | URL | Request, init?: RequestInit) => {
    const req: RelayRequest = {
      path: new URL(String(url)).pathname,
      body: JSON.parse(String(init?.body ?? '{}')),
    };
    requests.push(req);
    const r = reply(req);
    if (r === 'hang') {
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError'))
        );
      });
    }
    if (r.delayMs) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, r.delayMs);
        init?.signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
    }
    return new Response(r.raw ?? JSON.stringify(r.body), {
      status: r.status ?? 200,
      headers: { 'content-type': 'application/json', ...r.headers },
    });
  };

  vi.stubEnv('LLM_API_KEY', 'test-key');
  vi.stubEnv('LLM_BASE_URL', 'http://relay.test/v1');
  vi.stubGlobal('fetch', fakeFetch);

  return {
    requests,
    last: () => requests[requests.length - 1],
    reply: (fn: (req: RelayRequest) => Reply) => {
      reply = fn;
    },
    reset: () => {
      requests.length = 0;
      reply = () => ({ body: chatReply('ok') });
    },
  };
}

export function chatReply(
  content: string | null,
  opts: {
    finish?: string;
    refusal?: string;
    toolCalls?: Array<{ id: string; name: string; arguments: string }>;
  } = {}
) {
  return {
    id: 'chatcmpl-test',
    object: 'chat.completion',
    created: 0,
    model: 'gpt-6.1-sol',
    choices: [
      {
        index: 0,
        finish_reason: opts.finish ?? (opts.toolCalls ? 'tool_calls' : 'stop'),
        message: {
          role: 'assistant',
          content,
          refusal: opts.refusal ?? null,
          tool_calls: opts.toolCalls?.map(tc => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: tc.arguments },
          })),
        },
      },
    ],
  };
}

export function responsesReply(
  text: string,
  opts: { status?: string; incompleteReason?: string; refusal?: string; messageStatus?: string } = {}
) {
  return {
    id: 'resp-test',
    object: 'response',
    created_at: 0,
    model: 'gpt-6.1-sol',
    status: opts.status ?? 'completed',
    incomplete_details: opts.incompleteReason ? { reason: opts.incompleteReason } : null,
    output: [
      {
        type: 'message',
        id: 'msg-test',
        role: 'assistant',
        status: opts.messageStatus ?? 'completed',
        content: opts.refusal
          ? [{ type: 'refusal', refusal: opts.refusal }]
          : [{ type: 'output_text', text, annotations: [] }],
      },
    ],
  };
}
