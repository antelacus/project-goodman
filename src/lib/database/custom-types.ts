// Custom type extensions for the database
// V3.11: Hand-maintained types that complement auto-generated database.types.ts

import type { Database } from './database.types';

// ============================================================
// Domain-specific type aliases (narrower than generic string)
// ============================================================

export type UserRole = 'admin' | 'user' | 'guest';
export type OwnerType = 'system' | 'admin' | 'user' | 'guest';
export type DocumentStatus = 'processing' | 'ready' | 'error';
export type ExtractionStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type StructureQuality = 'good' | 'moderate' | 'basic';
export type WorkflowType = 'landing-chat' | 'guidance-chat' | 'financial-analysis' | 'data-extract' | 'unified';
export type MessageRole = 'user' | 'assistant' | 'tool' | 'system';
export type DocCategory = 'knowledge' | 'business';

// ============================================================
// RPC function result types
// ============================================================

/**
 * Result type for search_documents_hybrid RPC function
 */
export type SearchDocumentsHybridResult = {
  chunk_id: string;
  content: string;
  doc_type: string;
  document_id: string;
  document_name: string;
  keyword_rank: number;
  period: string;
  rrf_score: number;
  section_path: string[];
  section_title: string;
  vector_rank: number;
  year: number;
};

/**
 * Result type for match_documents RPC function
 */
export type MatchDocumentsResult = {
  chunk_index: number;
  content: string;
  document_id: string;
  id: string;
  similarity: number;
};

/**
 * Result type for search_regulations_hybrid RPC function
 */
export type SearchRegulationsHybridResult = {
  article_number: string;
  combined_score: number;
  content: string;
  keyword_match_score: number;
  keywords: string[];
  regulation_id: string;
  regulation_name: string;
  semantic_similarity: number;
};

/**
 * Result type for search_financial_data RPC function
 */
export type SearchFinancialDataResult = {
  document_id: string;
  document_name: string;
  metric_name: string;
  metric_value: number;
  period: string;
  unit: string;
  year: string;
};

// ============================================================
// RPC function argument types
// ============================================================

export type SearchDocumentsHybridArgs = {
  query_embedding: string;
  query_text: string;
  match_count?: number;
  section_filter?: string;
  year_filter?: number;
  doc_type_filter?: string;
  vector_weight?: number;
  keyword_weight?: number;
};

export type MatchDocumentsArgs = {
  query_embedding: string;
  match_count?: number;
  filter_doc_ids?: string[];
};

export type SearchRegulationsHybridArgs = {
  p_query_embedding: string;
  p_keywords: string[];
  p_limit?: number;
};

// ============================================================
// Common query result types
// ============================================================

/**
 * Document with ownership info - commonly used in document lists
 */
export type DocumentWithOwner = Pick<
  Database['public']['Tables']['documents']['Row'],
  'id' | 'name' | 'doc_type' | 'file_url' | 'owner_id' | 'owner_type' | 'expires_at' | 'doc_category' | 'status' | 'size' | 'upload_time' | 'year' | 'period'
>;

/**
 * Document list item - for API responses
 */
export type DocumentListItem = {
  id: string;
  name: string;
  doc_category: string;
  doc_type: string | null;
  year: string | null;
  period: string | null;
  file_url: string | null;
  upload_time: string | null;
  status: string | null;
  size: number;
  summary: Database['public']['Tables']['documents']['Row']['summary'];
  owner_type: string | null;
  expires_at: string | null;
};

// ============================================================
// Conversation message types
// ============================================================

/**
 * Database-compatible tool call structure for JSONB storage
 */
export interface DbToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Conversation message with typed role
 */
export interface TypedConversationMessage {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  tool_calls: DbToolCall[] | null;
  tool_call_id: string | null;
  created_at: string;
  sequence_number: number;
}
