import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock OpenAI with a class constructor
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = { completions: { create: vi.fn() } };
    },
  };
});

describe('LLM Client Factory', () => {
  beforeEach(async () => {
    // Reset modules to clear singleton state
    vi.resetModules();
    // Stub API key to prevent validation errors
    vi.stubEnv('OPENAI_API_KEY', 'test-api-key');
  });

  describe('getLLMClient', () => {
    it('should return singleton instance', async () => {
      const { getLLMClient } = await import('@/lib/ai/client');
      const client1 = getLLMClient();
      const client2 = getLLMClient();
      expect(client1).toBe(client2);
    });
  });

  describe('createLLMClient', () => {
    it('should create new instance each time', async () => {
      const { createLLMClient } = await import('@/lib/ai/client');
      const client1 = createLLMClient();
      const client2 = createLLMClient();
      expect(client1).not.toBe(client2);
    });
  });

  describe('resetLLMClient', () => {
    it('should reset singleton so next call creates new instance', async () => {
      const { getLLMClient, resetLLMClient } = await import('@/lib/ai/client');
      const client1 = getLLMClient();
      resetLLMClient();
      const client2 = getLLMClient();
      expect(client1).not.toBe(client2);
    });
  });
});
