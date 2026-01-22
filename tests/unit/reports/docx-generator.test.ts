/* @vitest-environment node */
import { describe, it, expect } from 'vitest';
import type { ReportContent } from '@/types/report';
import { generateReportDocx } from '@/lib/reports/docx-generator';

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
          sourceDocumentIds: ['doc-1'],
        },
      ],
      analysis: '本期流动比率提升，主要受短期借款下降影响。',
      sourceDocuments: [
        {
          documentId: 'doc-1',
          documentName: '2024年资产负债表',
          documentType: 'financial_report',
          year: '2024',
        },
      ],
    },
  ],
  summary: {
    keyFindings: ['流动性改善。'],
    riskWarnings: ['需关注应收账款回收周期。'],
    recommendations: ['优化存货管理策略。'],
  },
};

describe('generateReportDocx', () => {
  it('returns a DOCX buffer with zip header', async () => {
    const buffer = await generateReportDocx(reportFixture);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(100);
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4B);
  });
});
