/**
 * Unified Agent Prompts
 *
 * The system prompt is dynamically generated to include:
 * - Auto-generated tool list from the registry
 * - Product context from README.md (user roles, quotas, features)
 *
 * This ensures the prompt always reflects actual capabilities and product info.
 */

import fs from 'fs';
import path from 'path';
import { loadPromptWithVariables } from '@/lib/ai/prompts';
import { toolRegistry } from '@/lib/tools/registry';

/**
 * Extract relevant sections from README.md for agent context
 * Sections: 产品介绍, 功能概览, 用户角色, 功能详解
 */
function extractProductContext(): string {
  try {
    const readmePath = path.join(process.cwd(), 'README.md');
    const content = fs.readFileSync(readmePath, 'utf-8');

    // Extract sections between ## headers
    const sections = [
      '产品介绍',
      '功能概览',
      '用户角色',
      '功能详解',
    ];

    const extractedParts: string[] = [];

    for (const sectionName of sections) {
      // Match section from ## header to next ## header or end
      const regex = new RegExp(
        `## ${sectionName}\\n([\\s\\S]*?)(?=\\n## |$)`,
        'g'
      );
      const match = regex.exec(content);
      if (match) {
        // Clean up the content - remove excessive blank lines
        const sectionContent = match[1].trim();
        extractedParts.push(`## ${sectionName}\n\n${sectionContent}`);
      }
    }

    return extractedParts.join('\n\n---\n\n');
  } catch (error) {
    // Fallback if README.md is not available
    console.warn('Failed to load README.md for product context:', error);
    return '产品上下文暂不可用';
  }
}

/**
 * Get the unified agent system prompt with:
 * - Auto-generated tool list from registry
 * - Product context from README.md
 */
export function getUnifiedAgentSystemPrompt(): string {
  const toolsSummary = toolRegistry.generateCapabilitiesSummary();
  const productContext = extractProductContext();

  return loadPromptWithVariables('chat-system.md', {
    tools_summary: toolsSummary,
    product_context: productContext,
  });
}
