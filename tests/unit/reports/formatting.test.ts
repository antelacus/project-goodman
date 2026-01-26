/* @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { formatReportMetricPreviousValue } from '@/lib/reports/formatting';

describe('formatReportMetricPreviousValue', () => {
  it('formats previous value using the same unit rules', () => {
    const metric = {
      name: '流动比率',
      toolName: 'current_ratio',
      value: 2.27,
      formatted: '227.00%',
      previousValue: 2.4424,
    };

    expect(formatReportMetricPreviousValue(metric)).toBe('244.24%');
  });
});
