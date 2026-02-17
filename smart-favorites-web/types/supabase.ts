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
      bookmarks: {
        Row: {
          id: string
          user_id: string
          title: string
          url: string
          description: string | null
          folder_path: string | null
          add_date: string | null
          icon: string | null
          embedding: number[] | null
          source_hash: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          title: string
          url: string
          description?: string | null
          folder_path?: string | null
          add_date?: string | null
          icon?: string | null
          embedding?: number[] | null
          source_hash?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          url?: string
          description?: string | null
          folder_path?: string | null
          add_date?: string | null
          icon?: string | null
          embedding?: number[] | null
          source_hash?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      github_stars: {
        Row: {
          id: string
          user_id: string
          owner: string
          repo: string
          url: string
          description: string | null
          language: string | null
          stars: number
          forks: number
          updated: string
          embedding: number[] | null
          source_hash: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          owner: string
          repo: string
          url: string
          description?: string | null
          language?: string | null
          stars?: number
          forks?: number
          updated: string
          embedding?: number[] | null
          source_hash?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          owner?: string
          repo?: string
          url?: string
          description?: string | null
          language?: string | null
          stars?: number
          forks?: number
          updated?: string
          embedding?: number[] | null
          source_hash?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          title: string
          messages: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          title: string
          messages?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          messages?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_bookmarks: {
        Args: {
          query_embedding: number[]
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          user_id: string
          title: string
          url: string
          description: string | null
          folder_path: string | null
          similarity: number
        }[]
      }
      match_stars: {
        Args: {
          query_embedding: number[]
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          user_id: string
          owner: string
          repo: string
          url: string
          description: string | null
          language: string | null
          stars: number
          forks: number
          similarity: number
        }[]
      }
      match_all_items: {
        Args: {
          query_embedding: number[]
          match_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          type: string
          title: string
          url: string
          description: string | null
          similarity: number
          metadata: Json
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
