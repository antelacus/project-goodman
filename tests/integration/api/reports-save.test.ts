/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { EnsureSessionResult } from '@/lib/security';
import { POST } from '@/app/api/reports/save/route';
import { createServerSupabaseClient } from '@/lib/database';
import { generateAndSaveReportDocx } from '@/lib/reports';
import { getSignedFileUrl } from '@/lib/documents/storage';
import * as security from '@/lib/security';

vi.mock('@/lib/database', () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/reports', () => ({
  generateAndSaveReportDocx: vi.fn(),
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
  validateCsrf: vi.fn(),
  createCsrfErrorResponse: () => new Response('csrf', { status: 403 }),
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
  return new NextRequest('http://localhost/api/reports/save', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': 'csrf-token',
    },
    body: JSON.stringify(body),
  });
}

const reportPayload = {
  content: {
    title: '2024年度财务综合分析报告',
    generatedAt: '2026-01-22T00:00:00.000Z',
    year: '2024',
    comparisonYear: '2023',
    sections: [],
    summary: {
      keyFindings: ['流动性改善。'],
      riskWarnings: ['需关注应收账款回收周期。'],
      recommendations: ['优化存货管理策略。'],
    },
  },
  year: '2024',
  comparisonYear: '2023',
  generationTimeMs: 1200,
};

beforeEach(() => {
  vi.mocked(security.ensureSession).mockResolvedValue(mockSessionResult);
  vi.mocked(security.validateCsrf).mockResolvedValue(true);

  const insert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: 'report-id' }, error: null }),
    }),
  });

  vi.mocked(createServerSupabaseClient).mockReturnValue({
    from: vi.fn(() => ({ insert })),
  } as unknown as ReturnType<typeof createServerSupabaseClient>);
});

describe('POST /api/reports/save', () => {
  it('returns docxUrl after saving report', async () => {
    vi.mocked(generateAndSaveReportDocx).mockResolvedValue('reports/report-id/report.docx');
    vi.mocked(getSignedFileUrl).mockResolvedValue('https://example.com/report.docx');

    const response = await POST(createRequest(reportPayload));

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data?.docxUrl).toBe('https://example.com/report.docx');
    expect(generateAndSaveReportDocx).toHaveBeenCalledWith(
      'report-id',
      reportPayload.content,
      '2024',
      '2023'
    );
  });

  it('returns success even if docx generation fails', async () => {
    vi.mocked(generateAndSaveReportDocx).mockRejectedValue(new Error('docx failed'));
    vi.mocked(getSignedFileUrl).mockResolvedValue(null);

    const response = await POST(createRequest(reportPayload));

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data?.docxUrl).toBeNull();
  });
});
