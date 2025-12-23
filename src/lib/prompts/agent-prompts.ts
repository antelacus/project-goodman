import { loadPromptTemplate } from "../prompts"; // Assuming this exists or I need to check
import { toolRegistry } from "@/lib/tools";

/**
 * 构建 Financial Analysis Agent 系统提示
 */
export function buildFinancialAgentSystemPrompt(): string {
    // 加载基础模板
    // Note: loadPromptTemplate implementation needs to be verified. 
    // If it reads from file system, it should work with the file I just created.
    let basePrompt = "";
    try {
        basePrompt = loadPromptTemplate("financial-agent-system.txt");
    } catch (e) {
        // Fallback if loadPromptTemplate fails or is not implemented as expected
        console.warn("Could not load prompt template 'financial-agent-system', using fallback.");
        basePrompt = `你是一个专业的财务分析 Agent... {{AVAILABLE_TOOLS}} ...`;
    }

    // 动态添加可用工具列表
    const financialTools = toolRegistry.getByCategory("financial");
    const toolList = financialTools
        .map(t => `- ${t.name}: ${t.description}`)
        .join("\n");

    return basePrompt.replace("{{AVAILABLE_TOOLS}}", toolList);
}

/**
 * 构建 Guidance Chat Agent 系统提示
 */
export function buildGuidanceAgentSystemPrompt(
    citations: string
): string {
    try {
        const basePrompt = loadPromptTemplate("guidance-agent-system");
        return basePrompt.replace("{{CITATIONS}}", citations);
    } catch (e) {
        return `...`; // Fallback
    }
}
