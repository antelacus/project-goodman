/**
 * Unified Agent Prompts
 *
 * The system prompt is dynamically generated to include the auto-generated
 * tool list from the registry, ensuring it always reflects actual capabilities.
 */

import { loadPromptWithVariables } from '@/lib/ai/prompts';
import { toolRegistry } from '@/lib/tools/registry';

/**
 * Get the unified agent system prompt with auto-generated tool list
 * This ensures the prompt always reflects the actual registered tools
 */
export function getUnifiedAgentSystemPrompt(): string {
  const toolsSummary = toolRegistry.generateCapabilitiesSummary();

  return loadPromptWithVariables('chat-system.md', {
    tools_summary: toolsSummary,
  });
}
