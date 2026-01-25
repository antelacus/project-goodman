/**
 * Search Regulations Tool
 *
 * Searches tax, accounting standards, and legal compliance documents
 * using vector similarity search.
 */

import { z } from "zod";
import { Tool } from "../types";
import { createServerSupabaseClient, matchDocuments } from "@/lib/database";
import type { MatchDocumentsResult } from "@/lib/database";
import OpenAI from "openai";
import { AI_CONFIG } from "@/lib/ai/config";
import {
  RETRIEVAL_EMPTY_REGULATIONS_REASON,
} from "@/lib/tools/retrieval";

// ============================================================================
// Schema
// ============================================================================

export const SearchRegulationsInputSchema = z.object({
  query: z.string().describe("关于法规的问题或关键词"),
  limit: z.coerce.number().default(5).describe("返回结果数量"),
});

export type SearchRegulationsInput = z.infer<typeof SearchRegulationsInputSchema>;

// Output data type for the search results (without the wrapper)
interface SearchRegulationsData {
  total: number;
  documents: Array<{
    id: string;
    content: string;
    similarity: number;
    source: string;
    article: string;
  }>;
  empty: boolean;
  reason?: string;
  meta?: {
    total?: number;
  };
}

// ============================================================================
// Tool Definition
// ============================================================================

export const searchRegulationsTool: Tool<SearchRegulationsInput, SearchRegulationsData> = {
  name: "search_regulations",
  displayName: "搜索法规",
  displayNameEn: "Search Regulations",
  description:
    "查询税收、会计准则、法律法规等合规性文档。当用户询问具体政策或规定时使用。",
  category: "compliance",
  inputSchema: SearchRegulationsInputSchema as z.ZodSchema<SearchRegulationsInput>,
  outputSchema: z.any(),

  execute: async (input) => {
    try {
      const supabase = createServerSupabaseClient();
      const openai = new OpenAI();

      // 1. Generate embedding
      const embeddingResponse = await openai.embeddings.create({
        model: AI_CONFIG.models.embedding,
        input: input.query,
      });
      const queryEmbedding = embeddingResponse.data[0].embedding;

      // 2. Vector search via type-safe helper
      const vectorData = await matchDocuments(supabase, {
        query_embedding: JSON.stringify(queryEmbedding),
        match_count: input.limit || 5,
        filter_doc_ids: undefined,
      });

      // 3. Format results with proper typing
      const documents = vectorData.map((r: MatchDocumentsResult) => ({
        id: r.id,
        content: r.content,
        similarity: r.similarity,
        source: "Unknown Source", // metadata not available in match_documents result
        article: "",
      }));

      documents.sort((a, b) => {
        if (b.similarity !== a.similarity) {
          return b.similarity - a.similarity;
        }
        return a.source.localeCompare(b.source, "zh-CN");
      });

      const total = documents.length;
      const empty = total === 0;

      return {
        success: true,
        data: {
          total,
          documents,
          empty,
          reason: empty ? RETRIEVAL_EMPTY_REGULATIONS_REASON : undefined,
          meta: { total },
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during regulation search",
      };
    }
  },
};
