import OpenAI from 'openai';
import { MAX_RETRIES } from './config';

let clientInstance: OpenAI | null = null;

export function getClient(): OpenAI {
  if (!clientInstance) {
    clientInstance = new OpenAI({
      apiKey: process.env.LLM_API_KEY,
      baseURL: process.env.LLM_BASE_URL,
      maxRetries: MAX_RETRIES,
    });
  }
  return clientInstance;
}
