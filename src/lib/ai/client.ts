import OpenAI from 'openai';

/**
 * LLM Client Factory
 *
 * Centralized OpenAI client instantiation with provider flexibility.
 * Supports switching providers via environment variables.
 */

let clientInstance: OpenAI | null = null;

/**
 * Get or create the shared OpenAI client instance
 */
export function getLLMClient(): OpenAI {
  if (!clientInstance) {
    clientInstance = new OpenAI({
      apiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL,
    });
  }
  return clientInstance;
}

/**
 * Create a new OpenAI client instance (for cases needing isolation)
 */
export function createLLMClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL,
  });
}

/**
 * Reset the shared client instance (useful for testing)
 */
export function resetLLMClient(): void {
  clientInstance = null;
}
