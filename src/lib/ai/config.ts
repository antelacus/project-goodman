/**
 * AI configuration: the one model, and per purpose an output budget and a time limit.
 *
 * The model is a constant, not an env var: REQ §5.1 fixes every purpose to it.
 * The relay ignores output limits today (DESIGN §8); budgets are sent anyway and
 * leave room for reasoning tokens, which count against them on official models.
 * Time limits bound the whole call including the one retry (REQ §5.2).
 */

export const MODEL = 'gpt-6.1-sol';

export const PURPOSES = {
  chat: { outputBudget: 8000, timeoutMs: 60_000 },
  title: { outputBudget: 1000, timeoutMs: 60_000 },
  reportSection: { outputBudget: 4000, timeoutMs: 90_000 },
  reportSummary: { outputBudget: 4000, timeoutMs: 60_000 },
  reportConfig: { outputBudget: 2000, timeoutMs: 60_000 },
  extraction: { outputBudget: 16000, timeoutMs: 60_000 },
  ocr: { outputBudget: 16000, timeoutMs: 120_000 },
} as const;

export type AIPurpose = keyof typeof PURPOSES;

export const MAX_RETRIES = 1;
