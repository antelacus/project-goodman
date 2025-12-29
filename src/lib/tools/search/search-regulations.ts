/**
 * Search Regulations Tool
 *
 * Searches tax, accounting standards, and legal compliance documents
 * using vector similarity search.
 */

import { z } from "zod";
import { Tool } from "../types";
import { createServerSupabaseClient } from "@/lib/database";
import OpenAI from "openai";

// ============================================================================
// Schema
// ============================================================================

export const SearchRegulationsInputSchema = z.object({
  query: z.string().describe("关于法规的问题或关键词"),
  limit: z.number().default(5).describe("返回结果数量"),
});

export type SearchRegulationsInput = z.infer<typeof SearchRegulationsInputSchema>;

// ============================================================================
// Tool Definition
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const searchRegulationsTool: Tool<SearchRegulationsInput, any> = {
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
        model: "text-embedding-3-small",
        input: input.query,
      });
      const queryEmbedding = embeddingResponse.data[0].embedding;

      // 2. Vector search via RPC
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: vectorData, error: vectorError } = await (supabase.rpc as any)(
        "match_documents",
        {
          query_embedding: queryEmbedding,
          match_count: input.limit || 5,
          filter_doc_ids: null,
        }
      );

      if (vectorError)
        throw new Error(`Vector search failed: ${vectorError.message}`);

      // 3. Format results
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const documents = (vectorData || []).map((r: any) => ({
        id: r.id,
        content: r.content,
        similarity: r.similarity,
        source:
          r.metadata?.regulation || r.metadata?.filename || "Unknown Source",
        article: r.metadata?.article || "",
      }));

      return {
        success: true,
        data: {
          total: documents.length,
          documents,
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
