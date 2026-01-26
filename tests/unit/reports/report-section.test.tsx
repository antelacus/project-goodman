import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReportSection } from '@/components/reports/ReportSection';
import type { ReportSection as ReportSectionType } from '@/types/report';

describe('ReportSection', () => {
  it('formats comparison values using the same unit rules', () => {
    const section: ReportSectionType = {
      id: 'liquidity',
      title: '流动性分析',
      metrics: [
        {
          name: '流动比率',
          toolName: 'current_ratio',
          value: 2.2733,
          formatted: '227.33%',
          previousValue: 3.064837,
          change: '-25.83%',
        },
      ],
      analysis: '测试分析',
      sourceDocuments: [],
    };

    const html = renderToStaticMarkup(
      React.createElement(ReportSection, {
        section,
        index: 0,
        isExpanded: true,
        onToggle: () => {},
        hasComparison: true,
        comparisonYear: '2023',
        primaryYear: '2024',
      })
    );

    expect(html).toContain('306.48%');
  });
});
