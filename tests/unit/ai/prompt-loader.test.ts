import { describe, it, expect } from 'vitest';
import { loadPrompt, loadPromptWithVariables, getPromptContent } from '@/lib/ai/prompts';

describe('Prompt Loader', () => {
  describe('loadPrompt', () => {
    it('should load prompt with metadata', () => {
      const result = loadPrompt('chat-system.md');
      expect(result.metadata.name).toBe('chat-system');
      expect(result.metadata.description).toBeDefined();
      expect(result.content).toContain('Goodman Agent');
    });

    it('should throw error for non-existent file', () => {
      expect(() => loadPrompt('non-existent.md')).toThrow('Prompt file not found');
    });
  });

  describe('loadPromptWithVariables', () => {
    it('should interpolate variables', () => {
      const result = loadPromptWithVariables('report-config-intent.md', {
        year: '2024',
        comparisonYear: '2023',
        availableYears: '2022、2023、2024',
        userMessage: '确认',
      });
      expect(result).toContain('2024');
      expect(result).toContain('2023');
      expect(result).toContain('确认');
    });
  });

  describe('getPromptContent', () => {
    it('should get raw content without metadata', () => {
      const content = getPromptContent('session-title.md');
      expect(content).toContain('会话标题生成器');
      expect(content).not.toContain('---'); // No frontmatter delimiters
    });
  });
});
