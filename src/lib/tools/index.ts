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
