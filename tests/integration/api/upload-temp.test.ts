/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { EnsureSessionResult } from '@/lib/security';
import { POST } from '@/app/api/documents/upload-temp/route';
import * as security from '@/lib/security';
import { createServerSupabaseClient } from '@/lib/database';
import { parseDocumentSections, createSectionAwareChunks } from '@/lib/documents';
import { uploadFileToStorage } from '@/lib/documents/storage';

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

vi.mock('@/lib/database', () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/documents', () => ({
  parseDocumentSections: vi.fn(),
  createSectionAwareChunks: vi.fn(),
}));

vi.mock('@/lib/documents/storage', () => ({
  uploadFileToStorage: vi.fn(),
  deleteFileFromStorage: vi.fn(),
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
  return new NextRequest('http://localhost/api/documents/upload-temp', {
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

  vi.mocked(parseDocumentSections).mockResolvedValue({
    quality: 'basic',
    hasToc: false,
    sections: [{ title: '概览', level: 1 }],
  });

  vi.mocked(createSectionAwareChunks).mockReturnValue([
    {
      content: '测试内容片段',
      sectionTitle: '概览',
      sectionLevel: 1,
      sectionPath: '概览',
    },
  ]);

  const insertMock = vi.fn().mockResolvedValue({ error: null });
  const deleteMock = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });

  vi.mocked(createServerSupabaseClient).mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === 'documents') {
        return { insert: insertMock, delete: deleteMock };
      }
      return { insert: insertMock };
    }),
  });

  vi.mocked(uploadFileToStorage).mockResolvedValue('https://example.com/temp.pdf');
});

describe('POST /api/documents/upload-temp', () => {
  it('stores parsed content and returns document metadata', async () => {
    const payload = {
      fileData: Buffer.from('这是一段用于测试的文本内容，长度足够。').toString('base64'),
      fileName: 'test.txt',
      fileType: 'text/plain',
    };

    const response = await POST(createRequest(payload));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.documentId).toBeTruthy();
    expect(body.textPreview).toContain('测试的文本内容');
    expect(body.structureAnalysis.chunkCount).toBe(1);
  });
});
