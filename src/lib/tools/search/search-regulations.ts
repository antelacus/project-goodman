/**
 * Search Regulations Tool
 *
 * Keyword search over the structured articles of laws and accounting standards.
 * The tool executor numbers each result (R1…Rn) as citable evidence.
 */

import { z } from "zod";
import { Tool } from "../types";
import { searchRegulations } from "@/lib/search";
import { citationName } from "@/lib/citations";
import { RETRIEVAL_EMPTY_REGULATIONS_REASON, RETRIEVAL_FAILED_REASON } from "@/lib/tools/retrieval";
import { KeywordsSchema, dedupe } from "./keywords";

export const SearchRegulationsInputSchema = z.object({
  keywords: KeywordsSchema,
});

export type SearchRegulationsInput = z.infer<typeof SearchRegulationsInputSchema>;

export interface RegulationResult {
  /** Assigned by the tool executor; the model cites this, never an article number. */
  id?: string;
  regulation: string;
  regulationName: string;
  articleNumber: string;
  content: string;
  documentId: string;
  fileUrl: string | null;
}

export interface SearchRegulationsData {
  status: "ok" | "empty";
  empty: boolean;
  reason?: string;
  results: RegulationResult[];
}

export const searchRegulationsTool: Tool<SearchRegulationsInput, SearchRegulationsData> = {
  name: "search_regulations",
  displayName: "搜索法规",
  displayNameEn: "Search Regulations",
  description:
    "按关键词检索税法、会计准则等法规的条款原文。每条结果带编号（如 R3），回答中引用时只写编号。",
  category: "compliance",
  inputSchema: SearchRegulationsInputSchema as z.ZodSchema<SearchRegulationsInput>,
  outputSchema: z.any(),

  execute: async (input) => {
    try {
      const hits = await searchRegulations(dedupe(input.keywords));
      const results = hits.map((hit) => ({
        regulation: citationName(hit.regulationName),
        regulationName: hit.regulationName,
        articleNumber: hit.articleNumber,
        content: hit.content,
        documentId: hit.documentId,
        fileUrl: hit.fileUrl,
      }));
      const empty = results.length === 0;
      return {
        success: true,
        data: {
          status: empty ? "empty" : "ok",
          empty,
          reason: empty ? RETRIEVAL_EMPTY_REGULATIONS_REASON : undefined,
          results,
        },
      };
    } catch (error) {
      // The model reads "search failed", not the database's message.
      console.error('[search_regulations] search failed:', error);
      return { success: false, error: RETRIEVAL_FAILED_REASON };
    }
  },
};
