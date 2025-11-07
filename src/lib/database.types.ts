// Database types for Supabase
// Generate updated types with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
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
    }
  }
}
