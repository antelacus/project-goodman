/**
 * Extract Document Tool
 * 
 * Performs structured extraction on a specific document.
 */

import { z } from "zod";
import type { Tool } from "../types";
import { createServerSupabaseClient } from "@/lib/database";
import { loadDocumentText } from "@/lib/documents/text";
import { isReadableBy } from "@/lib/documents/access";
import { performStructuredExtraction, type DocumentType } from "@/lib/extraction";

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
    execute: async (input, requester) => {
        try {
            const supabase = createServerSupabaseClient();

            // Library documents and the requester's own uploads only (public-readiness REQ §5.7).
            const { data: doc } = await supabase
                .from("documents")
                .select("doc_category, owner_type, owner_id")
                .eq("id", input.documentId)
                .maybeSingle();
            if (!doc || !isReadableBy(doc, requester)) {
                return { success: false, error: "Document not found" };
            }

            const fullText = await loadDocumentText(supabase, input.documentId).catch((e: Error) => {
                throw new Error(`Failed to fetch document content: ${e.message}`);
            });
            if (fullText === null) throw new Error("Document has no content");

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
