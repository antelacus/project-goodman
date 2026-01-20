/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/admin/upload-database-document/route';
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

vi.mock('openai', () => {
  return {
    default: class OpenAI {
      embeddings = {
        create: vi.fn(),
      };
      chat = {
        completions: {
          create: vi.fn(),
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
  verifyAdminPassword: vi.fn(),
  generateRequestId: () => 'req-1',
  createErrorResponse: (error: unknown, requestId: string, status = 500) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message, requestId }),
      { status, headers: { 'content-type': 'application/json' } }
    );
  },
  validateFileByExtension: vi.fn(() => ({ valid: true })),
}));

function createRequest(body: unknown) {
  return new NextRequest('http://localhost/api/admin/upload-database-document', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.mocked(security.verifyAdminPassword).mockResolvedValue(false);
});

describe('POST /api/admin/upload-database-document', () => {
  it('logs workflow failure when admin auth fails', async () => {
    const payload = {
      documentText: 'test',
      fileName: 'test.pdf',
      documentType: 'balance_sheet',
      adminPassword: 'bad',
    };

    const response = await POST(createRequest(payload));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);

    expect(vi.mocked(logging.logWorkflowEvent)).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow: 'admin_upload',
        step: 'start',
        status: 'ok',
        requestId: 'req-1',
      })
    );
    expect(vi.mocked(logging.logWorkflowEvent)).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow: 'admin_upload',
        step: 'failure',
        status: 'error',
        errorType: 'AUTH',
        requestId: 'req-1',
      })
    );
  });
});
