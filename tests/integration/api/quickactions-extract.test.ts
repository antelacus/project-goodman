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

vi.mock('@/lib/ai', () => ({
  generateJSON: vi.fn().mockResolvedValue({ foo: 'bar' }),
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

const documents = vi.hoisted(() => new Map<string, { file_url: string; name: string; doc_type: string; doc_category: string; owner_type: string; owner_id: string }>());
vi.mock('@/lib/database', () => ({
  createServerSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: (_column: string, id: string) => ({
          single: async () => (documents.has(id) ? { data: documents.get(id), error: null } : { data: null, error: { code: 'PGRST116' } }),
        }),
      }),
    }),
  }),
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
  vi.clearAllMocks();
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

  it('includes requestId on validation errors', async () => {
    const response = await POST(createRequest({}));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.requestId).toBe('req-1');

    expect(vi.mocked(logging.logWorkflowEvent)).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow: 'quick_action_extract',
        step: 'failure',
        status: 'error',
        errorType: 'VALIDATION',
        requestId: 'req-1',
      })
    );
  });

  it('answers someone else\'s document like a missing one: 404, not 403', async () => {
    const theirs = '9b3e4c5a-6d7f-4e8a-8b92-3c4d5e6f7081';
    documents.set(theirs, { file_url: 'x.pdf', name: 'x.pdf', doc_type: 'contract', doc_category: 'business', owner_type: 'guest', owner_id: 'someone-else' });
    const refused = await POST(createRequest({ documentId: theirs }));
    const missing = await POST(createRequest({ documentId: '7f1c2a3e-4b5d-4c6e-8f70-1a2b3c4d5e6f' }));
    expect(refused.status).toBe(404);
    expect(await refused.json()).toEqual(await missing.json());
  });
});
