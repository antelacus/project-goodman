/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queryFinancialDataTool } from '@/lib/tools/financial/utility-tools';
import { queryFinancialData } from '@/lib/services/financial-data';

vi.mock('@/lib/services/financial-data', () => ({
  queryFinancialData: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('query_financial_data output normalization', () => {
  it('marks missing metrics as empty with reason', async () => {
    vi.mocked(queryFinancialData).mockResolvedValue([]);

    const result = await queryFinancialDataTool.execute({
      metric_names: ['资产总计'],
      years: ['2024'],
    });

    expect(queryFinancialData).toHaveBeenCalledWith(
      ['资产负债表-资产总计'],
      '2024',
      'annual'
    );
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      empty: true,
      reason: expect.stringContaining('缺少必要指标'),
      meta: { missing: ['资产总计'] },
    });
  });

  it('marks results as non-empty when data exists', async () => {
    vi.mocked(queryFinancialData).mockResolvedValue([
      {
        metric_name: '资产负债表-资产总计',
        metric_value: 1200,
        unit: '元',
        year: '2024',
        period: 'annual',
        document_id: 'doc-1',
        documents: {
          id: 'doc-1',
          name: '示例文档',
        },
      },
    ]);

    const result = await queryFinancialDataTool.execute({
      metric_names: ['资产总计'],
      years: ['2024'],
    });

    expect(result.success).toBe(true);
    expect(result.data?.empty).toBe(false);
    expect(result.data?.results?.length).toBe(1);
    expect(result.data?.results?.[0]?.metric).toBe('资产总计');
  });
});
