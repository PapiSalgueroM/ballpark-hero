import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type Relation<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

type MarketRow = {
  player_name: string;
  nationality: string | null;
  club: string | null;
  market_value_usd: number | null;
  year: number;
  id: number;
  person_key: string | null;
  position: string | null;
  age: number | null;
  matches: number | null;
  goals: number | null;
  assists: number | null;
  yellow_cards: number | null;
  red_cards: number | null;
};

type GameDatabase = {
  public: {
    Tables: {
      transfer_grade_votes: Relation<{
        player_name: string;
        move_year: number;
        to_club: string;
        grade: string;
      }>;
      player_market_values_dedup: Relation<MarketRow>;
      player_market_values: Relation<MarketRow>;
      player_market_tracked: Relation<MarketRow & { final_year: number; final_value_usd: number }>;
      rebuild_clubs: Relation<{ club: string; squad_size: number | null; squad_value_m: number | null; tier: string | null }>;
      transfer_grade_pool: Relation<{
        player_name: string; nationality: string | null; position: string | null;
        from_club: string; to_club: string; move_year: number;
        value_at_move: number; value_after: number; pct_change: number; actual_grade: string;
      }>;
      transfer_path_puzzles: Relation<{
        puzzle_id: string; player_a: string; player_b: string; min_steps: number;
        hint: string; sort_order: number; active_min_steps: number | null;
        active_hint: string | null; europe_min_steps: number | null; europe_hint: string | null;
      }>;
      ballon_dor: Relation<{
        player_name: string; year: number; rank: number | null; nationality: string | null;
        club: string | null; award_type: string | null;
      }>;
      game_player_pool: Relation<MarketRow & {
        position: string | null;
        age: number | null;
        value_millions: number | null;
        value_band: string | null;
        goals: number | null;
        assists: number | null;
      }>;
      jeopardy_clues: Relation<{
        clue_id: string;
        category: string;
        clue: string;
        answer: string;
        event_year: number;
        value: number;
      }>;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
  };
};

// A type-only contract for live relations missing from generated preview types.
// Reuse the existing connection and session; never create a second client.
export const gameQueryClient = supabase as unknown as SupabaseClient<GameDatabase>;