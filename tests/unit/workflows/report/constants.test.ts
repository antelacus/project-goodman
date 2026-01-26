/* @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { formatMetricValue } from '@/lib/workflows/report/constants';

describe('formatMetricValue', () => {
  it('formats ratio metrics as percent with 2 decimals', () => {
    expect(formatMetricValue('current_ratio', 2.27)).toBe('227.00%');
  });

  it('formats percentage metrics as value * 100 with 2 decimals', () => {
    expect(formatMetricValue('gross_profit_margin', 0.225939)).toBe('22.59%');
  });

  it('formats currency metrics with thousands separators in 万元', () => {
    expect(formatMetricValue('working_capital', 6257420386.72)).toBe('625,742.04万元');
  });

  it('formats day and turnover metrics without percent conversion', () => {
    expect(formatMetricValue('asset_turnover_days', 652.1)).toBe('652天');
    expect(formatMetricValue('receivables_turnover', 3.52)).toBe('3.52次');
  });
});
