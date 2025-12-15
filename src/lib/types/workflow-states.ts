/**
 * Workflow State Type Definitions
 *
 * This file defines the state structure for all workflow modules.
 * All workflows follow the WorkflowState template pattern for consistency
 * and future LangGraph migration compatibility.
 */

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
    dataMap: Record<
      string,
      {
        value: number;
        unit: string;
        source: string;
        documentId: string;
      }
    >;
    sourceDocuments: Array<{
      id: string;
      name: string;
      year: string;
      period: string;
    }>;
  };

  // Step 3: Execute calculation
  calculation: {
    functionName: string;
    functionDisplayName: string;
    formula: string;
    inputs: Record<string, number>;
    result: {
      value: number;
      formatted: string;
      unit: string;
    };
    steps: string[];
    warnings?: string[];
  };

  // Step 4: Evaluate confidence
  confidence: {
    score: number;
    factors: Array<{
      name: string;
      score: number;
      weight: number;
    }>;
    threshold: number;
    passed: boolean;
    reason?: string;
  };

  // Step 5: Generate response
  output: {
    type: 'calculation_result' | 'insufficient_data' | 'low_confidence' | 'no_function';
    answer: string;
    calculation?: {
      functionUsed: string;
      functionDisplayName: string;
      formula: string;
      inputs: Record<
        string,
        {
          value: number;
          unit: string;
          source: string;
        }
      >;
      result: {
        value: number;
        formatted: string;
        unit: string;
      };
      steps: string[];
    };
    confidence: number;
    sourceDocuments: Array<{
      id: string;
      name: string;
      year: string;
      period: string;
    }>;
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
    uploadedDocument?: {
      text: string;
      fileName: string;
      id?: string;
    };
    documentIds?: string[];
    regulationCategories?: string[];
  };

  // Step 1: Hybrid search (vector + keyword)
  search: {
    keywords: string[];
    vectorResults: Array<{
      chunk_id: string;
      content: string;
      similarity: number;
      regulation: string;
      article: string;
    }>;
    keywordResults: Array<{
      regulation_id: string;
      regulation_name: string;
      article_number: string;
      article_content: string;
      relevance: number;
    }>;
    combinedResults: Array<{
      regulation: string;
      article: string;
      content: string;
      relevance: number;
    }>;
    businessContext?: string;
  };

  // Step 2: Generate guidance
  reasoning: {
    guidanceText: string;
    citations: Array<{
      regulation: string;
      article: string;
      content: string;
      relevance: number;
    }>;
    toolCalls?: Array<{
      functionName: string;
      arguments: Record<string, unknown>;
    }>;
  };

  // Step 3: Execute tools (optional, if guidance needs calculations)
  toolExecution?: {
    calculations: Array<{
      functionName: string;
      functionDisplayName: string;
      formula: string;
      inputs: Record<string, { value: number; unit: string; source: string }>;
      result: {
        value: number;
        formatted: string;
      };
      description?: string;
    }>;
  };

  // Step 4: Find related articles
  relatedArticles: {
    articles: Array<{
      regulation: string;
      article: string;
      summary: string;
    }>;
  };

  // Step 5: Evaluate confidence
  confidence: {
    score: number;
    factors: Array<{
      name: string;
      score: number;
      weight: number;
    }>;
    threshold: number;
    passed: boolean;
    reason?: string;
  };

  // Step 6: Generate response
  output: {
    type: 'guidance' | 'not_found' | 'low_confidence';
    guidance?: string;
    citations: Array<{
      regulation: string;
      article: string;
      content: string;
      relevance: number;
    }>;
    confidence: number;
    relatedArticles?: Array<{
      regulation: string;
      article: string;
      summary: string;
    }>;
    warnings?: string[];
    calculations?: Array<{
      functionName: string;
      functionDisplayName: string;
      formula: string;
      inputs: Record<string, { value: number; unit: string; source: string }>;
      result: {
        value: number;
        formatted: string;
      };
      description?: string;
    }>;
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
    messages: Array<{
      role: 'user' | 'assistant';
      content: string;
    }>;
    currentMessage: string;
  };

  // Step 1: Generate reply
  reply: {
    content: string;
    conversationHistory: Array<{
      role: 'user' | 'assistant';
      content: string;
    }>;
  };

  // Step 2: Analyze intent and route to module
  routing: {
    intentAnalysis: {
      extractionKeywords: number;
      analysisKeywords: number;
      guidanceKeywords: number;
    };
    suggestedModule?: {
      name: string;
      displayName: string;
      reason: string;
      url: string;
    };
    confidence: number;
  };

  // Step 3: Generate suggested questions
  suggestions: {
    questions: string[];
  };

  // Step 4: Generate response
  output: {
    reply: string;
    suggestedModule?: {
      name: string;
      displayName: string;
      reason: string;
      url: string;
    };
    suggestedQuestions?: string[];
    confidence: number;
  };

  // Workflow metadata
  meta: WorkflowMeta;
}
