// Type-safe database helper functions
// V3.11: Wrappers for RPC calls to ensure type safety

import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import type { MessageRole, DbToolCall } from './custom-types';

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
