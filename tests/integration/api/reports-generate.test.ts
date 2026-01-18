/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { EnsureSessionResult } from '@/lib/security';
import { POST } from '@/app/api/reports/generate/route';
import * as security from '@/lib/security';
import { reportWorkflowGraph } from '@/lib/workflows/report';

vi.mock('@/lib/logging', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  logRequest: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('@/lib/workflows/report', () => ({
  reportWorkflowGraph: {
    streamEvents: vi.fn(),
  },
  createInitialState: (input: unknown) => ({ input }),
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
  return new NextRequest('http://localhost/api/reports/generate', {
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

beforeEach(() => {
  vi.mocked(security.ensureSession).mockResolvedValue(mockSessionResult);
  vi.mocked(security.checkGuestRate).mockResolvedValue({
    allowed: true,
    remaining: 2,
    total: 3,
    resetsAt: Date.now() + 3600_000,
  });
  vi.mocked(security.incrementGuestRate).mockResolvedValue();
});

describe('POST /api/reports/generate', () => {
  it('streams a complete report event for valid requests', async () => {
    vi.mocked(reportWorkflowGraph.streamEvents).mockResolvedValue(
      createEventStream([
        {
          event: 'on_chain_end',
          name: 'assembleReport',
          data: {
            output: {
              report: {
                title: '综合财务分析报告',
                summary: '测试报告内容',
              },
              meta: { generationTimeMs: 1234 },
            },
          },
        },
      ])
    );

    const response = await POST(createRequest({ year: '2024' }));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');

    const reader = response.body?.getReader();
    const firstChunk = reader ? await reader.read() : null;
    const chunkText = firstChunk?.value
      ? typeof firstChunk.value === 'string'
        ? firstChunk.value
        : new TextDecoder().decode(firstChunk.value)
      : '';

    expect(chunkText).toContain('event: report');
    expect(chunkText).toContain('"type":"complete"');
  });
});
