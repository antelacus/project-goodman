/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReportContent } from '@/types/report';
import { createClient } from '@supabase/supabase-js';
import { generateAndSaveReportDocx } from '@/lib/reports/docx-upload';
import { generateReportDocx } from '@/lib/reports/docx-generator';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/reports/docx-generator', () => ({
  generateReportDocx: vi.fn(),
  DOCX_CONTENT_TYPE: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}));

const originalEnv = { ...process.env };

const reportFixture: ReportContent = {
  title: '2024年度财务综合分析报告',
  generatedAt: '2026-01-22T00:00:00.000Z',
  year: '2024',
  comparisonYear: '2023',
  sections: [
    {
      id: 'liquidity',
      title: '流动性分析',
      metrics: [
        {
          name: '流动比率',
          toolName: 'current_ratio',
          value: 2.1,
          formatted: '2.1倍',
          previousValue: 1.9,
          change: '+10.53%',
          interpretation: '流动性保持稳定。',
          warnings: [],
        },
      ],
      analysis: '本期流动比率提升，主要受短期借款下降影响。',
      sourceDocuments: [],
    },
  ],
  summary: {
    keyFindings: ['流动性改善。'],
    riskWarnings: ['需关注应收账款回收周期。'],
    recommendations: ['优化存货管理策略。'],
  },
};

describe('generateAndSaveReportDocx', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('uploads DOCX and updates docx_storage_path', async () => {
    const upload = vi.fn().mockResolvedValue({
      data: { path: 'reports/report-id/report_2024_123.docx' },
      error: null,
    });
    const storageFrom = vi.fn().mockReturnValue({ upload });
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const dbFrom = vi.fn().mockReturnValue({ update });

    vi.mocked(createClient).mockImplementation(() => ({
      storage: { from: storageFrom },
      from: dbFrom,
    }) as unknown as ReturnType<typeof createClient>);

    vi.mocked(generateReportDocx).mockResolvedValue(Buffer.from('docx'));

    const storagePath = await generateAndSaveReportDocx(
      'report-id',
      reportFixture,
      '2024',
      '2023'
    );

    expect(storagePath).toBe('reports/report-id/report_2024_123.docx');
    expect(storageFrom).toHaveBeenCalledWith('document-files');
    expect(upload).toHaveBeenCalledWith(
      expect.stringContaining('.docx'),
      expect.any(Buffer),
      expect.objectContaining({
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      })
    );
    expect(dbFrom).toHaveBeenCalledWith('reports');
    expect(update).toHaveBeenCalledWith({ docx_storage_path: storagePath });
  });

  it('retries DOCX upload with a fallback content type when storage rejects mime', async () => {
    const upload = vi.fn()
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: 'mime type application/vnd.openxmlformats-officedocument.wordprocessingml.document is not supported',
          statusCode: 415,
        },
      })
      .mockResolvedValueOnce({
        data: { path: 'reports/report-id/report_2024_123.docx' },
        error: null,
      });
    const storageFrom = vi.fn().mockReturnValue({ upload });
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const dbFrom = vi.fn().mockReturnValue({ update });

    vi.mocked(createClient).mockImplementation(() => ({
      storage: { from: storageFrom },
      from: dbFrom,
    }) as unknown as ReturnType<typeof createClient>);

    vi.mocked(generateReportDocx).mockResolvedValue(Buffer.from('docx'));

    const storagePath = await generateAndSaveReportDocx(
      'report-id',
      reportFixture,
      '2024',
      '2023'
    );

    expect(storagePath).toBe('reports/report-id/report_2024_123.docx');
    expect(upload).toHaveBeenCalledTimes(2);
    expect(upload).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('.docx'),
      expect.any(Buffer),
      expect.objectContaining({
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      })
    );
    expect(upload).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('.docx'),
      expect.any(Buffer),
      expect.objectContaining({
        contentType: 'application/octet-stream',
        upsert: true,
      })
    );
    expect(update).toHaveBeenCalledWith({ docx_storage_path: storagePath });
  });
});
