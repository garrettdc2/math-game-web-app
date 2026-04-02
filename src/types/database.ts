/** Supabase database type definitions for the math-game-web-app */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          selected_grade: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          selected_grade?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          selected_grade?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      scores: {
        Row: {
          id: string;
          user_id: string;
          grade: string;
          score: number;
          streak: number;
          problems_correct: number;
          problems_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          grade: string;
          score?: number;
          streak?: number;
          problems_correct?: number;
          problems_total?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          grade?: string;
          score?: number;
          streak?: number;
          problems_correct?: number;
          problems_total?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scores_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      leaderboard: {
        Row: {
          user_id: string | null;
          grade: string | null;
          display_name: string | null;
          avatar_url: string | null;
          total_score: number | null;
          total_correct: number | null;
          total_problems: number | null;
          best_streak: number | null;
          games_played: number | null;
          rank: number | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
