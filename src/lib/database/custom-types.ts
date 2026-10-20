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
