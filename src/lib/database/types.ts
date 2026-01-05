// Database types for Supabase
// V3.9: Synced with actual database schema (2026-01-05)
// Generate updated types with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database/types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Role and ownership types
export type UserRole = 'admin' | 'user' | 'guest'
export type OwnerType = 'system' | 'admin' | 'user' | 'guest'
export type DocumentStatus = 'processing' | 'ready' | 'error'
export type ExtractionStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type StructureQuality = 'good' | 'moderate' | 'basic'
export type WorkflowType = 'landing-chat' | 'guidance-chat' | 'financial-analysis' | 'data-extract' | 'unified'
export type MessageRole = 'user' | 'assistant' | 'tool' | 'system'

export interface Database {
  public: {
    Tables: {
      // ============================================================
      // Users table
      // ============================================================
      users: {
        Row: {
          id: string
          username: string
          password_hash: string
          role: UserRole
          display_name: string | null
          email: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          last_login_at: string | null
        }
        Insert: {
          id?: string
          username: string
          password_hash: string
          role?: UserRole
          display_name?: string | null
          email?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
        }
        Update: {
          id?: string
          username?: string
          password_hash?: string
          role?: UserRole
          display_name?: string | null
          email?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
        }
      }

      // ============================================================
      // Documents table
      // ============================================================
      documents: {
        Row: {
          id: string
          name: string
          doc_category: 'knowledge' | 'business'
          doc_type: string | null
          upload_time: string
          status: DocumentStatus
          size: number
          summary: Json | null
          created_at: string
          // Processing columns
          processed_at: string | null
          extraction_status: ExtractionStatus
          extraction_metadata: Json | null
          is_structured: boolean
          // Structured columns
          section_structure: Json | null
          structure_quality: StructureQuality | null
          year: string | null
          period: string | null
          // Storage
          file_url: string | null
          is_temp: boolean
          // Ownership columns
          owner_id: string | null
          owner_type: OwnerType
          expires_at: string | null
        }
        Insert: {
          id: string
          name: string
          doc_category: 'knowledge' | 'business'
          doc_type?: string | null
          upload_time?: string
          status?: DocumentStatus
          size: number
          summary?: Json | null
          created_at?: string
          processed_at?: string | null
          extraction_status?: ExtractionStatus
          extraction_metadata?: Json | null
          is_structured?: boolean
          section_structure?: Json | null
          structure_quality?: StructureQuality | null
          year?: string | null
          period?: string | null
          file_url?: string | null
          is_temp?: boolean
          owner_id?: string | null
          owner_type?: OwnerType
          expires_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          doc_category?: 'knowledge' | 'business'
          doc_type?: string | null
          upload_time?: string
          status?: DocumentStatus
          size?: number
          summary?: Json | null
          created_at?: string
          processed_at?: string | null
          extraction_status?: ExtractionStatus
          extraction_metadata?: Json | null
          is_structured?: boolean
          section_structure?: Json | null
          structure_quality?: StructureQuality | null
          year?: string | null
          period?: string | null
          file_url?: string | null
          is_temp?: boolean
          owner_id?: string | null
          owner_type?: OwnerType
          expires_at?: string | null
        }
      }

      // ============================================================
      // Document chunks table
      // ============================================================
      document_chunks: {
        Row: {
          id: string
          document_id: string
          chunk_index: number
          content: string
          embedding: number[] | null
          created_at: string
          // Chunk metadata
          chunk_type: string | null
          parent_id: string | null
          keywords: string[] | null
          // Section info
          section_title: string | null
          section_level: number
          section_path: string[] | null
        }
        Insert: {
          id: string
          document_id: string
          chunk_index: number
          content: string
          embedding?: number[] | null
          created_at?: string
          chunk_type?: string | null
          parent_id?: string | null
          keywords?: string[] | null
          section_title?: string | null
          section_level?: number
          section_path?: string[] | null
        }
        Update: {
          id?: string
          document_id?: string
          chunk_index?: number
          content?: string
          embedding?: number[] | null
          created_at?: string
          chunk_type?: string | null
          parent_id?: string | null
          keywords?: string[] | null
          section_title?: string | null
          section_level?: number
          section_path?: string[] | null
        }
      }

      // ============================================================
      // Conversation sessions table
      // ============================================================
      conversation_sessions: {
        Row: {
          id: string
          workflow_type: WorkflowType
          created_at: string
          updated_at: string
          metadata: Json | null
          title: string | null
          owner_id: string | null
          owner_type: OwnerType | null
        }
        Insert: {
          id?: string
          workflow_type: WorkflowType
          created_at?: string
          updated_at?: string
          metadata?: Json | null
          title?: string | null
          owner_id?: string | null
          owner_type?: OwnerType | null
        }
        Update: {
          id?: string
          workflow_type?: WorkflowType
          created_at?: string
          updated_at?: string
          metadata?: Json | null
          title?: string | null
          owner_id?: string | null
          owner_type?: OwnerType | null
        }
      }

      // ============================================================
      // Conversation messages table
      // ============================================================
      conversation_messages: {
        Row: {
          id: string
          session_id: string
          role: MessageRole
          content: string
          tool_calls: Json | null
          tool_call_id: string | null
          created_at: string
          sequence_number: number
        }
        Insert: {
          id?: string
          session_id: string
          role: MessageRole
          content: string
          tool_calls?: Json | null
          tool_call_id?: string | null
          created_at?: string
          sequence_number: number
        }
        Update: {
          id?: string
          session_id?: string
          role?: MessageRole
          content?: string
          tool_calls?: Json | null
          tool_call_id?: string | null
          created_at?: string
          sequence_number?: number
        }
      }

      // ============================================================
      // Guest activity tracking table
      // ============================================================
      guest_activity: {
        Row: {
          id: string
          session_id: string
          ip_address: string | null
          user_agent: string | null
          message_count: number
          upload_count: number
          extract_count: number
          created_at: string
          last_activity_at: string
          expired_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          ip_address?: string | null
          user_agent?: string | null
          message_count?: number
          upload_count?: number
          extract_count?: number
          created_at?: string
          last_activity_at?: string
          expired_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          ip_address?: string | null
          user_agent?: string | null
          message_count?: number
          upload_count?: number
          extract_count?: number
          created_at?: string
          last_activity_at?: string
          expired_at?: string | null
        }
      }

      // ============================================================
      // Financial data table
      // ============================================================
      financial_data: {
        Row: {
          id: string
          document_id: string
          data_type: string
          year: string
          period: string
          metric_name: string
          metric_value: number
          metric_value_previous: number | null
          unit: string
          section: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          document_id: string
          data_type: string
          year: string
          period: string
          metric_name: string
          metric_value: number
          metric_value_previous?: number | null
          unit?: string
          section?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          data_type?: string
          year?: string
          period?: string
          metric_name?: string
          metric_value?: number
          metric_value_previous?: number | null
          unit?: string
          section?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }

      // ============================================================
      // Structured regulations table
      // ============================================================
      structured_regulations: {
        Row: {
          id: string
          document_id: string
          regulation_name: string
          article_number: string
          sub_article: string | null
          title: string | null
          content: string
          keywords: string[]
          effective_date: string | null
          expiry_date: string | null
          parent_article_id: string | null
          hierarchy: Json | null
          applicability: Json | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          document_id: string
          regulation_name: string
          article_number: string
          sub_article?: string | null
          title?: string | null
          content: string
          keywords?: string[]
          effective_date?: string | null
          expiry_date?: string | null
          parent_article_id?: string | null
          hierarchy?: Json | null
          applicability?: Json | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          regulation_name?: string
          article_number?: string
          sub_article?: string | null
          title?: string | null
          content?: string
          keywords?: string[]
          effective_date?: string | null
          expiry_date?: string | null
          parent_article_id?: string | null
          hierarchy?: Json | null
          applicability?: Json | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }

      // ============================================================
      // Preset functions table
      // ============================================================
      preset_functions: {
        Row: {
          id: string
          name: string
          display_name: string
          display_name_en: string | null
          category: string
          formula: string
          required_inputs: Json
          description: string | null
          formula_display: string | null
          unit: string
          validation_rules: Json | null
          interpretation_guide: string | null
          version: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          display_name_en?: string | null
          category: string
          formula: string
          required_inputs: Json
          description?: string | null
          formula_display?: string | null
          unit?: string
          validation_rules?: Json | null
          interpretation_guide?: string | null
          version?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          display_name_en?: string | null
          category?: string
          formula?: string
          required_inputs?: Json
          description?: string | null
          formula_display?: string | null
          unit?: string
          validation_rules?: Json | null
          interpretation_guide?: string | null
          version?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }

      // ============================================================
      // Calculation history table
      // ============================================================
      calculation_history: {
        Row: {
          id: string
          function_id: string
          user_query: string
          input_data: Json
          result: Json
          source_documents: string[]
          calculation_steps: Json | null
          confidence_score: number | null
          error_message: string | null
          execution_time_ms: number | null
          created_at: string
        }
        Insert: {
          id?: string
          function_id: string
          user_query: string
          input_data: Json
          result: Json
          source_documents: string[]
          calculation_steps?: Json | null
          confidence_score?: number | null
          error_message?: string | null
          execution_time_ms?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          function_id?: string
          user_query?: string
          input_data?: Json
          result?: Json
          source_documents?: string[]
          calculation_steps?: Json | null
          confidence_score?: number | null
          error_message?: string | null
          execution_time_ms?: number | null
          created_at?: string
        }
      }

      // ============================================================
      // Admin config table
      // ============================================================
      admin_config: {
        Row: {
          id: string
          config_key: string
          config_value: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          config_key: string
          config_value: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          config_key?: string
          config_value?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }

    Functions: {
      match_documents: {
        Args: {
          query_embedding: number[]
          match_count?: number
          filter_doc_ids?: string[] | null
        }
        Returns: {
          id: string
          document_id: string
          content: string
          chunk_index: number
          similarity: number
        }[]
      }
      search_documents_hybrid: {
        Args: {
          query_embedding: number[]
          query_text: string
          match_count?: number
          section_filter?: string | null
          year_filter?: number | null
          doc_type_filter?: string | null
          vector_weight?: number
          keyword_weight?: number
        }
        Returns: {
          chunk_id: string
          document_id: string
          document_name: string
          doc_type: string
          content: string
          section_title: string | null
          section_path: string[] | null
          vector_rank: number
          keyword_rank: number
          rrf_score: number
          year: number | null
          period: string | null
        }[]
      }
      cleanup_temp_documents: {
        Args: Record<string, never>
        Returns: number
      }
    }
  }
}

// ============================================================
// Convenience type aliases
// ============================================================
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Common row types
export type Document = Tables<'documents'>
export type DocumentChunk = Tables<'document_chunks'>
export type ConversationSession = Tables<'conversation_sessions'>
export type ConversationMessage = Tables<'conversation_messages'>
export type User = Tables<'users'>
export type GuestActivity = Tables<'guest_activity'>
export type FinancialData = Tables<'financial_data'>
export type StructuredRegulation = Tables<'structured_regulations'>
export type PresetFunction = Tables<'preset_functions'>
export type CalculationHistory = Tables<'calculation_history'>
export type AdminConfig = Tables<'admin_config'>
