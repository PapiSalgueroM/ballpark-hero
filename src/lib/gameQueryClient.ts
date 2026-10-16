import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
    Tables: {
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