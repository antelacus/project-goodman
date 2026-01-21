/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { EnsureSessionResult } from '@/lib/security';
import { POST } from '@/app/api/chat/stream/route';
import * as logging from '@/lib/logging';
import * as security from '@/lib/security';
import { unifiedAgentGraph } from '@/lib/workflows/unified/graph';

vi.mock('@/lib/logging', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  logRequest: vi.fn(),
  logError: vi.fn(),
  logWorkflowEvent: vi.fn(),
}));

vi.mock('@/lib/workflows/unified/graph', () => ({
  unifiedAgentGraph: {
    streamEvents: vi.fn(),
  },
}));

vi.mock('@/lib/workflows/shared/format-event', () => ({
  formatThinkingEvent: (name: string) => `thinking:${name}`,
  formatToolCallEvent: () => 'tool-call',
  formatToolResultEvent: () => 'tool-result',
}));

vi.mock('@/lib/security', () => ({
  ensureSession: vi.fn(),
  checkGuestRate: vi.fn(),
  incrementGuestRate: vi.fn(),
  generateRequestId: () => 'req-1',
  createErrorResponse: (error: unknown, requestId: string, status = 500) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message, requestId }),
      { status, headers: { 'content-type': 'application/json' } }
    );
  },
}));

const mockSessionResult: EnsureSessionResult = {
  session: {
    token: 'session-token',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    ip: '127.0.0.1',
    userAgent: 'vitest',
    sessionId: '550e8400-e29b-41d4-a716-446655440000',
    role: 'guest',
  },
  isNewSession: false,
};

function createRequest(body: unknown) {
  return new NextRequest('http://localhost/api/chat/stream', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createEventStream(events: Array<Record<string, unknown>>) {
  return (async function* () {
    for (const event of events) {
      yield event;
    }
  })();
}

async function readSseEvents(response: Response) {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let text = '';

  if (!reader) return [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += typeof value === 'string' ? value : decoder.decode(value);
  }

  return text
    .split('\n\n')
    .filter((block) => block.trim())
    .map((block) => {
      const lines = block.split('\n');
      let eventType: string | null = null;
      let eventData: unknown = null;

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.substring(7);
        } else if (line.startsWith('data: ')) {
          eventData = JSON.parse(line.substring(6));
        }
      }

      return { type: eventType, data: eventData };
    });
}

beforeEach(() => {
  vi.mocked(security.ensureSession).mockResolvedValue(mockSessionResult);
  vi.mocked(security.checkGuestRate).mockResolvedValue({
    allowed: true,
    remaining: 10,
    total: 20,
    resetsAt: Date.now() + 3600_000,
  });
  vi.mocked(security.incrementGuestRate).mockResolvedValue();
});

describe('POST /api/chat/stream', () => {
  it('streams a complete event for valid requests', async () => {
    vi.mocked(unifiedAgentGraph.streamEvents).mockResolvedValue(
      createEventStream([
        {
          event: 'on_chain_end',
          name: 'generateResponse',
          data: {
            output: {
              output: {
                answer: '测试回复',
                type: 'final',
              },
            },
          },
        },
      ])
    );

    const response = await POST(createRequest({ question: '你好' }));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');

    const events = await readSseEvents(response);
    const completeEvent = events.find((event) => event.type === 'complete');

    expect(completeEvent?.data).toMatchObject({
      answer: '测试回复',
    });

    expect(vi.mocked(logging.logWorkflowEvent)).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow: 'chat_stream',
        step: 'start',
        status: 'ok',
        requestId: 'req-1',
      })
    );
    expect(vi.mocked(logging.logWorkflowEvent)).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow: 'chat_stream',
        step: 'success',
        status: 'ok',
        requestId: 'req-1',
      })
    );
  });

  it('includes retrieval warnings when search results are empty', async () => {
    vi.mocked(unifiedAgentGraph.streamEvents).mockResolvedValue(
      createEventStream([
        {
          event: 'on_chain_end',
          name: 'toolExecutor',
          data: {
            output: {
              toolResults: [
                {
                  toolName: 'search_documents',
                  result: { success: true, data: { total: 0, documents: [] } },
                },
              ],
            },
          },
        },
        {
          event: 'on_chain_end',
          name: 'generateResponse',
          data: {
            output: {
              output: {
                answer: '测试回复',
                type: 'final',
              },
            },
          },
        },
      ])
    );

    const response = await POST(createRequest({ question: '你好' }));
    expect(response.status).toBe(200);

    const events = await readSseEvents(response);
    const completeEvent = events.find((event) => event.type === 'complete');

    expect(completeEvent?.data?.warnings).toEqual([
      expect.objectContaining({
        type: 'RETRIEVAL_EMPTY',
      }),
    ]);
  });
});
