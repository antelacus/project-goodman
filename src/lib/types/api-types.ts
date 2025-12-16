/**
 * API Type Definitions
 *
 * Centralized request/response types for all API routes.
 * These types ensure consistency between frontend and backend.
 */

import type {
  ChatMessage,
  Citation,
  RelatedArticle,
  SourceDocument,
  CalculationResult,
  CalculationResultSimple,
  SuggestedModule,
  UploadedDocument,
} from "./domain-types";

// ============================================================================
// Financial Analysis API Types
// ============================================================================

/**
 * POST /api/financial-analysis request body
 */
export interface FinancialAnalysisRequest {
  question: string;
  year?: string;
  period?: string;
  documentIds?: string[];
}

/**
 * POST /api/financial-analysis response body
 */
export interface FinancialAnalysisResponse {
  type:
    | "calculation_result"
    | "insufficient_data"
    | "low_confidence"
    | "no_function";
  answer: string;
  calculation?: CalculationResult;
  confidence: number;
  sourceDocuments: SourceDocument[];
  missingData?: string[];
  suggestion?: string;
  warnings?: string[];
}

// ============================================================================
// Guidance Chat API Types
// ============================================================================

/**
 * POST /api/guidance-chat request body
 */
export interface GuidanceChatRequest {
  question: string;
  uploadedDocument?: UploadedDocument;
  documentIds?: string[];
  regulationCategories?: string[];
}

/**
 * POST /api/guidance-chat response body
 */
export interface GuidanceChatResponse {
  type: "guidance" | "not_found" | "low_confidence";
  guidance?: string;
  citations: Citation[];
  confidence: number;
  relatedArticles?: RelatedArticle[];
  warnings?: string[];
  calculations?: CalculationResultSimple[];
}

// ============================================================================
// Landing Chat API Types
// ============================================================================

/**
 * POST /api/landing-chat request body
 */
export interface LandingChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
}

/**
 * POST /api/landing-chat response body
 */
export interface LandingChatResponse {
  reply: string;
  suggestedModule?: SuggestedModule;
  suggestedQuestions?: string[];
  confidence: number;
}

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
  RelatedArticle,
  SourceDocument,
  CalculationResult,
  CalculationResultSimple,
  SuggestedModule,
  UploadedDocument,
} from "./domain-types";
