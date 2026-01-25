import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { getAllMetricKeys } from "@/lib/financial/metric-registry";

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
            model: "gpt-5-mini",
            messages: [
                {
                    role: "system",
                    content: `You are an expert accountant and financial data analyst. 
Your task is to extract financial data from the provided text (converted from an Excel file) and map it to a standard schema.

### CRITICAL INSTRUCTIONS:
1. **DO NOT CONVERT SIGNS**: Assume the input is a standard public financial statement. Do not flip signs for liabilities or equity unless they are explicitly negative in the source text. Keep the values exactly as they appear in the source.
2. **Standard Schema**: Map the source columns/rows to the schema keys exactly as defined. Keys must use the flattened format like "资产负债表-流动资产-货币资金", "利润表-营业总收入-营业收入", "现金流量表-经营活动-销售商品、提供劳务收到的现金".
3. **Multiple Periods**: If the document contains data for multiple years (e.g., 2021 and 2020), extract ALL of them as separate entries.
4. **Missing Values**: If a specific field is not present in the source, set it to null or 0.
5. **Data Integrity**: Ensure that if the source has "Net Value" (净值), you use it. If it only has "Original Value" (原值) and "Provision" (准备), try to find the Net Value line. If not found, do not calculate it yourself unless explicitly obvious.

### Schema Definitions (Examples):
- **Balance Sheet**: "资产负债表-流动资产-货币资金", "资产负债表-非流动资产-固定资产", "资产负债表-资产总计", ...
- **Income Statement**: "利润表-营业总收入-营业总收入", "利润表-营业总成本-营业成本", "利润表-净利润-净利润", ...

Please analyze the text and output the structured data.`
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
