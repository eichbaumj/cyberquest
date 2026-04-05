// Database types for Supabase
// This file should be regenerated using: npm run db:generate
// For now, we define types manually based on our schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'student' | 'instructor' | 'admin';
export type QuestionType = 'multiple_choice' | 'true_false' | 'terminal_command';
export type GameStatus = 'lobby' | 'starting' | 'active' | 'paused' | 'finished';
export type GameMode = 'race' | 'practice';
export type QuestionCategory = 'dfir' | 'malware' | 'forensics' | 'network' | 'general';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          total_xp: number;
          level: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          total_xp?: number;
          level?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          total_xp?: number;
          level?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          instructor_id: string;
          title: string;
          description: string | null;
          code: string | null;
          is_active: boolean;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          instructor_id: string;
          title: string;
          description?: string | null;
          code?: string | null;
          is_active?: boolean;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          instructor_id?: string;
          title?: string;
          description?: string | null;
          code?: string | null;
          is_active?: boolean;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      course_enrollments: {
        Row: {
          course_id: string;
          student_id: string;
          status: 'active' | 'inactive' | 'completed';
          enrolled_at: string;
        };
        Insert: {
          course_id: string;
          student_id: string;
          status?: 'active' | 'inactive' | 'completed';
          enrolled_at?: string;
        };
        Update: {
          course_id?: string;
          student_id?: string;
          status?: 'active' | 'inactive' | 'completed';
          enrolled_at?: string;
        };
      };
      question_banks: {
        Row: {
          id: string;
          owner_id: string;
          course_id: string | null;
          title: string;
          description: string | null;
          category: QuestionCategory | null;
          is_public: boolean;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          course_id?: string | null;
          title: string;
          description?: string | null;
          category?: QuestionCategory | null;
          is_public?: boolean;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          course_id?: string | null;
          title?: string;
          description?: string | null;
          category?: QuestionCategory | null;
          is_public?: boolean;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      questions: {
        Row: {
          id: string;
          bank_id: string;
          type: QuestionType;
          content: Json;
          options: Json | null;
          correct_answer: Json;
          explanation: string | null;
          difficulty: number;
          points: number;
          time_limit_seconds: number;
          case_sensitive: boolean;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          bank_id: string;
          type: QuestionType;
          content: Json;
          options?: Json | null;
          correct_answer: Json;
          explanation?: string | null;
          difficulty?: number;
          points?: number;
          time_limit_seconds?: number;
          case_sensitive?: boolean;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          bank_id?: string;
          type?: QuestionType;
          content?: Json;
          options?: Json | null;
          correct_answer?: Json;
          explanation?: string | null;
          difficulty?: number;
          points?: number;
          time_limit_seconds?: number;
          case_sensitive?: boolean;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      game_sessions: {
        Row: {
          id: string;
          host_id: string;
          course_id: string | null;
          question_bank_id: string | null;
          title: string;
          join_code: string;
          status: GameStatus;
          game_mode: GameMode;
          current_question_index: number;
          settings: Json;
          started_at: string | null;
          finished_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          host_id: string;
          course_id?: string | null;
          question_bank_id?: string | null;
          title: string;
          join_code: string;
          status?: GameStatus;
          game_mode?: GameMode;
          current_question_index?: number;
          settings?: Json;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          host_id?: string;
          course_id?: string | null;
          question_bank_id?: string | null;
          title?: string;
          join_code?: string;
          status?: GameStatus;
          game_mode?: GameMode;
          current_question_index?: number;
          settings?: Json;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
        };
      };
      game_players: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          nickname: string;
          avatar_seed: string | null;
          score: number;
          correct_answers: number;
          total_answers: number;
          current_streak: number;
          best_streak: number;
          position_x: number;
          position_y: number;
          position_z: number;
          rotation_y: number;
          is_connected: boolean;
          last_seen_at: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          nickname: string;
          avatar_seed?: string | null;
          score?: number;
          correct_answers?: number;
          total_answers?: number;
          current_streak?: number;
          best_streak?: number;
          position_x?: number;
          position_y?: number;
          position_z?: number;
          rotation_y?: number;
          is_connected?: boolean;
          last_seen_at?: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          nickname?: string;
          avatar_seed?: string | null;
          score?: number;
          correct_answers?: number;
          total_answers?: number;
          current_streak?: number;
          best_streak?: number;
          position_x?: number;
          position_y?: number;
          position_z?: number;
          rotation_y?: number;
          is_connected?: boolean;
          last_seen_at?: string;
          joined_at?: string;
        };
      };
      player_stats: {
        Row: {
          user_id: string;
          games_played: number;
          games_won: number;
          total_correct: number;
          total_questions: number;
          total_points: number;
          best_streak: number;
          average_time_ms: number;
          dfir_correct: number;
          malware_correct: number;
          forensics_correct: number;
          network_correct: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          games_played?: number;
          games_won?: number;
          total_correct?: number;
          total_questions?: number;
          total_points?: number;
          best_streak?: number;
          average_time_ms?: number;
          dfir_correct?: number;
          malware_correct?: number;
          forensics_correct?: number;
          network_correct?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          games_played?: number;
          games_won?: number;
          total_correct?: number;
          total_questions?: number;
          total_points?: number;
          best_streak?: number;
          average_time_ms?: number;
          dfir_correct?: number;
          malware_correct?: number;
          forensics_correct?: number;
          network_correct?: number;
          updated_at?: string;
        };
      };
    };
    Functions: {
      generate_join_code: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
  };
}

// Helper types for easier usage
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Course = Database['public']['Tables']['courses']['Row'];
export type QuestionBank = Database['public']['Tables']['question_banks']['Row'];
export type Question = Database['public']['Tables']['questions']['Row'];
export type GameSession = Database['public']['Tables']['game_sessions']['Row'];
export type GamePlayer = Database['public']['Tables']['game_players']['Row'];
export type PlayerStats = Database['public']['Tables']['player_stats']['Row'];
