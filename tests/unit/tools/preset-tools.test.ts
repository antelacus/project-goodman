/* @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerPresetTools } from '@/lib/tools/financial/preset-tools';
import { toolRegistry } from '@/lib/tools/registry';
import { queryFinancialData } from '@/lib/services/financial-data';

vi.mock('@/lib/services/financial-data', () => ({
  queryFinancialData: vi.fn(),
}));

beforeEach(() => {
  registerPresetTools();
  vi.clearAllMocks();
});

describe('preset financial tools output normalization', () => {
  it('marks missing metrics as empty with reason', async () => {
    vi.mocked(queryFinancialData).mockResolvedValue([]);

    const tool = toolRegistry.get('current_ratio');
    expect(tool).toBeTruthy();

    const result = await tool!.execute({ year: '2024' });
    const requiredInputs = tool?.metadata?.financial?.requiredInputs || [];

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      empty: true,
      reason: expect.stringContaining('缺少必要指标'),
      meta: { missing: requiredInputs },
    });
  });
});
