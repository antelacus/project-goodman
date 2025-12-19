
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

export interface QueryIntent {
    originalQuery: string;
    keywords: string[];
    filters: {
        year?: number;
        docTypes?: string[];
    };
    yearExplicitlyMentioned: boolean;
}

const IntentSchema = z.object({
    keywords: z.array(z.string()).describe("List of partial keywords for full-text search"),
    year: z.number().nullable().describe("The specific year mentioned in the query, or null if none"),
    docTypes: z.array(z.string()).optional().describe("Potential document types implied (e.g. 'report', 'audit', 'announcement')"),
    yearExplicitlyMentioned: z.boolean().describe("True if the user explicitly asked for a specific year")
});

export async function analyzeIntent(query: string): Promise<QueryIntent> {
    // Optimization: If query is very short, skip LLM? 
    // But for "2024年报", we need LLM to know it's 2024 and type=report.

    // Quick regex check for year to assist or fast-fail? 
    // Let's rely on LLM for robustness as per design.

    const openai = new OpenAI();

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-5-mini",
            messages: [
                {
                    role: "system",
                    content: `You are a query understanding engine for a financial document system.
Analyze the user's query and extract:
1. Keywords: Key terms for search (remove stop words).
2. Year: The specific financial year relevant to the query.
3. DocTypes: If the user implies a document type (e.g. "audit report"), tag it.
   - Common types: 'annual_report', 'audit_report', 'announcement', 'research_report'.
4. YearExplicitlyMentioned: true if year is in text.

Current Year context: ${new Date().getFullYear()}`
                },
                { role: "user", content: query }
            ],
            response_format: zodResponseFormat(IntentSchema, "query_intent"),
            temperature: 0 // Deterministic
        });

        const result = JSON.parse(completion.choices[0]?.message?.content || "{}");

        return {
            originalQuery: query,
            keywords: result.keywords || [query],
            filters: {
                year: result.year ?? undefined,
                docTypes: result.docTypes?.length ? result.docTypes : undefined,
            },
            yearExplicitlyMentioned: result.yearExplicitlyMentioned
        };

    } catch (error) {
        console.error("Intent analysis failed, falling back to basic extraction:", error);

        // Fallback Logic
        const yearMatch = query.match(/20\d{2}/);
        const year = yearMatch ? parseInt(yearMatch[0]) : undefined;

        return {
            originalQuery: query,
            keywords: [query],
            filters: { year },
            yearExplicitlyMentioned: !!year
        };
    }
}
