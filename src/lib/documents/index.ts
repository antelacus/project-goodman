/**
 * Documents Module
 *
 * Document processing utilities:
 * - search: Hybrid document search (vector + keyword)
 * - constants: Document type/period labels and helpers
 * - chunker: Section-aware text chunking
 * - parser: Section/heading detection
 * - storage: Supabase storage helpers
 */

// Search types only (function is server-only due to LangSmith tracing)
// Server-side code should import directly: import { searchDocuments } from "@/lib/documents/search";
export type {
  DocumentSearchFilters,
  DocumentSearchOptions,
  DocumentSearchResponse,
} from "./search";

// Constants
export {
  DOC_TYPE_LABELS,
  PERIOD_LABELS,
  DOC_TYPE_OPTIONS,
  PERIOD_OPTIONS,
  formatDocType,
  formatPeriod,
  formatYearPeriod,
  getDocTypeValue,
  getPeriodValue,
  isFinancialStatement,
  isFinancialReport,
  requiresYearPeriod,
  isBusinessInfo,
  NON_UPLOADABLE_TYPES,
  isUploadable,
  PDF_ONLY_TYPES,
  isRegulation,
} from "./constants";

// Chunker
export {
  createSectionAwareChunks,
  type ChunkWithSection,
} from "./chunker";

// Parser
export {
  parseDocumentSections,
  type Section,
  type ParseResult,
} from "./parser";

// File Utilities (client-safe)
export {
  getFileExtension,
  isPreviewable,
  isImage,
  isPdf,
  isExcel,
} from "./file-utils";

// Storage functions are NOT exported from barrel to prevent client-side imports.
// Server-side code should import directly: import { ... } from "@/lib/documents/storage";
