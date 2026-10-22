// Database types - unified export point
// V3.11: Re-exports from database.types.ts (auto-generated) and custom-types.ts (hand-maintained)

// ============================================================
// Re-export auto-generated types
// ============================================================
export type { Database, Json } from './database.types';

// ============================================================
// Re-export custom types (domain-specific aliases, RPC types)
// ============================================================
export type {
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
} from './custom-types';

// ============================================================
// Re-export helper functions
// ============================================================
export {
  isValidMessageRole,
  convertToolCallsToDb,
  parseDbToolCalls,
} from './helpers';

// ============================================================
// Convenience type aliases (backward compatibility)
// ============================================================
import type { Database } from './database.types';

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Common row types (backward compatibility aliases)
export type Document = Tables<'documents'>;
export type DocumentChunk = Tables<'document_chunks'>;
export type ConversationSession = Tables<'conversation_sessions'>;
export type ConversationMessage = Tables<'conversation_messages'>;
export type User = Tables<'users'>;
export type GuestActivity = Tables<'guest_activity'>;
export type FinancialData = Tables<'financial_data'>;
export type StructuredRegulation = Tables<'structured_regulations'>;
export type PresetFunction = Tables<'preset_functions'>;
export type CalculationHistory = Tables<'calculation_history'>;
export type AdminConfig = Tables<'admin_config'>;
