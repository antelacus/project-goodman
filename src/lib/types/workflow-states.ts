/**
 * Workflow State Type Definitions
 *
 * This file defines the state structure for all workflow modules.
 * All workflows follow the WorkflowState template pattern for consistency
 * and future LangGraph migration compatibility.
 */

import type {
  ChatMessage,
  Citation,
  RelatedArticle,
  SourceDocument,
  CalculationInput,
  CalculationValue,
  CalculationResultSimple,
  ConfidenceFactor,
  ConfidenceEvaluation,
  SuggestedModule,
  VectorSearchResult,
  KeywordSearchResult,
  CombinedSearchResult,
  ToolCall,
  IntentAnalysis,
  UploadedDocument,
  FinancialMetricDataExtended,
} from "./domain-types";

// ============================================================================
// Base Error Interface (placeholder for Phase E)
// ============================================================================

export interface WorkflowError {
  code: string;
  message: string;
  recoverable: boolean;
  context?: Record<string, unknown>;
}

// ============================================================================
// Workflow Metadata
// ============================================================================

export interface WorkflowMeta {
  startTime: number;
  endTime?: number;
  currentStep: string;
  errors: WorkflowError[];
  debugInfo?: Record<string, unknown>;
}

// ============================================================================
// Base Workflow State Template
// ============================================================================

/**
 * Base workflow state template that all specific workflow states extend.
 * This pattern ensures:
 * - Consistent state structure across all workflows
 * - Type safety for workflow orchestration
 * - Easy migration to LangGraph StateGraph
 */
export interface WorkflowState {
  input: unknown;
  output: unknown;
  meta: WorkflowMeta;
  [stepName: string]: unknown;
}

// ============================================================================
// Financial Analysis Workflow State
// ============================================================================

export interface FinancialAnalysisState extends WorkflowState {
  // Input from API request
  input: {
    question: string;
    year?: string;
    period?: string;
    documentIds?: string[];
  };

  // Step 1: Route to function
  routing: {
    selectedFunction: string | null;
    functionArgs: Record<string, unknown>;
    confidence: number;
  };

  // Step 2: Query financial data
  dataQuery: {
    requiredMetrics: string[];
    availableMetrics: string[];
    missingMetrics: string[];
    dataMap: Record<string, FinancialMetricDataExtended>;
    sourceDocuments: SourceDocument[];
  };

  // Step 3: Execute calculation
  calculation: {
    functionName: string;
    functionDisplayName: string;
    formula: string;
    inputs: Record<string, number>;
    result: CalculationValue;
    steps: string[];
    warnings?: string[];
  };

  // Step 4: Evaluate confidence
  confidence: ConfidenceEvaluation;

  // Step 5: Generate response
  output: {
    type:
      | "calculation_result"
      | "insufficient_data"
      | "low_confidence"
      | "no_function";
    answer: string;
    calculation?: {
      functionUsed: string;
      functionDisplayName: string;
      formula: string;
      inputs: Record<string, CalculationInput>;
      result: CalculationValue;
      steps: string[];
    };
    confidence: number;
    sourceDocuments: SourceDocument[];
    missingData?: string[];
    suggestion?: string;
    warnings?: string[];
  };

  // Workflow metadata
  meta: WorkflowMeta;
}

// ============================================================================
// Guidance Chat Workflow State
// ============================================================================

export interface GuidanceChatState extends WorkflowState {
  // Input from API request
  input: {
    question: string;
    uploadedDocument?: UploadedDocument;
    documentIds?: string[];
    regulationCategories?: string[];
  };

  // Step 1: Hybrid search (vector + keyword)
  search: {
    keywords: string[];
    vectorResults: VectorSearchResult[];
    keywordResults: KeywordSearchResult[];
    combinedResults: CombinedSearchResult[];
    businessContext?: string;
  };

  // Step 2: Generate guidance
  reasoning: {
    guidanceText: string;
    citations: Citation[];
    toolCalls?: ToolCall[];
  };

  // Step 3: Execute tools (optional, if guidance needs calculations)
  toolExecution?: {
    calculations: CalculationResultSimple[];
  };

  // Step 4: Find related articles
  relatedArticles: {
    articles: RelatedArticle[];
  };

  // Step 5: Evaluate confidence
  confidence: ConfidenceEvaluation;

  // Step 6: Generate response
  output: {
    type: "guidance" | "not_found" | "low_confidence";
    guidance?: string;
    citations: Citation[];
    confidence: number;
    relatedArticles?: RelatedArticle[];
    warnings?: string[];
    calculations?: CalculationResultSimple[];
  };

  // Workflow metadata
  meta: WorkflowMeta;
}

// ============================================================================
// Landing Chat Workflow State
// ============================================================================

export interface LandingChatState extends WorkflowState {
  // Input from API request
  input: {
    messages: ChatMessage[];
    currentMessage: string;
  };

  // Step 1: Generate reply
  reply: {
    content: string;
    conversationHistory: ChatMessage[];
  };

  // Step 2: Analyze intent and route to module
  routing: {
    intentAnalysis: IntentAnalysis;
    suggestedModule?: SuggestedModule;
    confidence: number;
  };

  // Step 3: Generate suggested questions
  suggestions: {
    questions: string[];
  };

  // Step 4: Generate response
  output: {
    reply: string;
    suggestedModule?: SuggestedModule;
    suggestedQuestions?: string[];
    confidence: number;
  };

  // Workflow metadata
  meta: WorkflowMeta;
}

// ============================================================================
// Re-export domain types for convenience
// ============================================================================

export type {
  ChatMessage,
  Citation,
  RelatedArticle,
  SourceDocument,
  CalculationInput,
  CalculationValue,
  CalculationResult,
  CalculationResultSimple,
  ConfidenceFactor,
  ConfidenceEvaluation,
  SuggestedModule,
  VectorSearchResult,
  KeywordSearchResult,
  CombinedSearchResult,
  ToolCall,
  IntentAnalysis,
  UploadedDocument,
  FinancialMetricData,
  FinancialMetricDataExtended,
  FinancialMetricDataWithYear,
} from "./domain-types";
