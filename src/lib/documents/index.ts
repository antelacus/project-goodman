/**
 * Documents Module
 *
 * Document processing utilities:
 * - constants: Document type/period labels and helpers
 * - chunker: Section-aware text chunking
 * - parser: Section/heading detection
 * - storage: Supabase storage helpers
 */

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

// Stored document text
export { loadDocumentText } from "./text";

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
