/* @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { buildSectionAnalysisPrompt } from '@/lib/workflows/report/prompts';
import type { MetricResult } from '@/lib/workflows/report/state';

const metricFixture: MetricResult = {
  toolName: 'current_ratio',
  displayName: '流动比率',
  value: 1.23,
  formatted: '1.23',
  unit: '倍',
  sourceDocumentIds: ['doc-1'],
};

describe('buildSectionAnalysisPrompt', () => {
  it('injects company context when provided', () => {
    const prompt = buildSectionAnalysisPrompt(
      'liquidity',
      '流动性分析',
      [metricFixture],
      [],
      '2024',
      undefined,
      {
        companyProfile: '公司档案内容',
        financialPolicy: '制度内容',
      }
    );

    expect(prompt).toContain('公司上下文');
    expect(prompt).toContain('公司档案内容');
    expect(prompt).toContain('制度内容');
    expect(prompt).toContain('公司基准');
  });

  it('omits company context block when none is provided', () => {
    const prompt = buildSectionAnalysisPrompt(
      'liquidity',
      '流动性分析',
      [metricFixture],
      [],
      '2024'
    );

    expect(prompt).not.toContain('公司上下文');
    expect(prompt).not.toContain('公司档案内容');
  });

  it('does not include hard numeric thresholds', () => {
    const prompt = buildSectionAnalysisPrompt(
      'liquidity',
      '流动性分析',
      [],
      [],
      '2024',
      '2023'
    );

    expect(prompt).not.toContain('>2');
    expect(prompt).not.toContain('>1');
    expect(prompt).not.toContain('40%-60%');
    expect(prompt).not.toContain('>3');
  });

  it('adds 2024 cause guidance', () => {
    const prompt = buildSectionAnalysisPrompt(
      'liquidity',
      '流动性分析',
      [],
      [],
      '2024',
      '2023'
    );

    expect(prompt).toContain('2024');
    expect(prompt).toContain('原因');
  });
});
