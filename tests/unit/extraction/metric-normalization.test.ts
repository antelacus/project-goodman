import { describe, it, expect } from 'vitest';
import { resolveMetricKey } from '@/lib/financial/metric-registry';
import { buildFinancialContentSchema } from '@/lib/extraction/ai';
import { normalizeMetricName } from '@/lib/extraction/column';

describe('column/ai normalization utilities', () => {
  it('resolves prefixed metric name', () => {
    expect(resolveMetricKey('三、营业利润')).toBe('利润表-营业利润-营业利润');
  });

  it('builds schema with canonical metric keys', () => {
    const schema = buildFinancialContentSchema();
    expect(schema.shape['资产负债表-流动资产-货币资金']).toBeDefined();
  });

  it('normalizes column metric names to canonical key', () => {
    expect(normalizeMetricName('其中：营业收入金额')).toBe('利润表-营业总收入-营业收入');
  });
});
