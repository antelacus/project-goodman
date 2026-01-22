/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/admin/upload-database-document/route';
import * as logging from '@/lib/logging';
import * as security from '@/lib/security';
import { createServerSupabaseClient } from '@/lib/database';
import { performStructuredExtraction } from '@/lib/extraction';

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
        create: vi.fn().mockResolvedValue({
          data: [{ embedding: [0.1, 0.2, 0.3] }],
        }),
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

vi.mock('@/lib/database', () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/extraction', () => ({
  performStructuredExtraction: vi.fn(),
  performColumnBasedExtraction: vi.fn(),
  performAIExtraction: vi.fn(),
}));

function createRequest(body: unknown) {
  return new NextRequest('http://localhost/api/admin/upload-database-document', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
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
    expect(body.requestId).toBe('req-1');

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

  it('stores documents when admin upload succeeds', async () => {
    vi.mocked(security.verifyAdminPassword).mockResolvedValue(true);

    vi.mocked(performStructuredExtraction).mockResolvedValue({
      documentType: 'general',
      extractedData: { summary: 'test' },
      summary: 'test summary',
      confidence: 0.9,
      metadata: {},
    });

    const documentsInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    const documentChunksInsert = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(createServerSupabaseClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'documents') {
          return {
            insert: documentsInsert,
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'document_chunks') {
          return {
            insert: documentChunksInsert,
          };
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }),
    });

    const payload = {
      documentText: Buffer.from('Admin upload sample content.').toString('base64'),
      fileName: 'notes.txt',
      documentType: 'general',
      adminPassword: 'valid-password',
    };

    const response = await POST(createRequest(payload));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.documentId).toBeTruthy();

    expect(vi.mocked(logging.logWorkflowEvent)).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow: 'admin_upload',
        step: 'success',
        status: 'ok',
        requestId: 'req-1',
      })
    );
  });

  it('decodes markdown uploads before storing document size', async () => {
    vi.mocked(security.verifyAdminPassword).mockResolvedValue(true);

    vi.mocked(performStructuredExtraction).mockResolvedValue({
      documentType: 'general',
      extractedData: { summary: 'test' },
      summary: 'test summary',
      confidence: 0.9,
      metadata: {},
    });

    let insertedDocument: Record<string, unknown> | null = null;
    const documentsInsert = vi.fn().mockImplementation((payload: Record<string, unknown>) => {
      insertedDocument = payload;
      return {
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    });
    const documentChunksInsert = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(createServerSupabaseClient).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'documents') {
          return {
            insert: documentsInsert,
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'document_chunks') {
          return {
            insert: documentChunksInsert,
          };
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }),
    });

    const markdown = '# 标题\n内容';
    const payload = {
      documentText: Buffer.from(markdown).toString('base64'),
      fileName: 'notes.md',
      documentType: 'general',
      adminPassword: 'valid-password',
    };

    const response = await POST(createRequest(payload));

    expect(response.status).toBe(200);
    expect(insertedDocument?.size).toBe(Buffer.byteLength(markdown, 'utf8'));
  });
});
