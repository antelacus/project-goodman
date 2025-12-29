/**
 * Extract Document Tool
 * 
 * Performs structured extraction on a specific document.
 */

import { z } from "zod";
import type { Tool } from "../types";
import { createServerSupabaseClient } from "@/lib/supabase";
import { performStructuredExtraction, DocumentType } from "@/lib/structured-extraction";

export const ExtractDocumentInputSchema = z.object({
    documentId: z.string().describe("UUID of the document to extract from"),
    extractionType: z.enum(['balance_sheet', 'income_statement', 'cash_flow', 'contract', 'regulation', 'general'])
        .optional()
        .describe("Optional explicit type hint for extraction"),
});

export type ExtractDocumentInput = z.infer<typeof ExtractDocumentInputSchema>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const extractDocumentTool: Tool<ExtractDocumentInput, any> = {
    name: "extract_document",
    displayName: "文档信息提取",
    displayNameEn: "Extract Document Info",
    description: "从特定文档中提取结构化信息（如财务报表数据、合同条款、法规条目）。",
    category: "extraction",
    inputSchema: ExtractDocumentInputSchema,
    outputSchema: z.any(),
    execute: async (input) => {
        try {
            const supabase = createServerSupabaseClient();

            // 1. Fetch document chunks to reconstruct text
            // We assume the document text is available in chunks being stored in order.
            const { data: chunks, error: chunkError } = await supabase
                .from("document_chunks")
                .select("content")
                .eq("document_id", input.documentId)
                .order("chunk_index", { ascending: true });

            if (chunkError) throw new Error(`Failed to fetch document content: ${chunkError.message}`);
            if (!chunks || chunks.length === 0) throw new Error("Document has no content");

            const fullText = chunks.map((c: { content: string }) => c.content).join("\n\n");

            // 2. Perform Extraction
            const result = await performStructuredExtraction(
                fullText,
                undefined, // fileName not easily available here without another query, acceptable to omit
                input.extractionType as DocumentType
            );

            return {
                success: true,
                data: result
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error during extraction",
            };
        }
    }
};
