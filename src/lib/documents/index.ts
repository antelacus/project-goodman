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

// Search
export {
  searchDocuments,
  type DocumentSearchFilters,
  type DocumentSearchOptions,
  type DocumentSearchResult,
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

// Storage
export {
  uploadDocumentFile,
  downloadFileAsBase64,
  getSignedUrl,
  deleteDocumentFile,
  listDocumentFiles,
  getFirstFileForDocument,
} from "./storage";
