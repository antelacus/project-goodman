import { describe, it, expect, vi } from 'vitest';

describe('AI config', () => {
  it('reads model names from env with defaults', async () => {
    vi.stubEnv('OPENAI_MODEL', 'gpt-test');
    vi.stubEnv('OPENAI_EXTRACTION_MODEL', 'gpt-extract');

    const { AI_CONFIG } = await import('@/lib/ai/config');

    expect(AI_CONFIG.models.chat).toBe('gpt-test');
    expect(AI_CONFIG.models.extraction).toBe('gpt-extract');
    expect(AI_CONFIG.models.embedding).toBeTruthy();
  });

  it('exposes unified system prompt', async () => {
    const { AI_CONFIG } = await import('@/lib/ai/config');

    expect(AI_CONFIG.prompts.unifiedSystem).toContain('Goodman Agent');
  });
});
