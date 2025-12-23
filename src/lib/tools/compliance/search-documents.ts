/**
 * Search Documents Tool
 * 
 * Wrapper around the document search service for the agent to use.
 */

import { z } from "zod";
import { Tool } from "../types";
import { searchDocuments } from "@/lib/document-search";

export const SearchDocumentsInputSchema = z.object({
    query: z.string().describe("搜索关键词或问题"),
    year: z.number().optional().describe("年份过滤 (例如 2024)"),
    docTypes: z.array(z.string()).optional().describe("文档类型过滤 (例如 ['annual_report'])"),
    limit: z.number().optional().default(5).describe("返回文档数量限制"),
});

export type SearchDocumentsInput = z.infer<typeof SearchDocumentsInputSchema>;

export const searchDocumentsTool: Tool<SearchDocumentsInput> = {
    name: "search_documents",
    displayName: "搜索文档",
    displayNameEn: "Search Documents",
    description: "搜索公司财务文档库中的相关内容。当需要查找具体的财务数字、经营情况或管理层讨论时使用。",
    category: "search",
    inputSchema: SearchDocumentsInputSchema,
    outputSchema: z.any(), // Flexible output for now
    execute: async (input) => {
        try {
            const results = await searchDocuments(
                input.query,
                {
                    year: input.year,
                    docTypes: input.docTypes,
                },
                {
                    limit: input.limit,
                    includeContent: true,
                }
            );

            // Simplify output for LLM consumption
            const simplifiedDocs = results.documents.map(doc => ({
                id: doc.documentId,
                name: doc.documentName,
                year: doc.year,
                matchScore: doc.relevanceScore,
                chunks: doc.matchedChunks.map(c => ({
                    text: c.content,
                    section: c.sectionTitle,
                }))
            }));

            return {
                success: true,
                data: {
                    total: results.totalMatches,
                    documents: simplifiedDocs,
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error during search",
            };
        }
    }
};
