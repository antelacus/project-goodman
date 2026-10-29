import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ToolRegistry } from '@/lib/tools/registry';
import type { Tool } from '@/lib/tools/types';

type SampleInput = { year: string; tags?: string[] };

type SampleOutput = { ok: boolean };

function buildTool(overrides: Partial<Tool<SampleInput, SampleOutput>> = {}): Tool<SampleInput, SampleOutput> {
  return {
    name: 'sample_tool',
    displayName: 'Sample Tool',
    displayNameEn: 'Sample Tool',
    description: 'Tool for testing registry behavior.',
    category: 'search',
    inputSchema: z.object({
      year: z.string().describe('Year value'),
      tags: z.array(z.string()).optional().describe('Optional tags'),
    }),
    outputSchema: z.object({ ok: z.boolean() }),
    execute: async () => ({ success: true, data: { ok: true } }),
    ...overrides,
  };
}

describe('ToolRegistry', () => {
  it('registers tools and skips duplicate names', () => {
    const registry = new ToolRegistry();
    const tool = buildTool();

    registry.register(tool);
    registry.register(tool);

    expect(registry.size).toBe(1);
    expect(registry.get('sample_tool')).toBeTruthy();
  });

  it('filters tools by category and returns list metadata', () => {
    const registry = new ToolRegistry();
    registry.register(buildTool());
    registry.register(buildTool({ name: 'finance', category: 'financial' }));

    const financialTools = registry.getByCategory('financial');
    expect(financialTools).toHaveLength(1);
    expect(registry.getNames()).toContain('finance');

    const list = registry.toList();
    expect(list).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'finance', category: 'financial' }),
      ])
    );
  });

  it('builds OpenAI definitions with schema conversion and optional arrays', () => {
    const registry = new ToolRegistry();
    registry.register(buildTool());

    const defs = registry.toOpenAIFunctionDefs();
    const definition = defs[0];

    expect(definition.type).toBe('function');
    expect(definition.function.name).toBe('sample_tool');
    expect(definition.function.parameters.properties).toMatchObject({
      year: { type: 'string', description: 'Year value' },
      tags: { type: 'array', description: 'Optional tags', items: { type: 'string' } },
    });
    expect(definition.function.parameters.required).toEqual(['year']);
    expect(definition.function.parameters).not.toHaveProperty('$schema');
  });

  it('shows the model the constraints the input schema will enforce', () => {
    const registry = new ToolRegistry();
    registry.register(buildTool({
      inputSchema: z.object({
        year: z.string(),
        kind: z.enum(['annual', 'Q1']).default('annual'),
        keywords: z.array(z.string().min(2)).min(1).max(8),
      }) as unknown as Tool<SampleInput, SampleOutput>['inputSchema'],
    }));

    const parameters = registry.toOpenAIFunctionDefs()[0].function.parameters!;

    expect(parameters.properties).toMatchObject({
      kind: { enum: ['annual', 'Q1'] },
      keywords: { minItems: 1, maxItems: 8, items: { minLength: 2 } },
    });
    expect(parameters.required).toEqual(['year', 'keywords']);
  });

  it('uses parameter overrides and financial metadata in detailed mode', () => {
    const registry = new ToolRegistry();
    registry.register(buildTool({
      name: 'ratio',
      category: 'financial',
      metadata: {
        financial: {
          requiredInputs: ['asset', 'liability'],
          formulaDisplay: 'asset / liability',
          unit: 'x',
          financialCategory: 'liquidity',
        },
      },
    }));

    const override = {
      type: 'object',
      properties: { foo: { type: 'string' } },
      required: ['foo'],
    };

    const defs = registry.toOpenAIFunctionDefs({
      detailed: true,
      parameterOverrides: { ratio: override },
    });

    const def = defs[0];
    expect(def.function.parameters).toEqual(override);
    expect(def.function.description).toContain('需要的数据');
    expect(def.function.description).toContain('asset / liability');
  });

  it('executes tools with validation and returns errors for missing tools', async () => {
    const registry = new ToolRegistry();

    const missing = await registry.execute('missing', {});
    expect(missing.success).toBe(false);
    expect(missing.error).toContain('not found');

    const tool = buildTool({
      name: 'validated',
      inputSchema: z.object({ name: z.string() }),
    });
    registry.register(tool as Tool<{ name: string }, SampleOutput>);

    const invalid = await registry.execute('validated', { bad: true });
    expect(invalid.success).toBe(false);
    expect(invalid.error).toContain('Input validation failed');
  });

  it('validates output schemas in executeWithValidation', async () => {
    const registry = new ToolRegistry();

    const tool = buildTool({
      name: 'output-test',
      execute: async () => ({
        success: true,
        data: { ok: 'nope' as unknown as boolean },
      }),
    });
    registry.register(tool);

    const invalid = await registry.executeWithValidation('output-test', { year: '2024' });
    expect(invalid.success).toBe(false);
    expect(invalid.error).toContain('Output validation failed');

    const validTool = buildTool({ name: 'output-good' });
    registry.register(validTool);

    const valid = await registry.executeWithValidation('output-good', { year: '2024' });
    expect(valid.success).toBe(true);
    expect(valid.data).toEqual({ ok: true });
  });

  it('returns execution errors when tool throws', async () => {
    const registry = new ToolRegistry();
    registry.register(buildTool({
      name: 'throws',
      execute: async () => {
        throw new Error('boom');
      },
    }));

    const result = await registry.execute('throws', { year: '2024' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('boom');
  });
});
