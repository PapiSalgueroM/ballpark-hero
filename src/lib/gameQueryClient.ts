import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type MarketRow = {
  player_name: string;
  nationality: string | null;
  club: string | null;
  market_value_usd: number | null;
  year: number;
};

type VoteInsert = {
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
        Row: VoteInsert;
        Insert: VoteInsert;
        Update: Partial<VoteInsert>;
        Relationships: [];
      };
    };
    Views: {
      player_market_values_dedup: View<MarketRow>;
      game_player_pool: View<MarketRow & {
        position: string | null;
        age: number | null;
        value_millions: number | null;
        value_band: string | null;
        goals: number | null;
        assists: number | null;
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
    Functions: Record<string, never>;
  };
};

// Local query types for live relations missing from the generated schema.
// This is the same client instance, preserving its connection and session.
export const gameQueryClient = supabase as unknown as SupabaseClient<GameQueryDatabase>;