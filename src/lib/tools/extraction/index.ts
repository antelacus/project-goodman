/**
 * Extraction Tools Module
 *
 * Exports all extraction-related tools:
 * - extract_document: Extract structured information from documents
 */

export {
  extractDocumentTool,
  ExtractDocumentInputSchema,
  type ExtractDocumentInput,
} from "./extract-document";

// ============================================================================
// Registration
// ============================================================================

import { toolRegistry } from "../registry";
import { extractDocumentTool } from "./extract-document";

/**
 * Register all extraction tools
 */
export function registerExtractionTools(): void {
  if (!toolRegistry.has(extractDocumentTool.name)) {
    toolRegistry.register(extractDocumentTool);
  }
}
