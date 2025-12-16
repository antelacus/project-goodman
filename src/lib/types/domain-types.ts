/**
 * Domain Type Definitions
 *
 * Centralized domain types used across workflows and API responses.
 * These types represent core business concepts in the application.
 */

// ============================================================================
// Chat & Conversation Types
// ============================================================================

/**
 * Chat message in conversation history
 */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ============================================================================
// Citation & Reference Types
// ============================================================================

/**
 * Citation reference to a regulation article
 */
export interface Citation {
  regulation: string;
  article: string;
  content: string;
  relevance: number;
}

/**
 * Related article reference (less detailed than Citation)
 */
export interface RelatedArticle {
  regulation: string;
  article: string;
  summary: string;
}

/**
 * Source document reference
 */
export interface SourceDocument {
  id: string;
  name: string;
  year: string;
  period: string;
}

// ============================================================================
// Financial Data Types
// ============================================================================

/**
 * Financial metric value with metadata
 */
export interface FinancialMetricData {
  value: number;
  unit: string;
  source: string;
}

/**
 * Extended financial metric data with document reference
 */
export interface FinancialMetricDataExtended extends FinancialMetricData {
  documentId: string;
}

/**
 * Financial metric data with year information
 */
export interface FinancialMetricDataWithYear extends FinancialMetricData {
  year: string;
}

// ============================================================================
// Calculation Types
// ============================================================================

/**
 * Calculation result value
 */
export interface CalculationValue {
  value: number;
  formatted: string;
  unit: string;
}

/**
 * Calculation input with source tracking
 */
export interface CalculationInput {
  value: number;
  unit: string;
  source: string;
}

/**
 * Full calculation result from a financial function
 */
export interface CalculationResult {
  functionUsed: string;
  functionDisplayName: string;
  formula: string;
  inputs: Record<string, CalculationInput>;
  result: CalculationValue;
  steps: string[];
  description?: string;
}

/**
 * Simplified calculation result (used in guidance chat)
 */
export interface CalculationResultSimple {
  functionName: string;
  functionDisplayName: string;
  formula: string;
  inputs: Record<string, CalculationInput>;
  result: {
    value: number;
    formatted: string;
  };
  description?: string;
}

// ============================================================================
// Confidence Evaluation Types
// ============================================================================

/**
 * Individual confidence factor
 */
export interface ConfidenceFactor {
  name: string;
  score: number;
  weight: number;
}

/**
 * Full confidence evaluation result
 */
export interface ConfidenceEvaluation {
  score: number;
  factors: ConfidenceFactor[];
  threshold: number;
  passed: boolean;
  reason?: string;
}

// ============================================================================
// Module Suggestion Types
// ============================================================================

/**
 * Suggested module for user navigation
 */
export interface SuggestedModule {
  name: string;
  displayName: string;
  reason: string;
  url: string;
}

// ============================================================================
// Search Result Types
// ============================================================================

/**
 * Vector search result from regulation chunks
 */
export interface VectorSearchResult {
  chunk_id: string;
  content: string;
  similarity: number;
  regulation: string;
  article: string;
}

/**
 * Keyword search result from regulations
 */
export interface KeywordSearchResult {
  regulation_id: string;
  regulation_name: string;
  article_number: string;
  article_content: string;
  relevance: number;
}

/**
 * Combined search result (merged from vector + keyword)
 */
export interface CombinedSearchResult {
  regulation: string;
  article: string;
  content: string;
  relevance: number;
}

// ============================================================================
// Tool Call Types
// ============================================================================

/**
 * Tool call record from LLM
 */
export interface ToolCall {
  functionName: string;
  arguments: Record<string, unknown>;
}

// ============================================================================
// Intent Analysis Types
// ============================================================================

/**
 * Intent analysis result for landing chat routing
 */
export interface IntentAnalysis {
  extractionKeywords: number;
  analysisKeywords: number;
  guidanceKeywords: number;
}

// ============================================================================
// Uploaded Document Types
// ============================================================================

/**
 * Uploaded document in request
 */
export interface UploadedDocument {
  text: string;
  fileName: string;
  id?: string;
}
