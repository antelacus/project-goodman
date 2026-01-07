// Type-safe database helper functions
// V3.11: Wrappers for RPC calls to ensure type safety

import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import type {
  SearchDocumentsHybridResult,
  SearchDocumentsHybridArgs,
  MatchDocumentsResult,
  MatchDocumentsArgs,
  SearchRegulationsHybridResult,
  SearchRegulationsHybridArgs,
  MessageRole,
  DbToolCall,
} from './custom-types';

// ============================================================
// Type-safe RPC wrappers
// ============================================================

/**
 * Type-safe wrapper for search_documents_hybrid RPC
 * Uses hybrid search combining vector similarity and keyword matching
 */
export async function searchDocumentsHybrid(
  supabase: SupabaseClient<Database>,
  params: SearchDocumentsHybridArgs
): Promise<SearchDocumentsHybridResult[]> {
  const { data, error } = await supabase.rpc('search_documents_hybrid', {
    query_embedding: params.query_embedding,
    query_text: params.query_text,
    match_count: params.match_count,
    section_filter: params.section_filter,
    year_filter: params.year_filter,
    doc_type_filter: params.doc_type_filter,
    vector_weight: params.vector_weight,
    keyword_weight: params.keyword_weight,
  });

  if (error) throw error;
  return (data ?? []) as SearchDocumentsHybridResult[];
}

/**
 * Type-safe wrapper for match_documents RPC
 * Uses pure vector similarity search
 */
export async function matchDocuments(
  supabase: SupabaseClient<Database>,
  params: MatchDocumentsArgs
): Promise<MatchDocumentsResult[]> {
  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: params.query_embedding,
    match_count: params.match_count,
    filter_doc_ids: params.filter_doc_ids,
  });

  if (error) throw error;
  return (data ?? []) as MatchDocumentsResult[];
}

/**
 * Type-safe wrapper for search_regulations_hybrid RPC
 * Searches regulations using both semantic and keyword matching
 */
export async function searchRegulationsHybrid(
  supabase: SupabaseClient<Database>,
  params: SearchRegulationsHybridArgs
): Promise<SearchRegulationsHybridResult[]> {
  const { data, error } = await supabase.rpc('search_regulations_hybrid', {
    p_query_embedding: params.p_query_embedding,
    p_keywords: params.p_keywords,
    p_limit: params.p_limit,
  });

  if (error) throw error;
  return (data ?? []) as SearchRegulationsHybridResult[];
}

// ============================================================
// Type guards and converters
// ============================================================

/**
 * Validates if a string is a valid MessageRole
 */
export function isValidMessageRole(role: unknown): role is MessageRole {
  return role === 'user' || role === 'assistant' || role === 'tool' || role === 'system';
}

/**
 * LangChain tool call format (from AI response)
 */
interface LangChainToolCall {
  id?: string;
  name: string;
  args: Record<string, unknown>;
}

/**
 * Converts LangChain tool calls to database-compatible format
 */
export function convertToolCallsToDb(toolCalls: LangChainToolCall[]): DbToolCall[] {
  return toolCalls.map(tc => ({
    id: tc.id || '',
    type: 'function' as const,
    function: {
      name: tc.name,
      arguments: JSON.stringify(tc.args),
    },
  }));
}

/**
 * Safely parses tool calls from database JSONB
 * Returns empty array if parsing fails or data is invalid
 */
export function parseDbToolCalls(jsonbData: unknown): DbToolCall[] {
  if (!jsonbData || !Array.isArray(jsonbData)) {
    return [];
  }

  return jsonbData.filter((item): item is DbToolCall => {
    return (
      typeof item === 'object' &&
      item !== null &&
      'id' in item &&
      'type' in item &&
      'function' in item &&
      typeof (item as DbToolCall).function === 'object' &&
      'name' in (item as DbToolCall).function &&
      'arguments' in (item as DbToolCall).function
    );
  });
}
