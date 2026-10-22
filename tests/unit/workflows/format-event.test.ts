import { describe, it, expect } from 'vitest';
import { formatToolCallEvent, formatToolResultEvent, formatThinkingEvent } from '@/lib/workflows/shared/format-event';

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

describe('search events', () => {
  it('a search shows its keywords, its hit count, and a refusal by the budget as not run', () => {
    expect(formatToolCallEvent('search_regulations', { keywords: ['折旧方法', '会计估计变更'] }))
      .toBe('正在查询法规：折旧方法、会计估计变更...');
    expect(formatToolCallEvent('search_documents', { keywords: ['质保金'], year: '2024' }))
      .toBe('正在搜索文档：质保金 (2024年)...');
    expect(formatToolResultEvent('search_regulations', { success: true, data: { status: 'ok', results: [{}, {}, {}] } }))
      .toBe('查询法规 完成，找到 3 条结果');
    expect(formatToolResultEvent('search_documents', { success: true, data: { status: 'empty', results: [] } }))
      .toBe('搜索文档 完成，没有找到结果');
    expect(formatToolResultEvent('search_regulations', { success: true, data: { status: 'budget_exhausted' } }))
      .toBe('查询法规 未执行：本问题的检索次数已用完');
  });

  it('every node of the chat graph has a label', () => {
    for (const node of ['forceAnswer', 'finalizeAnswer']) {
      expect(formatThinkingEvent(node), node).not.toContain(node);
    }
  });
});
