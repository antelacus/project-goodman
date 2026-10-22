import { describe, it, expect } from 'vitest';
import { resolveMetricKey } from '@/lib/financial/metric-registry';
import { normalizeMetricName } from '@/lib/extraction/column';

describe('column/ai normalization utilities', () => {
  it('resolves prefixed metric name', () => {
    expect(resolveMetricKey('三、营业利润')).toBe('利润表-营业利润-营业利润');
  });

  it('normalizes column metric names to canonical key', () => {
    expect(normalizeMetricName('其中：营业收入金额')).toBe('利润表-营业总收入-营业收入');
  });

  it('normalizes common label variants to canonical key', () => {
    expect(normalizeMetricName('归属母公司所有者的其他综合收益的税后净额')).toBe(
      '利润表-其他综合收益-归属于母公司所有者的其他综合收益的税后净额'
    );
  });
});
