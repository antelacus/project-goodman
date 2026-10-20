import { z } from "zod";
import { getAllMetricKeys } from "@/lib/financial/metric-registry";
import { generateJSON } from "@/lib/ai";
import { getPromptContent } from "@/lib/ai/prompts";

// Each period lists only the metrics present in the source, as {metric, value}
// pairs with `metric` an enum of the canonical keys. A strict schema with one
// field per key would force all ~200 keys (mostly null) into every reply, which
// takes over a minute per period on the relay.
const MetricKeySchema = z.enum(getAllMetricKeys() as [string, ...string[]]);

const ExtractionResponseSchema = z.object({
    documentType: z.enum(['balance_sheet', 'income_statement', 'cash_flow']),
    data: z.array(z.object({
        year: z.string().describe("Year of the data (e.g., '2021')"),
        period: z.string().describe("Period of the data (e.g., 'annual', 'Q1')"),
        items: z.array(z.object({ metric: MetricKeySchema, value: z.number() })),
    }))
});

export async function performAIExtraction(
    text: string,
    fileName: string
): Promise<{
    type: 'balance_sheet' | 'income_statement' | 'cash_flow';
    data: Array<{ year: string; period: string; content: Record<string, number | null | undefined> }>;
}> {
    console.log(`[AI Extraction] Starting extraction for ${fileName}...`);

    try {
        const result = await generateJSON({
            purpose: "extraction",
            system: getPromptContent('financial-extraction.md'),
            prompt: `File Name: ${fileName}\n\nDocument Content:\n${text.substring(0, 30000)}`,
            schema: ExtractionResponseSchema,
        });

        return {
            type: result.documentType,
            data: result.data.map(({ year, period, items }) => ({
                year,
                period,
                content: Object.fromEntries(items.map(i => [i.metric, i.value])),
            })),
        };
    } catch (error) {
        console.error("[AI Extraction] Error:", error);
        throw error;
    }
}
