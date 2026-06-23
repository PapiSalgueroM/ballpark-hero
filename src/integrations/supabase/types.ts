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
      baseball_career_players: {
        Row: {
          created_at: string
          data: Json
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          data: Json
          id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          sort_order?: number
        }
        Relationships: []
      }
      baseball_connections_puzzles: {
        Row: {
          created_at: string
          groups_json: Json
          id: string
          puzzle_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          groups_json: Json
          id?: string
          puzzle_id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          groups_json?: Json
          id?: string
          puzzle_id?: string
          sort_order?: number
        }
        Relationships: []
      }
      career_players: {
        Row: {
          created_at: string
          id: string
          nationality: string
          player_name: string
          position: string
        }
        Insert: {
          created_at?: string
          id?: string
          nationality: string
          player_name: string
          position: string
        }
        Update: {
          created_at?: string
          id?: string
          nationality?: string
          player_name?: string
          position?: string
        }
        Relationships: []
      }
      career_seasons: {
        Row: {
          appearances: number
          assists: number
          club: string
          created_at: string
          goals: number
          id: string
          market_value: number
          player_id: string
          season: string
          sort_order: number
        }
        Insert: {
          appearances: number
          assists: number
          club: string
          created_at?: string
          goals: number
          id?: string
          market_value: number
          player_id: string
          season: string
          sort_order: number
        }
        Update: {
          appearances?: number
          assists?: number
          club?: string
          created_at?: string
          goals?: number
          id?: string
          market_value?: number
          player_id?: string
          season?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "career_seasons_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "career_players"
            referencedColumns: ["id"]
          },
        ]
      }
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
      college_grid_puzzles: {
        Row: {
          created_at: string
          data: Json
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          data: Json
          id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          sort_order?: number
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
      colleges_pool: {
        Row: {
          created_at: string
          data: Json
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          data: Json
          id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          sort_order?: number
        }
        Relationships: []
      }
      connections_puzzles: {
        Row: {
          created_at: string
          groups_json: Json
          id: string
          puzzle_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          groups_json: Json
          id?: string
          puzzle_id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          groups_json?: Json
          id?: string
          puzzle_id?: string
          sort_order?: number
        }
        Relationships: []
      }
      conquest_free_agents: {
        Row: {
          created_at: string
          data: Json
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          data: Json
          id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          sort_order?: number
        }
        Relationships: []
      }
      conquest_nfl_teams: {
        Row: {
          created_at: string
          data: Json
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          data: Json
          id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          sort_order?: number
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
      draft_guesser_puzzles: {
        Row: {
          created_at: string
          data: Json
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          data: Json
          id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          sort_order?: number
        }
        Relationships: []
      }
      f1_constructor_puzzles: {
        Row: {
          created_at: string
          data: Json
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          data: Json
          id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          sort_order?: number
        }
        Relationships: []
      }
      f1_driver_puzzles: {
        Row: {
          created_at: string
          data: Json
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          data: Json
          id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          sort_order?: number
        }
        Relationships: []
      }
      f1_perfect_lineup_pool: {
        Row: {
          created_at: string
          data: Json
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          data: Json
          id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          sort_order?: number
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
          user_id: string | null
          voted_team: string
        }
        Insert: {
          created_at?: string
          id?: string
          puzzle_date?: string
          user_id?: string | null
          voted_team: string
        }
        Update: {
          created_at?: string
          id?: string
          puzzle_date?: string
          user_id?: string | null
          voted_team?: string
        }
        Relationships: []
      }
      football_grid_puzzles: {
        Row: {
          created_at: string
          data: Json
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          data: Json
          id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          sort_order?: number
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
      guess_the_year_puzzles: {
        Row: {
          created_at: string
          data: Json
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          data: Json
          id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          sort_order?: number
        }
        Relationships: []
      }
      higher_lower_players: {
        Row: {
          created_at: string
          data: Json
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          data: Json
          id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          sort_order?: number
        }
        Relationships: []
      }
      hockey_career_players: {
        Row: {
          created_at: string
          data: Json
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          data: Json
          id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          sort_order?: number
        }
        Relationships: []
      }
      hockey_hl_players: {
        Row: {
          created_at: string
          data: Json
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          data: Json
          id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          sort_order?: number
        }
        Relationships: []
      }
      hof_votes: {
        Row: {
          created_at: string
          id: string
          player_id: string
          vote: string
        }
        Insert: {
          created_at?: string
          id?: string
          player_id: string
          vote: string
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string
          vote?: string
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
      nba_perfect_lineup_pool: {
        Row: {
          created_at: string
          data: Json
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          data: Json
          id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          sort_order?: number
        }
        Relationships: []
      }
      nba_teams_pool: {
        Row: {
          created_at: string
          data: Json
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          data: Json
          id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          sort_order?: number
        }
        Relationships: []
      }
      nfl_career_players: {
        Row: {
          created_at: string
          data: Json
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          data: Json
          id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          sort_order?: number
        }
        Relationships: []
      }
      nfl_players: {
        Row: {
          awards: string[]
          career_stats_summary: string | null
          college: string | null
          common_nicknames: string[]
          created_at: string
          draft_round: number | null
          draft_year: number | null
          full_name: string
          hall_of_fame: boolean
          hof_year: number | null
          id: string
          is_active: boolean
          position: string
          teams: Json
        }
        Insert: {
          awards?: string[]
          career_stats_summary?: string | null
          college?: string | null
          common_nicknames?: string[]
          created_at?: string
          draft_round?: number | null
          draft_year?: number | null
          full_name: string
          hall_of_fame?: boolean
          hof_year?: number | null
          id?: string
          is_active?: boolean
          position: string
          teams?: Json
        }
        Update: {
          awards?: string[]
          career_stats_summary?: string | null
          college?: string | null
          common_nicknames?: string[]
          created_at?: string
          draft_round?: number | null
          draft_year?: number | null
          full_name?: string
          hall_of_fame?: boolean
          hof_year?: number | null
          id?: string
          is_active?: boolean
          position?: string
          teams?: Json
        }
        Relationships: []
      }
      nfl_team_puzzles: {
        Row: {
          created_at: string
          data: Json
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          data: Json
          id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          sort_order?: number
        }
        Relationships: []
      }
      nhl_perfect_lineup_pool: {
        Row: {
          created_at: string
          data: Json
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          data: Json
          id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          sort_order?: number
        }
        Relationships: []
      }
      olympics_athletes: {
        Row: {
          created_at: string
          data: Json
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          data: Json
          id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          sort_order?: number
        }
        Relationships: []
      }
      player_market_values: {
        Row: {
          age: number | null
          assists: number | null
          club: string | null
          goals: number | null
          id: number
          market_value_usd: number | null
          matches: number | null
          nationality: string | null
          player_name: string | null
          position: string | null
          rank: number | null
          red_cards: number | null
          year: number | null
          yellow_cards: number | null
        }
        Insert: {
          age?: number | null
          assists?: number | null
          club?: string | null
          goals?: number | null
          id: number
          market_value_usd?: number | null
          matches?: number | null
          nationality?: string | null
          player_name?: string | null
          position?: string | null
          rank?: number | null
          red_cards?: number | null
          year?: number | null
          yellow_cards?: number | null
        }
        Update: {
          age?: number | null
          assists?: number | null
          club?: string | null
          goals?: number | null
          id?: number
          market_value_usd?: number | null
          matches?: number | null
          nationality?: string | null
          player_name?: string | null
          position?: string | null
          rank?: number | null
          red_cards?: number | null
          year?: number | null
          yellow_cards?: number | null
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
          streak_freezes: number
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
          streak_freezes?: number
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
          streak_freezes?: number
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
      saved_brackets: {
        Row: {
          bracket_data: Json
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          bracket_data?: Json
          created_at?: string
          id: string
          user_id: string
        }
        Update: {
          bracket_data?: Json
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      shirt_number_puzzles: {
        Row: {
          club: string
          created_at: string
          fun_fact: string
          id: string
          kit_number: number
          league: string
          nationality: string
          player_name: string
        }
        Insert: {
          club: string
          created_at?: string
          fun_fact: string
          id?: string
          kit_number: number
          league: string
          nationality: string
          player_name: string
        }
        Update: {
          club?: string
          created_at?: string
          fun_fact?: string
          id?: string
          kit_number?: number
          league?: string
          nationality?: string
          player_name?: string
        }
        Relationships: []
      }
      soccer_career_clubs: {
        Row: {
          color: string
          country: string
          created_at: string
          id: string
          league: string
          name: string
          tier: number
        }
        Insert: {
          color?: string
          country: string
          created_at?: string
          id?: string
          league?: string
          name: string
          tier: number
        }
        Update: {
          color?: string
          country?: string
          created_at?: string
          id?: string
          league?: string
          name?: string
          tier?: number
        }
        Relationships: []
      }
      soccer_careers: {
        Row: {
          age: number
          career_history: Json
          created_at: string
          current_club: string | null
          defending: number
          dribbling: number
          id: string
          is_active: boolean
          nationality: string
          overall_rating: number
          pace: number
          passing: number
          physical: number
          player_name: string
          position: string
          reflexes: number
          season_year: number
          shooting: number
          starting_era: string
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number
          career_history?: Json
          created_at?: string
          current_club?: string | null
          defending?: number
          dribbling?: number
          id?: string
          is_active?: boolean
          nationality: string
          overall_rating?: number
          pace?: number
          passing?: number
          physical?: number
          player_name: string
          position: string
          reflexes?: number
          season_year: number
          shooting?: number
          starting_era: string
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number
          career_history?: Json
          created_at?: string
          current_club?: string | null
          defending?: number
          dribbling?: number
          id?: string
          is_active?: boolean
          nationality?: string
          overall_rating?: number
          pace?: number
          passing?: number
          physical?: number
          player_name?: string
          position?: string
          reflexes?: number
          season_year?: number
          shooting?: number
          starting_era?: string
          updated_at?: string
          user_id?: string
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
      soccer_club_puzzles: {
        Row: {
          common_names: string[]
          country: string
          created_at: string
          full_name: string
          fun_fact: string
          id: string
          kit_colors: string
          league: string
          league_hint: string
          league_titles: number
          puzzle_id: string
          sort_order: number
          vibe: string
        }
        Insert: {
          common_names: string[]
          country: string
          created_at?: string
          full_name: string
          fun_fact: string
          id?: string
          kit_colors: string
          league: string
          league_hint: string
          league_titles: number
          puzzle_id: string
          sort_order: number
          vibe: string
        }
        Update: {
          common_names?: string[]
          country?: string
          created_at?: string
          full_name?: string
          fun_fact?: string
          id?: string
          kit_colors?: string
          league?: string
          league_hint?: string
          league_titles?: number
          puzzle_id?: string
          sort_order?: number
          vibe?: string
        }
        Relationships: []
      }
      soccer_grid_puzzles: {
        Row: {
          cols_json: Json
          created_at: string
          id: string
          puzzle_id: string
          rows_json: Json
          sort_order: number
        }
        Insert: {
          cols_json: Json
          created_at?: string
          id?: string
          puzzle_id: string
          rows_json: Json
          sort_order: number
        }
        Update: {
          cols_json?: Json
          created_at?: string
          id?: string
          puzzle_id?: string
          rows_json?: Json
          sort_order?: number
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
      teammates_pairs: {
        Row: {
          created_at: string
          data: Json
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          data: Json
          id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          sort_order?: number
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
        Relationships: []
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
          common_names: string[]
          created_at?: string
          difficulty: string
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
      timeline_puzzles: {
        Row: {
          created_at: string
          data: Json
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          data: Json
          id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          sort_order?: number
        }
        Relationships: []
      }
      transfer_path_puzzles: {
        Row: {
          created_at: string
          hint: string
          id: string
          min_steps: number
          player_a: string
          player_b: string
          puzzle_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          hint: string
          id?: string
          min_steps: number
          player_a: string
          player_b: string
          puzzle_id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          hint?: string
          id?: string
          min_steps?: number
          player_a?: string
          player_b?: string
          puzzle_id?: string
          sort_order?: number
        }
        Relationships: []
      }
      ufc_chain_fighters: {
        Row: {
          created_at: string
          data: Json
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          data: Json
          id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          sort_order?: number
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
      ufc_fighters_pool: {
        Row: {
          created_at: string
          data: Json
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          data: Json
          id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          sort_order?: number
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
      user_preferences: {
        Row: {
          created_at: string
          favourite_game: string | null
          favourite_player: string | null
          favourite_team: string | null
          id: string
          time_spent_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          favourite_game?: string | null
          favourite_player?: string | null
          favourite_team?: string | null
          id?: string
          time_spent_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          favourite_game?: string | null
          favourite_player?: string | null
          favourite_team?: string | null
          id?: string
          time_spent_minutes?: number
          updated_at?: string
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
      world_cup_puzzles: {
        Row: {
          created_at: string
          data: Json
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          data: Json
          id: string
          sort_order: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          sort_order?: number
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
