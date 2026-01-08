/**
 * Financial Tools Module
 *
 * Exports all financial-related tools:
 * - 22 preset calculation tools (liquidity, solvency, profitability, efficiency)
 * - 2 utility tools (query_financial_data, evaluate_expression)
 */

// Preset tools (22 auto-generated from preset-functions.ts)
export {
  registerPresetTools,
  buildFinancialAnalysisFunctionDefs,
  getPresetToolNames,
  getPresetTool,
} from "./preset-tools";

// Utility tools (2 flexible query/calculation tools)
export {
  queryFinancialDataTool,
  evaluateExpressionTool,
  registerUtilityTools,
  buildGuidanceChatFunctionDefs,
} from "./utility-tools";

// ============================================================================
// Combined Registration
// ============================================================================

import { registerPresetTools } from "./preset-tools";
import { registerUtilityTools } from "./utility-tools";

/**
 * Register all financial tools (preset + utility)
 */
export function registerFinancialTools(): void {
  registerPresetTools();
  registerUtilityTools();
}
