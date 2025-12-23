/**
 * Tools Module
 *
 * Unified tool system for the workflow architecture.
 *
 * Usage:
 * ```typescript
 * import { toolRegistry, registerFinancialTools } from '@/lib/tools';
 *
 * // Register tools at app startup
 * registerFinancialTools();
 *
 * // Get OpenAI function definitions
 * const tools = toolRegistry.toOpenAIFunctionDefs();
 *
 * // Execute a tool
 * const result = await toolRegistry.execute('calculate_financial_metric', {
 *   metric_name: 'debt_to_asset_ratio',
 *   inputs: { '负债总计': 100, '资产总计': 200 }
 * });
 * ```
 */

// Core types
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

// Schemas
export {
  FinancialToolInputSchema,
  FinancialToolOutputSchema,
  QueryFinancialDataInputSchema,
  QueryFinancialDataOutputSchema,
} from "./types";

// Type guards
export { isFinancialTool, isTool } from "./types";

// Registry
export { ToolRegistry, toolRegistry } from "./registry";

// Financial tools
export {
  registerFinancialTools,
  buildFinancialAnalysisFunctionDefs,
  buildGuidanceChatFunctionDefs,
  getFinancialToolNames,
  getFinancialTool,
} from "./financial-tools";

// New Tool Wrappers
import { searchDocumentsTool } from "./compliance/search-documents";
import { searchRegulationsTool } from "./compliance/search-regulations";
import { extractDocumentTool } from "./extraction/extract-document";
import { registerFinancialTools } from "./financial-tools";
import { toolRegistry } from "./registry";

/**
 * Registers all available tools (V3.6a Unified Agent)
 */
export function registerUnifiedTools() {
  // Register existing financial tools
  registerFinancialTools();

  // Register new compliance tools
  toolRegistry.register(searchDocumentsTool);
  toolRegistry.register(searchRegulationsTool);

  // Register new extraction tools
  toolRegistry.register(extractDocumentTool);
}

