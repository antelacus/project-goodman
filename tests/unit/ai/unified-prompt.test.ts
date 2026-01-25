import { describe, it, expect } from 'vitest';
import { AI_CONFIG } from '@/lib/ai/config';

describe('unified system prompt constraints', () => {
  it('requires cash flow questions to query raw cash flow data first', () => {
    expect(AI_CONFIG.prompts.unifiedSystem).toContain('现金流状况类问题');
    expect(AI_CONFIG.prompts.unifiedSystem).toContain('先使用 `query_financial_data` 获取经营/投资/筹资现金流净额');
  });

  it('requires search before follow-up questions for documents/regulations', () => {
    expect(AI_CONFIG.prompts.unifiedSystem).toContain('默认先检索');
  });
});
