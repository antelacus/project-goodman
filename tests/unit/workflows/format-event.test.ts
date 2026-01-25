import { describe, it, expect } from 'vitest';
import { formatToolResultEvent } from '@/lib/workflows/shared/format-event';

describe('formatToolResultEvent', () => {
  it('renders formula with mixed operators and parentheses', () => {
    const output = {
      success: true,
      data: {
        value: 2,
        formatted: '2.00倍',
        formula: '速动比率 = (流动资产合计 - 存货) / 流动负债合计',
        inputs: {
          '流动资产合计': 1000,
          '存货': 200,
          '流动负债合计': 400,
        },
      },
    };

    const result = formatToolResultEvent('quick_ratio', output);
    expect(result).toBe('(流动资产合计 1,000.00 - 存货 200.00) / 流动负债合计 400.00 = 2.00倍');
  });
});
