export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      college_grid_selections: {
        Row: {
          cell_index: number
          created_at: string
          id: string
          player_name: string
          puzzle_id: string
        }
        Insert: {
          cell_index: number
          created_at?: string
          id?: string
          player_name: string
          puzzle_id: string
        }
        Update: {
          cell_index?: number
          created_at?: string
          id?: string
          player_name?: string
          puzzle_id?: string
        }
        Relationships: []
      }
      college_guess_scores: {
        Row: {
          clues_used: number
          created_at: string
          guessed: boolean
          id: string
          mode: string
          puzzle_date: string
          score: number
        }
        Insert: {
          clues_used: number
          created_at?: string
          guessed?: boolean
          id?: string
          mode?: string
          puzzle_date: string
          score: number
        }
        Update: {
          clues_used?: number
          created_at?: string
          guessed?: boolean
          id?: string
          mode?: string
          puzzle_date?: string
          score?: number
        }
        Relationships: []
      }
      football_grid_selections: {
        Row: {
          cell_index: number
          created_at: string
          id: string
          player_name: string
          puzzle_id: string
        }
        Insert: {
          cell_index: number
          created_at?: string
          id?: string
          player_name: string
          puzzle_id: string
        }
        Update: {
          cell_index?: number
          created_at?: string
          id?: string
          player_name?: string
          puzzle_id?: string
        }
        Relationships: []
      }
      guess_nation_countries: {
        Row: {
          best_sport_hint: string
          common_names: string[]
          continent: string
          continent_hint: string
          country_name: string
          country_size_hint: string
          created_at: string
          difficulty: string
          famous_moment_hint: string
          flag_colors_hint: string
          flag_emoji: string
          games_attended_hint: string
          gold_medal_hint: string
          iconic_moment: string
          id: string
          population_hint: string
          season_focus: string
          total_medals_hint: string
          vibe_word: string
          winter_history_hint: string
        }
        Insert: {
          best_sport_hint: string
          common_names?: string[]
          continent: string
          continent_hint: string
          country_name: string
          country_size_hint: string
          created_at?: string
          difficulty?: string
          famous_moment_hint: string
          flag_colors_hint: string
          flag_emoji?: string
          games_attended_hint: string
          gold_medal_hint: string
          iconic_moment: string
          id?: string
          population_hint: string
          season_focus?: string
          total_medals_hint: string
          vibe_word: string
          winter_history_hint: string
        }
        Update: {
          best_sport_hint?: string
          common_names?: string[]
          continent?: string
          continent_hint?: string
          country_name?: string
          country_size_hint?: string
          created_at?: string
          difficulty?: string
          famous_moment_hint?: string
          flag_colors_hint?: string
          flag_emoji?: string
          games_attended_hint?: string
          gold_medal_hint?: string
          iconic_moment?: string
          id?: string
          population_hint?: string
          season_focus?: string
          total_medals_hint?: string
          vibe_word?: string
          winter_history_hint?: string
        }
        Relationships: []
      }
      guess_nation_daily: {
        Row: {
          country_id: string
          created_at: string
          difficulty: string
          id: string
          puzzle_date: string
        }
        Insert: {
          country_id: string
          created_at?: string
          difficulty?: string
          id?: string
          puzzle_date: string
        }
        Update: {
          country_id?: string
          created_at?: string
          difficulty?: string
          id?: string
          puzzle_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "guess_nation_daily_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "guess_nation_countries"
            referencedColumns: ["id"]
          },
        ]
      }
      guess_nation_scores: {
        Row: {
          clues_used: number
          created_at: string
          guessed: boolean
          id: string
          mode: string
          puzzle_date: string
          score: number
        }
        Insert: {
          clues_used: number
          created_at?: string
          guessed?: boolean
          id?: string
          mode?: string
          puzzle_date: string
          score: number
        }
        Update: {
          clues_used?: number
          created_at?: string
          guessed?: boolean
          id?: string
          mode?: string
          puzzle_date?: string
          score?: number
        }
        Relationships: []
      }
      medal_games_scores: {
        Row: {
          clues_used: number
          created_at: string
          guessed: boolean
          id: string
          puzzle_date: string
          score: number
        }
        Insert: {
          clues_used: number
          created_at?: string
          guessed?: boolean
          id?: string
          puzzle_date: string
          score: number
        }
        Update: {
          clues_used?: number
          created_at?: string
          guessed?: boolean
          id?: string
          puzzle_date?: string
          score?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_streak: number
          display_name: string | null
          id: string
          last_played_date: string | null
          longest_streak: number
          total_correct_answers: number
          total_games_played: number
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_streak?: number
          display_name?: string | null
          id?: string
          last_played_date?: string | null
          longest_streak?: number
          total_correct_answers?: number
          total_games_played?: number
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_streak?: number
          display_name?: string | null
          id?: string
          last_played_date?: string | null
          longest_streak?: number
          total_correct_answers?: number
          total_games_played?: number
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      question_reports: {
        Row: {
          created_at: string
          description: string
          game_context: Json | null
          game_type: string
          id: string
          resolved: boolean
          resolved_at: string | null
        }
        Insert: {
          created_at?: string
          description: string
          game_context?: Json | null
          game_type: string
          id?: string
          resolved?: boolean
          resolved_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          game_context?: Json | null
          game_type?: string
          id?: string
          resolved?: boolean
          resolved_at?: string | null
        }
        Relationships: []
      }
      soccer_club_guess_scores: {
        Row: {
          clues_used: number
          created_at: string
          guessed: boolean
          id: string
          mode: string
          puzzle_date: string
          score: number
        }
        Insert: {
          clues_used: number
          created_at?: string
          guessed?: boolean
          id?: string
          mode?: string
          puzzle_date: string
          score: number
        }
        Update: {
          clues_used?: number
          created_at?: string
          guessed?: boolean
          id?: string
          mode?: string
          puzzle_date?: string
          score?: number
        }
        Relationships: []
      }
      ufc_chain_scores: {
        Row: {
          chain_length: number
          created_at: string
          id: string
          mode: string
          nickname: string
          puzzle_date: string
          score: number
        }
        Insert: {
          chain_length: number
          created_at?: string
          id?: string
          mode?: string
          nickname: string
          puzzle_date?: string
          score: number
        }
        Update: {
          chain_length?: number
          created_at?: string
          id?: string
          mode?: string
          nickname?: string
          puzzle_date?: string
          score?: number
        }
        Relationships: []
      }
      user_best_scores: {
        Row: {
          achieved_at: string
          best_score: number
          game_type: string
          id: string
          user_id: string
        }
        Insert: {
          achieved_at?: string
          best_score?: number
          game_type: string
          id?: string
          user_id: string
        }
        Update: {
          achieved_at?: string
          best_score?: number
          game_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_game_scores: {
        Row: {
          correct_answers: number
          game_type: string
          id: string
          played_at: string
          puzzle_date: string
          score: number
          user_id: string
        }
        Insert: {
          correct_answers?: number
          game_type: string
          id?: string
          played_at?: string
          puzzle_date?: string
          score?: number
          user_id: string
        }
        Update: {
          correct_answers?: number
          game_type?: string
          id?: string
          played_at?: string
          puzzle_date?: string
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
