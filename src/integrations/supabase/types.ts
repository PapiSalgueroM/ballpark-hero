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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      cbb_daily: {
        Row: {
          created_at: string
          difficulty: string
          id: string
          program_id: string
          puzzle_date: string
        }
        Insert: {
          created_at?: string
          difficulty?: string
          id?: string
          program_id: string
          puzzle_date: string
        }
        Update: {
          created_at?: string
          difficulty?: string
          id?: string
          program_id?: string
          puzzle_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "cbb_daily_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "cbb_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      cbb_programs: {
        Row: {
          championships_hint: string
          common_names: string[]
          conference_hint: string
          created_at: string
          difficulty: string
          id: string
          mascot_hint: string
          region_hint: string
          school_name: string
          tournament_hint: string
          vibe_word: string
        }
        Insert: {
          championships_hint: string
          common_names?: string[]
          conference_hint: string
          created_at?: string
          difficulty?: string
          id?: string
          mascot_hint: string
          region_hint: string
          school_name: string
          tournament_hint: string
          vibe_word: string
        }
        Update: {
          championships_hint?: string
          common_names?: string[]
          conference_hint?: string
          created_at?: string
          difficulty?: string
          id?: string
          mascot_hint?: string
          region_hint?: string
          school_name?: string
          tournament_hint?: string
          vibe_word?: string
        }
        Relationships: []
      }
      cbb_scores: {
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
      daily_badges: {
        Row: {
          created_at: string
          date: string
          id: string
          streak_days: number
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          streak_days?: number
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          streak_days?: number
          user_id?: string
        }
        Relationships: []
      }
      daily_completions: {
        Row: {
          completed_at: string
          date: string
          game_slug: string
          id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          date?: string
          game_slug: string
          id?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          date?: string
          game_slug?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      fantasy_draft_daily: {
        Row: {
          created_at: string
          criteria: string
          id: string
          puzzle_date: string
        }
        Insert: {
          created_at?: string
          criteria: string
          id?: string
          puzzle_date: string
        }
        Update: {
          created_at?: string
          criteria?: string
          id?: string
          puzzle_date?: string
        }
        Relationships: []
      }
      fantasy_draft_players: {
        Row: {
          created_at: string
          dominant_foot: string
          id: string
          market_value_millions: number
          name: string
          nationality: string
          position: string
        }
        Insert: {
          created_at?: string
          dominant_foot: string
          id?: string
          market_value_millions?: number
          name: string
          nationality: string
          position: string
        }
        Update: {
          created_at?: string
          dominant_foot?: string
          id?: string
          market_value_millions?: number
          name?: string
          nationality?: string
          position?: string
        }
        Relationships: []
      }
      fantasy_draft_votes: {
        Row: {
          created_at: string
          id: string
          puzzle_date: string
          voted_team: string
        }
        Insert: {
          created_at?: string
          id?: string
          puzzle_date?: string
          voted_team: string
        }
        Update: {
          created_at?: string
          id?: string
          puzzle_date?: string
          voted_team?: string
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
      nascar_chain_scores: {
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
      nascar_daily: {
        Row: {
          created_at: string
          difficulty: string
          driver_id: string
          id: string
          puzzle_date: string
        }
        Insert: {
          created_at?: string
          difficulty?: string
          driver_id: string
          id?: string
          puzzle_date: string
        }
        Update: {
          created_at?: string
          difficulty?: string
          driver_id?: string
          id?: string
          puzzle_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "nascar_daily_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "nascar_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      nascar_drivers: {
        Row: {
          car_number_hint: string
          championship_hint: string
          common_names: string[]
          created_at: string
          difficulty: string
          driver_name: string
          era_hint: string
          famous_moment_hint: string
          id: string
          vibe_word: string
          wins_hint: string
        }
        Insert: {
          car_number_hint: string
          championship_hint: string
          common_names?: string[]
          created_at?: string
          difficulty?: string
          driver_name: string
          era_hint: string
          famous_moment_hint: string
          id?: string
          vibe_word: string
          wins_hint: string
        }
        Update: {
          car_number_hint?: string
          championship_hint?: string
          common_names?: string[]
          created_at?: string
          difficulty?: string
          driver_name?: string
          era_hint?: string
          famous_moment_hint?: string
          id?: string
          vibe_word?: string
          wins_hint?: string
        }
        Relationships: []
      }
      nascar_scores: {
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
      profiles: {
        Row: {
          all_time_score: number
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
          all_time_score?: number
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
          all_time_score?: number
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
      soccer_grid_selections: {
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
      tennis_chain_scores: {
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
      tennis_daily: {
        Row: {
          created_at: string
          difficulty: string
          id: string
          player_id: string
          puzzle_date: string
        }
        Insert: {
          created_at?: string
          difficulty?: string
          id?: string
          player_id: string
          puzzle_date: string
        }
        Update: {
          created_at?: string
          difficulty?: string
          id?: string
          player_id?: string
          puzzle_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "tennis_daily_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "tennis_players"
            referencedColumns: ["id"]
          },
        ]
      }
      tennis_players: {
        Row: {
          common_names: string[]
          created_at: string
          difficulty: string
          famous_moment_hint: string
          id: string
          nationality_era_hint: string
          player_name: string
          slam_count_hint: string
          slam_detail_hint: string
          tour_hint: string
          vibe_word: string
        }
        Insert: {
          common_names?: string[]
          created_at?: string
          difficulty?: string
          famous_moment_hint: string
          id?: string
          nationality_era_hint: string
          player_name: string
          slam_count_hint: string
          slam_detail_hint: string
          tour_hint: string
          vibe_word: string
        }
        Update: {
          common_names?: string[]
          created_at?: string
          difficulty?: string
          famous_moment_hint?: string
          id?: string
          nationality_era_hint?: string
          player_name?: string
          slam_count_hint?: string
          slam_detail_hint?: string
          tour_hint?: string
          vibe_word?: string
        }
        Relationships: []
      }
      tennis_scores: {
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
      user_scores: {
        Row: {
          current_streak: number
          games_played_today: number
          id: string
          last_played_at: string
          longest_streak: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          games_played_today?: number
          id?: string
          last_played_at?: string
          longest_streak?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          games_played_today?: number
          id?: string
          last_played_at?: string
          longest_streak?: number
          total_points?: number
          updated_at?: string
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
