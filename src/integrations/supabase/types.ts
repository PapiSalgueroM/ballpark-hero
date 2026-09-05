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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_validation_cache: {
        Row: {
          cache_key: string
          created_at: string
          game: string
          verdict: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          game: string
          verdict: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          game?: string
          verdict?: Json
        }
        Relationships: []
      }
      all_star_selections: {
        Row: {
          id: number
          league: string | null
          player_name: string
          position: string | null
          selection_type: string | null
          sport: string
          team: string | null
          year: number
        }
        Insert: {
          id?: number
          league?: string | null
          player_name: string
          position?: string | null
          selection_type?: string | null
          sport: string
          team?: string | null
          year: number
        }
        Update: {
          id?: number
          league?: string | null
          player_name?: string
          position?: string | null
          selection_type?: string | null
          sport?: string
          team?: string | null
          year?: number
        }
        Relationships: []
      }
      ballon_dor: {
        Row: {
          award_type: string | null
          club: string | null
          id: number
          nationality: string | null
          player_name: string
          points: number | null
          rank: number
          year: number
        }
        Insert: {
          award_type?: string | null
          club?: string | null
          id?: number
          nationality?: string | null
          player_name: string
          points?: number | null
          rank: number
          year: number
        }
        Update: {
          award_type?: string | null
          club?: string | null
          id?: number
          nationality?: string | null
          player_name?: string
          points?: number | null
          rank?: number
          year?: number
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
      bootroom_club_season: {
        Row: {
          club: string
          mean_value_usd: number | null
          playable: boolean | null
          player_count: number | null
          positions_covered: number | null
          tier: string | null
          top_player_value: number | null
          total_value_usd: number | null
          year: number
        }
        Insert: {
          club: string
          mean_value_usd?: number | null
          playable?: boolean | null
          player_count?: number | null
          positions_covered?: number | null
          tier?: string | null
          top_player_value?: number | null
          total_value_usd?: number | null
          year: number
        }
        Update: {
          club?: string
          mean_value_usd?: number | null
          playable?: boolean | null
          player_count?: number | null
          positions_covered?: number | null
          tier?: string | null
          top_player_value?: number | null
          total_value_usd?: number | null
          year?: number
        }
        Relationships: []
      }
      bootroom_event_log: {
        Row: {
          choice_taken: string | null
          event_id: string | null
          event_log_id: string
          save_id: string | null
          week: number | null
          year: number | null
        }
        Insert: {
          choice_taken?: string | null
          event_id?: string | null
          event_log_id?: string
          save_id?: string | null
          week?: number | null
          year?: number | null
        }
        Update: {
          choice_taken?: string | null
          event_id?: string | null
          event_log_id?: string
          save_id?: string | null
          week?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bootroom_event_log_save_id_fkey"
            columns: ["save_id"]
            isOneToOne: false
            referencedRelation: "bootroom_save"
            referencedColumns: ["save_id"]
          },
        ]
      }
      bootroom_facilities: {
        Row: {
          commercial_level: number | null
          medical_level: number | null
          save_id: string
          scout_depth: number | null
          scout_infra_level: number | null
          scout_reach: number | null
          scout_speed: number | null
          training_level: number | null
          upgrade_completes_year: number | null
          upgrade_in_progress: string | null
        }
        Insert: {
          commercial_level?: number | null
          medical_level?: number | null
          save_id: string
          scout_depth?: number | null
          scout_infra_level?: number | null
          scout_reach?: number | null
          scout_speed?: number | null
          training_level?: number | null
          upgrade_completes_year?: number | null
          upgrade_in_progress?: string | null
        }
        Update: {
          commercial_level?: number | null
          medical_level?: number | null
          save_id?: string
          scout_depth?: number | null
          scout_infra_level?: number | null
          scout_reach?: number | null
          scout_speed?: number | null
          training_level?: number | null
          upgrade_completes_year?: number | null
          upgrade_in_progress?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bootroom_facilities_save_id_fkey"
            columns: ["save_id"]
            isOneToOne: true
            referencedRelation: "bootroom_save"
            referencedColumns: ["save_id"]
          },
        ]
      }
      bootroom_formation_quota: {
        Row: {
          formation: string
          position: string
          quota: number
          starters: number
        }
        Insert: {
          formation: string
          position: string
          quota: number
          starters: number
        }
        Update: {
          formation?: string
          position?: string
          quota?: number
          starters?: number
        }
        Relationships: []
      }
      bootroom_match: {
        Row: {
          assists: Json | null
          goals_against: number | null
          goals_for: number | null
          is_home: boolean | null
          match_id: string
          opponent: string | null
          save_id: string | null
          scorers: Json | null
          week: number | null
          year: number | null
        }
        Insert: {
          assists?: Json | null
          goals_against?: number | null
          goals_for?: number | null
          is_home?: boolean | null
          match_id?: string
          opponent?: string | null
          save_id?: string | null
          scorers?: Json | null
          week?: number | null
          year?: number | null
        }
        Update: {
          assists?: Json | null
          goals_against?: number | null
          goals_for?: number | null
          is_home?: boolean | null
          match_id?: string
          opponent?: string | null
          save_id?: string | null
          scorers?: Json | null
          week?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bootroom_match_save_id_fkey"
            columns: ["save_id"]
            isOneToOne: false
            referencedRelation: "bootroom_save"
            referencedColumns: ["save_id"]
          },
        ]
      }
      bootroom_player_trajectory: {
        Row: {
          age: number | null
          career_first_year: number | null
          career_last_year: number | null
          club: string | null
          delta_y1_pct: number | null
          delta_y3_pct: number | null
          market_value_usd: number | null
          nationality: string | null
          peak_value: number | null
          peak_year: number | null
          player_name: string
          position: string
          reappears_after_y3: boolean | null
          trajectory_class: string | null
          value_y1: number | null
          value_y2: number | null
          value_y3: number | null
          year: number
        }
        Insert: {
          age?: number | null
          career_first_year?: number | null
          career_last_year?: number | null
          club?: string | null
          delta_y1_pct?: number | null
          delta_y3_pct?: number | null
          market_value_usd?: number | null
          nationality?: string | null
          peak_value?: number | null
          peak_year?: number | null
          player_name: string
          position: string
          reappears_after_y3?: boolean | null
          trajectory_class?: string | null
          value_y1?: number | null
          value_y2?: number | null
          value_y3?: number | null
          year: number
        }
        Update: {
          age?: number | null
          career_first_year?: number | null
          career_last_year?: number | null
          club?: string | null
          delta_y1_pct?: number | null
          delta_y3_pct?: number | null
          market_value_usd?: number | null
          nationality?: string | null
          peak_value?: number | null
          peak_year?: number | null
          player_name?: string
          position?: string
          reappears_after_y3?: boolean | null
          trajectory_class?: string | null
          value_y1?: number | null
          value_y2?: number | null
          value_y3?: number | null
          year?: number
        }
        Relationships: []
      }
      bootroom_position_year_pool: {
        Row: {
          age: number | null
          club: string | null
          market_value_usd: number | null
          nationality: string | null
          player_name: string
          position: string
          value_band: string | null
          year: number
        }
        Insert: {
          age?: number | null
          club?: string | null
          market_value_usd?: number | null
          nationality?: string | null
          player_name: string
          position: string
          value_band?: string | null
          year: number
        }
        Update: {
          age?: number | null
          club?: string | null
          market_value_usd?: number | null
          nationality?: string | null
          player_name?: string
          position?: string
          value_band?: string | null
          year?: number
        }
        Relationships: []
      }
      bootroom_save: {
        Row: {
          board_standing: number | null
          cash_usd: number | null
          club: string
          created_at: string | null
          current_week: number
          current_year: number
          heat: number | null
          integrity_flags: number | null
          market_rep: number | null
          player_trust: number | null
          save_id: string
          seed: number
          start_year: number
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          board_standing?: number | null
          cash_usd?: number | null
          club: string
          created_at?: string | null
          current_week?: number
          current_year: number
          heat?: number | null
          integrity_flags?: number | null
          market_rep?: number | null
          player_trust?: number | null
          save_id?: string
          seed: number
          start_year: number
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          board_standing?: number | null
          cash_usd?: number | null
          club?: string
          created_at?: string | null
          current_week?: number
          current_year?: number
          heat?: number | null
          integrity_flags?: number | null
          market_rep?: number | null
          player_trust?: number | null
          save_id?: string
          seed?: number
          start_year?: number
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bootroom_save_player: {
        Row: {
          acquired_fee_usd: number | null
          acquired_year: number | null
          age: number | null
          current_value_usd: number | null
          fitness: number | null
          form: number | null
          injured_until_week: number | null
          is_anchor: boolean | null
          is_starter: boolean | null
          morale: number | null
          nationality: string | null
          player_name: string
          position: string | null
          save_id: string
          squad_number: number | null
          wage_usd: number | null
        }
        Insert: {
          acquired_fee_usd?: number | null
          acquired_year?: number | null
          age?: number | null
          current_value_usd?: number | null
          fitness?: number | null
          form?: number | null
          injured_until_week?: number | null
          is_anchor?: boolean | null
          is_starter?: boolean | null
          morale?: number | null
          nationality?: string | null
          player_name: string
          position?: string | null
          save_id: string
          squad_number?: number | null
          wage_usd?: number | null
        }
        Update: {
          acquired_fee_usd?: number | null
          acquired_year?: number | null
          age?: number | null
          current_value_usd?: number | null
          fitness?: number | null
          form?: number | null
          injured_until_week?: number | null
          is_anchor?: boolean | null
          is_starter?: boolean | null
          morale?: number | null
          nationality?: string | null
          player_name?: string
          position?: string | null
          save_id?: string
          squad_number?: number | null
          wage_usd?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bootroom_save_player_save_id_fkey"
            columns: ["save_id"]
            isOneToOne: false
            referencedRelation: "bootroom_save"
            referencedColumns: ["save_id"]
          },
        ]
      }
      bootroom_scout_report: {
        Row: {
          ambiguous: boolean | null
          band_high: number | null
          band_low: number | null
          created_at: string | null
          created_week: number | null
          noise_seed: number | null
          player_name: string | null
          projected_delta: number | null
          report_id: string
          save_id: string | null
          scout_depth: number | null
          scouted_year: number | null
          verdict_text: string | null
        }
        Insert: {
          ambiguous?: boolean | null
          band_high?: number | null
          band_low?: number | null
          created_at?: string | null
          created_week?: number | null
          noise_seed?: number | null
          player_name?: string | null
          projected_delta?: number | null
          report_id?: string
          save_id?: string | null
          scout_depth?: number | null
          scouted_year?: number | null
          verdict_text?: string | null
        }
        Update: {
          ambiguous?: boolean | null
          band_high?: number | null
          band_low?: number | null
          created_at?: string | null
          created_week?: number | null
          noise_seed?: number | null
          player_name?: string | null
          projected_delta?: number | null
          report_id?: string
          save_id?: string | null
          scout_depth?: number | null
          scouted_year?: number | null
          verdict_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bootroom_scout_report_save_id_fkey"
            columns: ["save_id"]
            isOneToOne: false
            referencedRelation: "bootroom_save"
            referencedColumns: ["save_id"]
          },
        ]
      }
      bootroom_tier_bands: {
        Row: {
          tier: string
          value_band: string
          weight: number
        }
        Insert: {
          tier: string
          value_band: string
          weight: number
        }
        Update: {
          tier?: string
          value_band?: string
          weight?: number
        }
        Relationships: []
      }
      bootroom_trajectory_v2_candidate: {
        Row: {
          age: number | null
          cell_n: number | null
          class_v1: string | null
          class_v2: string | null
          club: string | null
          delta_y3_pct: number | null
          market_value_usd: number | null
          nationality: string | null
          player_name: string | null
          position: string | null
          pr: number | null
          v_millions: number | null
          value_band: string | null
          year: number | null
        }
        Insert: {
          age?: number | null
          cell_n?: number | null
          class_v1?: string | null
          class_v2?: string | null
          club?: string | null
          delta_y3_pct?: number | null
          market_value_usd?: number | null
          nationality?: string | null
          player_name?: string | null
          position?: string | null
          pr?: number | null
          v_millions?: number | null
          value_band?: string | null
          year?: number | null
        }
        Update: {
          age?: number | null
          cell_n?: number | null
          class_v1?: string | null
          class_v2?: string | null
          club?: string | null
          delta_y3_pct?: number | null
          market_value_usd?: number | null
          nationality?: string | null
          player_name?: string | null
          position?: string | null
          pr?: number | null
          v_millions?: number | null
          value_band?: string | null
          year?: number | null
        }
        Relationships: []
      }
      bootroom_transfer_log: {
        Row: {
          created_at: string | null
          direction: string | null
          fee_usd: number | null
          had_scout_report: boolean | null
          player_age: number | null
          player_name: string | null
          save_id: string | null
          scout_verdict: string | null
          transfer_id: string
          value_at_time: number | null
          year: number | null
        }
        Insert: {
          created_at?: string | null
          direction?: string | null
          fee_usd?: number | null
          had_scout_report?: boolean | null
          player_age?: number | null
          player_name?: string | null
          save_id?: string | null
          scout_verdict?: string | null
          transfer_id?: string
          value_at_time?: number | null
          year?: number | null
        }
        Update: {
          created_at?: string | null
          direction?: string | null
          fee_usd?: number | null
          had_scout_report?: boolean | null
          player_age?: number | null
          player_name?: string | null
          save_id?: string | null
          scout_verdict?: string | null
          transfer_id?: string
          value_at_time?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bootroom_transfer_log_save_id_fkey"
            columns: ["save_id"]
            isOneToOne: false
            referencedRelation: "bootroom_save"
            referencedColumns: ["save_id"]
          },
        ]
      }
      boxing_career_records: {
        Row: {
          boxer: string | null
          division: string | null
          draws: number | null
          height: string | null
          id: number
          ko_pct: number | null
          kos: number | null
          losses: number | null
          reach: string | null
          stance: string | null
          wins: number | null
        }
        Insert: {
          boxer?: string | null
          division?: string | null
          draws?: number | null
          height?: string | null
          id?: number
          ko_pct?: number | null
          kos?: number | null
          losses?: number | null
          reach?: string | null
          stance?: string | null
          wins?: number | null
        }
        Update: {
          boxer?: string | null
          division?: string | null
          draws?: number | null
          height?: string | null
          id?: number
          ko_pct?: number | null
          kos?: number | null
          losses?: number | null
          reach?: string | null
          stance?: string | null
          wins?: number | null
        }
        Relationships: []
      }
      boxing_champions: {
        Row: {
          champion_name: string
          id: number
          reign_end: string | null
          reign_start: string | null
          sanctioning_body: string | null
          weight_class: string
        }
        Insert: {
          champion_name: string
          id?: number
          reign_end?: string | null
          reign_start?: string | null
          sanctioning_body?: string | null
          weight_class: string
        }
        Update: {
          champion_name?: string
          id?: number
          reign_end?: string | null
          reign_start?: string | null
          sanctioning_body?: string | null
          weight_class?: string
        }
        Relationships: []
      }
      boxing_champions_v2: {
        Row: {
          champion: string | null
          country: string | null
          id: number
          notes: string | null
          organization: string | null
          reign_end: string | null
          reign_start: string | null
          weight_class: string | null
        }
        Insert: {
          champion?: string | null
          country?: string | null
          id?: number
          notes?: string | null
          organization?: string | null
          reign_end?: string | null
          reign_start?: string | null
          weight_class?: string | null
        }
        Update: {
          champion?: string | null
          country?: string | null
          id?: number
          notes?: string | null
          organization?: string | null
          reign_end?: string | null
          reign_start?: string | null
          weight_class?: string | null
        }
        Relationships: []
      }
      boxing_major_fights: {
        Row: {
          date: string | null
          fight_name: string | null
          id: number
          loser: string | null
          method: string | null
          round: number | null
          venue: string | null
          weight_class: string | null
          winner: string | null
        }
        Insert: {
          date?: string | null
          fight_name?: string | null
          id?: number
          loser?: string | null
          method?: string | null
          round?: number | null
          venue?: string | null
          weight_class?: string | null
          winner?: string | null
        }
        Update: {
          date?: string | null
          fight_name?: string | null
          id?: number
          loser?: string | null
          method?: string | null
          round?: number | null
          venue?: string | null
          weight_class?: string | null
          winner?: string | null
        }
        Relationships: []
      }
      boxing_title_fights: {
        Row: {
          fight_date: string | null
          fighter_1: string
          fighter_2: string
          id: number
          method: string | null
          round: number | null
          sanctioning_body: string | null
          venue: string | null
          weight_class: string | null
          winner: string | null
        }
        Insert: {
          fight_date?: string | null
          fighter_1: string
          fighter_2: string
          id?: number
          method?: string | null
          round?: number | null
          sanctioning_body?: string | null
          venue?: string | null
          weight_class?: string | null
          winner?: string | null
        }
        Update: {
          fight_date?: string | null
          fighter_1?: string
          fighter_2?: string
          id?: number
          method?: string | null
          round?: number | null
          sanctioning_body?: string | null
          venue?: string | null
          weight_class?: string | null
          winner?: string | null
        }
        Relationships: []
      }
      bref_nba_player_seasons: {
        Row: {
          age: number | null
          ast: number | null
          blk: number | null
          drb: number | null
          fg: number | null
          fg_pct: number | null
          fga: number | null
          ft: number | null
          ft_pct: number | null
          fta: number | null
          games: number | null
          games_started: number | null
          id: number
          minutes: number | null
          orb: number | null
          person_key: string | null
          pf: number | null
          player_name: string | null
          position: string | null
          pts: number | null
          season: string | null
          stl: number | null
          team: string | null
          three_p: number | null
          three_p_pct: number | null
          three_pa: number | null
          tov: number | null
          trb: number | null
        }
        Insert: {
          age?: number | null
          ast?: number | null
          blk?: number | null
          drb?: number | null
          fg?: number | null
          fg_pct?: number | null
          fga?: number | null
          ft?: number | null
          ft_pct?: number | null
          fta?: number | null
          games?: number | null
          games_started?: number | null
          id?: number
          minutes?: number | null
          orb?: number | null
          person_key?: string | null
          pf?: number | null
          player_name?: string | null
          position?: string | null
          pts?: number | null
          season?: string | null
          stl?: number | null
          team?: string | null
          three_p?: number | null
          three_p_pct?: number | null
          three_pa?: number | null
          tov?: number | null
          trb?: number | null
        }
        Update: {
          age?: number | null
          ast?: number | null
          blk?: number | null
          drb?: number | null
          fg?: number | null
          fg_pct?: number | null
          fga?: number | null
          ft?: number | null
          ft_pct?: number | null
          fta?: number | null
          games?: number | null
          games_started?: number | null
          id?: number
          minutes?: number | null
          orb?: number | null
          person_key?: string | null
          pf?: number | null
          player_name?: string | null
          position?: string | null
          pts?: number | null
          season?: string | null
          stl?: number | null
          team?: string | null
          three_p?: number | null
          three_p_pct?: number | null
          three_pa?: number | null
          tov?: number | null
          trb?: number | null
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
      career_records: {
        Row: {
          era_notes: string | null
          id: number
          league: string | null
          player_name: string
          rank: number | null
          sport: string
          stat_category: string
          stat_value: string | null
        }
        Insert: {
          era_notes?: string | null
          id?: number
          league?: string | null
          player_name: string
          rank?: number | null
          sport: string
          stat_category: string
          stat_value?: string | null
        }
        Update: {
          era_notes?: string | null
          id?: number
          league?: string | null
          player_name?: string
          rank?: number | null
          sport?: string
          stat_category?: string
          stat_value?: string | null
        }
        Relationships: []
      }
      career_seasons: {
        Row: {
          appearances: number
          assists: number | null
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
          appearances?: number
          assists?: number | null
          club: string
          created_at?: string
          goals?: number
          id?: string
          market_value?: number
          player_id: string
          season: string
          sort_order: number
        }
        Update: {
          appearances?: number
          assists?: number | null
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
      cbb_awards: {
        Row: {
          award_name: string
          division: string | null
          id: number
          player_name: string
          position: string | null
          team: string | null
          year: number
        }
        Insert: {
          award_name: string
          division?: string | null
          id?: number
          player_name: string
          position?: string | null
          team?: string | null
          year: number
        }
        Update: {
          award_name?: string
          division?: string | null
          id?: number
          player_name?: string
          position?: string | null
          team?: string | null
          year?: number
        }
        Relationships: []
      }
      cbb_conference_tournament_champions: {
        Row: {
          champion: string | null
          conference: string | null
          id: number
          mvp: string | null
          runner_up: string | null
          score: string | null
          year: number | null
        }
        Insert: {
          champion?: string | null
          conference?: string | null
          id?: number
          mvp?: string | null
          runner_up?: string | null
          score?: string | null
          year?: number | null
        }
        Update: {
          champion?: string | null
          conference?: string | null
          id?: number
          mvp?: string | null
          runner_up?: string | null
          score?: string | null
          year?: number | null
        }
        Relationships: []
      }
      cbb_daily: {
        Row: {
          created_at: string
          id: string
          program_id: string | null
          puzzle_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          program_id?: string | null
          puzzle_date: string
        }
        Update: {
          created_at?: string
          id?: string
          program_id?: string | null
          puzzle_date?: string
        }
        Relationships: []
      }
      cbb_naismith_winners: {
        Row: {
          gender: string | null
          id: number
          school: string | null
          winner: string | null
          year: number | null
        }
        Insert: {
          gender?: string | null
          id?: number
          school?: string | null
          winner?: string | null
          year?: number | null
        }
        Update: {
          gender?: string | null
          id?: number
          school?: string | null
          winner?: string | null
          year?: number | null
        }
        Relationships: []
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
          clues_used: number | null
          created_at: string
          guessed: boolean | null
          id: string
          mode: string | null
          puzzle_date: string | null
          score: number | null
        }
        Insert: {
          clues_used?: number | null
          created_at?: string
          guessed?: boolean | null
          id?: string
          mode?: string | null
          puzzle_date?: string | null
          score?: number | null
        }
        Update: {
          clues_used?: number | null
          created_at?: string
          guessed?: boolean | null
          id?: string
          mode?: string | null
          puzzle_date?: string | null
          score?: number | null
        }
        Relationships: []
      }
      cbb_wooden_award: {
        Row: {
          gender: string | null
          id: number
          school: string | null
          winner: string | null
          year: number | null
        }
        Insert: {
          gender?: string | null
          id?: number
          school?: string | null
          winner?: string | null
          year?: number | null
        }
        Update: {
          gender?: string | null
          id?: number
          school?: string | null
          winner?: string | null
          year?: number | null
        }
        Relationships: []
      }
      cfb_all_americans: {
        Row: {
          id: number
          player_name: string
          position: string | null
          school: string | null
          team_level: string | null
          year: number
        }
        Insert: {
          id?: number
          player_name: string
          position?: string | null
          school?: string | null
          team_level?: string | null
          year: number
        }
        Update: {
          id?: number
          player_name?: string
          position?: string | null
          school?: string | null
          team_level?: string | null
          year?: number
        }
        Relationships: []
      }
      cfb_ap_poll_final: {
        Row: {
          id: number
          rank: number | null
          record: string | null
          team: string | null
          year: number | null
        }
        Insert: {
          id?: number
          rank?: number | null
          record?: string | null
          team?: string | null
          year?: number | null
        }
        Update: {
          id?: number
          rank?: number | null
          record?: string | null
          team?: string | null
          year?: number | null
        }
        Relationships: []
      }
      cfb_awards: {
        Row: {
          award_name: string
          id: number
          notes: string | null
          player_name: string
          points: number | null
          position: string | null
          rank: number | null
          team: string | null
          year: number
        }
        Insert: {
          award_name: string
          id?: number
          notes?: string | null
          player_name: string
          points?: number | null
          position?: string | null
          rank?: number | null
          team?: string | null
          year: number
        }
        Update: {
          award_name?: string
          id?: number
          notes?: string | null
          player_name?: string
          points?: number | null
          position?: string | null
          rank?: number | null
          team?: string | null
          year?: number
        }
        Relationships: []
      }
      cfb_bowl_games: {
        Row: {
          bowl_name: string
          id: number
          loser: string | null
          loser_score: number | null
          mvp: string | null
          venue: string | null
          winner: string
          winner_score: number | null
          year: number
        }
        Insert: {
          bowl_name: string
          id?: number
          loser?: string | null
          loser_score?: number | null
          mvp?: string | null
          venue?: string | null
          winner: string
          winner_score?: number | null
          year: number
        }
        Update: {
          bowl_name?: string
          id?: number
          loser?: string | null
          loser_score?: number | null
          mvp?: string | null
          venue?: string | null
          winner?: string
          winner_score?: number | null
          year?: number
        }
        Relationships: []
      }
      cfb_bowl_results: {
        Row: {
          bowl_name: string | null
          id: number
          loser: string | null
          loser_score: number | null
          mvp: string | null
          winner: string | null
          winner_score: number | null
          year: number | null
        }
        Insert: {
          bowl_name?: string | null
          id?: number
          loser?: string | null
          loser_score?: number | null
          mvp?: string | null
          winner?: string | null
          winner_score?: number | null
          year?: number | null
        }
        Update: {
          bowl_name?: string | null
          id?: number
          loser?: string | null
          loser_score?: number | null
          mvp?: string | null
          winner?: string | null
          winner_score?: number | null
          year?: number | null
        }
        Relationships: []
      }
      cfb_champions: {
        Row: {
          champion: string | null
          coach: string | null
          id: number
          record: string | null
          selector: string | null
          year: number | null
        }
        Insert: {
          champion?: string | null
          coach?: string | null
          id?: number
          record?: string | null
          selector?: string | null
          year?: number | null
        }
        Update: {
          champion?: string | null
          coach?: string | null
          id?: number
          record?: string | null
          selector?: string | null
          year?: number | null
        }
        Relationships: []
      }
      cfb_heisman_winners: {
        Row: {
          class: string | null
          id: number
          position: string | null
          school: string | null
          winner: string | null
          year: number | null
        }
        Insert: {
          class?: string | null
          id?: number
          position?: string | null
          school?: string | null
          winner?: string | null
          year?: number | null
        }
        Update: {
          class?: string | null
          id?: number
          position?: string | null
          school?: string | null
          winner?: string | null
          year?: number | null
        }
        Relationships: []
      }
      cfb_national_champions: {
        Row: {
          champion: string
          coach: string | null
          id: number
          record: string | null
          selector: string | null
          year: number
        }
        Insert: {
          champion: string
          coach?: string | null
          id?: number
          record?: string | null
          selector?: string | null
          year: number
        }
        Update: {
          champion?: string
          coach?: string | null
          id?: number
          record?: string | null
          selector?: string | null
          year?: number
        }
        Relationships: []
      }
      cfb_qb_stats: {
        Row: {
          games: number | null
          pass_adj_yds_per_att: number | null
          pass_att: number | null
          pass_cmp: number | null
          pass_cmp_pct: number | null
          pass_inc: number | null
          pass_int: number | null
          pass_int_pct: number | null
          pass_rating: number | null
          pass_td: number | null
          pass_td_pct: number | null
          pass_yds: number | null
          pass_yds_per_att: number | null
          pass_yds_per_cmp: number | null
          pass_yds_per_g: number | null
          player_name: string
          player_slug: string | null
          pos: string | null
          rk: number
          schools: string | null
          year_max: number | null
          year_min: number | null
        }
        Insert: {
          games?: number | null
          pass_adj_yds_per_att?: number | null
          pass_att?: number | null
          pass_cmp?: number | null
          pass_cmp_pct?: number | null
          pass_inc?: number | null
          pass_int?: number | null
          pass_int_pct?: number | null
          pass_rating?: number | null
          pass_td?: number | null
          pass_td_pct?: number | null
          pass_yds?: number | null
          pass_yds_per_att?: number | null
          pass_yds_per_cmp?: number | null
          pass_yds_per_g?: number | null
          player_name: string
          player_slug?: string | null
          pos?: string | null
          rk: number
          schools?: string | null
          year_max?: number | null
          year_min?: number | null
        }
        Update: {
          games?: number | null
          pass_adj_yds_per_att?: number | null
          pass_att?: number | null
          pass_cmp?: number | null
          pass_cmp_pct?: number | null
          pass_inc?: number | null
          pass_int?: number | null
          pass_int_pct?: number | null
          pass_rating?: number | null
          pass_td?: number | null
          pass_td_pct?: number | null
          pass_yds?: number | null
          pass_yds_per_att?: number | null
          pass_yds_per_cmp?: number | null
          pass_yds_per_g?: number | null
          player_name?: string
          player_slug?: string | null
          pos?: string | null
          rk?: number
          schools?: string | null
          year_max?: number | null
          year_min?: number | null
        }
        Relationships: []
      }
      cfb_rankings: {
        Row: {
          conference: string | null
          id: number
          is_final: boolean | null
          poll_name: string
          rank: number
          record: string | null
          team: string
          year: number
        }
        Insert: {
          conference?: string | null
          id?: number
          is_final?: boolean | null
          poll_name: string
          rank: number
          record?: string | null
          team: string
          year: number
        }
        Update: {
          conference?: string | null
          id?: number
          is_final?: boolean | null
          poll_name?: string
          rank?: number
          record?: string | null
          team?: string
          year?: number
        }
        Relationships: []
      }
      cfb_rb_stats: {
        Row: {
          games: number | null
          player_name: string
          player_slug: string | null
          pos: string | null
          rk: number
          rush_att: number | null
          rush_td: number | null
          rush_yds: number | null
          rush_yds_per_att: number | null
          rush_yds_per_g: number | null
          schools: string | null
          year_max: number | null
          year_min: number | null
        }
        Insert: {
          games?: number | null
          player_name: string
          player_slug?: string | null
          pos?: string | null
          rk: number
          rush_att?: number | null
          rush_td?: number | null
          rush_yds?: number | null
          rush_yds_per_att?: number | null
          rush_yds_per_g?: number | null
          schools?: string | null
          year_max?: number | null
          year_min?: number | null
        }
        Update: {
          games?: number | null
          player_name?: string
          player_slug?: string | null
          pos?: string | null
          rk?: number
          rush_att?: number | null
          rush_td?: number | null
          rush_yds?: number | null
          rush_yds_per_att?: number | null
          rush_yds_per_g?: number | null
          schools?: string | null
          year_max?: number | null
          year_min?: number | null
        }
        Relationships: []
      }
      college_athletic_facts: {
        Row: {
          basketball_arena: string | null
          city: string | null
          colors: string | null
          conference: string | null
          enrollment: number | null
          fight_song: string | null
          football_stadium: string | null
          football_stadium_capacity: number | null
          founded: number | null
          full_university_name: string | null
          head_basketball_coach: string | null
          head_football_coach: string | null
          id: number
          mascot: string | null
          national_championships: string | null
          nickname: string | null
          notable_alumni: string | null
          rivals: string | null
          school_name: string | null
          state: string | null
          wiki_url: string | null
        }
        Insert: {
          basketball_arena?: string | null
          city?: string | null
          colors?: string | null
          conference?: string | null
          enrollment?: number | null
          fight_song?: string | null
          football_stadium?: string | null
          football_stadium_capacity?: number | null
          founded?: number | null
          full_university_name?: string | null
          head_basketball_coach?: string | null
          head_football_coach?: string | null
          id?: number
          mascot?: string | null
          national_championships?: string | null
          nickname?: string | null
          notable_alumni?: string | null
          rivals?: string | null
          school_name?: string | null
          state?: string | null
          wiki_url?: string | null
        }
        Update: {
          basketball_arena?: string | null
          city?: string | null
          colors?: string | null
          conference?: string | null
          enrollment?: number | null
          fight_song?: string | null
          football_stadium?: string | null
          football_stadium_capacity?: number | null
          founded?: number | null
          full_university_name?: string | null
          head_basketball_coach?: string | null
          head_football_coach?: string | null
          id?: number
          mascot?: string | null
          national_championships?: string | null
          nickname?: string | null
          notable_alumni?: string | null
          rivals?: string | null
          school_name?: string | null
          state?: string | null
          wiki_url?: string | null
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
      conference_championships: {
        Row: {
          conference: string
          id: number
          loser: string | null
          mvp: string | null
          score: string | null
          sport: string
          winner: string
          year: number
        }
        Insert: {
          conference: string
          id?: number
          loser?: string | null
          mvp?: string | null
          score?: string | null
          sport: string
          winner: string
          year: number
        }
        Update: {
          conference?: string
          id?: number
          loser?: string | null
          mvp?: string | null
          score?: string | null
          sport?: string
          winner?: string
          year?: number
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
      connections_puzzles_auto_backup: {
        Row: {
          created_at: string | null
          groups_json: Json | null
          id: string | null
          puzzle_id: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          groups_json?: Json | null
          id?: string | null
          puzzle_id?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          groups_json?: Json | null
          id?: string | null
          puzzle_id?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      cricket_championships: {
        Row: {
          competition: string | null
          host: string | null
          id: number
          player_of_tournament: string | null
          runner_up: string | null
          winner: string | null
          year: number | null
        }
        Insert: {
          competition?: string | null
          host?: string | null
          id?: number
          player_of_tournament?: string | null
          runner_up?: string | null
          winner?: string | null
          year?: number | null
        }
        Update: {
          competition?: string | null
          host?: string | null
          id?: number
          player_of_tournament?: string | null
          runner_up?: string | null
          winner?: string | null
          year?: number | null
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
          date: string
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
          created_at: string
          date: string
          game_slug: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          game_slug: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          game_slug?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_polls: {
        Row: {
          created_at: string
          id: number
          option_a: string
          option_a_emoji: string
          option_a_flag: string | null
          option_b: string
          option_b_emoji: string
          option_b_flag: string | null
          option_c: string | null
          option_c_emoji: string | null
          option_c_flag: string | null
          option_d: string | null
          option_d_emoji: string | null
          option_d_flag: string | null
          poll_date: string
          poll_key: string
          question: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: never
          option_a: string
          option_a_emoji?: string
          option_a_flag?: string | null
          option_b: string
          option_b_emoji?: string
          option_b_flag?: string | null
          option_c?: string | null
          option_c_emoji?: string | null
          option_c_flag?: string | null
          option_d?: string | null
          option_d_emoji?: string | null
          option_d_flag?: string | null
          poll_date: string
          poll_key: string
          question: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: never
          option_a?: string
          option_a_emoji?: string
          option_a_flag?: string | null
          option_b?: string
          option_b_emoji?: string
          option_b_flag?: string | null
          option_c?: string | null
          option_c_emoji?: string | null
          option_c_flag?: string | null
          option_d?: string | null
          option_d_emoji?: string | null
          option_d_flag?: string | null
          poll_date?: string
          poll_key?: string
          question?: string
          sort_order?: number
        }
        Relationships: []
      }
      esports_championships: {
        Row: {
          champion: string | null
          country: string | null
          event: string | null
          game: string | null
          id: number
          prize_pool: string | null
          runner_up: string | null
          year: number | null
        }
        Insert: {
          champion?: string | null
          country?: string | null
          event?: string | null
          game?: string | null
          id?: number
          prize_pool?: string | null
          runner_up?: string | null
          year?: number | null
        }
        Update: {
          champion?: string | null
          country?: string | null
          event?: string | null
          game?: string | null
          id?: number
          prize_pool?: string | null
          runner_up?: string | null
          year?: number | null
        }
        Relationships: []
      }
      f1_constructors: {
        Row: {
          constructor_name: string
          id: number
          nationality: string | null
          podiums: number | null
          points: number | null
          poles: number | null
          races: number | null
          since: number | null
          wcc_titles: number | null
          win_pct: number | null
          wins: number | null
        }
        Insert: {
          constructor_name: string
          id?: number
          nationality?: string | null
          podiums?: number | null
          points?: number | null
          poles?: number | null
          races?: number | null
          since?: number | null
          wcc_titles?: number | null
          win_pct?: number | null
          wins?: number | null
        }
        Update: {
          constructor_name?: string
          id?: number
          nationality?: string | null
          podiums?: number | null
          points?: number | null
          poles?: number | null
          races?: number | null
          since?: number | null
          wcc_titles?: number | null
          win_pct?: number | null
          wins?: number | null
        }
        Relationships: []
      }
      f1_constructors_full: {
        Row: {
          constructor_id: string | null
          id: number
          name: string | null
          nationality: string | null
          url: string | null
        }
        Insert: {
          constructor_id?: string | null
          id?: number
          name?: string | null
          nationality?: string | null
          url?: string | null
        }
        Update: {
          constructor_id?: string | null
          id?: number
          name?: string | null
          nationality?: string | null
          url?: string | null
        }
        Relationships: []
      }
      f1_driver_standings: {
        Row: {
          constructor_id: string | null
          constructor_name: string | null
          driver_id: string | null
          driver_name: string | null
          id: number
          points: number | null
          position: number | null
          season: number | null
          wins: number | null
        }
        Insert: {
          constructor_id?: string | null
          constructor_name?: string | null
          driver_id?: string | null
          driver_name?: string | null
          id?: number
          points?: number | null
          position?: number | null
          season?: number | null
          wins?: number | null
        }
        Update: {
          constructor_id?: string | null
          constructor_name?: string | null
          driver_id?: string | null
          driver_name?: string | null
          id?: number
          points?: number | null
          position?: number | null
          season?: number | null
          wins?: number | null
        }
        Relationships: []
      }
      f1_drivers: {
        Row: {
          current_team: string | null
          driver_name: string
          id: number
          nationality: string | null
          podiums: number | null
          points: number | null
          poles: number | null
          races: number | null
          wdc_titles: number | null
          win_pct: number | null
          wins: number | null
        }
        Insert: {
          current_team?: string | null
          driver_name: string
          id?: number
          nationality?: string | null
          podiums?: number | null
          points?: number | null
          poles?: number | null
          races?: number | null
          wdc_titles?: number | null
          win_pct?: number | null
          wins?: number | null
        }
        Update: {
          current_team?: string | null
          driver_name?: string
          id?: number
          nationality?: string | null
          podiums?: number | null
          points?: number | null
          poles?: number | null
          races?: number | null
          wdc_titles?: number | null
          win_pct?: number | null
          wins?: number | null
        }
        Relationships: []
      }
      f1_drivers_full: {
        Row: {
          code: string | null
          date_of_birth: string | null
          driver_id: string | null
          family_name: string | null
          given_name: string | null
          id: number
          nationality: string | null
          number: number | null
          url: string | null
        }
        Insert: {
          code?: string | null
          date_of_birth?: string | null
          driver_id?: string | null
          family_name?: string | null
          given_name?: string | null
          id?: number
          nationality?: string | null
          number?: number | null
          url?: string | null
        }
        Update: {
          code?: string | null
          date_of_birth?: string | null
          driver_id?: string | null
          family_name?: string | null
          given_name?: string | null
          id?: number
          nationality?: string | null
          number?: number | null
          url?: string | null
        }
        Relationships: []
      }
      f1_race_results: {
        Row: {
          constructor: string | null
          grand_prix: string | null
          round: number | null
          winning_driver: string | null
          year: number | null
        }
        Insert: {
          constructor?: string | null
          grand_prix?: string | null
          round?: number | null
          winning_driver?: string | null
          year?: number | null
        }
        Update: {
          constructor?: string | null
          grand_prix?: string | null
          round?: number | null
          winning_driver?: string | null
          year?: number | null
        }
        Relationships: []
      }
      fantasy_draft_daily: {
        Row: {
          created_at: string
          criteria: string
          puzzle_date: string
        }
        Insert: {
          created_at?: string
          criteria: string
          puzzle_date: string
        }
        Update: {
          created_at?: string
          criteria?: string
          puzzle_date?: string
        }
        Relationships: []
      }
      fantasy_draft_players: {
        Row: {
          age: number | null
          created_at: string
          dominant_foot: string
          id: string
          market_value_millions: number
          name: string
          nationality: string
          position: string
        }
        Insert: {
          age?: number | null
          created_at?: string
          dominant_foot: string
          id?: string
          market_value_millions?: number
          name: string
          nationality: string
          position: string
        }
        Update: {
          age?: number | null
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
          user_id: string
          voted_team: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          voted_team: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
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
      game_completions: {
        Row: {
          completed_on: string
          created_at: string
          game: string
          id: number
          player_name: string | null
          score: number | null
        }
        Insert: {
          completed_on?: string
          created_at?: string
          game: string
          id?: never
          player_name?: string | null
          score?: number | null
        }
        Update: {
          completed_on?: string
          created_at?: string
          game?: string
          id?: never
          player_name?: string | null
          score?: number | null
        }
        Relationships: []
      }
      golf_awards: {
        Row: {
          award_name: string
          id: number
          nationality: string | null
          tour: string | null
          winner_name: string
          year: number
        }
        Insert: {
          award_name: string
          id?: number
          nationality?: string | null
          tour?: string | null
          winner_name: string
          year: number
        }
        Update: {
          award_name?: string
          id?: number
          nationality?: string | null
          tour?: string | null
          winner_name?: string
          year?: number
        }
        Relationships: []
      }
      golf_major_results: {
        Row: {
          country: string | null
          id: number
          runner_up: string | null
          score: string | null
          tournament: string | null
          venue: string | null
          winner: string | null
          year: number | null
        }
        Insert: {
          country?: string | null
          id?: number
          runner_up?: string | null
          score?: string | null
          tournament?: string | null
          venue?: string | null
          winner?: string | null
          year?: number | null
        }
        Update: {
          country?: string | null
          id?: number
          runner_up?: string | null
          score?: string | null
          tournament?: string | null
          venue?: string | null
          winner?: string | null
          year?: number | null
        }
        Relationships: []
      }
      golf_majors: {
        Row: {
          id: number
          nationality: string | null
          player_name: string
          rank: number | null
          score: string | null
          tour: string | null
          tournament: string
          venue: string | null
          year: number
        }
        Insert: {
          id?: number
          nationality?: string | null
          player_name: string
          rank?: number | null
          score?: string | null
          tour?: string | null
          tournament: string
          venue?: string | null
          year: number
        }
        Update: {
          id?: number
          nationality?: string | null
          player_name?: string
          rank?: number | null
          score?: string | null
          tour?: string | null
          tournament?: string
          venue?: string | null
          year?: number
        }
        Relationships: []
      }
      golf_majors_bak_20260715: {
        Row: {
          id: number | null
          nationality: string | null
          player_name: string | null
          rank: number | null
          score: string | null
          tour: string | null
          tournament: string | null
          venue: string | null
          year: number | null
        }
        Insert: {
          id?: number | null
          nationality?: string | null
          player_name?: string | null
          rank?: number | null
          score?: string | null
          tour?: string | null
          tournament?: string | null
          venue?: string | null
          year?: number | null
        }
        Update: {
          id?: number | null
          nationality?: string | null
          player_name?: string | null
          rank?: number | null
          score?: string | null
          tour?: string | null
          tournament?: string | null
          venue?: string | null
          year?: number | null
        }
        Relationships: []
      }
      golf_team_events: {
        Row: {
          event_name: string
          id: number
          loser: string | null
          score: string | null
          venue: string | null
          winner: string
          year: number
        }
        Insert: {
          event_name: string
          id?: number
          loser?: string | null
          score?: string | null
          venue?: string | null
          winner: string
          year: number
        }
        Update: {
          event_name?: string
          id?: number
          loser?: string | null
          score?: string | null
          venue?: string | null
          winner?: string
          year?: number
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
      hall_of_fame: {
        Row: {
          id: number
          inductee: string | null
          position_or_role: string | null
          primary_team: string | null
          sport: string | null
          year_inducted: number | null
        }
        Insert: {
          id?: number
          inductee?: string | null
          position_or_role?: string | null
          primary_team?: string | null
          sport?: string | null
          year_inducted?: number | null
        }
        Update: {
          id?: number
          inductee?: string | null
          position_or_role?: string | null
          primary_team?: string | null
          sport?: string | null
          year_inducted?: number | null
        }
        Relationships: []
      }
      halls_of_fame: {
        Row: {
          category: string | null
          hof_name: string
          id: number
          inductee_name: string
          position_or_role: string | null
          primary_team: string | null
          year_inducted: number
        }
        Insert: {
          category?: string | null
          hof_name: string
          id?: number
          inductee_name: string
          position_or_role?: string | null
          primary_team?: string | null
          year_inducted: number
        }
        Update: {
          category?: string | null
          hof_name?: string
          id?: number
          inductee_name?: string
          position_or_role?: string | null
          primary_team?: string | null
          year_inducted?: number
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
      href_nhl_player_seasons: {
        Row: {
          age: number | null
          assists: number | null
          games: number | null
          goals: number | null
          gwg: number | null
          id: number
          person_key: string | null
          pim: number | null
          player_name: string | null
          plus_minus: number | null
          points: number | null
          position: string | null
          ppg: number | null
          season: string | null
          shg: number | null
          shot_pct: number | null
          shots: number | null
          team: string | null
        }
        Insert: {
          age?: number | null
          assists?: number | null
          games?: number | null
          goals?: number | null
          gwg?: number | null
          id?: number
          person_key?: string | null
          pim?: number | null
          player_name?: string | null
          plus_minus?: number | null
          points?: number | null
          position?: string | null
          ppg?: number | null
          season?: string | null
          shg?: number | null
          shot_pct?: number | null
          shots?: number | null
          team?: string | null
        }
        Update: {
          age?: number | null
          assists?: number | null
          games?: number | null
          goals?: number | null
          gwg?: number | null
          id?: number
          person_key?: string | null
          pim?: number | null
          player_name?: string | null
          plus_minus?: number | null
          points?: number | null
          position?: string | null
          ppg?: number | null
          season?: string | null
          shg?: number | null
          shot_pct?: number | null
          shots?: number | null
          team?: string | null
        }
        Relationships: []
      }
      individual_awards_v2: {
        Row: {
          award_name: string | null
          id: number
          position: string | null
          sport: string | null
          team: string | null
          winner: string | null
          year: number | null
        }
        Insert: {
          award_name?: string | null
          id?: number
          position?: string | null
          sport?: string | null
          team?: string | null
          winner?: string | null
          year?: number | null
        }
        Update: {
          award_name?: string | null
          id?: number
          position?: string | null
          sport?: string | null
          team?: string | null
          winner?: string | null
          year?: number | null
        }
        Relationships: []
      }
      lahman_allstar: {
        Row: {
          gameid: string | null
          gamenum: number | null
          gp: number | null
          id: number
          lgid: string | null
          playerid: string | null
          startingpos: number | null
          teamid: string | null
          yearid: number | null
        }
        Insert: {
          gameid?: string | null
          gamenum?: number | null
          gp?: number | null
          id?: number
          lgid?: string | null
          playerid?: string | null
          startingpos?: number | null
          teamid?: string | null
          yearid?: number | null
        }
        Update: {
          gameid?: string | null
          gamenum?: number | null
          gp?: number | null
          id?: number
          lgid?: string | null
          playerid?: string | null
          startingpos?: number | null
          teamid?: string | null
          yearid?: number | null
        }
        Relationships: []
      }
      lahman_appearances: {
        Row: {
          g_1b: number | null
          g_2b: number | null
          g_3b: number | null
          g_all: number | null
          g_batting: number | null
          g_c: number | null
          g_cf: number | null
          g_defense: number | null
          g_dh: number | null
          g_lf: number | null
          g_of: number | null
          g_p: number | null
          g_ph: number | null
          g_pr: number | null
          g_rf: number | null
          g_ss: number | null
          gs: number | null
          id: number
          lgid: string | null
          playerid: string | null
          teamid: string | null
          yearid: number | null
        }
        Insert: {
          g_1b?: number | null
          g_2b?: number | null
          g_3b?: number | null
          g_all?: number | null
          g_batting?: number | null
          g_c?: number | null
          g_cf?: number | null
          g_defense?: number | null
          g_dh?: number | null
          g_lf?: number | null
          g_of?: number | null
          g_p?: number | null
          g_ph?: number | null
          g_pr?: number | null
          g_rf?: number | null
          g_ss?: number | null
          gs?: number | null
          id?: number
          lgid?: string | null
          playerid?: string | null
          teamid?: string | null
          yearid?: number | null
        }
        Update: {
          g_1b?: number | null
          g_2b?: number | null
          g_3b?: number | null
          g_all?: number | null
          g_batting?: number | null
          g_c?: number | null
          g_cf?: number | null
          g_defense?: number | null
          g_dh?: number | null
          g_lf?: number | null
          g_of?: number | null
          g_p?: number | null
          g_ph?: number | null
          g_pr?: number | null
          g_rf?: number | null
          g_ss?: number | null
          gs?: number | null
          id?: number
          lgid?: string | null
          playerid?: string | null
          teamid?: string | null
          yearid?: number | null
        }
        Relationships: []
      }
      lahman_awards_managers: {
        Row: {
          awardid: string | null
          id: number
          lgid: string | null
          notes: string | null
          playerid: string | null
          tie: string | null
          yearid: number | null
        }
        Insert: {
          awardid?: string | null
          id?: number
          lgid?: string | null
          notes?: string | null
          playerid?: string | null
          tie?: string | null
          yearid?: number | null
        }
        Update: {
          awardid?: string | null
          id?: number
          lgid?: string | null
          notes?: string | null
          playerid?: string | null
          tie?: string | null
          yearid?: number | null
        }
        Relationships: []
      }
      lahman_awards_players: {
        Row: {
          awardid: string | null
          id: number
          lgid: string | null
          notes: string | null
          playerid: string | null
          tie: string | null
          yearid: number | null
        }
        Insert: {
          awardid?: string | null
          id?: number
          lgid?: string | null
          notes?: string | null
          playerid?: string | null
          tie?: string | null
          yearid?: number | null
        }
        Update: {
          awardid?: string | null
          id?: number
          lgid?: string | null
          notes?: string | null
          playerid?: string | null
          tie?: string | null
          yearid?: number | null
        }
        Relationships: []
      }
      lahman_awards_share_managers: {
        Row: {
          awardid: string | null
          id: number
          lgid: string | null
          playerid: string | null
          pointsmax: number | null
          pointswon: number | null
          votesfirst: number | null
          yearid: number | null
        }
        Insert: {
          awardid?: string | null
          id?: number
          lgid?: string | null
          playerid?: string | null
          pointsmax?: number | null
          pointswon?: number | null
          votesfirst?: number | null
          yearid?: number | null
        }
        Update: {
          awardid?: string | null
          id?: number
          lgid?: string | null
          playerid?: string | null
          pointsmax?: number | null
          pointswon?: number | null
          votesfirst?: number | null
          yearid?: number | null
        }
        Relationships: []
      }
      lahman_awards_share_players: {
        Row: {
          awardid: string | null
          id: number
          lgid: string | null
          playerid: string | null
          pointsmax: number | null
          pointswon: number | null
          votesfirst: number | null
          yearid: number | null
        }
        Insert: {
          awardid?: string | null
          id?: number
          lgid?: string | null
          playerid?: string | null
          pointsmax?: number | null
          pointswon?: number | null
          votesfirst?: number | null
          yearid?: number | null
        }
        Update: {
          awardid?: string | null
          id?: number
          lgid?: string | null
          playerid?: string | null
          pointsmax?: number | null
          pointswon?: number | null
          votesfirst?: number | null
          yearid?: number | null
        }
        Relationships: []
      }
      lahman_batting: {
        Row: {
          ab: number | null
          bb: number | null
          cs: number | null
          doubles: number | null
          g: number | null
          gidp: number | null
          h: number | null
          hbp: number | null
          hr: number | null
          ibb: number | null
          id: number
          lgid: string | null
          playerid: string | null
          r: number | null
          rbi: number | null
          sb: number | null
          sf: number | null
          sh: number | null
          so: number | null
          stint: number | null
          teamid: string | null
          triples: number | null
          yearid: number | null
        }
        Insert: {
          ab?: number | null
          bb?: number | null
          cs?: number | null
          doubles?: number | null
          g?: number | null
          gidp?: number | null
          h?: number | null
          hbp?: number | null
          hr?: number | null
          ibb?: number | null
          id?: number
          lgid?: string | null
          playerid?: string | null
          r?: number | null
          rbi?: number | null
          sb?: number | null
          sf?: number | null
          sh?: number | null
          so?: number | null
          stint?: number | null
          teamid?: string | null
          triples?: number | null
          yearid?: number | null
        }
        Update: {
          ab?: number | null
          bb?: number | null
          cs?: number | null
          doubles?: number | null
          g?: number | null
          gidp?: number | null
          h?: number | null
          hbp?: number | null
          hr?: number | null
          ibb?: number | null
          id?: number
          lgid?: string | null
          playerid?: string | null
          r?: number | null
          rbi?: number | null
          sb?: number | null
          sf?: number | null
          sh?: number | null
          so?: number | null
          stint?: number | null
          teamid?: string | null
          triples?: number | null
          yearid?: number | null
        }
        Relationships: []
      }
      lahman_batting_post: {
        Row: {
          ab: number | null
          bb: number | null
          cs: number | null
          doubles: number | null
          g: number | null
          gidp: number | null
          h: number | null
          hbp: number | null
          hr: number | null
          ibb: number | null
          id: number
          lgid: string | null
          playerid: string | null
          r: number | null
          rbi: number | null
          round: string | null
          sb: number | null
          sf: number | null
          sh: number | null
          so: number | null
          teamid: string | null
          triples: number | null
          yearid: number | null
        }
        Insert: {
          ab?: number | null
          bb?: number | null
          cs?: number | null
          doubles?: number | null
          g?: number | null
          gidp?: number | null
          h?: number | null
          hbp?: number | null
          hr?: number | null
          ibb?: number | null
          id?: number
          lgid?: string | null
          playerid?: string | null
          r?: number | null
          rbi?: number | null
          round?: string | null
          sb?: number | null
          sf?: number | null
          sh?: number | null
          so?: number | null
          teamid?: string | null
          triples?: number | null
          yearid?: number | null
        }
        Update: {
          ab?: number | null
          bb?: number | null
          cs?: number | null
          doubles?: number | null
          g?: number | null
          gidp?: number | null
          h?: number | null
          hbp?: number | null
          hr?: number | null
          ibb?: number | null
          id?: number
          lgid?: string | null
          playerid?: string | null
          r?: number | null
          rbi?: number | null
          round?: string | null
          sb?: number | null
          sf?: number | null
          sh?: number | null
          so?: number | null
          teamid?: string | null
          triples?: number | null
          yearid?: number | null
        }
        Relationships: []
      }
      lahman_college_playing: {
        Row: {
          id: number
          playerid: string | null
          schoolid: string | null
          yearid: number | null
        }
        Insert: {
          id?: number
          playerid?: string | null
          schoolid?: string | null
          yearid?: number | null
        }
        Update: {
          id?: number
          playerid?: string | null
          schoolid?: string | null
          yearid?: number | null
        }
        Relationships: []
      }
      lahman_fielding: {
        Row: {
          a: number | null
          cs: number | null
          dp: number | null
          e: number | null
          g: number | null
          gs: number | null
          id: number
          innouts: number | null
          lgid: string | null
          pb: number | null
          playerid: string | null
          po: number | null
          pos: string | null
          sb: number | null
          stint: number | null
          teamid: string | null
          wp: number | null
          yearid: number | null
          zr: number | null
        }
        Insert: {
          a?: number | null
          cs?: number | null
          dp?: number | null
          e?: number | null
          g?: number | null
          gs?: number | null
          id?: number
          innouts?: number | null
          lgid?: string | null
          pb?: number | null
          playerid?: string | null
          po?: number | null
          pos?: string | null
          sb?: number | null
          stint?: number | null
          teamid?: string | null
          wp?: number | null
          yearid?: number | null
          zr?: number | null
        }
        Update: {
          a?: number | null
          cs?: number | null
          dp?: number | null
          e?: number | null
          g?: number | null
          gs?: number | null
          id?: number
          innouts?: number | null
          lgid?: string | null
          pb?: number | null
          playerid?: string | null
          po?: number | null
          pos?: string | null
          sb?: number | null
          stint?: number | null
          teamid?: string | null
          wp?: number | null
          yearid?: number | null
          zr?: number | null
        }
        Relationships: []
      }
      lahman_fielding_of: {
        Row: {
          gcf: number | null
          glf: number | null
          grf: number | null
          id: number
          playerid: string | null
          stint: number | null
          yearid: number | null
        }
        Insert: {
          gcf?: number | null
          glf?: number | null
          grf?: number | null
          id?: number
          playerid?: string | null
          stint?: number | null
          yearid?: number | null
        }
        Update: {
          gcf?: number | null
          glf?: number | null
          grf?: number | null
          id?: number
          playerid?: string | null
          stint?: number | null
          yearid?: number | null
        }
        Relationships: []
      }
      lahman_fielding_of_split: {
        Row: {
          a: number | null
          cs: number | null
          dp: number | null
          e: number | null
          g: number | null
          gs: number | null
          id: number
          innouts: number | null
          lgid: string | null
          pb: number | null
          playerid: string | null
          po: number | null
          pos: string | null
          sb: number | null
          stint: number | null
          teamid: string | null
          wp: number | null
          yearid: number | null
          zr: number | null
        }
        Insert: {
          a?: number | null
          cs?: number | null
          dp?: number | null
          e?: number | null
          g?: number | null
          gs?: number | null
          id?: number
          innouts?: number | null
          lgid?: string | null
          pb?: number | null
          playerid?: string | null
          po?: number | null
          pos?: string | null
          sb?: number | null
          stint?: number | null
          teamid?: string | null
          wp?: number | null
          yearid?: number | null
          zr?: number | null
        }
        Update: {
          a?: number | null
          cs?: number | null
          dp?: number | null
          e?: number | null
          g?: number | null
          gs?: number | null
          id?: number
          innouts?: number | null
          lgid?: string | null
          pb?: number | null
          playerid?: string | null
          po?: number | null
          pos?: string | null
          sb?: number | null
          stint?: number | null
          teamid?: string | null
          wp?: number | null
          yearid?: number | null
          zr?: number | null
        }
        Relationships: []
      }
      lahman_fielding_post: {
        Row: {
          a: number | null
          cs: number | null
          dp: number | null
          e: number | null
          g: number | null
          gs: number | null
          id: number
          innouts: number | null
          lgid: string | null
          pb: number | null
          playerid: string | null
          po: number | null
          pos: string | null
          round: string | null
          sb: number | null
          teamid: string | null
          tp: number | null
          yearid: number | null
        }
        Insert: {
          a?: number | null
          cs?: number | null
          dp?: number | null
          e?: number | null
          g?: number | null
          gs?: number | null
          id?: number
          innouts?: number | null
          lgid?: string | null
          pb?: number | null
          playerid?: string | null
          po?: number | null
          pos?: string | null
          round?: string | null
          sb?: number | null
          teamid?: string | null
          tp?: number | null
          yearid?: number | null
        }
        Update: {
          a?: number | null
          cs?: number | null
          dp?: number | null
          e?: number | null
          g?: number | null
          gs?: number | null
          id?: number
          innouts?: number | null
          lgid?: string | null
          pb?: number | null
          playerid?: string | null
          po?: number | null
          pos?: string | null
          round?: string | null
          sb?: number | null
          teamid?: string | null
          tp?: number | null
          yearid?: number | null
        }
        Relationships: []
      }
      lahman_hof: {
        Row: {
          ballots: number | null
          category: string | null
          id: number
          inducted: string | null
          needed: number | null
          needed_note: string | null
          playerid: string | null
          votedby: string | null
          votes: number | null
          yearid: number | null
        }
        Insert: {
          ballots?: number | null
          category?: string | null
          id?: number
          inducted?: string | null
          needed?: number | null
          needed_note?: string | null
          playerid?: string | null
          votedby?: string | null
          votes?: number | null
          yearid?: number | null
        }
        Update: {
          ballots?: number | null
          category?: string | null
          id?: number
          inducted?: string | null
          needed?: number | null
          needed_note?: string | null
          playerid?: string | null
          votedby?: string | null
          votes?: number | null
          yearid?: number | null
        }
        Relationships: []
      }
      lahman_home_games: {
        Row: {
          attendance: number | null
          games: number | null
          id: number
          league_key: string | null
          openings: number | null
          park_key: string | null
          span_first: string | null
          span_last: string | null
          team_key: string | null
          year_key: number | null
        }
        Insert: {
          attendance?: number | null
          games?: number | null
          id?: number
          league_key?: string | null
          openings?: number | null
          park_key?: string | null
          span_first?: string | null
          span_last?: string | null
          team_key?: string | null
          year_key?: number | null
        }
        Update: {
          attendance?: number | null
          games?: number | null
          id?: number
          league_key?: string | null
          openings?: number | null
          park_key?: string | null
          span_first?: string | null
          span_last?: string | null
          team_key?: string | null
          year_key?: number | null
        }
        Relationships: []
      }
      lahman_managers: {
        Row: {
          g: number | null
          id: number
          inseason: number | null
          l: number | null
          lgid: string | null
          playerid: string | null
          plyrmgr: string | null
          rank: number | null
          teamid: string | null
          w: number | null
          yearid: number | null
        }
        Insert: {
          g?: number | null
          id?: number
          inseason?: number | null
          l?: number | null
          lgid?: string | null
          playerid?: string | null
          plyrmgr?: string | null
          rank?: number | null
          teamid?: string | null
          w?: number | null
          yearid?: number | null
        }
        Update: {
          g?: number | null
          id?: number
          inseason?: number | null
          l?: number | null
          lgid?: string | null
          playerid?: string | null
          plyrmgr?: string | null
          rank?: number | null
          teamid?: string | null
          w?: number | null
          yearid?: number | null
        }
        Relationships: []
      }
      lahman_managers_half: {
        Row: {
          g: number | null
          half: number | null
          id: number
          inseason: number | null
          l: number | null
          lgid: string | null
          playerid: string | null
          rank: number | null
          teamid: string | null
          w: number | null
          yearid: number | null
        }
        Insert: {
          g?: number | null
          half?: number | null
          id?: number
          inseason?: number | null
          l?: number | null
          lgid?: string | null
          playerid?: string | null
          rank?: number | null
          teamid?: string | null
          w?: number | null
          yearid?: number | null
        }
        Update: {
          g?: number | null
          half?: number | null
          id?: number
          inseason?: number | null
          l?: number | null
          lgid?: string | null
          playerid?: string | null
          rank?: number | null
          teamid?: string | null
          w?: number | null
          yearid?: number | null
        }
        Relationships: []
      }
      lahman_parks: {
        Row: {
          city: string | null
          country: string | null
          id: number
          park_alias: string | null
          park_key: string | null
          park_name: string | null
          state: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          id?: number
          park_alias?: string | null
          park_key?: string | null
          park_name?: string | null
          state?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          id?: number
          park_alias?: string | null
          park_key?: string | null
          park_name?: string | null
          state?: string | null
        }
        Relationships: []
      }
      lahman_people: {
        Row: {
          bats: string | null
          bbrefid: string | null
          birthcity: string | null
          birthcountry: string | null
          birthday: number | null
          birthmonth: number | null
          birthstate: string | null
          birthyear: number | null
          deathcity: string | null
          deathcountry: string | null
          deathday: number | null
          deathmonth: number | null
          deathstate: string | null
          deathyear: number | null
          debut: string | null
          finalgame: string | null
          height: number | null
          id: number
          namefirst: string | null
          namegiven: string | null
          namelast: string | null
          playerid: string | null
          retroid: string | null
          throws: string | null
          weight: number | null
        }
        Insert: {
          bats?: string | null
          bbrefid?: string | null
          birthcity?: string | null
          birthcountry?: string | null
          birthday?: number | null
          birthmonth?: number | null
          birthstate?: string | null
          birthyear?: number | null
          deathcity?: string | null
          deathcountry?: string | null
          deathday?: number | null
          deathmonth?: number | null
          deathstate?: string | null
          deathyear?: number | null
          debut?: string | null
          finalgame?: string | null
          height?: number | null
          id?: number
          namefirst?: string | null
          namegiven?: string | null
          namelast?: string | null
          playerid?: string | null
          retroid?: string | null
          throws?: string | null
          weight?: number | null
        }
        Update: {
          bats?: string | null
          bbrefid?: string | null
          birthcity?: string | null
          birthcountry?: string | null
          birthday?: number | null
          birthmonth?: number | null
          birthstate?: string | null
          birthyear?: number | null
          deathcity?: string | null
          deathcountry?: string | null
          deathday?: number | null
          deathmonth?: number | null
          deathstate?: string | null
          deathyear?: number | null
          debut?: string | null
          finalgame?: string | null
          height?: number | null
          id?: number
          namefirst?: string | null
          namegiven?: string | null
          namelast?: string | null
          playerid?: string | null
          retroid?: string | null
          throws?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      lahman_pitching: {
        Row: {
          baopp: number | null
          bb: number | null
          bfp: number | null
          bk: number | null
          cg: number | null
          er: number | null
          era: number | null
          g: number | null
          gf: number | null
          gidp: number | null
          gs: number | null
          h: number | null
          hbp: number | null
          hr: number | null
          ibb: number | null
          id: number
          ipouts: number | null
          l: number | null
          lgid: string | null
          playerid: string | null
          r: number | null
          sf: number | null
          sh: number | null
          sho: number | null
          so: number | null
          stint: number | null
          sv: number | null
          teamid: string | null
          w: number | null
          wp: number | null
          yearid: number | null
        }
        Insert: {
          baopp?: number | null
          bb?: number | null
          bfp?: number | null
          bk?: number | null
          cg?: number | null
          er?: number | null
          era?: number | null
          g?: number | null
          gf?: number | null
          gidp?: number | null
          gs?: number | null
          h?: number | null
          hbp?: number | null
          hr?: number | null
          ibb?: number | null
          id?: number
          ipouts?: number | null
          l?: number | null
          lgid?: string | null
          playerid?: string | null
          r?: number | null
          sf?: number | null
          sh?: number | null
          sho?: number | null
          so?: number | null
          stint?: number | null
          sv?: number | null
          teamid?: string | null
          w?: number | null
          wp?: number | null
          yearid?: number | null
        }
        Update: {
          baopp?: number | null
          bb?: number | null
          bfp?: number | null
          bk?: number | null
          cg?: number | null
          er?: number | null
          era?: number | null
          g?: number | null
          gf?: number | null
          gidp?: number | null
          gs?: number | null
          h?: number | null
          hbp?: number | null
          hr?: number | null
          ibb?: number | null
          id?: number
          ipouts?: number | null
          l?: number | null
          lgid?: string | null
          playerid?: string | null
          r?: number | null
          sf?: number | null
          sh?: number | null
          sho?: number | null
          so?: number | null
          stint?: number | null
          sv?: number | null
          teamid?: string | null
          w?: number | null
          wp?: number | null
          yearid?: number | null
        }
        Relationships: []
      }
      lahman_pitching_post: {
        Row: {
          baopp: number | null
          bb: number | null
          bfp: number | null
          bk: number | null
          cg: number | null
          er: number | null
          era: number | null
          g: number | null
          gf: number | null
          gidp: number | null
          gs: number | null
          h: number | null
          hbp: number | null
          hr: number | null
          ibb: number | null
          id: number
          ipouts: number | null
          l: number | null
          lgid: string | null
          playerid: string | null
          r: number | null
          round: string | null
          sf: number | null
          sh: number | null
          sho: number | null
          so: number | null
          sv: number | null
          teamid: string | null
          w: number | null
          wp: number | null
          yearid: number | null
        }
        Insert: {
          baopp?: number | null
          bb?: number | null
          bfp?: number | null
          bk?: number | null
          cg?: number | null
          er?: number | null
          era?: number | null
          g?: number | null
          gf?: number | null
          gidp?: number | null
          gs?: number | null
          h?: number | null
          hbp?: number | null
          hr?: number | null
          ibb?: number | null
          id?: number
          ipouts?: number | null
          l?: number | null
          lgid?: string | null
          playerid?: string | null
          r?: number | null
          round?: string | null
          sf?: number | null
          sh?: number | null
          sho?: number | null
          so?: number | null
          sv?: number | null
          teamid?: string | null
          w?: number | null
          wp?: number | null
          yearid?: number | null
        }
        Update: {
          baopp?: number | null
          bb?: number | null
          bfp?: number | null
          bk?: number | null
          cg?: number | null
          er?: number | null
          era?: number | null
          g?: number | null
          gf?: number | null
          gidp?: number | null
          gs?: number | null
          h?: number | null
          hbp?: number | null
          hr?: number | null
          ibb?: number | null
          id?: number
          ipouts?: number | null
          l?: number | null
          lgid?: string | null
          playerid?: string | null
          r?: number | null
          round?: string | null
          sf?: number | null
          sh?: number | null
          sho?: number | null
          so?: number | null
          sv?: number | null
          teamid?: string | null
          w?: number | null
          wp?: number | null
          yearid?: number | null
        }
        Relationships: []
      }
      lahman_salaries: {
        Row: {
          id: number
          lgid: string | null
          playerid: string | null
          salary: number | null
          teamid: string | null
          yearid: number | null
        }
        Insert: {
          id?: number
          lgid?: string | null
          playerid?: string | null
          salary?: number | null
          teamid?: string | null
          yearid?: number | null
        }
        Update: {
          id?: number
          lgid?: string | null
          playerid?: string | null
          salary?: number | null
          teamid?: string | null
          yearid?: number | null
        }
        Relationships: []
      }
      lahman_schools: {
        Row: {
          city: string | null
          country: string | null
          id: number
          name_full: string | null
          schoolid: string | null
          state: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          id?: number
          name_full?: string | null
          schoolid?: string | null
          state?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          id?: number
          name_full?: string | null
          schoolid?: string | null
          state?: string | null
        }
        Relationships: []
      }
      lahman_series_post: {
        Row: {
          id: number
          lgidloser: string | null
          lgidwinner: string | null
          losses: number | null
          round: string | null
          teamidloser: string | null
          teamidwinner: string | null
          ties: number | null
          wins: number | null
          yearid: number | null
        }
        Insert: {
          id?: number
          lgidloser?: string | null
          lgidwinner?: string | null
          losses?: number | null
          round?: string | null
          teamidloser?: string | null
          teamidwinner?: string | null
          ties?: number | null
          wins?: number | null
          yearid?: number | null
        }
        Update: {
          id?: number
          lgidloser?: string | null
          lgidwinner?: string | null
          losses?: number | null
          round?: string | null
          teamidloser?: string | null
          teamidwinner?: string | null
          ties?: number | null
          wins?: number | null
          yearid?: number | null
        }
        Relationships: []
      }
      lahman_team_franchises: {
        Row: {
          active: string | null
          franchid: string | null
          franchname: string | null
          id: number
          naassoc: string | null
        }
        Insert: {
          active?: string | null
          franchid?: string | null
          franchname?: string | null
          id?: number
          naassoc?: string | null
        }
        Update: {
          active?: string | null
          franchid?: string | null
          franchname?: string | null
          id?: number
          naassoc?: string | null
        }
        Relationships: []
      }
      lahman_teams: {
        Row: {
          ab: number | null
          attendance: number | null
          bb: number | null
          bba: number | null
          bpf: number | null
          cg: number | null
          cs: number | null
          divid: string | null
          divwin: string | null
          doubles: number | null
          dp: number | null
          e: number | null
          er: number | null
          era: number | null
          fp: number | null
          franchid: string | null
          g: number | null
          ghome: number | null
          h: number | null
          ha: number | null
          hbp: number | null
          hr: number | null
          hra: number | null
          id: number
          ipouts: number | null
          l: number | null
          lgid: string | null
          lgwin: string | null
          name: string | null
          park: string | null
          ppf: number | null
          r: number | null
          ra: number | null
          rank: number | null
          sb: number | null
          sf: number | null
          sho: number | null
          so: number | null
          soa: number | null
          sv: number | null
          teamid: string | null
          teamidbr: string | null
          teamidlahman45: string | null
          teamidretro: string | null
          triples: number | null
          w: number | null
          wcwin: string | null
          wswin: string | null
          yearid: number | null
        }
        Insert: {
          ab?: number | null
          attendance?: number | null
          bb?: number | null
          bba?: number | null
          bpf?: number | null
          cg?: number | null
          cs?: number | null
          divid?: string | null
          divwin?: string | null
          doubles?: number | null
          dp?: number | null
          e?: number | null
          er?: number | null
          era?: number | null
          fp?: number | null
          franchid?: string | null
          g?: number | null
          ghome?: number | null
          h?: number | null
          ha?: number | null
          hbp?: number | null
          hr?: number | null
          hra?: number | null
          id?: number
          ipouts?: number | null
          l?: number | null
          lgid?: string | null
          lgwin?: string | null
          name?: string | null
          park?: string | null
          ppf?: number | null
          r?: number | null
          ra?: number | null
          rank?: number | null
          sb?: number | null
          sf?: number | null
          sho?: number | null
          so?: number | null
          soa?: number | null
          sv?: number | null
          teamid?: string | null
          teamidbr?: string | null
          teamidlahman45?: string | null
          teamidretro?: string | null
          triples?: number | null
          w?: number | null
          wcwin?: string | null
          wswin?: string | null
          yearid?: number | null
        }
        Update: {
          ab?: number | null
          attendance?: number | null
          bb?: number | null
          bba?: number | null
          bpf?: number | null
          cg?: number | null
          cs?: number | null
          divid?: string | null
          divwin?: string | null
          doubles?: number | null
          dp?: number | null
          e?: number | null
          er?: number | null
          era?: number | null
          fp?: number | null
          franchid?: string | null
          g?: number | null
          ghome?: number | null
          h?: number | null
          ha?: number | null
          hbp?: number | null
          hr?: number | null
          hra?: number | null
          id?: number
          ipouts?: number | null
          l?: number | null
          lgid?: string | null
          lgwin?: string | null
          name?: string | null
          park?: string | null
          ppf?: number | null
          r?: number | null
          ra?: number | null
          rank?: number | null
          sb?: number | null
          sf?: number | null
          sho?: number | null
          so?: number | null
          soa?: number | null
          sv?: number | null
          teamid?: string | null
          teamidbr?: string | null
          teamidlahman45?: string | null
          teamidretro?: string | null
          triples?: number | null
          w?: number | null
          wcwin?: string | null
          wswin?: string | null
          yearid?: number | null
        }
        Relationships: []
      }
      lahman_teams_half: {
        Row: {
          divid: string | null
          divwin: string | null
          g: number | null
          half: number | null
          id: number
          l: number | null
          lgid: string | null
          rank: number | null
          teamid: string | null
          w: number | null
          yearid: number | null
        }
        Insert: {
          divid?: string | null
          divwin?: string | null
          g?: number | null
          half?: number | null
          id?: number
          l?: number | null
          lgid?: string | null
          rank?: number | null
          teamid?: string | null
          w?: number | null
          yearid?: number | null
        }
        Update: {
          divid?: string | null
          divwin?: string | null
          g?: number | null
          half?: number | null
          id?: number
          l?: number | null
          lgid?: string | null
          rank?: number | null
          teamid?: string | null
          w?: number | null
          yearid?: number | null
        }
        Relationships: []
      }
      league_champions: {
        Row: {
          champion: string
          country: string | null
          id: number
          league: string
          runner_up: string | null
          sport: string
          top_scorer: string | null
          year: number
        }
        Insert: {
          champion: string
          country?: string | null
          id?: number
          league: string
          runner_up?: string | null
          sport: string
          top_scorer?: string | null
          year: number
        }
        Update: {
          champion?: string
          country?: string | null
          id?: number
          league?: string
          runner_up?: string | null
          sport?: string
          top_scorer?: string | null
          year?: number
        }
        Relationships: []
      }
      medal_games_scores: {
        Row: {
          clues_used: number | null
          created_at: string
          guessed: boolean | null
          id: string
          puzzle_date: string | null
          score: number | null
        }
        Insert: {
          clues_used?: number | null
          created_at?: string
          guessed?: boolean | null
          id?: string
          puzzle_date?: string | null
          score?: number | null
        }
        Update: {
          clues_used?: number | null
          created_at?: string
          guessed?: boolean | null
          id?: string
          puzzle_date?: string | null
          score?: number | null
        }
        Relationships: []
      }
      missing_xi_puzzles: {
        Row: {
          blank_candidates: Json
          competition: string
          created_at: string
          date_label: string
          formation_label: string
          id: string
          match_date: string
          opponent: string
          puzzle_id: string
          score_line: string
          slots: Json
          sort_order: number
          source: string
          team: string
          venue: string
        }
        Insert: {
          blank_candidates: Json
          competition: string
          created_at?: string
          date_label: string
          formation_label: string
          id?: string
          match_date: string
          opponent: string
          puzzle_id: string
          score_line: string
          slots: Json
          sort_order: number
          source: string
          team: string
          venue: string
        }
        Update: {
          blank_candidates?: Json
          competition?: string
          created_at?: string
          date_label?: string
          formation_label?: string
          id?: string
          match_date?: string
          opponent?: string
          puzzle_id?: string
          score_line?: string
          slots?: Json
          sort_order?: number
          source?: string
          team?: string
          venue?: string
        }
        Relationships: []
      }
      mlb_batting_stats: {
        Row: {
          ab: number | null
          age_range: string | null
          ba: number | null
          bb: number | null
          created_at: string | null
          doubles: number | null
          games: number | null
          hits: number | null
          hr: number | null
          id: number
          obp: number | null
          ops: number | null
          ops_plus: number | null
          pa: number | null
          person_key: string | null
          player_name: string
          position: string | null
          rbi: number | null
          runs: number | null
          sb: number | null
          slg: number | null
          so: number | null
          tb: number | null
          teams: string | null
          triples: number | null
          year_from: string | null
          year_to: string | null
        }
        Insert: {
          ab?: number | null
          age_range?: string | null
          ba?: number | null
          bb?: number | null
          created_at?: string | null
          doubles?: number | null
          games?: number | null
          hits?: number | null
          hr?: number | null
          id?: number
          obp?: number | null
          ops?: number | null
          ops_plus?: number | null
          pa?: number | null
          person_key?: string | null
          player_name: string
          position?: string | null
          rbi?: number | null
          runs?: number | null
          sb?: number | null
          slg?: number | null
          so?: number | null
          tb?: number | null
          teams?: string | null
          triples?: number | null
          year_from?: string | null
          year_to?: string | null
        }
        Update: {
          ab?: number | null
          age_range?: string | null
          ba?: number | null
          bb?: number | null
          created_at?: string | null
          doubles?: number | null
          games?: number | null
          hits?: number | null
          hr?: number | null
          id?: number
          obp?: number | null
          ops?: number | null
          ops_plus?: number | null
          pa?: number | null
          person_key?: string | null
          player_name?: string
          position?: string | null
          rbi?: number | null
          runs?: number | null
          sb?: number | null
          slg?: number | null
          so?: number | null
          tb?: number | null
          teams?: string | null
          triples?: number | null
          year_from?: string | null
          year_to?: string | null
        }
        Relationships: []
      }
      mlb_draft_picks: {
        Row: {
          id: number
          pick: number | null
          player_name: string
          position: string | null
          round: number | null
          school: string | null
          team: string | null
          year: number
        }
        Insert: {
          id?: number
          pick?: number | null
          player_name: string
          position?: string | null
          round?: number | null
          school?: string | null
          team?: string | null
          year: number
        }
        Update: {
          id?: number
          pick?: number | null
          player_name?: string
          position?: string | null
          round?: number | null
          school?: string | null
          team?: string | null
          year?: number
        }
        Relationships: []
      }
      mlb_pitching_stats: {
        Row: {
          age_range: string | null
          bb: number | null
          bb9: number | null
          bf: number | null
          bk: number | null
          cg: number | null
          created_at: string | null
          decisions: number | null
          er: number | null
          era: number | null
          era_plus: number | null
          fip: number | null
          games: number | null
          gs: number | null
          h9: number | null
          hbp: number | null
          hits: number | null
          hr: number | null
          hr9: number | null
          ibb: number | null
          id: number
          ip: number | null
          losses: number | null
          person_key: string | null
          player_name: string
          position: string | null
          runs: number | null
          sho: number | null
          so: number | null
          so_bb: number | null
          so9: number | null
          sv: number | null
          teams: string | null
          whip: number | null
          win_loss_pct: number | null
          wins: number | null
          wp: number | null
          year_from: string | null
          year_to: string | null
        }
        Insert: {
          age_range?: string | null
          bb?: number | null
          bb9?: number | null
          bf?: number | null
          bk?: number | null
          cg?: number | null
          created_at?: string | null
          decisions?: number | null
          er?: number | null
          era?: number | null
          era_plus?: number | null
          fip?: number | null
          games?: number | null
          gs?: number | null
          h9?: number | null
          hbp?: number | null
          hits?: number | null
          hr?: number | null
          hr9?: number | null
          ibb?: number | null
          id?: number
          ip?: number | null
          losses?: number | null
          person_key?: string | null
          player_name: string
          position?: string | null
          runs?: number | null
          sho?: number | null
          so?: number | null
          so_bb?: number | null
          so9?: number | null
          sv?: number | null
          teams?: string | null
          whip?: number | null
          win_loss_pct?: number | null
          wins?: number | null
          wp?: number | null
          year_from?: string | null
          year_to?: string | null
        }
        Update: {
          age_range?: string | null
          bb?: number | null
          bb9?: number | null
          bf?: number | null
          bk?: number | null
          cg?: number | null
          created_at?: string | null
          decisions?: number | null
          er?: number | null
          era?: number | null
          era_plus?: number | null
          fip?: number | null
          games?: number | null
          gs?: number | null
          h9?: number | null
          hbp?: number | null
          hits?: number | null
          hr?: number | null
          hr9?: number | null
          ibb?: number | null
          id?: number
          ip?: number | null
          losses?: number | null
          person_key?: string | null
          player_name?: string
          position?: string | null
          runs?: number | null
          sho?: number | null
          so?: number | null
          so_bb?: number | null
          so9?: number | null
          sv?: number | null
          teams?: string | null
          whip?: number | null
          win_loss_pct?: number | null
          wins?: number | null
          wp?: number | null
          year_from?: string | null
          year_to?: string | null
        }
        Relationships: []
      }
      mlb_players: {
        Row: {
          bats: string | null
          birth_country: string | null
          birth_date: string | null
          full_name: string | null
          height: string | null
          id: number
          jersey_number: string | null
          player_id: number | null
          position: string | null
          team: string | null
          throws: string | null
          weight: number | null
        }
        Insert: {
          bats?: string | null
          birth_country?: string | null
          birth_date?: string | null
          full_name?: string | null
          height?: string | null
          id?: number
          jersey_number?: string | null
          player_id?: number | null
          position?: string | null
          team?: string | null
          throws?: string | null
          weight?: number | null
        }
        Update: {
          bats?: string | null
          birth_country?: string | null
          birth_date?: string | null
          full_name?: string | null
          height?: string | null
          id?: number
          jersey_number?: string | null
          player_id?: number | null
          position?: string | null
          team?: string | null
          throws?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      mma_fighter_careers: {
        Row: {
          born: string | null
          championships: string | null
          decision_wins: number | null
          draws: number | null
          fighter: string | null
          height: string | null
          id: number
          ko_wins: number | null
          losses: number | null
          nationality: string | null
          reach: string | null
          stance: string | null
          submission_wins: number | null
          weight_class: string | null
          wins: number | null
        }
        Insert: {
          born?: string | null
          championships?: string | null
          decision_wins?: number | null
          draws?: number | null
          fighter?: string | null
          height?: string | null
          id?: number
          ko_wins?: number | null
          losses?: number | null
          nationality?: string | null
          reach?: string | null
          stance?: string | null
          submission_wins?: number | null
          weight_class?: string | null
          wins?: number | null
        }
        Update: {
          born?: string | null
          championships?: string | null
          decision_wins?: number | null
          draws?: number | null
          fighter?: string | null
          height?: string | null
          id?: number
          ko_wins?: number | null
          losses?: number | null
          nationality?: string | null
          reach?: string | null
          stance?: string | null
          submission_wins?: number | null
          weight_class?: string | null
          wins?: number | null
        }
        Relationships: []
      }
      nascar_chain_scores: {
        Row: {
          chain_length: number
          created_at: string
          id: string
          mode: string | null
          nickname: string
          score: number
        }
        Insert: {
          chain_length?: number
          created_at?: string
          id?: string
          mode?: string | null
          nickname: string
          score?: number
        }
        Update: {
          chain_length?: number
          created_at?: string
          id?: string
          mode?: string | null
          nickname?: string
          score?: number
        }
        Relationships: []
      }
      nascar_champions: {
        Row: {
          driver_name: string | null
          manufacturer: string | null
          points: number | null
          team: string | null
          wins_that_season: number | null
          year: number | null
        }
        Insert: {
          driver_name?: string | null
          manufacturer?: string | null
          points?: number | null
          team?: string | null
          wins_that_season?: number | null
          year?: number | null
        }
        Update: {
          driver_name?: string | null
          manufacturer?: string | null
          points?: number | null
          team?: string | null
          wins_that_season?: number | null
          year?: number | null
        }
        Relationships: []
      }
      nascar_cup_races: {
        Row: {
          date: string | null
          id: number
          laps: number | null
          pole_winner: string | null
          race_name: string | null
          race_no: number | null
          race_time: string | null
          track: string | null
          winning_driver: string | null
          winning_team: string | null
          year: number | null
        }
        Insert: {
          date?: string | null
          id?: number
          laps?: number | null
          pole_winner?: string | null
          race_name?: string | null
          race_no?: number | null
          race_time?: string | null
          track?: string | null
          winning_driver?: string | null
          winning_team?: string | null
          year?: number | null
        }
        Update: {
          date?: string | null
          id?: number
          laps?: number | null
          pole_winner?: string | null
          race_name?: string | null
          race_no?: number | null
          race_time?: string | null
          track?: string | null
          winning_driver?: string | null
          winning_team?: string | null
          year?: number | null
        }
        Relationships: []
      }
      nascar_daily: {
        Row: {
          created_at: string
          driver_id: string | null
          id: string
          puzzle_date: string
        }
        Insert: {
          created_at?: string
          driver_id?: string | null
          id?: string
          puzzle_date: string
        }
        Update: {
          created_at?: string
          driver_id?: string | null
          id?: string
          puzzle_date?: string
        }
        Relationships: []
      }
      nascar_driver_careers: {
        Row: {
          birthplace: string | null
          born: string | null
          cup_championships: number | null
          daytona_500_wins: number | null
          driver: string | null
          id: number
          retired: string | null
          top_10: number | null
          top_5: number | null
          total_starts: number | null
          wins: number | null
        }
        Insert: {
          birthplace?: string | null
          born?: string | null
          cup_championships?: number | null
          daytona_500_wins?: number | null
          driver?: string | null
          id?: number
          retired?: string | null
          top_10?: number | null
          top_5?: number | null
          total_starts?: number | null
          wins?: number | null
        }
        Update: {
          birthplace?: string | null
          born?: string | null
          cup_championships?: number | null
          daytona_500_wins?: number | null
          driver?: string | null
          id?: number
          retired?: string | null
          top_10?: number | null
          top_5?: number | null
          total_starts?: number | null
          wins?: number | null
        }
        Relationships: []
      }
      nascar_drivers: {
        Row: {
          career_earnings_usd: number | null
          championships: number | null
          country: string | null
          driver_name: string | null
          first_year: number | null
          last_year: number | null
          primary_manufacturer: string | null
          rank: number | null
          total_poles: number | null
          total_starts: number | null
          total_top10: number | null
          total_top5: number | null
          total_wins: number | null
          years_active: string | null
        }
        Insert: {
          career_earnings_usd?: number | null
          championships?: number | null
          country?: string | null
          driver_name?: string | null
          first_year?: number | null
          last_year?: number | null
          primary_manufacturer?: string | null
          rank?: number | null
          total_poles?: number | null
          total_starts?: number | null
          total_top10?: number | null
          total_top5?: number | null
          total_wins?: number | null
          years_active?: string | null
        }
        Update: {
          career_earnings_usd?: number | null
          championships?: number | null
          country?: string | null
          driver_name?: string | null
          first_year?: number | null
          last_year?: number | null
          primary_manufacturer?: string | null
          rank?: number | null
          total_poles?: number | null
          total_starts?: number | null
          total_top10?: number | null
          total_top5?: number | null
          total_wins?: number | null
          years_active?: string | null
        }
        Relationships: []
      }
      nascar_race_results: {
        Row: {
          race_name: string | null
          winner: string | null
          year: number | null
        }
        Insert: {
          race_name?: string | null
          winner?: string | null
          year?: number | null
        }
        Update: {
          race_name?: string | null
          winner?: string | null
          year?: number | null
        }
        Relationships: []
      }
      nascar_scores: {
        Row: {
          clues_used: number | null
          created_at: string
          guessed: boolean | null
          id: string
          mode: string | null
          puzzle_date: string | null
          score: number | null
        }
        Insert: {
          clues_used?: number | null
          created_at?: string
          guessed?: boolean | null
          id?: string
          mode?: string | null
          puzzle_date?: string | null
          score?: number | null
        }
        Update: {
          clues_used?: number | null
          created_at?: string
          guessed?: boolean | null
          id?: string
          mode?: string | null
          puzzle_date?: string | null
          score?: number | null
        }
        Relationships: []
      }
      nascar_teams: {
        Row: {
          championships: number | null
          current_drivers: string | null
          founded: number | null
          headquarters: string | null
          id: number
          owner: string | null
          team_name: string | null
          total_wins: number | null
        }
        Insert: {
          championships?: number | null
          current_drivers?: string | null
          founded?: number | null
          headquarters?: string | null
          id?: number
          owner?: string | null
          team_name?: string | null
          total_wins?: number | null
        }
        Update: {
          championships?: number | null
          current_drivers?: string | null
          founded?: number | null
          headquarters?: string | null
          id?: number
          owner?: string | null
          team_name?: string | null
          total_wins?: number | null
        }
        Relationships: []
      }
      national_team_squads: {
        Row: {
          club: string | null
          competition: string
          country: string
          id: number
          jersey_number: number | null
          player_name: string
          position: string | null
          year: number
        }
        Insert: {
          club?: string | null
          competition: string
          country: string
          id?: number
          jersey_number?: number | null
          player_name: string
          position?: string | null
          year: number
        }
        Update: {
          club?: string | null
          competition?: string
          country?: string
          id?: number
          jersey_number?: number | null
          player_name?: string
          position?: string | null
          year?: number
        }
        Relationships: []
      }
      nba_all_star_rosters: {
        Row: {
          conference: string | null
          id: number
          mvp: boolean | null
          player: string | null
          position: string | null
          starter: boolean | null
          team: string | null
          year: number | null
        }
        Insert: {
          conference?: string | null
          id?: number
          mvp?: boolean | null
          player?: string | null
          position?: string | null
          starter?: boolean | null
          team?: string | null
          year?: number | null
        }
        Update: {
          conference?: string | null
          id?: number
          mvp?: boolean | null
          player?: string | null
          position?: string | null
          starter?: boolean | null
          team?: string | null
          year?: number | null
        }
        Relationships: []
      }
      nba_connections_puzzles: {
        Row: {
          created_at: string
          groups_json: Json
          id: number
          puzzle_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          groups_json: Json
          id?: never
          puzzle_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          groups_json?: Json
          id?: never
          puzzle_id?: string
          sort_order?: number
        }
        Relationships: []
      }
      nba_draft_picks: {
        Row: {
          college_or_country: string | null
          id: number
          nationality: string | null
          pick: number | null
          player_name: string
          round: number | null
          team: string | null
          year: number
        }
        Insert: {
          college_or_country?: string | null
          id?: number
          nationality?: string | null
          pick?: number | null
          player_name: string
          round?: number | null
          team?: string | null
          year: number
        }
        Update: {
          college_or_country?: string | null
          id?: number
          nationality?: string | null
          pick?: number | null
          player_name?: string
          round?: number | null
          team?: string | null
          year?: number
        }
        Relationships: []
      }
      nba_finals: {
        Row: {
          finals_mvp: string | null
          id: number
          loser: string | null
          series_result: string | null
          winner: string
          winning_coach: string | null
          year: number
        }
        Insert: {
          finals_mvp?: string | null
          id?: number
          loser?: string | null
          series_result?: string | null
          winner: string
          winning_coach?: string | null
          year: number
        }
        Update: {
          finals_mvp?: string | null
          id?: number
          loser?: string | null
          series_result?: string | null
          winner?: string
          winning_coach?: string | null
          year?: number
        }
        Relationships: []
      }
      nba_finals_bak_20260715: {
        Row: {
          finals_mvp: string | null
          id: number | null
          loser: string | null
          series_result: string | null
          winner: string | null
          winning_coach: string | null
          year: number | null
        }
        Insert: {
          finals_mvp?: string | null
          id?: number | null
          loser?: string | null
          series_result?: string | null
          winner?: string | null
          winning_coach?: string | null
          year?: number | null
        }
        Update: {
          finals_mvp?: string | null
          id?: number | null
          loser?: string | null
          series_result?: string | null
          winner?: string | null
          winning_coach?: string | null
          year?: number | null
        }
        Relationships: []
      }
      nba_player_stats: {
        Row: {
          age_range: string | null
          ast: number | null
          blk: number | null
          created_at: string | null
          drb: number | null
          fg: number | null
          fg_pct: number | null
          fga: number | null
          ft: number | null
          ft_pct: number | null
          fta: number | null
          games: number | null
          games_started: number | null
          id: number
          minutes: number | null
          orb: number | null
          person_key: string | null
          pf: number | null
          player_name: string
          points: number | null
          position: string | null
          stl: number | null
          teams: string | null
          three_p: number | null
          three_pa: number | null
          three_pct: number | null
          tov: number | null
          trb: number | null
          ts_pct: number | null
          year_from: string | null
          year_to: string | null
        }
        Insert: {
          age_range?: string | null
          ast?: number | null
          blk?: number | null
          created_at?: string | null
          drb?: number | null
          fg?: number | null
          fg_pct?: number | null
          fga?: number | null
          ft?: number | null
          ft_pct?: number | null
          fta?: number | null
          games?: number | null
          games_started?: number | null
          id?: number
          minutes?: number | null
          orb?: number | null
          person_key?: string | null
          pf?: number | null
          player_name: string
          points?: number | null
          position?: string | null
          stl?: number | null
          teams?: string | null
          three_p?: number | null
          three_pa?: number | null
          three_pct?: number | null
          tov?: number | null
          trb?: number | null
          ts_pct?: number | null
          year_from?: string | null
          year_to?: string | null
        }
        Update: {
          age_range?: string | null
          ast?: number | null
          blk?: number | null
          created_at?: string | null
          drb?: number | null
          fg?: number | null
          fg_pct?: number | null
          fga?: number | null
          ft?: number | null
          ft_pct?: number | null
          fta?: number | null
          games?: number | null
          games_started?: number | null
          id?: number
          minutes?: number | null
          orb?: number | null
          person_key?: string | null
          pf?: number | null
          player_name?: string
          points?: number | null
          position?: string | null
          stl?: number | null
          teams?: string | null
          three_p?: number | null
          three_pa?: number | null
          three_pct?: number | null
          tov?: number | null
          trb?: number | null
          ts_pct?: number | null
          year_from?: string | null
          year_to?: string | null
        }
        Relationships: []
      }
      nba_player_stats_bak_20260722: {
        Row: {
          age_range: string | null
          ast: number | null
          blk: number | null
          created_at: string | null
          drb: number | null
          fg: number | null
          fg_pct: number | null
          fga: number | null
          ft: number | null
          ft_pct: number | null
          fta: number | null
          games: number | null
          games_started: number | null
          id: number | null
          minutes: number | null
          orb: number | null
          person_key: string | null
          pf: number | null
          player_name: string | null
          points: number | null
          position: string | null
          stl: number | null
          teams: string | null
          three_p: number | null
          three_pa: number | null
          three_pct: number | null
          tov: number | null
          trb: number | null
          ts_pct: number | null
          year_from: string | null
          year_to: string | null
        }
        Insert: {
          age_range?: string | null
          ast?: number | null
          blk?: number | null
          created_at?: string | null
          drb?: number | null
          fg?: number | null
          fg_pct?: number | null
          fga?: number | null
          ft?: number | null
          ft_pct?: number | null
          fta?: number | null
          games?: number | null
          games_started?: number | null
          id?: number | null
          minutes?: number | null
          orb?: number | null
          person_key?: string | null
          pf?: number | null
          player_name?: string | null
          points?: number | null
          position?: string | null
          stl?: number | null
          teams?: string | null
          three_p?: number | null
          three_pa?: number | null
          three_pct?: number | null
          tov?: number | null
          trb?: number | null
          ts_pct?: number | null
          year_from?: string | null
          year_to?: string | null
        }
        Update: {
          age_range?: string | null
          ast?: number | null
          blk?: number | null
          created_at?: string | null
          drb?: number | null
          fg?: number | null
          fg_pct?: number | null
          fga?: number | null
          ft?: number | null
          ft_pct?: number | null
          fta?: number | null
          games?: number | null
          games_started?: number | null
          id?: number | null
          minutes?: number | null
          orb?: number | null
          person_key?: string | null
          pf?: number | null
          player_name?: string | null
          points?: number | null
          position?: string | null
          stl?: number | null
          teams?: string | null
          three_p?: number | null
          three_pa?: number | null
          three_pct?: number | null
          tov?: number | null
          trb?: number | null
          ts_pct?: number | null
          year_from?: string | null
          year_to?: string | null
        }
        Relationships: []
      }
      nba_player_team_seasons: {
        Row: {
          assists: number | null
          games_played: number | null
          id: number
          minutes: number | null
          person_key: string | null
          player_id: number | null
          player_name: string | null
          points: number | null
          rebounds: number | null
          season: string | null
          team_abbreviation: string | null
          team_id: number | null
          team_name: string | null
        }
        Insert: {
          assists?: number | null
          games_played?: number | null
          id?: number
          minutes?: number | null
          person_key?: string | null
          player_id?: number | null
          player_name?: string | null
          points?: number | null
          rebounds?: number | null
          season?: string | null
          team_abbreviation?: string | null
          team_id?: number | null
          team_name?: string | null
        }
        Update: {
          assists?: number | null
          games_played?: number | null
          id?: number
          minutes?: number | null
          person_key?: string | null
          player_id?: number | null
          player_name?: string | null
          points?: number | null
          rebounds?: number | null
          season?: string | null
          team_abbreviation?: string | null
          team_id?: number | null
          team_name?: string | null
        }
        Relationships: []
      }
      nba_player_team_stints: {
        Row: {
          first_season: number | null
          id: number
          last_season: number | null
          person_key: string | null
          player_name: string | null
          position: string | null
          seasons: number | null
          team: string | null
        }
        Insert: {
          first_season?: number | null
          id?: number
          last_season?: number | null
          person_key?: string | null
          player_name?: string | null
          position?: string | null
          seasons?: number | null
          team?: string | null
        }
        Update: {
          first_season?: number | null
          id?: number
          last_season?: number | null
          person_key?: string | null
          player_name?: string | null
          position?: string | null
          seasons?: number | null
          team?: string | null
        }
        Relationships: []
      }
      nba_players_extended: {
        Row: {
          college: string | null
          country: string | null
          draft_number: number | null
          draft_round: number | null
          draft_year: number | null
          first_name: string | null
          height: string | null
          id: number
          jersey_number: string | null
          last_name: string | null
          player_id: number | null
          position: string | null
          team: string | null
          weight: number | null
        }
        Insert: {
          college?: string | null
          country?: string | null
          draft_number?: number | null
          draft_round?: number | null
          draft_year?: number | null
          first_name?: string | null
          height?: string | null
          id?: number
          jersey_number?: string | null
          last_name?: string | null
          player_id?: number | null
          position?: string | null
          team?: string | null
          weight?: number | null
        }
        Update: {
          college?: string | null
          country?: string | null
          draft_number?: number | null
          draft_round?: number | null
          draft_year?: number | null
          first_name?: string | null
          height?: string | null
          id?: number
          jersey_number?: string | null
          last_name?: string | null
          player_id?: number | null
          position?: string | null
          team?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      nba_players_extended_v2: {
        Row: {
          college: string | null
          country: string | null
          draft_number: number | null
          draft_round: number | null
          draft_year: number | null
          first_name: string | null
          height: string | null
          id: number
          jersey_number: string | null
          last_name: string | null
          player_id: number | null
          position: string | null
          source: string | null
          team: string | null
          weight: number | null
        }
        Insert: {
          college?: string | null
          country?: string | null
          draft_number?: number | null
          draft_round?: number | null
          draft_year?: number | null
          first_name?: string | null
          height?: string | null
          id?: number
          jersey_number?: string | null
          last_name?: string | null
          player_id?: number | null
          position?: string | null
          source?: string | null
          team?: string | null
          weight?: number | null
        }
        Update: {
          college?: string | null
          country?: string | null
          draft_number?: number | null
          draft_round?: number | null
          draft_year?: number | null
          first_name?: string | null
          height?: string | null
          id?: number
          jersey_number?: string | null
          last_name?: string | null
          player_id?: number | null
          position?: string | null
          source?: string | null
          team?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      nba_team_codes: {
        Row: {
          franchise: string | null
          team_code: string
          team_name: string
        }
        Insert: {
          franchise?: string | null
          team_code: string
          team_name: string
        }
        Update: {
          franchise?: string | null
          team_code?: string
          team_name?: string
        }
        Relationships: []
      }
      ncaa_basketball_champions: {
        Row: {
          champion: string | null
          coach: string | null
          division: string | null
          id: number
          most_outstanding_player: string | null
          runner_up: string | null
          score: string | null
          year: number | null
        }
        Insert: {
          champion?: string | null
          coach?: string | null
          division?: string | null
          id?: number
          most_outstanding_player?: string | null
          runner_up?: string | null
          score?: string | null
          year?: number | null
        }
        Update: {
          champion?: string | null
          coach?: string | null
          division?: string | null
          id?: number
          most_outstanding_player?: string | null
          runner_up?: string | null
          score?: string | null
          year?: number | null
        }
        Relationships: []
      }
      ncaa_basketball_champions_bak_20260715: {
        Row: {
          champion: string | null
          coach: string | null
          division: string | null
          id: number | null
          most_outstanding_player: string | null
          runner_up: string | null
          score: string | null
          year: number | null
        }
        Insert: {
          champion?: string | null
          coach?: string | null
          division?: string | null
          id?: number | null
          most_outstanding_player?: string | null
          runner_up?: string | null
          score?: string | null
          year?: number | null
        }
        Update: {
          champion?: string | null
          coach?: string | null
          division?: string | null
          id?: number | null
          most_outstanding_player?: string | null
          runner_up?: string | null
          score?: string | null
          year?: number | null
        }
        Relationships: []
      }
      ncaa_player_stats: {
        Row: {
          ast: number | null
          blk: number | null
          created_at: string | null
          drb: number | null
          efg_pct: number | null
          fg: number | null
          fg_pct: number | null
          fga: number | null
          ft: number | null
          ft_pct: number | null
          fta: number | null
          games: number | null
          games_started: number | null
          id: number
          minutes: number | null
          orb: number | null
          pf: number | null
          player_name: string
          player_slug: string | null
          points: number | null
          position: string | null
          rk: number | null
          schools: string | null
          stl: number | null
          three_p: number | null
          three_pa: number | null
          three_pct: number | null
          tov: number | null
          trb: number | null
          ts_pct: number | null
          two_p: number | null
          two_pa: number | null
          two_pct: number | null
          year_from: string | null
          year_to: string | null
        }
        Insert: {
          ast?: number | null
          blk?: number | null
          created_at?: string | null
          drb?: number | null
          efg_pct?: number | null
          fg?: number | null
          fg_pct?: number | null
          fga?: number | null
          ft?: number | null
          ft_pct?: number | null
          fta?: number | null
          games?: number | null
          games_started?: number | null
          id?: number
          minutes?: number | null
          orb?: number | null
          pf?: number | null
          player_name: string
          player_slug?: string | null
          points?: number | null
          position?: string | null
          rk?: number | null
          schools?: string | null
          stl?: number | null
          three_p?: number | null
          three_pa?: number | null
          three_pct?: number | null
          tov?: number | null
          trb?: number | null
          ts_pct?: number | null
          two_p?: number | null
          two_pa?: number | null
          two_pct?: number | null
          year_from?: string | null
          year_to?: string | null
        }
        Update: {
          ast?: number | null
          blk?: number | null
          created_at?: string | null
          drb?: number | null
          efg_pct?: number | null
          fg?: number | null
          fg_pct?: number | null
          fga?: number | null
          ft?: number | null
          ft_pct?: number | null
          fta?: number | null
          games?: number | null
          games_started?: number | null
          id?: number
          minutes?: number | null
          orb?: number | null
          pf?: number | null
          player_name?: string
          player_slug?: string | null
          points?: number | null
          position?: string | null
          rk?: number | null
          schools?: string | null
          stl?: number | null
          three_p?: number | null
          three_pa?: number | null
          three_pct?: number | null
          tov?: number | null
          trb?: number | null
          ts_pct?: number | null
          two_p?: number | null
          two_pa?: number | null
          two_pct?: number | null
          year_from?: string | null
          year_to?: string | null
        }
        Relationships: []
      }
      ncaa_tournament_games: {
        Row: {
          id: number
          loser: string | null
          round: string | null
          score: string | null
          winner: string | null
          year: number | null
        }
        Insert: {
          id?: number
          loser?: string | null
          round?: string | null
          score?: string | null
          winner?: string | null
          year?: number | null
        }
        Update: {
          id?: number
          loser?: string | null
          round?: string | null
          score?: string | null
          winner?: string | null
          year?: number | null
        }
        Relationships: []
      }
      ncaa_tournament_results: {
        Row: {
          division: string | null
          id: number
          loser: string | null
          loser_seed: number | null
          round: string | null
          score: string | null
          winner: string | null
          winner_seed: number | null
          year: number
        }
        Insert: {
          division?: string | null
          id?: number
          loser?: string | null
          loser_seed?: number | null
          round?: string | null
          score?: string | null
          winner?: string | null
          winner_seed?: number | null
          year: number
        }
        Update: {
          division?: string | null
          id?: number
          loser?: string | null
          loser_seed?: number | null
          round?: string | null
          score?: string | null
          winner?: string | null
          winner_seed?: number | null
          year?: number
        }
        Relationships: []
      }
      ncaa_womens_basketball_champions: {
        Row: {
          champion: string | null
          coach: string | null
          division: string | null
          id: number | null
          most_outstanding_player: string | null
          runner_up: string | null
          score: string | null
          year: number | null
        }
        Insert: {
          champion?: string | null
          coach?: string | null
          division?: string | null
          id?: number | null
          most_outstanding_player?: string | null
          runner_up?: string | null
          score?: string | null
          year?: number | null
        }
        Update: {
          champion?: string | null
          coach?: string | null
          division?: string | null
          id?: number | null
          most_outstanding_player?: string | null
          runner_up?: string | null
          score?: string | null
          year?: number | null
        }
        Relationships: []
      }
      nfl_connections_puzzles: {
        Row: {
          created_at: string
          groups_json: Json
          id: number
          puzzle_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          groups_json: Json
          id?: never
          puzzle_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          groups_json?: Json
          id?: never
          puzzle_id?: string
          sort_order?: number
        }
        Relationships: []
      }
      nfl_defense_stats: {
        Row: {
          age_range: string | null
          created_at: string | null
          games: number | null
          games_started: number | null
          id: number
          person_key: string | null
          player_name: string
          position: string | null
          teams: string | null
          year_from: number | null
          year_to: number | null
        }
        Insert: {
          age_range?: string | null
          created_at?: string | null
          games?: number | null
          games_started?: number | null
          id?: number
          person_key?: string | null
          player_name: string
          position?: string | null
          teams?: string | null
          year_from?: number | null
          year_to?: number | null
        }
        Update: {
          age_range?: string | null
          created_at?: string | null
          games?: number | null
          games_started?: number | null
          id?: number
          person_key?: string | null
          player_name?: string
          position?: string | null
          teams?: string | null
          year_from?: number | null
          year_to?: number | null
        }
        Relationships: []
      }
      nfl_draft_picks: {
        Row: {
          college: string | null
          id: number
          pick: number | null
          player_name: string
          position: string | null
          round: number | null
          team: string | null
          year: number
        }
        Insert: {
          college?: string | null
          id?: number
          pick?: number | null
          player_name: string
          position?: string | null
          round?: number | null
          team?: string | null
          year: number
        }
        Update: {
          college?: string | null
          id?: number
          pick?: number | null
          player_name?: string
          position?: string | null
          round?: number | null
          team?: string | null
          year?: number
        }
        Relationships: []
      }
      nfl_player_team_stints: {
        Row: {
          college: string | null
          debut_age: number | null
          debut_season: number | null
          first_season: number | null
          id: number
          last_season: number | null
          person_key: string | null
          player_name: string | null
          position: string | null
          seasons: number | null
          team: string | null
        }
        Insert: {
          college?: string | null
          debut_age?: number | null
          debut_season?: number | null
          first_season?: number | null
          id?: number
          last_season?: number | null
          person_key?: string | null
          player_name?: string | null
          position?: string | null
          seasons?: number | null
          team?: string | null
        }
        Update: {
          college?: string | null
          debut_age?: number | null
          debut_season?: number | null
          first_season?: number | null
          id?: number
          last_season?: number | null
          person_key?: string | null
          player_name?: string | null
          position?: string | null
          seasons?: number | null
          team?: string | null
        }
        Relationships: []
      }
      nfl_qb_passing_leaders: {
        Row: {
          age_range: string | null
          from_year: number
          games: number | null
          games_started: number | null
          interceptions: number | null
          losses: number | null
          passing_tds: number
          passing_yards: number | null
          person_key: string | null
          player_name: string
          rank: number
          teams: string | null
          ties: number | null
          to_year: number
          wins: number | null
        }
        Insert: {
          age_range?: string | null
          from_year: number
          games?: number | null
          games_started?: number | null
          interceptions?: number | null
          losses?: number | null
          passing_tds: number
          passing_yards?: number | null
          person_key?: string | null
          player_name: string
          rank: number
          teams?: string | null
          ties?: number | null
          to_year: number
          wins?: number | null
        }
        Update: {
          age_range?: string | null
          from_year?: number
          games?: number | null
          games_started?: number | null
          interceptions?: number | null
          losses?: number | null
          passing_tds?: number
          passing_yards?: number | null
          person_key?: string | null
          player_name?: string
          rank?: number
          teams?: string | null
          ties?: number | null
          to_year?: number
          wins?: number | null
        }
        Relationships: []
      }
      nfl_rb_stats: {
        Row: {
          age_range: string | null
          attempts: number | null
          created_at: string | null
          games: number | null
          games_started: number | null
          id: number
          person_key: string | null
          player_name: string
          position: string | null
          rushing_yards: number | null
          rushing_yards2: number | null
          teams: string | null
          touchdowns: number | null
          yards_per_attempt: number | null
          yards_per_game: number | null
          year_from: number | null
          year_to: number | null
        }
        Insert: {
          age_range?: string | null
          attempts?: number | null
          created_at?: string | null
          games?: number | null
          games_started?: number | null
          id?: number
          person_key?: string | null
          player_name: string
          position?: string | null
          rushing_yards?: number | null
          rushing_yards2?: number | null
          teams?: string | null
          touchdowns?: number | null
          yards_per_attempt?: number | null
          yards_per_game?: number | null
          year_from?: number | null
          year_to?: number | null
        }
        Update: {
          age_range?: string | null
          attempts?: number | null
          created_at?: string | null
          games?: number | null
          games_started?: number | null
          id?: number
          person_key?: string | null
          player_name?: string
          position?: string | null
          rushing_yards?: number | null
          rushing_yards2?: number | null
          teams?: string | null
          touchdowns?: number | null
          yards_per_attempt?: number | null
          yards_per_game?: number | null
          year_from?: number | null
          year_to?: number | null
        }
        Relationships: []
      }
      nfl_team_achievements: {
        Row: {
          abbr: string | null
          achievement_type: string | null
          detail: string | null
          id: number
          team_name: string | null
          year: number | null
        }
        Insert: {
          abbr?: string | null
          achievement_type?: string | null
          detail?: string | null
          id?: number
          team_name?: string | null
          year?: number | null
        }
        Update: {
          abbr?: string | null
          achievement_type?: string | null
          detail?: string | null
          id?: number
          team_name?: string | null
          year?: number | null
        }
        Relationships: []
      }
      nfl_team_codes: {
        Row: {
          franchise: string
          team_code: string
          team_name: string
        }
        Insert: {
          franchise: string
          team_code: string
          team_name: string
        }
        Update: {
          franchise?: string
          team_code?: string
          team_name?: string
        }
        Relationships: []
      }
      nfl_team_defense: {
        Row: {
          abbr: string
          def_rank: number
          games: number
          ints: number
          rating: number
          sacks: number
          tdpg: number
          year: number
          ypg: number
        }
        Insert: {
          abbr: string
          def_rank: number
          games: number
          ints: number
          rating: number
          sacks: number
          tdpg: number
          year: number
          ypg: number
        }
        Update: {
          abbr?: string
          def_rank?: number
          games?: number
          ints?: number
          rating?: number
          sacks?: number
          tdpg?: number
          year?: number
          ypg?: number
        }
        Relationships: []
      }
      nfl_team_metadata: {
        Row: {
          abbr: string | null
          city: string | null
          conference: string | null
          division: string | null
          founded: number | null
          id: number
          latitude: number | null
          longitude: number | null
          primary_color: string | null
          secondary_color: string | null
          state: string | null
          team_name: string | null
        }
        Insert: {
          abbr?: string | null
          city?: string | null
          conference?: string | null
          division?: string | null
          founded?: number | null
          id?: number
          latitude?: number | null
          longitude?: number | null
          primary_color?: string | null
          secondary_color?: string | null
          state?: string | null
          team_name?: string | null
        }
        Update: {
          abbr?: string | null
          city?: string | null
          conference?: string | null
          division?: string | null
          founded?: number | null
          id?: number
          latitude?: number | null
          longitude?: number | null
          primary_color?: string | null
          secondary_color?: string | null
          state?: string | null
          team_name?: string | null
        }
        Relationships: []
      }
      nfl_team_seasons: {
        Row: {
          abbr: string | null
          division_finish: string | null
          head_coach: string | null
          id: number
          losses: number | null
          playoff_result: string | null
          team_name: string | null
          ties: number | null
          wins: number | null
          year: number | null
        }
        Insert: {
          abbr?: string | null
          division_finish?: string | null
          head_coach?: string | null
          id?: number
          losses?: number | null
          playoff_result?: string | null
          team_name?: string | null
          ties?: number | null
          wins?: number | null
          year?: number | null
        }
        Update: {
          abbr?: string | null
          division_finish?: string | null
          head_coach?: string | null
          id?: number
          losses?: number | null
          playoff_result?: string | null
          team_name?: string | null
          ties?: number | null
          wins?: number | null
          year?: number | null
        }
        Relationships: []
      }
      nfl_wr_te_stats: {
        Row: {
          age_range: string | null
          created_at: string | null
          games: number | null
          games_started: number | null
          id: number
          person_key: string | null
          player_name: string
          position: string | null
          receiving_yards: number | null
          receptions: number | null
          targets: number | null
          teams: string | null
          touchdowns: number | null
          yards_per_game: number | null
          yards_per_reception: number | null
          year_from: number | null
          year_to: number | null
        }
        Insert: {
          age_range?: string | null
          created_at?: string | null
          games?: number | null
          games_started?: number | null
          id?: number
          person_key?: string | null
          player_name: string
          position?: string | null
          receiving_yards?: number | null
          receptions?: number | null
          targets?: number | null
          teams?: string | null
          touchdowns?: number | null
          yards_per_game?: number | null
          yards_per_reception?: number | null
          year_from?: number | null
          year_to?: number | null
        }
        Update: {
          age_range?: string | null
          created_at?: string | null
          games?: number | null
          games_started?: number | null
          id?: number
          person_key?: string | null
          player_name?: string
          position?: string | null
          receiving_yards?: number | null
          receptions?: number | null
          targets?: number | null
          teams?: string | null
          touchdowns?: number | null
          yards_per_game?: number | null
          yards_per_reception?: number | null
          year_from?: number | null
          year_to?: number | null
        }
        Relationships: []
      }
      nflfastr_player_stats: {
        Row: {
          air_yards_share: string | null
          attempts: string | null
          carries: string | null
          completions: string | null
          dakota: string | null
          fantasy_points: string | null
          fantasy_points_ppr: string | null
          headshot_url: string | null
          id: number
          interceptions: string | null
          opponent_team: string | null
          pacr: string | null
          passing_2pt_conversions: string | null
          passing_air_yards: string | null
          passing_epa: string | null
          passing_first_downs: string | null
          passing_tds: string | null
          passing_yards: string | null
          passing_yards_after_catch: string | null
          person_key: string | null
          player_display_name: string | null
          player_id: string | null
          player_name: string | null
          position: string | null
          position_group: string | null
          racr: string | null
          receiving_2pt_conversions: string | null
          receiving_air_yards: string | null
          receiving_epa: string | null
          receiving_first_downs: string | null
          receiving_fumbles: string | null
          receiving_fumbles_lost: string | null
          receiving_tds: string | null
          receiving_yards: string | null
          receiving_yards_after_catch: string | null
          recent_team: string | null
          receptions: string | null
          rushing_2pt_conversions: string | null
          rushing_epa: string | null
          rushing_first_downs: string | null
          rushing_fumbles: string | null
          rushing_fumbles_lost: string | null
          rushing_tds: string | null
          rushing_yards: string | null
          sack_fumbles: string | null
          sack_fumbles_lost: string | null
          sack_yards: string | null
          sacks: string | null
          season: string | null
          season_type: string | null
          special_teams_tds: string | null
          target_share: string | null
          targets: string | null
          week: string | null
          wopr: string | null
        }
        Insert: {
          air_yards_share?: string | null
          attempts?: string | null
          carries?: string | null
          completions?: string | null
          dakota?: string | null
          fantasy_points?: string | null
          fantasy_points_ppr?: string | null
          headshot_url?: string | null
          id?: number
          interceptions?: string | null
          opponent_team?: string | null
          pacr?: string | null
          passing_2pt_conversions?: string | null
          passing_air_yards?: string | null
          passing_epa?: string | null
          passing_first_downs?: string | null
          passing_tds?: string | null
          passing_yards?: string | null
          passing_yards_after_catch?: string | null
          person_key?: string | null
          player_display_name?: string | null
          player_id?: string | null
          player_name?: string | null
          position?: string | null
          position_group?: string | null
          racr?: string | null
          receiving_2pt_conversions?: string | null
          receiving_air_yards?: string | null
          receiving_epa?: string | null
          receiving_first_downs?: string | null
          receiving_fumbles?: string | null
          receiving_fumbles_lost?: string | null
          receiving_tds?: string | null
          receiving_yards?: string | null
          receiving_yards_after_catch?: string | null
          recent_team?: string | null
          receptions?: string | null
          rushing_2pt_conversions?: string | null
          rushing_epa?: string | null
          rushing_first_downs?: string | null
          rushing_fumbles?: string | null
          rushing_fumbles_lost?: string | null
          rushing_tds?: string | null
          rushing_yards?: string | null
          sack_fumbles?: string | null
          sack_fumbles_lost?: string | null
          sack_yards?: string | null
          sacks?: string | null
          season?: string | null
          season_type?: string | null
          special_teams_tds?: string | null
          target_share?: string | null
          targets?: string | null
          week?: string | null
          wopr?: string | null
        }
        Update: {
          air_yards_share?: string | null
          attempts?: string | null
          carries?: string | null
          completions?: string | null
          dakota?: string | null
          fantasy_points?: string | null
          fantasy_points_ppr?: string | null
          headshot_url?: string | null
          id?: number
          interceptions?: string | null
          opponent_team?: string | null
          pacr?: string | null
          passing_2pt_conversions?: string | null
          passing_air_yards?: string | null
          passing_epa?: string | null
          passing_first_downs?: string | null
          passing_tds?: string | null
          passing_yards?: string | null
          passing_yards_after_catch?: string | null
          person_key?: string | null
          player_display_name?: string | null
          player_id?: string | null
          player_name?: string | null
          position?: string | null
          position_group?: string | null
          racr?: string | null
          receiving_2pt_conversions?: string | null
          receiving_air_yards?: string | null
          receiving_epa?: string | null
          receiving_first_downs?: string | null
          receiving_fumbles?: string | null
          receiving_fumbles_lost?: string | null
          receiving_tds?: string | null
          receiving_yards?: string | null
          receiving_yards_after_catch?: string | null
          recent_team?: string | null
          receptions?: string | null
          rushing_2pt_conversions?: string | null
          rushing_epa?: string | null
          rushing_first_downs?: string | null
          rushing_fumbles?: string | null
          rushing_fumbles_lost?: string | null
          rushing_tds?: string | null
          rushing_yards?: string | null
          sack_fumbles?: string | null
          sack_fumbles_lost?: string | null
          sack_yards?: string | null
          sacks?: string | null
          season?: string | null
          season_type?: string | null
          special_teams_tds?: string | null
          target_share?: string | null
          targets?: string | null
          week?: string | null
          wopr?: string | null
        }
        Relationships: []
      }
      nflfastr_rosters: {
        Row: {
          birth_date: string | null
          college: string | null
          depth_chart_position: string | null
          draft_club: string | null
          draft_number: string | null
          entry_year: string | null
          esb_id: string | null
          espn_id: string | null
          fantasy_data_id: string | null
          first_name: string | null
          football_name: string | null
          full_name: string | null
          game_type: string | null
          gsis_id: string | null
          gsis_it_id: string | null
          headshot_url: string | null
          height: string | null
          id: number
          jersey_number: string | null
          last_name: string | null
          ngs_position: string | null
          person_key: string | null
          pff_id: string | null
          pfr_id: string | null
          position: string | null
          rookie_year: string | null
          rotowire_id: string | null
          season: string | null
          sleeper_id: string | null
          smart_id: string | null
          sportradar_id: string | null
          status: string | null
          status_description_abbr: string | null
          team: string | null
          week: string | null
          weight: string | null
          yahoo_id: string | null
          years_exp: string | null
        }
        Insert: {
          birth_date?: string | null
          college?: string | null
          depth_chart_position?: string | null
          draft_club?: string | null
          draft_number?: string | null
          entry_year?: string | null
          esb_id?: string | null
          espn_id?: string | null
          fantasy_data_id?: string | null
          first_name?: string | null
          football_name?: string | null
          full_name?: string | null
          game_type?: string | null
          gsis_id?: string | null
          gsis_it_id?: string | null
          headshot_url?: string | null
          height?: string | null
          id?: number
          jersey_number?: string | null
          last_name?: string | null
          ngs_position?: string | null
          person_key?: string | null
          pff_id?: string | null
          pfr_id?: string | null
          position?: string | null
          rookie_year?: string | null
          rotowire_id?: string | null
          season?: string | null
          sleeper_id?: string | null
          smart_id?: string | null
          sportradar_id?: string | null
          status?: string | null
          status_description_abbr?: string | null
          team?: string | null
          week?: string | null
          weight?: string | null
          yahoo_id?: string | null
          years_exp?: string | null
        }
        Update: {
          birth_date?: string | null
          college?: string | null
          depth_chart_position?: string | null
          draft_club?: string | null
          draft_number?: string | null
          entry_year?: string | null
          esb_id?: string | null
          espn_id?: string | null
          fantasy_data_id?: string | null
          first_name?: string | null
          football_name?: string | null
          full_name?: string | null
          game_type?: string | null
          gsis_id?: string | null
          gsis_it_id?: string | null
          headshot_url?: string | null
          height?: string | null
          id?: number
          jersey_number?: string | null
          last_name?: string | null
          ngs_position?: string | null
          person_key?: string | null
          pff_id?: string | null
          pfr_id?: string | null
          position?: string | null
          rookie_year?: string | null
          rotowire_id?: string | null
          season?: string | null
          sleeper_id?: string | null
          smart_id?: string | null
          sportradar_id?: string | null
          status?: string | null
          status_description_abbr?: string | null
          team?: string | null
          week?: string | null
          weight?: string | null
          yahoo_id?: string | null
          years_exp?: string | null
        }
        Relationships: []
      }
      nflfastr_team_stats: {
        Row: {
          attempts: string | null
          carries: string | null
          completions: string | null
          def_fumbles: string | null
          def_fumbles_forced: string | null
          def_interception_yards: string | null
          def_interceptions: string | null
          def_pass_defended: string | null
          def_qb_hits: string | null
          def_sack_yards: string | null
          def_sacks: string | null
          def_safeties: string | null
          def_tackle_assists: string | null
          def_tackles_for_loss: string | null
          def_tackles_for_loss_yards: string | null
          def_tackles_solo: string | null
          def_tackles_with_assist: string | null
          def_tds: string | null
          fg_att: string | null
          fg_blocked: string | null
          fg_blocked_distance: string | null
          fg_blocked_list: string | null
          fg_long: string | null
          fg_made: string | null
          fg_made_0_19: string | null
          fg_made_20_29: string | null
          fg_made_30_39: string | null
          fg_made_40_49: string | null
          fg_made_50_59: string | null
          fg_made_60_: string | null
          fg_made_distance: string | null
          fg_made_list: string | null
          fg_missed: string | null
          fg_missed_0_19: string | null
          fg_missed_20_29: string | null
          fg_missed_30_39: string | null
          fg_missed_40_49: string | null
          fg_missed_50_59: string | null
          fg_missed_60_: string | null
          fg_missed_distance: string | null
          fg_missed_list: string | null
          fg_pct: string | null
          fumble_recovery_opp: string | null
          fumble_recovery_own: string | null
          fumble_recovery_tds: string | null
          fumble_recovery_yards_opp: string | null
          fumble_recovery_yards_own: string | null
          games: string | null
          gwfg_att: string | null
          gwfg_blocked: string | null
          gwfg_distance_list: string | null
          gwfg_made: string | null
          gwfg_missed: string | null
          id: number
          kickoff_return_yards: string | null
          kickoff_returns: string | null
          misc_yards: string | null
          passing_2pt_conversions: string | null
          passing_air_yards: string | null
          passing_cpoe: string | null
          passing_epa: string | null
          passing_first_downs: string | null
          passing_interceptions: string | null
          passing_tds: string | null
          passing_yards: string | null
          passing_yards_after_catch: string | null
          pat_att: string | null
          pat_blocked: string | null
          pat_made: string | null
          pat_missed: string | null
          pat_pct: string | null
          penalties: string | null
          penalty_yards: string | null
          punt_return_yards: string | null
          punt_returns: string | null
          receiving_2pt_conversions: string | null
          receiving_air_yards: string | null
          receiving_epa: string | null
          receiving_first_downs: string | null
          receiving_fumbles: string | null
          receiving_fumbles_lost: string | null
          receiving_tds: string | null
          receiving_yards: string | null
          receiving_yards_after_catch: string | null
          receptions: string | null
          rushing_2pt_conversions: string | null
          rushing_epa: string | null
          rushing_first_downs: string | null
          rushing_fumbles: string | null
          rushing_fumbles_lost: string | null
          rushing_tds: string | null
          rushing_yards: string | null
          sack_fumbles: string | null
          sack_fumbles_lost: string | null
          sack_yards_lost: string | null
          sacks_suffered: string | null
          season: string | null
          season_type: string | null
          special_teams_tds: string | null
          targets: string | null
          team: string | null
          timeouts: string | null
        }
        Insert: {
          attempts?: string | null
          carries?: string | null
          completions?: string | null
          def_fumbles?: string | null
          def_fumbles_forced?: string | null
          def_interception_yards?: string | null
          def_interceptions?: string | null
          def_pass_defended?: string | null
          def_qb_hits?: string | null
          def_sack_yards?: string | null
          def_sacks?: string | null
          def_safeties?: string | null
          def_tackle_assists?: string | null
          def_tackles_for_loss?: string | null
          def_tackles_for_loss_yards?: string | null
          def_tackles_solo?: string | null
          def_tackles_with_assist?: string | null
          def_tds?: string | null
          fg_att?: string | null
          fg_blocked?: string | null
          fg_blocked_distance?: string | null
          fg_blocked_list?: string | null
          fg_long?: string | null
          fg_made?: string | null
          fg_made_0_19?: string | null
          fg_made_20_29?: string | null
          fg_made_30_39?: string | null
          fg_made_40_49?: string | null
          fg_made_50_59?: string | null
          fg_made_60_?: string | null
          fg_made_distance?: string | null
          fg_made_list?: string | null
          fg_missed?: string | null
          fg_missed_0_19?: string | null
          fg_missed_20_29?: string | null
          fg_missed_30_39?: string | null
          fg_missed_40_49?: string | null
          fg_missed_50_59?: string | null
          fg_missed_60_?: string | null
          fg_missed_distance?: string | null
          fg_missed_list?: string | null
          fg_pct?: string | null
          fumble_recovery_opp?: string | null
          fumble_recovery_own?: string | null
          fumble_recovery_tds?: string | null
          fumble_recovery_yards_opp?: string | null
          fumble_recovery_yards_own?: string | null
          games?: string | null
          gwfg_att?: string | null
          gwfg_blocked?: string | null
          gwfg_distance_list?: string | null
          gwfg_made?: string | null
          gwfg_missed?: string | null
          id?: number
          kickoff_return_yards?: string | null
          kickoff_returns?: string | null
          misc_yards?: string | null
          passing_2pt_conversions?: string | null
          passing_air_yards?: string | null
          passing_cpoe?: string | null
          passing_epa?: string | null
          passing_first_downs?: string | null
          passing_interceptions?: string | null
          passing_tds?: string | null
          passing_yards?: string | null
          passing_yards_after_catch?: string | null
          pat_att?: string | null
          pat_blocked?: string | null
          pat_made?: string | null
          pat_missed?: string | null
          pat_pct?: string | null
          penalties?: string | null
          penalty_yards?: string | null
          punt_return_yards?: string | null
          punt_returns?: string | null
          receiving_2pt_conversions?: string | null
          receiving_air_yards?: string | null
          receiving_epa?: string | null
          receiving_first_downs?: string | null
          receiving_fumbles?: string | null
          receiving_fumbles_lost?: string | null
          receiving_tds?: string | null
          receiving_yards?: string | null
          receiving_yards_after_catch?: string | null
          receptions?: string | null
          rushing_2pt_conversions?: string | null
          rushing_epa?: string | null
          rushing_first_downs?: string | null
          rushing_fumbles?: string | null
          rushing_fumbles_lost?: string | null
          rushing_tds?: string | null
          rushing_yards?: string | null
          sack_fumbles?: string | null
          sack_fumbles_lost?: string | null
          sack_yards_lost?: string | null
          sacks_suffered?: string | null
          season?: string | null
          season_type?: string | null
          special_teams_tds?: string | null
          targets?: string | null
          team?: string | null
          timeouts?: string | null
        }
        Update: {
          attempts?: string | null
          carries?: string | null
          completions?: string | null
          def_fumbles?: string | null
          def_fumbles_forced?: string | null
          def_interception_yards?: string | null
          def_interceptions?: string | null
          def_pass_defended?: string | null
          def_qb_hits?: string | null
          def_sack_yards?: string | null
          def_sacks?: string | null
          def_safeties?: string | null
          def_tackle_assists?: string | null
          def_tackles_for_loss?: string | null
          def_tackles_for_loss_yards?: string | null
          def_tackles_solo?: string | null
          def_tackles_with_assist?: string | null
          def_tds?: string | null
          fg_att?: string | null
          fg_blocked?: string | null
          fg_blocked_distance?: string | null
          fg_blocked_list?: string | null
          fg_long?: string | null
          fg_made?: string | null
          fg_made_0_19?: string | null
          fg_made_20_29?: string | null
          fg_made_30_39?: string | null
          fg_made_40_49?: string | null
          fg_made_50_59?: string | null
          fg_made_60_?: string | null
          fg_made_distance?: string | null
          fg_made_list?: string | null
          fg_missed?: string | null
          fg_missed_0_19?: string | null
          fg_missed_20_29?: string | null
          fg_missed_30_39?: string | null
          fg_missed_40_49?: string | null
          fg_missed_50_59?: string | null
          fg_missed_60_?: string | null
          fg_missed_distance?: string | null
          fg_missed_list?: string | null
          fg_pct?: string | null
          fumble_recovery_opp?: string | null
          fumble_recovery_own?: string | null
          fumble_recovery_tds?: string | null
          fumble_recovery_yards_opp?: string | null
          fumble_recovery_yards_own?: string | null
          games?: string | null
          gwfg_att?: string | null
          gwfg_blocked?: string | null
          gwfg_distance_list?: string | null
          gwfg_made?: string | null
          gwfg_missed?: string | null
          id?: number
          kickoff_return_yards?: string | null
          kickoff_returns?: string | null
          misc_yards?: string | null
          passing_2pt_conversions?: string | null
          passing_air_yards?: string | null
          passing_cpoe?: string | null
          passing_epa?: string | null
          passing_first_downs?: string | null
          passing_interceptions?: string | null
          passing_tds?: string | null
          passing_yards?: string | null
          passing_yards_after_catch?: string | null
          pat_att?: string | null
          pat_blocked?: string | null
          pat_made?: string | null
          pat_missed?: string | null
          pat_pct?: string | null
          penalties?: string | null
          penalty_yards?: string | null
          punt_return_yards?: string | null
          punt_returns?: string | null
          receiving_2pt_conversions?: string | null
          receiving_air_yards?: string | null
          receiving_epa?: string | null
          receiving_first_downs?: string | null
          receiving_fumbles?: string | null
          receiving_fumbles_lost?: string | null
          receiving_tds?: string | null
          receiving_yards?: string | null
          receiving_yards_after_catch?: string | null
          receptions?: string | null
          rushing_2pt_conversions?: string | null
          rushing_epa?: string | null
          rushing_first_downs?: string | null
          rushing_fumbles?: string | null
          rushing_fumbles_lost?: string | null
          rushing_tds?: string | null
          rushing_yards?: string | null
          sack_fumbles?: string | null
          sack_fumbles_lost?: string | null
          sack_yards_lost?: string | null
          sacks_suffered?: string | null
          season?: string | null
          season_type?: string | null
          special_teams_tds?: string | null
          targets?: string | null
          team?: string | null
          timeouts?: string | null
        }
        Relationships: []
      }
      nhl_connections_puzzles: {
        Row: {
          created_at: string
          groups_json: Json
          id: number
          puzzle_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          groups_json: Json
          id?: never
          puzzle_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          groups_json?: Json
          id?: never
          puzzle_id?: string
          sort_order?: number
        }
        Relationships: []
      }
      nhl_draft: {
        Row: {
          amateur_team: string | null
          id: number
          nationality: string | null
          pick: number | null
          player: string | null
          position: string | null
          round: number | null
          team: string | null
          year: number | null
        }
        Insert: {
          amateur_team?: string | null
          id?: number
          nationality?: string | null
          pick?: number | null
          player?: string | null
          position?: string | null
          round?: number | null
          team?: string | null
          year?: number | null
        }
        Update: {
          amateur_team?: string | null
          id?: number
          nationality?: string | null
          pick?: number | null
          player?: string | null
          position?: string | null
          round?: number | null
          team?: string | null
          year?: number | null
        }
        Relationships: []
      }
      nhl_draft_picks: {
        Row: {
          id: number
          nationality: string | null
          pick: number | null
          player_name: string
          position: string | null
          prior_team: string | null
          round: number | null
          team: string | null
          year: number
        }
        Insert: {
          id?: number
          nationality?: string | null
          pick?: number | null
          player_name: string
          position?: string | null
          prior_team?: string | null
          round?: number | null
          team?: string | null
          year: number
        }
        Update: {
          id?: number
          nationality?: string | null
          pick?: number | null
          player_name?: string
          position?: string | null
          prior_team?: string | null
          round?: number | null
          team?: string | null
          year?: number
        }
        Relationships: []
      }
      nhl_player_stats: {
        Row: {
          age_range: string | null
          assists: number | null
          blocks: number | null
          created_at: string | null
          evg: number | null
          fo_pct: number | null
          fol: number | null
          fow: number | null
          games: number | null
          goals: number | null
          gwg: number | null
          hits: number | null
          id: number
          person_key: string | null
          pim: number | null
          player_name: string
          plus_minus: number | null
          points: number | null
          position: string | null
          ppg: number | null
          shg: number | null
          shot_pct: number | null
          shots: number | null
          teams: string | null
          toi: string | null
          year_from: string | null
          year_to: string | null
        }
        Insert: {
          age_range?: string | null
          assists?: number | null
          blocks?: number | null
          created_at?: string | null
          evg?: number | null
          fo_pct?: number | null
          fol?: number | null
          fow?: number | null
          games?: number | null
          goals?: number | null
          gwg?: number | null
          hits?: number | null
          id?: number
          person_key?: string | null
          pim?: number | null
          player_name: string
          plus_minus?: number | null
          points?: number | null
          position?: string | null
          ppg?: number | null
          shg?: number | null
          shot_pct?: number | null
          shots?: number | null
          teams?: string | null
          toi?: string | null
          year_from?: string | null
          year_to?: string | null
        }
        Update: {
          age_range?: string | null
          assists?: number | null
          blocks?: number | null
          created_at?: string | null
          evg?: number | null
          fo_pct?: number | null
          fol?: number | null
          fow?: number | null
          games?: number | null
          goals?: number | null
          gwg?: number | null
          hits?: number | null
          id?: number
          person_key?: string | null
          pim?: number | null
          player_name?: string
          plus_minus?: number | null
          points?: number | null
          position?: string | null
          ppg?: number | null
          shg?: number | null
          shot_pct?: number | null
          shots?: number | null
          teams?: string | null
          toi?: string | null
          year_from?: string | null
          year_to?: string | null
        }
        Relationships: []
      }
      nhl_players: {
        Row: {
          birth_country: string | null
          birth_date: string | null
          full_name: string | null
          height: string | null
          id: number
          jersey_number: number | null
          player_id: number | null
          position: string | null
          shoots: string | null
          team: string | null
          weight: number | null
        }
        Insert: {
          birth_country?: string | null
          birth_date?: string | null
          full_name?: string | null
          height?: string | null
          id?: number
          jersey_number?: number | null
          player_id?: number | null
          position?: string | null
          shoots?: string | null
          team?: string | null
          weight?: number | null
        }
        Update: {
          birth_country?: string | null
          birth_date?: string | null
          full_name?: string | null
          height?: string | null
          id?: number
          jersey_number?: number | null
          player_id?: number | null
          position?: string | null
          shoots?: string | null
          team?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      olympic_medalists: {
        Row: {
          athlete_name: string | null
          country: string | null
          event_name: string | null
          host_city: string | null
          id: number
          medal: string
          season: string
          sport: string | null
          year: number
        }
        Insert: {
          athlete_name?: string | null
          country?: string | null
          event_name?: string | null
          host_city?: string | null
          id?: number
          medal: string
          season: string
          sport?: string | null
          year: number
        }
        Update: {
          athlete_name?: string | null
          country?: string | null
          event_name?: string | null
          host_city?: string | null
          id?: number
          medal?: string
          season?: string
          sport?: string | null
          year?: number
        }
        Relationships: []
      }
      olympic_medals: {
        Row: {
          athlete: string | null
          country: string | null
          event: string | null
          games: string | null
          id: number
          medal: string | null
          season: string | null
          sport: string | null
          year: number | null
        }
        Insert: {
          athlete?: string | null
          country?: string | null
          event?: string | null
          games?: string | null
          id?: number
          medal?: string | null
          season?: string | null
          sport?: string | null
          year?: number | null
        }
        Update: {
          athlete?: string | null
          country?: string | null
          event?: string | null
          games?: string | null
          id?: number
          medal?: string | null
          season?: string | null
          sport?: string | null
          year?: number | null
        }
        Relationships: []
      }
      overrated_votes: {
        Row: {
          created_at: string
          id: string
          player_name: string
          user_id: string | null
          vote: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          player_name: string
          user_id?: string | null
          vote: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          player_name?: string
          user_id?: string | null
          vote?: string
          year?: number
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
          name_folded: string | null
          nationality: string | null
          person_key: string | null
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
          id?: number
          market_value_usd?: number | null
          matches?: number | null
          nationality?: string | null
          person_key?: string | null
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
          person_key?: string | null
          player_name?: string | null
          position?: string | null
          rank?: number | null
          red_cards?: number | null
          year?: number | null
          yellow_cards?: number | null
        }
        Relationships: []
      }
      poll_votes: {
        Row: {
          choice: string
          created_at: string
          id: number
          poll_key: string
        }
        Insert: {
          choice: string
          created_at?: string
          id?: never
          poll_key: string
        }
        Update: {
          choice?: string
          created_at?: string
          id?: never
          poll_key?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          streak_state: Json
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          streak_state?: Json
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          streak_state?: Json
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
      rarity_round_guesses: {
        Row: {
          answer: string
          category_key: string
          created_at: string
          id: number
          picked_on: string
        }
        Insert: {
          answer: string
          category_key: string
          created_at?: string
          id?: never
          picked_on?: string
        }
        Update: {
          answer?: string
          category_key?: string
          created_at?: string
          id?: never
          picked_on?: string
        }
        Relationships: []
      }
      rugby_championships: {
        Row: {
          competition: string | null
          host: string | null
          id: number
          runner_up: string | null
          winner: string | null
          year: number | null
        }
        Insert: {
          competition?: string | null
          host?: string | null
          id?: number
          runner_up?: string | null
          winner?: string | null
          year?: number | null
        }
        Update: {
          competition?: string | null
          host?: string | null
          id?: number
          runner_up?: string | null
          winner?: string | null
          year?: number | null
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
          bracket_data: Json
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
      soccer_awards: {
        Row: {
          award_name: string
          club_or_team: string | null
          competition_or_league: string | null
          id: number
          nationality: string | null
          notes: string | null
          winner_name: string
          year: number
        }
        Insert: {
          award_name: string
          club_or_team?: string | null
          competition_or_league?: string | null
          id?: number
          nationality?: string | null
          notes?: string | null
          winner_name: string
          year: number
        }
        Update: {
          award_name?: string
          club_or_team?: string | null
          competition_or_league?: string | null
          id?: number
          nationality?: string | null
          notes?: string | null
          winner_name?: string
          year?: number
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
      soccer_continental_finals: {
        Row: {
          competition: string
          id: number
          loser: string | null
          motm: string | null
          score: string | null
          venue: string | null
          winner: string
          year: number
        }
        Insert: {
          competition: string
          id?: number
          loser?: string | null
          motm?: string | null
          score?: string | null
          venue?: string | null
          winner: string
          year: number
        }
        Update: {
          competition?: string
          id?: number
          loser?: string | null
          motm?: string | null
          score?: string | null
          venue?: string | null
          winner?: string
          year?: number
        }
        Relationships: []
      }
      soccer_domestic_cup_finals: {
        Row: {
          competition: string
          country: string | null
          id: number
          loser: string | null
          score: string | null
          winner: string
          year: number
        }
        Insert: {
          competition: string
          country?: string | null
          id?: number
          loser?: string | null
          score?: string | null
          winner: string
          year: number
        }
        Update: {
          competition?: string
          country?: string | null
          id?: number
          loser?: string | null
          score?: string | null
          winner?: string
          year?: number
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
      soccer_league_champions: {
        Row: {
          champion: string | null
          id: number
          league: string | null
          runner_up: string | null
          top_scorer: string | null
          year: number | null
        }
        Insert: {
          champion?: string | null
          id?: number
          league?: string | null
          runner_up?: string | null
          top_scorer?: string | null
          year?: number | null
        }
        Update: {
          champion?: string | null
          id?: number
          league?: string | null
          runner_up?: string | null
          top_scorer?: string | null
          year?: number | null
        }
        Relationships: []
      }
      soccer_league_top_scorers: {
        Row: {
          club: string | null
          goals: number | null
          id: number
          league: string | null
          player: string | null
          season: string | null
        }
        Insert: {
          club?: string | null
          goals?: number | null
          id?: number
          league?: string | null
          player?: string | null
          season?: string | null
        }
        Update: {
          club?: string | null
          goals?: number | null
          id?: number
          league?: string | null
          player?: string | null
          season?: string | null
        }
        Relationships: []
      }
      soccer_player_career_paths: {
        Row: {
          appearances: number | null
          club: string | null
          goals: number | null
          id: number
          nationality: string | null
          person_key: string | null
          player_name: string | null
          position: string | null
          wiki_url: string | null
          year_end: number | null
          year_start: number | null
        }
        Insert: {
          appearances?: number | null
          club?: string | null
          goals?: number | null
          id?: number
          nationality?: string | null
          person_key?: string | null
          player_name?: string | null
          position?: string | null
          wiki_url?: string | null
          year_end?: number | null
          year_start?: number | null
        }
        Update: {
          appearances?: number | null
          club?: string | null
          goals?: number | null
          id?: number
          nationality?: string | null
          person_key?: string | null
          player_name?: string | null
          position?: string | null
          wiki_url?: string | null
          year_end?: number | null
          year_start?: number | null
        }
        Relationships: []
      }
      soccer_player_careers_expanded: {
        Row: {
          career_appearances: number | null
          career_clubs: string | null
          career_goals: number | null
          current_club: string | null
          date_of_birth: string | null
          height: string | null
          id: number
          international_caps: number | null
          international_goals: number | null
          nationality: string | null
          person_key: string | null
          player_name: string | null
          position: string | null
          wiki_url: string | null
        }
        Insert: {
          career_appearances?: number | null
          career_clubs?: string | null
          career_goals?: number | null
          current_club?: string | null
          date_of_birth?: string | null
          height?: string | null
          id?: number
          international_caps?: number | null
          international_goals?: number | null
          nationality?: string | null
          person_key?: string | null
          player_name?: string | null
          position?: string | null
          wiki_url?: string | null
        }
        Update: {
          career_appearances?: number | null
          career_clubs?: string | null
          career_goals?: number | null
          current_club?: string | null
          date_of_birth?: string | null
          height?: string | null
          id?: number
          international_caps?: number | null
          international_goals?: number | null
          nationality?: string | null
          person_key?: string | null
          player_name?: string | null
          position?: string | null
          wiki_url?: string | null
        }
        Relationships: []
      }
      soccer_player_club_stints: {
        Row: {
          club: string | null
          debut_age: number | null
          debut_year: number | null
          first_year: number | null
          id: number
          last_year: number | null
          nationality: string | null
          person_key: string | null
          player_name: string | null
          position: string | null
          seasons: number | null
        }
        Insert: {
          club?: string | null
          debut_age?: number | null
          debut_year?: number | null
          first_year?: number | null
          id?: number
          last_year?: number | null
          nationality?: string | null
          person_key?: string | null
          player_name?: string | null
          position?: string | null
          seasons?: number | null
        }
        Update: {
          club?: string | null
          debut_age?: number | null
          debut_year?: number | null
          first_year?: number | null
          id?: number
          last_year?: number | null
          nationality?: string | null
          person_key?: string | null
          player_name?: string | null
          position?: string | null
          seasons?: number | null
        }
        Relationships: []
      }
      soccer_player_facts: {
        Row: {
          birthplace: string | null
          date_of_birth: string | null
          full_name: string | null
          height: string | null
          id: number
          international_caps: number | null
          international_goals: number | null
          international_team: string | null
          player_name: string | null
          position: string | null
          preferred_foot: string | null
          signature_skill: string | null
          trophies: string | null
          wiki_url: string | null
        }
        Insert: {
          birthplace?: string | null
          date_of_birth?: string | null
          full_name?: string | null
          height?: string | null
          id?: number
          international_caps?: number | null
          international_goals?: number | null
          international_team?: string | null
          player_name?: string | null
          position?: string | null
          preferred_foot?: string | null
          signature_skill?: string | null
          trophies?: string | null
          wiki_url?: string | null
        }
        Update: {
          birthplace?: string | null
          date_of_birth?: string | null
          full_name?: string | null
          height?: string | null
          id?: number
          international_caps?: number | null
          international_goals?: number | null
          international_team?: string | null
          player_name?: string | null
          position?: string | null
          preferred_foot?: string | null
          signature_skill?: string | null
          trophies?: string | null
          wiki_url?: string | null
        }
        Relationships: []
      }
      sports_awards: {
        Row: {
          award_name: string
          id: number
          league: string | null
          notes: string | null
          position: string | null
          sport: string
          team: string | null
          winner_name: string
          year: number
        }
        Insert: {
          award_name: string
          id?: number
          league?: string | null
          notes?: string | null
          position?: string | null
          sport: string
          team?: string | null
          winner_name: string
          year: number
        }
        Update: {
          award_name?: string
          id?: number
          league?: string | null
          notes?: string | null
          position?: string | null
          sport?: string
          team?: string | null
          winner_name?: string
          year?: number
        }
        Relationships: []
      }
      stanley_cup_finals: {
        Row: {
          conn_smythe: string | null
          id: number
          loser: string | null
          series_result: string | null
          winner: string
          winning_coach: string | null
          year: number
        }
        Insert: {
          conn_smythe?: string | null
          id?: number
          loser?: string | null
          series_result?: string | null
          winner: string
          winning_coach?: string | null
          year: number
        }
        Update: {
          conn_smythe?: string | null
          id?: number
          loser?: string | null
          series_result?: string | null
          winner?: string
          winning_coach?: string | null
          year?: number
        }
        Relationships: []
      }
      stanley_cup_finals_v2: {
        Row: {
          conn_smythe_winner: string | null
          id: number
          loser: string | null
          series_result: string | null
          winner: string | null
          year: number | null
        }
        Insert: {
          conn_smythe_winner?: string | null
          id?: number
          loser?: string | null
          series_result?: string | null
          winner?: string | null
          year?: number | null
        }
        Update: {
          conn_smythe_winner?: string | null
          id?: number
          loser?: string | null
          series_result?: string | null
          winner?: string | null
          year?: number | null
        }
        Relationships: []
      }
      stanley_cup_finals_v2_bak_20260715: {
        Row: {
          conn_smythe_winner: string | null
          id: number | null
          loser: string | null
          series_result: string | null
          winner: string | null
          year: number | null
        }
        Insert: {
          conn_smythe_winner?: string | null
          id?: number | null
          loser?: string | null
          series_result?: string | null
          winner?: string | null
          year?: number | null
        }
        Update: {
          conn_smythe_winner?: string | null
          id?: number | null
          loser?: string | null
          series_result?: string | null
          winner?: string | null
          year?: number | null
        }
        Relationships: []
      }
      stat_leaders: {
        Row: {
          id: number
          league: string | null
          player_name: string
          sport: string
          stat_category: string
          stat_value: string | null
          team: string | null
          year: number
        }
        Insert: {
          id?: number
          league?: string | null
          player_name: string
          sport: string
          stat_category: string
          stat_value?: string | null
          team?: string | null
          year: number
        }
        Update: {
          id?: number
          league?: string | null
          player_name?: string
          sport?: string
          stat_category?: string
          stat_value?: string | null
          team?: string | null
          year?: number
        }
        Relationships: []
      }
      super_bowls: {
        Row: {
          city: string | null
          id: number
          loser: string | null
          loser_score: number | null
          mvp: string | null
          sb_number: string
          venue: string | null
          winner: string
          winner_score: number | null
          year: number
        }
        Insert: {
          city?: string | null
          id?: number
          loser?: string | null
          loser_score?: number | null
          mvp?: string | null
          sb_number: string
          venue?: string | null
          winner: string
          winner_score?: number | null
          year: number
        }
        Update: {
          city?: string | null
          id?: number
          loser?: string | null
          loser_score?: number | null
          mvp?: string | null
          sb_number?: string
          venue?: string | null
          winner?: string
          winner_score?: number | null
          year?: number
        }
        Relationships: []
      }
      super_bowls_bak_20260715: {
        Row: {
          city: string | null
          id: number | null
          loser: string | null
          loser_score: number | null
          mvp: string | null
          sb_number: string | null
          venue: string | null
          winner: string | null
          winner_score: number | null
          year: number | null
        }
        Insert: {
          city?: string | null
          id?: number | null
          loser?: string | null
          loser_score?: number | null
          mvp?: string | null
          sb_number?: string | null
          venue?: string | null
          winner?: string | null
          winner_score?: number | null
          year?: number | null
        }
        Update: {
          city?: string | null
          id?: number | null
          loser?: string | null
          loser_score?: number | null
          mvp?: string | null
          sb_number?: string | null
          venue?: string | null
          winner?: string | null
          winner_score?: number | null
          year?: number | null
        }
        Relationships: []
      }
      tennis_career_titles: {
        Row: {
          grand_slam_titles: number | null
          id: number
          player: string | null
          total_titles: number | null
          tour: string | null
          weeks_at_no1: number | null
        }
        Insert: {
          grand_slam_titles?: number | null
          id?: number
          player?: string | null
          total_titles?: number | null
          tour?: string | null
          weeks_at_no1?: number | null
        }
        Update: {
          grand_slam_titles?: number | null
          id?: number
          player?: string | null
          total_titles?: number | null
          tour?: string | null
          weeks_at_no1?: number | null
        }
        Relationships: []
      }
      tennis_chain_scores: {
        Row: {
          chain_length: number
          created_at: string
          id: string
          mode: string | null
          nickname: string
          score: number
        }
        Insert: {
          chain_length?: number
          created_at?: string
          id?: string
          mode?: string | null
          nickname: string
          score?: number
        }
        Update: {
          chain_length?: number
          created_at?: string
          id?: string
          mode?: string | null
          nickname?: string
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
      tennis_grand_slam_winners: {
        Row: {
          category: string | null
          champion: string | null
          id: number
          runner_up: string | null
          score: string | null
          tournament: string | null
          year: number | null
        }
        Insert: {
          category?: string | null
          champion?: string | null
          id?: number
          runner_up?: string | null
          score?: string | null
          tournament?: string | null
          year?: number | null
        }
        Update: {
          category?: string | null
          champion?: string | null
          id?: number
          runner_up?: string | null
          score?: string | null
          tournament?: string | null
          year?: number | null
        }
        Relationships: []
      }
      tennis_grand_slam_winners_bak_20260715: {
        Row: {
          category: string | null
          champion: string | null
          id: number | null
          runner_up: string | null
          score: string | null
          tournament: string | null
          year: number | null
        }
        Insert: {
          category?: string | null
          champion?: string | null
          id?: number | null
          runner_up?: string | null
          score?: string | null
          tournament?: string | null
          year?: number | null
        }
        Update: {
          category?: string | null
          champion?: string | null
          id?: number | null
          runner_up?: string | null
          score?: string | null
          tournament?: string | null
          year?: number | null
        }
        Relationships: []
      }
      tennis_grand_slams: {
        Row: {
          champion: string | null
          division: string | null
          runner_up: string | null
          tournament: string | null
          year: number | null
        }
        Insert: {
          champion?: string | null
          division?: string | null
          runner_up?: string | null
          tournament?: string | null
          year?: number | null
        }
        Update: {
          champion?: string | null
          division?: string | null
          runner_up?: string | null
          tournament?: string | null
          year?: number | null
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
      tennis_players_bak_20260708: {
        Row: {
          common_names: string[] | null
          created_at: string | null
          difficulty: string | null
          famous_moment_hint: string | null
          id: string | null
          nationality_era_hint: string | null
          player_name: string | null
          slam_count_hint: string | null
          slam_detail_hint: string | null
          tour_hint: string | null
          vibe_word: string | null
        }
        Insert: {
          common_names?: string[] | null
          created_at?: string | null
          difficulty?: string | null
          famous_moment_hint?: string | null
          id?: string | null
          nationality_era_hint?: string | null
          player_name?: string | null
          slam_count_hint?: string | null
          slam_detail_hint?: string | null
          tour_hint?: string | null
          vibe_word?: string | null
        }
        Update: {
          common_names?: string[] | null
          created_at?: string | null
          difficulty?: string | null
          famous_moment_hint?: string | null
          id?: string | null
          nationality_era_hint?: string | null
          player_name?: string | null
          slam_count_hint?: string | null
          slam_detail_hint?: string | null
          tour_hint?: string | null
          vibe_word?: string | null
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
      tennis_tour_winners: {
        Row: {
          category: string | null
          division: string | null
          id: number
          runner_up: string | null
          surface: string | null
          tour: string
          tournament: string
          winner: string
          year: number
        }
        Insert: {
          category?: string | null
          division?: string | null
          id?: number
          runner_up?: string | null
          surface?: string | null
          tour: string
          tournament: string
          winner: string
          year: number
        }
        Update: {
          category?: string | null
          division?: string | null
          id?: number
          runner_up?: string | null
          surface?: string | null
          tour?: string
          tournament?: string
          winner?: string
          year?: number
        }
        Relationships: []
      }
      tennis_year_end_no1: {
        Row: {
          id: number
          nationality: string | null
          player: string | null
          tour: string | null
          year: number | null
        }
        Insert: {
          id?: number
          nationality?: string | null
          player?: string | null
          tour?: string | null
          year?: number | null
        }
        Update: {
          id?: number
          nationality?: string | null
          player?: string | null
          tour?: string | null
          year?: number | null
        }
        Relationships: []
      }
      tennis_year_end_rankings: {
        Row: {
          id: number
          nationality: string | null
          player_name: string
          points: number | null
          rank: number
          tour: string
          year: number
        }
        Insert: {
          id?: number
          nationality?: string | null
          player_name: string
          points?: number | null
          rank: number
          tour: string
          year: number
        }
        Update: {
          id?: number
          nationality?: string | null
          player_name?: string
          points?: number | null
          rank?: number
          tour?: string
          year?: number
        }
        Relationships: []
      }
      tier_list_votes: {
        Row: {
          created_at: string
          id: string
          player_name: string
          tier: string
          user_id: string | null
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          player_name: string
          tier: string
          user_id?: string | null
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          player_name?: string
          tier?: string
          user_id?: string | null
          year?: number
        }
        Relationships: []
      }
      transfer_grade_votes: {
        Row: {
          created_at: string
          grade: string
          id: string
          move_year: number
          player_name: string
          to_club: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          grade: string
          id?: string
          move_year: number
          player_name: string
          to_club: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          grade?: string
          id?: string
          move_year?: number
          player_name?: string
          to_club?: string
          user_id?: string | null
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
      transfer_path_puzzles_backup_20260710: {
        Row: {
          created_at: string | null
          hint: string | null
          id: string | null
          min_steps: number | null
          player_a: string | null
          player_b: string | null
          puzzle_id: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          hint?: string | null
          id?: string | null
          min_steps?: number | null
          player_a?: string | null
          player_b?: string | null
          puzzle_id?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          hint?: string | null
          id?: string | null
          min_steps?: number | null
          player_a?: string | null
          player_b?: string | null
          puzzle_id?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      trophy_winners: {
        Row: {
          id: number
          result: string
          team_name: string
          team_type: string
          trophy_name: string
          year: number
        }
        Insert: {
          id?: number
          result: string
          team_name: string
          team_type: string
          trophy_name: string
          year: number
        }
        Update: {
          id?: number
          result?: string
          team_name?: string
          team_type?: string
          trophy_name?: string
          year?: number
        }
        Relationships: []
      }
      ucl_top_scorers_by_season: {
        Row: {
          club: string | null
          goals: number | null
          id: number
          player: string | null
          season: string | null
        }
        Insert: {
          club?: string | null
          goals?: number | null
          id?: number
          player?: string | null
          season?: string | null
        }
        Update: {
          club?: string | null
          goals?: number | null
          id?: number
          player?: string | null
          season?: string | null
        }
        Relationships: []
      }
      ufc_chain_scores: {
        Row: {
          chain_length: number
          created_at: string
          id: string
          mode: string | null
          nickname: string
          score: number
        }
        Insert: {
          chain_length?: number
          created_at?: string
          id?: string
          mode?: string | null
          nickname: string
          score?: number
        }
        Update: {
          chain_length?: number
          created_at?: string
          id?: string
          mode?: string | null
          nickname?: string
          score?: number
        }
        Relationships: []
      }
      ufc_champions: {
        Row: {
          champion_name: string
          id: number
          reign_end: string | null
          reign_number: number | null
          reign_start: string | null
          title_defenses: number | null
          weight_class: string
        }
        Insert: {
          champion_name: string
          id?: number
          reign_end?: string | null
          reign_number?: number | null
          reign_start?: string | null
          title_defenses?: number | null
          weight_class: string
        }
        Update: {
          champion_name?: string
          id?: number
          reign_end?: string | null
          reign_number?: number | null
          reign_start?: string | null
          title_defenses?: number | null
          weight_class?: string
        }
        Relationships: []
      }
      ufc_fights: {
        Row: {
          event_date: string | null
          event_name: string | null
          fighter_1: string
          fighter_2: string
          id: number
          is_title_fight: boolean | null
          method: string | null
          round: number | null
          time_in_round: string | null
          weight_class: string | null
          winner: string | null
        }
        Insert: {
          event_date?: string | null
          event_name?: string | null
          fighter_1: string
          fighter_2: string
          id?: number
          is_title_fight?: boolean | null
          method?: string | null
          round?: number | null
          time_in_round?: string | null
          weight_class?: string | null
          winner?: string | null
        }
        Update: {
          event_date?: string | null
          event_name?: string | null
          fighter_1?: string
          fighter_2?: string
          id?: number
          is_title_fight?: boolean | null
          method?: string | null
          round?: number | null
          time_in_round?: string | null
          weight_class?: string | null
          winner?: string | null
        }
        Relationships: []
      }
      ufc_fights_v2: {
        Row: {
          event_date: string | null
          event_name: string | null
          id: number
          loser: string | null
          method: string | null
          notes: string | null
          round: number | null
          time: string | null
          weight_class: string | null
          winner: string | null
        }
        Insert: {
          event_date?: string | null
          event_name?: string | null
          id?: number
          loser?: string | null
          method?: string | null
          notes?: string | null
          round?: number | null
          time?: string | null
          weight_class?: string | null
          winner?: string | null
        }
        Update: {
          event_date?: string | null
          event_name?: string | null
          id?: number
          loser?: string | null
          method?: string | null
          notes?: string | null
          round?: number | null
          time?: string | null
          weight_class?: string | null
          winner?: string | null
        }
        Relationships: []
      }
      user_best_scores: {
        Row: {
          achieved_at: string
          best_score: number
          created_at: string
          game_type: string
          id: string
          user_id: string
        }
        Insert: {
          achieved_at?: string
          best_score?: number
          created_at?: string
          game_type: string
          id?: string
          user_id: string
        }
        Update: {
          achieved_at?: string
          best_score?: number
          created_at?: string
          game_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_game_scores: {
        Row: {
          correct_answers: number
          created_at: string
          game_type: string
          id: string
          puzzle_date: string | null
          score: number
          user_id: string
        }
        Insert: {
          correct_answers?: number
          created_at?: string
          game_type: string
          id?: string
          puzzle_date?: string | null
          score?: number
          user_id: string
        }
        Update: {
          correct_answers?: number
          created_at?: string
          game_type?: string
          id?: string
          puzzle_date?: string | null
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
          created_at: string
          current_streak: number
          games_played_today: number
          id: string
          last_played_at: string | null
          longest_streak: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          games_played_today?: number
          id?: string
          last_played_at?: string | null
          longest_streak?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          games_played_today?: number
          id?: string
          last_played_at?: string | null
          longest_streak?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wnba_draft_picks: {
        Row: {
          college_or_country: string | null
          id: number
          pick: number | null
          player_name: string
          round: number | null
          team: string | null
          year: number
        }
        Insert: {
          college_or_country?: string | null
          id?: number
          pick?: number | null
          player_name: string
          round?: number | null
          team?: string | null
          year: number
        }
        Update: {
          college_or_country?: string | null
          id?: number
          pick?: number | null
          player_name?: string
          round?: number | null
          team?: string | null
          year?: number
        }
        Relationships: []
      }
      wnba_finals: {
        Row: {
          finals_mvp: string | null
          id: number
          loser: string | null
          series_result: string | null
          winner: string
          year: number
        }
        Insert: {
          finals_mvp?: string | null
          id?: number
          loser?: string | null
          series_result?: string | null
          winner: string
          year: number
        }
        Update: {
          finals_mvp?: string | null
          id?: number
          loser?: string | null
          series_result?: string | null
          winner?: string
          year?: number
        }
        Relationships: []
      }
      wnba_finals_bak_20260715: {
        Row: {
          finals_mvp: string | null
          id: number | null
          loser: string | null
          series_result: string | null
          winner: string | null
          year: number | null
        }
        Insert: {
          finals_mvp?: string | null
          id?: number | null
          loser?: string | null
          series_result?: string | null
          winner?: string | null
          year?: number | null
        }
        Update: {
          finals_mvp?: string | null
          id?: number | null
          loser?: string | null
          series_result?: string | null
          winner?: string | null
          year?: number | null
        }
        Relationships: []
      }
      world_cup_matches: {
        Row: {
          away_score: number | null
          away_team: string
          competition: string
          home_score: number | null
          home_team: string
          id: number
          match_date: string | null
          notes: string | null
          round: string | null
          venue: string | null
          year: number
        }
        Insert: {
          away_score?: number | null
          away_team: string
          competition: string
          home_score?: number | null
          home_team: string
          id?: number
          match_date?: string | null
          notes?: string | null
          round?: string | null
          venue?: string | null
          year: number
        }
        Update: {
          away_score?: number | null
          away_team?: string
          competition?: string
          home_score?: number | null
          home_team?: string
          id?: number
          match_date?: string | null
          notes?: string | null
          round?: string | null
          venue?: string | null
          year?: number
        }
        Relationships: []
      }
      world_cup_player_stats: {
        Row: {
          appearances: number
          assists: number | null
          goals: number
          id: number
          minutes_played: number | null
          nationality: string
          own_goals: number
          player_name: string
          red_cards: number
          world_cup_year: number
          yellow_cards: number
        }
        Insert: {
          appearances?: number
          assists?: number | null
          goals?: number
          id?: number
          minutes_played?: number | null
          nationality: string
          own_goals?: number
          player_name: string
          red_cards?: number
          world_cup_year: number
          yellow_cards?: number
        }
        Update: {
          appearances?: number
          assists?: number | null
          goals?: number
          id?: number
          minutes_played?: number | null
          nationality?: string
          own_goals?: number
          player_name?: string
          red_cards?: number
          world_cup_year?: number
          yellow_cards?: number
        }
        Relationships: []
      }
      world_cup_players: {
        Row: {
          caps: number
          club: string
          date_of_birth: string
          goals: number
          id: number
          nationality: string
          player_name: string
          position: string
          squad_number: number
          world_cup_year: number
        }
        Insert: {
          caps: number
          club: string
          date_of_birth: string
          goals: number
          id?: number
          nationality: string
          player_name: string
          position: string
          squad_number: number
          world_cup_year: number
        }
        Update: {
          caps?: number
          club?: string
          date_of_birth?: string
          goals?: number
          id?: number
          nationality?: string
          player_name?: string
          position?: string
          squad_number?: number
          world_cup_year?: number
        }
        Relationships: []
      }
      world_records: {
        Row: {
          athlete_name: string
          date_set: string | null
          discipline: string | null
          event: string
          id: number
          is_current: boolean | null
          nationality: string | null
          record_value: string | null
          sport: string
          venue: string | null
        }
        Insert: {
          athlete_name: string
          date_set?: string | null
          discipline?: string | null
          event: string
          id?: number
          is_current?: boolean | null
          nationality?: string | null
          record_value?: string | null
          sport: string
          venue?: string | null
        }
        Update: {
          athlete_name?: string
          date_set?: string | null
          discipline?: string | null
          event?: string
          id?: number
          is_current?: boolean | null
          nationality?: string | null
          record_value?: string | null
          sport?: string
          venue?: string | null
        }
        Relationships: []
      }
      world_series: {
        Row: {
          id: number
          loser: string | null
          series_result: string | null
          winner: string
          winning_manager: string | null
          ws_mvp: string | null
          year: number
        }
        Insert: {
          id?: number
          loser?: string | null
          series_result?: string | null
          winner: string
          winning_manager?: string | null
          ws_mvp?: string | null
          year: number
        }
        Update: {
          id?: number
          loser?: string | null
          series_result?: string | null
          winner?: string
          winning_manager?: string | null
          ws_mvp?: string | null
          year?: number
        }
        Relationships: []
      }
      world_series_v2: {
        Row: {
          id: number
          loser: string | null
          mvp: string | null
          series_result: string | null
          winner: string | null
          year: number | null
        }
        Insert: {
          id?: number
          loser?: string | null
          mvp?: string | null
          series_result?: string | null
          winner?: string | null
          year?: number | null
        }
        Update: {
          id?: number
          loser?: string | null
          mvp?: string | null
          series_result?: string | null
          winner?: string | null
          year?: number | null
        }
        Relationships: []
      }
      world_series_v2_bak_20260715: {
        Row: {
          id: number | null
          loser: string | null
          mvp: string | null
          series_result: string | null
          winner: string | null
          year: number | null
        }
        Insert: {
          id?: number | null
          loser?: string | null
          mvp?: string | null
          series_result?: string | null
          winner?: string | null
          year?: number | null
        }
        Update: {
          id?: number | null
          loser?: string | null
          mvp?: string | null
          series_result?: string | null
          winner?: string | null
          year?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      eligible_nba_players: {
        Row: {
          college: string | null
          country: string | null
          draft_year: number | null
          latest_team: string | null
          player_id: number | null
          player_name: string | null
          position: string | null
        }
        Relationships: []
      }
      eligible_nfl_players: {
        Row: {
          college: string | null
          gsis_id: string | null
          latest_team: string | null
          player_name: string | null
          position: string | null
          rookie_year: string | null
          years_exp: string | null
        }
        Relationships: []
      }
      eligible_nhl_players: {
        Row: {
          games: number | null
          player_name: string | null
          points: number | null
          position: string | null
          teams: string | null
          year_from: string | null
          year_to: string | null
        }
        Relationships: []
      }
      eligible_soccer_players: {
        Row: {
          latest_club: string | null
          nationality: string | null
          peak_market_value_usd: number | null
          peak_value_year: number | null
          player_name: string | null
          position: string | null
        }
        Relationships: []
      }
      game_player_pool: {
        Row: {
          age: number | null
          assists: number | null
          club: string | null
          goals: number | null
          market_value_usd: number | null
          matches: number | null
          nationality: string | null
          player_name: string | null
          position: string | null
          value_band: string | null
          value_millions: number | null
          year: number | null
        }
        Insert: {
          age?: number | null
          assists?: number | null
          club?: string | null
          goals?: number | null
          market_value_usd?: number | null
          matches?: number | null
          nationality?: string | null
          player_name?: string | null
          position?: string | null
          value_band?: never
          value_millions?: never
          year?: number | null
        }
        Update: {
          age?: number | null
          assists?: number | null
          club?: string | null
          goals?: number | null
          market_value_usd?: number | null
          matches?: number | null
          nationality?: string | null
          player_name?: string | null
          position?: string | null
          value_band?: never
          value_millions?: never
          year?: number | null
        }
        Relationships: []
      }
      jeopardy_clues: {
        Row: {
          answer: string | null
          category: string | null
          clue: string | null
          clue_id: string | null
          event_year: number | null
          value: number | null
        }
        Relationships: []
      }
      mlb_grid_players: {
        Row: {
          first_year: number | null
          franchises: string | null
          games: number | null
          hits: number | null
          hrs: number | null
          last_year: number | null
          player_name: string | null
          playerid: string | null
        }
        Relationships: []
      }
      player_market_tracked: {
        Row: {
          age: number | null
          assists: number | null
          club: string | null
          final_value_usd: number | null
          final_year: number | null
          goals: number | null
          id: number | null
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
        Relationships: []
      }
      player_market_values_dedup: {
        Row: {
          age: number | null
          assists: number | null
          club: string | null
          goals: number | null
          id: number | null
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
        Relationships: []
      }
      rebuild_clubs: {
        Row: {
          club: string | null
          squad_size: number | null
          squad_value_m: number | null
          tier: string | null
        }
        Relationships: []
      }
      transfer_grade_pool: {
        Row: {
          actual_grade: string | null
          from_club: string | null
          move_year: number | null
          nationality: string | null
          pct_change: number | null
          player_name: string | null
          position: string | null
          to_club: string | null
          value_after: number | null
          value_at_move: number | null
          value_band: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_rarity_tier: { Args: { percentile_rank: number }; Returns: string }
      audit_name_columns: {
        Args: never
        Returns: {
          bad_rows: number
          column_name: string
          pct_bad: number
          sample_bad: string
          table_name: string
          total_rows: number
        }[]
      }
      global_leaderboard: {
        Args: { p_games?: string[]; p_period?: string }
        Returns: {
          games_played: number
          player_name: string
          rank: number
          total_points: number
        }[]
      }
      global_rank: {
        Args: { p_games?: string[]; p_period?: string; p_player: string }
        Returns: {
          rank: number
          total_players: number
          total_points: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
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
