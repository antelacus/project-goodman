import { describe, it, expect } from 'vitest';
import {
  FinancialMetrics as RegistryMetrics,
  resolveMetricKey,
  getMetricDisplayName,
} from '@/lib/financial/metric-registry';
import { FinancialMetrics } from '@/lib/financial/metric-names';

describe('metric registry normalization', () => {
  it('normalizes prefix and amount suffix', () => {
    const key = resolveMetricKey('其中：营业收入金额');
    expect(key).toBe('利润表-营业总收入-营业收入');
  });

  it('maps sub-account aliases', () => {
    const key = resolveMetricKey('其他应收款-应收股利');
    expect(key).toBe('资产负债表-流动资产-其他应收款-应收股利');
  });

  it('normalizes amount suffix to canonical key', () => {
    const key = resolveMetricKey('固定资产金额');
    expect(key).toBe('资产负债表-非流动资产-固定资产');
  });

  it('exposes canonical keys for balance sheet items', () => {
    expect(RegistryMetrics.BalanceSheet.PROXY_UNDERWRITING_SECURITIES).toBe(
      '资产负债表-流动负债-代理承销证券款',
    );
  });

  it('re-exports canonical keys in metric-names', () => {
    expect(FinancialMetrics.BalanceSheet.PROXY_UNDERWRITING_SECURITIES).toBe(
      '资产负债表-流动负债-代理承销证券款',
    );
  });

  it('returns display name for canonical key', () => {
    expect(getMetricDisplayName('资产负债表-流动资产-货币资金')).toBe('货币资金');
  });
});
