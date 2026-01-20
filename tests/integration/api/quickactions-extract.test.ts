/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { EnsureSessionResult } from '@/lib/security';
import { POST } from '@/app/api/quick-actions/extract/route';
import * as logging from '@/lib/logging';
import * as security from '@/lib/security';

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

vi.mock('@/lib/prompts', () => ({
  getDataExtractPrompt: () => 'PROMPT',
}));

vi.mock('openai', () => {
  return {
    default: class OpenAI {
      chat = {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: '{"foo":"bar"}' } }],
          }),
        },
      };
      responses = {
        create: vi.fn(),
      };
      constructor() {}
    },
  };
});

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
  return new NextRequest('http://localhost/api/quick-actions/extract', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.mocked(security.ensureSession).mockResolvedValue(mockSessionResult);
  vi.mocked(security.checkGuestRate).mockResolvedValue({
    allowed: true,
    remaining: 4,
    total: 5,
    resetsAt: Date.now() + 3600_000,
  });
  vi.mocked(security.incrementGuestRate).mockResolvedValue();
});

describe('POST /api/quick-actions/extract', () => {
  it('logs workflow events for successful extraction', async () => {
    const payload = {
      fileData: Buffer.from('test').toString('base64'),
      fileName: 'test.png',
      fileType: 'image/png',
    };

    const response = await POST(createRequest(payload));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({ foo: 'bar' });

    expect(vi.mocked(logging.logWorkflowEvent)).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow: 'quick_action_extract',
        step: 'start',
        status: 'ok',
        requestId: 'req-1',
      })
    );
    expect(vi.mocked(logging.logWorkflowEvent)).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow: 'quick_action_extract',
        step: 'success',
        status: 'ok',
        requestId: 'req-1',
      })
    );
  });
});
