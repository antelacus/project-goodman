/**
 * Search Tools Module
 *
 * Exports all search-related tools:
 * - search_documents: Search company financial documents
 * - search_regulations: Search tax/accounting/legal regulations
 */

export {
  searchDocumentsTool,
  SearchDocumentsInputSchema,
  type SearchDocumentsInput,
} from "./search-documents";

export {
  searchRegulationsTool,
  SearchRegulationsInputSchema,
  type SearchRegulationsInput,
} from "./search-regulations";

// ============================================================================
// Registration
// ============================================================================

import { toolRegistry } from "../registry";
import { searchDocumentsTool } from "./search-documents";
import { searchRegulationsTool } from "./search-regulations";

/**
 * Register all search tools
 */
export function registerSearchTools(): void {
  if (!toolRegistry.has(searchDocumentsTool.name)) {
    toolRegistry.register(searchDocumentsTool);
  }
  if (!toolRegistry.has(searchRegulationsTool.name)) {
    toolRegistry.register(searchRegulationsTool);
  }
}
