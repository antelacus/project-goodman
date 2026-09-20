/* @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { evaluateExpressionTool } from '@/lib/tools/financial/utility-tools';

// The expression reaches this tool from an LLM tool call, so it is untrusted input,
// and its result lands in a financial report. Both facts shape what is tested here:
// wrong-but-successful results are worse than failures.

type Ok = { result: number; formatted: string; expression: string; description?: string };

async function run(input: Record<string, unknown>) {
  return evaluateExpressionTool.execute(input);
}

describe('evaluate_expression: arithmetic', () => {
  it('computes a growth rate from variables', async () => {
    const r = await run({
      expression: '(current - previous) / previous * 100',
      variables: { current: 65, previous: 60 },
    });
    expect(r.success).toBe(true);
    expect((r.data as Ok).result).toBeCloseTo(8.3333333, 6);
  });

  it('accepts numeric strings as variable values', async () => {
    const r = await run({ expression: 'a * b', variables: { a: '1200.5', b: '2' } });
    expect(r.success).toBe(true);
    expect((r.data as Ok).result).toBe(2401);
  });

  it('rejects a variable that is not a number and names it', async () => {
    const r = await run({ expression: 'a + 1', variables: { a: 'sixty' } });
    expect(r.success).toBe(false);
    expect(r.error).toContain('a');
    expect(r.error).toContain('sixty');
  });

  it('passes the description through unchanged', async () => {
    const r = await run({ expression: '1 + 1', description: '资产负债率增长百分比' });
    expect((r.data as Ok).description).toBe('资产负债率增长百分比');
  });
});

describe('evaluate_expression: formatting', () => {
  it('groups thousands and keeps two decimals at or above 10,000', async () => {
    const r = await run({ expression: '1234567.891' });
    expect((r.data as Ok).formatted).toBe('1,234,567.89');
  });

  it('keeps two to four decimals for ordinary magnitudes', async () => {
    expect(((await run({ expression: '385' })).data as Ok).formatted).toBe('385.00');
    expect(((await run({ expression: '8.33333333' })).data as Ok).formatted).toBe('8.3333');
  });

  it('uses exponent notation below 0.01 so small ratios do not print as 0.00', async () => {
    const r = await run({ expression: '0.00123' });
    expect((r.data as Ok).formatted).toBe('1.23e-3');
  });

  it('prints zero as 0.00, not in exponent notation', async () => {
    expect(((await run({ expression: '5 - 5' })).data as Ok).formatted).toBe('0.00');
  });

  it('substitutes variables into the display expression on word boundaries', async () => {
    const r = await run({ expression: 'a + ab', variables: { a: 1, ab: 2 } });
    expect((r.data as Ok).expression).toBe('1 + 2');
  });
});

describe('evaluate_expression: results that must not be reported as success', () => {
  it('fails on division by zero instead of returning Infinity', async () => {
    const r = await run({ expression: 'revenue / base', variables: { revenue: 100, base: 0 } });
    expect(r.success).toBe(false);
  });

  it('fails on 0 / 0 instead of returning NaN', async () => {
    const r = await run({ expression: '0 / 0' });
    expect(r.success).toBe(false);
  });

  it('fails when the expression evaluates to something other than a number', async () => {
    expect((await run({ expression: '[1, 2, 3]' })).success).toBe(false);
    expect((await run({ expression: 'f(x) = x ^ 2' })).success).toBe(false);
    expect((await run({ expression: '"12"' })).success).toBe(false);
  });
});

describe('evaluate_expression: untrusted input', () => {
  it('fails on a syntax error with the tool’s error prefix', async () => {
    const r = await run({ expression: '(1 + ' });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/^表达式计算失败/);
  });

  it('fails on an undefined symbol rather than treating it as zero', async () => {
    expect((await run({ expression: 'revenue * 2' })).success).toBe(false);
  });

  it('does not let an expression reach the JavaScript runtime', async () => {
    const r = await run({ expression: 'cos.constructor("return process")()' });
    expect(r.success).toBe(false);
  });

  it('does not let a variable name shadow-inject object properties', async () => {
    const r = await run({ expression: 'constructor', variables: {} });
    expect(r.success).toBe(false);
  });
});
