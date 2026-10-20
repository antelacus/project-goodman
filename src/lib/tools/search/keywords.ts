import { z } from "zod";

/**
 * The agent's search keywords (DESIGN §4): 1–8 words of 2–10 characters each,
 * in the standards' own terms. The function schema sent to the model cannot
 * carry these limits, so the description states them.
 */
export const KeywordsSchema = z
  .array(z.string().trim().min(2).max(10))
  .min(1)
  .max(8)
  .describe("1–8 个检索关键词，每个 2–10 个字；用准则、法规原文的术语（如“金融资产”“减值”），不要整句提问");

export const dedupe = (keywords: string[]) => [...new Set(keywords)];
