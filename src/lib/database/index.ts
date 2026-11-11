/**
 * Database Module
 *
 * Database clients and types:
 * - supabase: Supabase client factory (server & browser)
 * - redis: Redis client (import directly from @/lib/database/redis for server-only code)
 * - types: Auto-generated Supabase database types + custom types + helpers
 */

// Supabase
export {
  createServerSupabaseClient,
} from "./supabase";

// Note: Redis is NOT re-exported here to avoid bundling issues.
// Import directly: import { redis } from "@/lib/database/redis";

// Types - all from unified types.ts export point
export type {
  // Auto-generated types
  Database,
  Json,
  // Table type helpers
  Tables,
  InsertTables,
  UpdateTables,
  // Common row types
  Document,
  DocumentChunk,
  ConversationSession,
  ConversationMessage,
  User,
  GuestActivity,
  FinancialData,
  StructuredRegulation,
  PresetFunction,
  CalculationHistory,
  AdminConfig,
  // Domain types
  UserRole,
  OwnerType,
  DocumentStatus,
  ExtractionStatus,
  StructureQuality,
  WorkflowType,
  MessageRole,
  DocCategory,
  // RPC result types
  SearchFinancialDataResult,
  // Common query types
  DocumentWithOwner,
  DocumentListItem,
  // Conversation types
  DbToolCall,
  TypedConversationMessage,
} from "./types";

// Helper functions
export {
  isValidMessageRole,
  convertToolCallsToDb,
  parseDbToolCalls,
} from "./types";
