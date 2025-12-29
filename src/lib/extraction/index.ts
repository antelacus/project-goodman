/**
 * Extraction Module
 *
 * Document data extraction utilities:
 * - ai: AI-powered extraction using OpenAI structured outputs
 * - structured: Type-specific extraction logic
 * - column: Excel column mapping and extraction
 */

// AI Extraction
export {
  extractFinancialData,
} from "./ai";

// Structured Extraction
export {
  performStructuredExtraction,
  classifyDocument,
  type DocumentType,
  type ExtractionResult,
} from "./structured";

// Column Extraction
export {
  extractFromExcel,
  getColumnMappingForType,
} from "./column";
