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