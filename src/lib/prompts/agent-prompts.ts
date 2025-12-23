import { loadPromptTemplate } from "../prompts";
import { getAllMetricNames } from "../financial-schema";
import { presetFunctions } from "../preset-functions";
import { type PresetFunction } from "../preset-functions";

/**
 * 构建 Financial Analysis Agent 系统提示
 */
export function buildFinancialAgentSystemPrompt(): string {
    let promptTemplate = "";
    try {
        // Use the refined prompt file
        promptTemplate = loadPromptTemplate("financial-analysis.txt");
    } catch {
        console.warn("Could not load prompt template 'financial-analysis.txt', using fallback.");
        return "You are a helpful financial assistant.";
    }

    // 1. Preset Functions List
    const availableFunctions = presetFunctions;
    const functionsList = availableFunctions
        .map((f: PresetFunction) => `- ${f.displayName} (${f.name}): ${f.interpretation || ""}`)
        .join("\n");

    // 2. Metric List
    const metricList = getAllMetricNames().join("\n");

    // 3. Available Documents (Placeholder default for now)
    const availableDocuments = "System Database (All Years/Periods) - Consolidated & Parent";

    // 4. Business Context (Placeholder default for now)
    const businessContext = "Internal Company Data. The user is a financial professional.";

    return promptTemplate
        .replace(/{PRESET_FUNCTIONS_LIST}/g, functionsList)
        .replace(/{AVAILABLE_DOCUMENTS}/g, availableDocuments)
        .replace(/{CONTEXT}/g, "") // No conversation context in system prompt init
        .replace(/{METRIC_LIST}/g, metricList)
        .replace(/{BUSINESS_CONTEXT}/g, businessContext);
}

/**
 * 构建 Guidance Chat Agent 系统提示
 */
export function buildGuidanceAgentSystemPrompt(
    citations: string
): string {
    try {
        const basePrompt = loadPromptTemplate("guidance-agent-system.txt"); // Added .txt extension safety
        return basePrompt.replace("{{CITATIONS}}", citations);
    } catch {
        // Retry with generic name if .txt fails or vice versa
        try {
            const basePrompt = loadPromptTemplate("guidance-agent-system");
            return basePrompt.replace("{{CITATIONS}}", citations);
        } catch {
            return `You are a helpful guidance assistant.`;
        }
    }
}
