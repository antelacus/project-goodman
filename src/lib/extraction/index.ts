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
