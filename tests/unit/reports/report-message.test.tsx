import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReportMessage } from '@/components/reports/ReportMessage';
import type { ReportContent } from '@/types/report';

describe('ReportMessage', () => {
  it('collapses all sections by default', () => {
    const report: ReportContent = {
      title: '2024年度财务综合分析报告',
      generatedAt: '2026-01-26T00:00:00.000Z',
      year: '2024',
      comparisonYear: '2023',
      summary: {
        keyFindings: [],
        riskWarnings: [],
        recommendations: [],
      },
      sections: [
        {
          id: 'liquidity',
          title: '流动性分析',
          metrics: [
            {
              name: '流动比率',
              toolName: 'current_ratio',
              value: 2.2733,
              formatted: '227.33%',
              previousValue: 3.0648,
              change: '-25.83%',
            },
          ],
          analysis: '测试分析',
          sourceDocuments: [],
        },
      ],
    };

    const html = renderToStaticMarkup(React.createElement(ReportMessage, { report }));

    expect(html).not.toContain('指标名称');
  });
});
