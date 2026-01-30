import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { getAllMetricKeys } from "@/lib/financial/metric-registry";
import { AI_CONFIG } from "@/lib/ai/config";
import { getPromptContent } from "@/lib/ai/prompts";

// Define a wrapper schema to handle multiple years/periods
// OpenAI Structured Outputs requires strict schemas. z.record is not supported.
// We must define a union of possible schemas or a single comprehensive schema.
// Since we want to support Balance Sheet, Income Statement, and Cash Flow, 
// and OpenAI requires all fields to be specified if we want strict mode,
// we will define a "Super Schema" that contains all possible fields as optional.

export function buildFinancialContentSchema(): z.ZodObject<z.ZodRawShape> {
    const shape = Object.fromEntries(
        getAllMetricKeys().map((key) => [key, z.number().nullable().optional()])
    ) as z.ZodRawShape;
    return z.object(shape);
}

const FinancialContentSchema = buildFinancialContentSchema();

const ExtractionResponseSchema = z.object({
    documentType: z.enum(['balance_sheet', 'income_statement', 'cash_flow']),
    data: z.array(z.object({
        year: z.string().describe("Year of the data (e.g., '2021')"),
        period: z.string().describe("Period of the data (e.g., 'annual', 'Q1')"),
        content: FinancialContentSchema
    }))
});

export async function performAIExtraction(
    text: string,
    fileName: string,
    openai: OpenAI
): Promise<{
    type: 'balance_sheet' | 'income_statement' | 'cash_flow';
    data: Array<{ year: string; period: string; content: Record<string, number | null | undefined> }>;
}> {
    console.log(`[AI Extraction] Starting extraction for ${fileName}...`);

    try {
        const completion = await openai.chat.completions.create({
            model: AI_CONFIG.models.extraction,
            messages: [
                {
                    role: "system",
                    content: getPromptContent('financial-extraction.md')
                },
                {
                    role: "user",
                    content: `File Name: ${fileName}\n\nDocument Content:\n${text.substring(0, 30000)}`
                }
            ],
            response_format: zodResponseFormat(ExtractionResponseSchema, "financial_extraction"),
        });

        const content = completion.choices[0].message.content;
        if (!content) {
            throw new Error("AI extraction returned empty content");
        }

        const result = JSON.parse(content);

        return {
            type: result.documentType,
            data: result.data
        };
    } catch (error) {
        console.error("[AI Extraction] Error:", error);
        throw error;
    }
}
