// Database types for Supabase
// Generate updated types with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// V3.10: User role types
export type UserRole = 'admin' | 'user' | 'guest'
export type OwnerType = 'system' | 'admin' | 'user' | 'guest'

export interface Database {
  public: {
    Tables: {
      // V3.10: Users table
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
      documents: {
        Row: {
          id: string
          name: string
          doc_category: 'knowledge' | 'business'
          doc_type: string | null
          upload_time: string
          status: string
          size: number
          summary: Json | null
          created_at: string
          // Structured columns
          section_structure?: Json | null
          structure_quality?: string | null
          year?: string | null
          period?: string | null
          // V3.10: Ownership columns
          owner_id?: string | null
          owner_type?: OwnerType
          expires_at?: string | null
        }
        Insert: {
          id: string
          name: string
          doc_category: 'knowledge' | 'business'
          doc_type?: string | null
          upload_time?: string
          status?: string
          size: number
          summary?: Json | null
          created_at?: string
          // V3.10: Ownership columns
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
          status?: string
          size?: number
          summary?: Json | null
          created_at?: string
          // V3.10: Ownership columns
          owner_id?: string | null
          owner_type?: OwnerType
          expires_at?: string | null
        }
      }
      // V3.10: Guest activity tracking
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
      document_chunks: {
        Row: {
          id: string
          document_id: string
          chunk_index: number
          content: string
          embedding: number[] | null
          created_at: string
          // New columns
          section_title?: string | null
          section_level?: number | null
          section_path?: string[] | null
        }
        Insert: {
          id: string
          document_id: string
          chunk_index: number
          content: string
          embedding?: number[] | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          chunk_index?: number
          content?: string
          embedding?: number[] | null
          created_at?: string
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
    }
  }
}
