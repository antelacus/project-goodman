/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { EnsureSessionResult } from '@/lib/security';
import { GET } from '@/app/api/reports/[id]/docx/route';
import { createServerSupabaseClient } from '@/lib/database';
import { getSignedFileUrl } from '@/lib/documents/storage';
import * as security from '@/lib/security';

vi.mock('@/lib/database', () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/documents/storage', () => ({
  getSignedFileUrl: vi.fn(),
}));

vi.mock('@/lib/security', () => ({
  ensureSession: vi.fn(),
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

const reportId = '550e8400-e29b-41d4-a716-446655440001';

function createRequest() {
  return new NextRequest(`http://localhost/api/reports/${reportId}/docx`);
}

beforeEach(() => {
  vi.mocked(security.ensureSession).mockResolvedValue(mockSessionResult);
});

describe('GET /api/reports/[id]/docx', () => {
  it('returns docx signed url for owner', async () => {
    vi.mocked(createServerSupabaseClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: reportId,
                owner_id: mockSessionResult.session.sessionId,
                owner_type: 'guest',
                docx_storage_path: 'reports/report-id/report.docx',
              },
              error: null,
            }),
          }),
        }),
      })),
    } as unknown as ReturnType<typeof createServerSupabaseClient>);

    vi.mocked(getSignedFileUrl).mockResolvedValue('https://example.com/report.docx');

    const response = await GET(createRequest(), { params: Promise.resolve({ id: reportId }) });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data?.url).toBe('https://example.com/report.docx');
  });

  it('returns 404 when docx is missing', async () => {
    vi.mocked(createServerSupabaseClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: reportId,
                owner_id: mockSessionResult.session.sessionId,
                owner_type: 'guest',
                docx_storage_path: null,
              },
              error: null,
            }),
          }),
        }),
      })),
    } as unknown as ReturnType<typeof createServerSupabaseClient>);

    const response = await GET(createRequest(), { params: Promise.resolve({ id: reportId }) });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('DOCX 文件尚未生成');
  });
});
