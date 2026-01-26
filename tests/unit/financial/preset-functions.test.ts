/* @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { presetFunctions } from '@/lib/financial/preset-functions';

describe('presetFunctions interpretation', () => {
  it('does not contain numeric thresholds', () => {
    const withDigits = presetFunctions.filter(f => /\d/.test(f.interpretation));
    expect(withDigits).toHaveLength(0);
  });
});

describe('ratio formatting', () => {
  it('formats current ratio as percent', () => {
    const currentRatio = presetFunctions.find(f => f.name === 'current_ratio');
    const result = currentRatio?.calculate({
      '资产负债表-流动资产-流动资产合计': 227,
      '资产负债表-流动负债-流动负债合计': 100,
    });

    expect(result?.formatted).toBe('227.00%');
  });
});
