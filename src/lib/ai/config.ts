/**
 * AI Configuration
 *
 * Centralized configuration for all LLM-related settings.
 * Models, parameters, and provider settings.
 *
 * Prompts are stored in src/lib/ai/prompts/*.md
 */

export const AI_CONFIG = {
  models: {
    chat: process.env.LLM_MODEL_CHAT || process.env.OPENAI_MODEL || 'gpt-4o',
    extraction: process.env.LLM_MODEL_EXTRACTION || process.env.OPENAI_EXTRACTION_MODEL || 'gpt-5-mini',
    embedding: process.env.LLM_MODEL_EMBEDDING || process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    title: process.env.LLM_MODEL_TITLE || process.env.OPENAI_TITLE_MODEL || 'gpt-4o-mini',
    report: process.env.LLM_MODEL_REPORT || 'gpt-4o',
  },
  params: {
    chat: {
      temperature: 0.2,
      maxTokens: 800,
    },
    extraction: {
      temperature: 0.1,
      maxTokens: 4000,
    },
    title: {
      temperature: 0.3,
      maxTokens: 50,
    },
    report: {
      temperature: 0.3,
      maxTokens: 800,
    },
  },
} as const;

// Type exports for consumers
export type ModelType = keyof typeof AI_CONFIG.models;
export type ParamsType = keyof typeof AI_CONFIG.params;
