import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { isFinancialTool, isTool } from '@/lib/tools/types';
import type { Tool } from '@/lib/tools/types';

describe('tool type guards', () => {
  const baseTool: Tool = {
    name: 'tool',
    displayName: 'Tool',
    displayNameEn: 'Tool',
    description: 'Test tool',
    category: 'search',
    inputSchema: z.object({}),
    outputSchema: z.object({}),
    execute: async () => ({ success: true }),
  };

  it('detects financial tools with metadata', () => {
    const financialTool: Tool = {
      ...baseTool,
      name: 'financial',
      category: 'financial',
      metadata: {
        financial: {
          requiredInputs: ['asset'],
          formulaDisplay: 'asset',
          unit: 'x',
          financialCategory: 'liquidity',
        },
      },
    };

    expect(isFinancialTool(financialTool)).toBe(true);
    expect(isFinancialTool({ ...financialTool, metadata: undefined })).toBe(false);
    expect(isFinancialTool(baseTool)).toBe(false);
  });

  it('validates tool shape', () => {
    expect(isTool(baseTool)).toBe(true);
    expect(isTool(null)).toBe(false);
    expect(isTool({})).toBe(false);
    expect(isTool({ name: 'x', execute: () => null })).toBe(false);
  });
});
