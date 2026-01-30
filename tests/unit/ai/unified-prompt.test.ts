import { describe, it, expect } from 'vitest';
import { getPromptContent } from '@/lib/ai/prompts';

describe('unified system prompt constraints', () => {
  const systemPrompt = getPromptContent('chat-system.md');

  it('requires cash flow questions to query raw cash flow data first', () => {
    // Check for cash flow constraint - wording may vary but core requirement remains
    expect(systemPrompt).toContain('现金流');
    expect(systemPrompt).toContain('query_financial_data');
    expect(systemPrompt).toContain('经营/投资/筹资现金流净额');
  });

  it('requires search before follow-up questions for documents/regulations', () => {
    expect(systemPrompt).toContain('默认先检索');
  });
});
