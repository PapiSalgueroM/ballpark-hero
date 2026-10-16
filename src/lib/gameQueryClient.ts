import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// Local contracts for live relations missing from the generated schema.
// Reuse the existing client so authentication and the live endpoint stay unchanged.
type MarketRow = {
  player_name: string;
  nationality: string | null;
  club: string | null;
  market_value_usd: number | null;
  year: number;
};

type PackRow = MarketRow & {
  position: string | null;
  age: number | null;
  value_millions: number | null;
  value_band: string | null;
  goals: number | null;
  assists: number | null;
};

type Vote = {
  player_name: string;
  move_year: number;
  to_club: string;
  grade: string;
};

type View<Row> = { Row: Row; Relationships: [] };
type GameQueryDatabase = {
  public: {
    Tables: Omit<Database['public']['Tables'], 'transfer_path_puzzles'> & {
      transfer_path_puzzles: {
        Row: {
          puzzle_id: string;
          player_a: string;
          player_b: string;
          min_steps: number;
          hint: string;
          sort_order: number;
          active_min_steps: number | null;
          active_hint: string | null;
          europe_min_steps: number | null;
          europe_hint: string | null;
        };
        Insert: Database['public']['Tables']['transfer_path_puzzles']['Insert'];
        Update: Database['public']['Tables']['transfer_path_puzzles']['Update'];
        Relationships: [];
      };
      transfer_grade_votes: {
        Row: Vote;
        Insert: Vote;
        Update: Partial<Vote>;
        Relationships: [];
      };
    };
    Views: {
      player_market_values_dedup: View<MarketRow>;
      game_player_pool: View<PackRow>;
      rebuild_clubs: View<{
        club: string;
        squad_size: number | null;
        squad_value_m: number | null;
        tier: string | null;
      }>;
      transfer_grade_pool: View<{
        player_name: string;
        nationality: string | null;
        position: string | null;
        from_club: string;
        to_club: string;
        move_year: number;
        value_at_move: number;
        value_after: number;
        pct_change: number;
        actual_grade: string;
      }>;
      jeopardy_clues: View<{
        clue_id: string;
        category: string;
        clue: string;
        answer: string;
        event_year: number;
        value: number;
      }>;
    };
    Functions: Record<never, never>;
  };
};

export const gameQueryClient = supabase as unknown as SupabaseClient<GameQueryDatabase>;