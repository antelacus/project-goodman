/**
 * Tools Module
 *
 * Unified tool system for the workflow architecture.
 *
 * Directory Structure:
 * - /financial  - Financial calculation & query tools (25 tools)
 * - /search     - Document & regulation search tools (2 tools)
 * - /extraction - Document extraction tools (1 tool)
 *
 * Usage:
 * ```typescript
 * import { toolRegistry, registerUnifiedTools } from '@/lib/tools';
 *
 * // Register all tools at app startup
 * registerUnifiedTools();
 *
 * // Get OpenAI function definitions
 * const tools = toolRegistry.toOpenAIFunctionDefs();
 *
 * // Execute a tool
 * const result = await toolRegistry.execute('current_ratio', { year: '2024' });
 * ```
 */

// ============================================================================
// Core Types & Registry
// ============================================================================

export type {
  Tool,
  ToolCategory,
  ToolMetadata,
  FinancialToolMetadata,
  ToolExecutionResult,
  ToOpenAIOptions,
  OpenAIParameterSchema,
  ChatCompletionTool,
  ChatCompletionToolChoiceOption,
} from "./types";

export {
  FinancialToolInputSchema,
  FinancialToolOutputSchema,
  QueryFinancialDataInputSchema,
  QueryFinancialDataOutputSchema,
} from "./types";

export { isFinancialTool, isTool } from "./types";

export { ToolRegistry, toolRegistry } from "./registry";

// ============================================================================
// Financial Tools
// ============================================================================

export {
  registerFinancialTools,
  buildFinancialAnalysisFunctionDefs,
  buildGuidanceChatFunctionDefs,
  getPresetToolNames as getFinancialToolNames,
  getPresetTool as getFinancialTool,
} from "./financial";

// ============================================================================
// Search Tools
// ============================================================================

export {
  searchDocumentsTool,
  searchRegulationsTool,
  registerSearchTools,
} from "./search";

// ============================================================================
// Extraction Tools
// ============================================================================

export {
  extractDocumentTool,
  registerExtractionTools,
} from "./extraction";

// ============================================================================
// Unified Registration
// ============================================================================

import { registerFinancialTools } from "./financial";
import { registerSearchTools } from "./search";
import { registerExtractionTools } from "./extraction";

/**
 * Register all available tools (V3.6a Unified Agent)
 *
 * Call this at application startup to make all 28 tools available:
 * - 22 preset financial calculations
 * - 3 financial utility tools
 * - 2 search tools
 * - 1 extraction tool
 */
export function registerUnifiedTools(): void {
  registerFinancialTools();
  registerSearchTools();
  registerExtractionTools();
}
