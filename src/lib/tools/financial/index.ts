/**
 * Financial Tools Module
 *
 * Exports all financial-related tools:
 * - 22 preset calculation tools (liquidity, solvency, profitability, efficiency)
 * - 3 utility tools (get_financial_metric, query_financial_data, calculate_financial_metric)
 */

// Preset tools (22 auto-generated from preset-functions.ts)
export {
  registerPresetTools,
  buildFinancialAnalysisFunctionDefs,
  getPresetToolNames,
  getPresetTool,
} from "./preset-tools";

// Utility tools (4 flexible query/calculation tools)
export {
  getFinancialMetricTool,
  queryFinancialDataTool,
  calculateFinancialMetricTool,
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
