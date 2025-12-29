/**
 * Financial Module
 *
 * Financial domain logic:
 * - preset-functions: 22 financial calculation functions
 * - metric-names: Standardized metric name constants
 * - schema: Zod schemas for financial statements
 * - validation: Financial statement validation logic
 */

// Preset Functions
export {
  presetFunctions,
  executeFunction,
  getPresetByName,
  type PresetFunction,
  type FunctionCategory,
  type CalculationResult,
  type ValidationRule,
} from "./preset-functions";

// Metric Names
export { FinancialMetrics } from "./metric-names";

// Schema
export {
  BalanceSheetSchema,
  IncomeStatementSchema,
  CashFlowSchema,
  type StandardBalanceSheet,
  type StandardIncomeStatement,
  type StandardCashFlow,
} from "./schema";

// Validation
export {
  validateBalanceSheet,
  validateIncomeStatement,
  validateCashFlow,
  type ValidationResult,
} from "./validation";
