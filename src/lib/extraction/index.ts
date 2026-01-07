/**
 * Extraction Module
 *
 * Document data extraction utilities:
 * - ai: AI-powered extraction using OpenAI structured outputs
 * - structured: Type-specific extraction logic
 * - column: Excel column mapping and extraction
 */

// AI Extraction
export { performAIExtraction } from "./ai";

// Structured Extraction
export {
  performStructuredExtraction,
  classifyDocumentType,
  extractFinancialMetrics,
  extractYearAndPeriod,
  extractRegulationArticles,
  extractKeywords,
  validateExtractionResult,
  formatMetricName,
  type DocumentType,
  type ExtractionResult,
  type FinancialMetric,
  type RegulationArticle,
  type ContractClause,
  type FinancialExtractionResult,
  type RegulationExtractionResult,
  type ContractExtractionResult,
  type GeneralExtractionResult,
} from "./structured";

// Column Extraction
export {
  performColumnBasedExtraction,
  type ColumnMapping,
  type ColumnExtractionOptions,
} from "./column";

// ============================================================================
// Unified Financial Extraction Types
// ============================================================================

/**
 * Content structure for financial statement data.
 * Keys are Chinese metric names, values are numeric or null.
 */
export type FinancialStatementContent = Record<string, number | null | undefined>;

/**
 * Data for a single financial period (e.g., 2021 annual, 2020 Q1).
 */
export interface FinancialPeriodData {
  year: string;
  period: string;
  content: FinancialStatementContent;
}

/**
 * Financial statement types supported by AI/column extraction.
 */
export type FinancialStatementType = 'balance_sheet' | 'income_statement' | 'cash_flow';

/**
 * Unified result type for financial statement extraction.
 * Used by both performAIExtraction and performColumnBasedExtraction.
 */
export interface FinancialExtractionWithType {
  type: FinancialStatementType;
  data: FinancialPeriodData[];
}
