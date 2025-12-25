/**
 * API Type Definitions
 *
 * Centralized request/response types for all API routes.
 * These types ensure consistency between frontend and backend.
 */

// ============================================================================
// Error Response Types
// ============================================================================

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  error: string;
  details?: string;
}

// ============================================================================
// Re-export domain types for convenience
// ============================================================================

export type {
  ChatMessage,
  Citation,
  SourceDocument,
  CalculationResult,
  UploadedDocument,
} from "./domain-types";
