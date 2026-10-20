/**
 * Search Documents Tool
 *
 * Keyword search over the company's knowledge library (ready knowledge
 * documents only; the scope is fixed in the database).
 */

import { z } from "zod";
import { Tool } from "../types";
import { searchKnowledge } from "@/lib/search";
import { RETRIEVAL_EMPTY_DOCUMENTS_REASON, RETRIEVAL_FAILED_REASON } from "@/lib/tools/retrieval";
import { KeywordsSchema, dedupe } from "./keywords";

export const SearchDocumentsInputSchema = z.object({
  keywords: KeywordsSchema,
  year: z.coerce.string().optional().describe("年份过滤 (例如 2024)"),
  docTypes: z
    .array(z.string())
    .optional()
    .describe("文档类型过滤 (例如 ['policy', 'financial_report'])"),
});

export type SearchDocumentsInput = z.infer<typeof SearchDocumentsInputSchema>;

export interface DocumentResult {
  document: string;
  year: string | null;
  section: string | null;
  content: string;
  documentId: string;
  docType: string | null;
  fileUrl: string | null;
}

export interface SearchDocumentsData {
  status: "ok" | "empty";
  empty: boolean;
  reason?: string;
  results: DocumentResult[];
}

export const searchDocumentsTool: Tool<SearchDocumentsInput, SearchDocumentsData> = {
  name: "search_documents",
  displayName: "搜索文档",
  displayNameEn: "Search Documents",
  description:
    "按关键词检索公司资料库中的文档（公司档案、财务管理制度、财务报告等）。当需要查找公司的具体规定、经营情况或管理层讨论时使用。",
  category: "search",
  inputSchema: SearchDocumentsInputSchema as z.ZodSchema<SearchDocumentsInput>,
  outputSchema: z.any(),

  execute: async (input) => {
    try {
      const hits = await searchKnowledge(dedupe(input.keywords), {
        year: input.year,
        docTypes: input.docTypes,
      });
      const results = hits.map((hit) => ({
        document: hit.documentName,
        year: hit.year,
        section: hit.sectionTitle,
        content: hit.content,
        documentId: hit.documentId,
        docType: hit.docType,
        fileUrl: hit.fileUrl,
      }));
      const empty = results.length === 0;
      return {
        success: true,
        data: {
          status: empty ? "empty" : "ok",
          empty,
          reason: empty ? RETRIEVAL_EMPTY_DOCUMENTS_REASON : undefined,
          results,
        },
      };
    } catch (error) {
      // The model reads "search failed", not the database's message.
      console.error('[search_documents] search failed:', error);
      return { success: false, error: RETRIEVAL_FAILED_REASON };
    }
  },
};
