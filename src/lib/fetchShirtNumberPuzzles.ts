import { supabase } from '@/integrations/supabase/client';
import { type ShirtNumberPuzzle } from '@/data/shirtNumberPuzzles';

// ---------------------------------------------------------------------------
// Fetch all shirt number puzzles from Supabase.
// Returns [] on any error — the caller (useShirtNumber.ts) falls back to the
// hardcoded shirtNumberPuzzles array in src/data/shirtNumberPuzzles.ts.
// ---------------------------------------------------------------------------
export async function fetchShirtNumberPuzzles(): Promise<ShirtNumberPuzzle[]> {
  try {
    const { data, error } = await supabase
      .from('shirt_number_puzzles')
      .select('player_name, club, league, nationality, kit_number, fun_fact')
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn('[fetchShirtNumberPuzzles] Supabase returned empty or errored — using fallback');
      return [];
    }

    return data.map(row => ({
      playerName: row.player_name,
      club: row.club,
      league: row.league,
      nationality: row.nationality,
      kitNumber: row.kit_number,
      funFact: row.fun_fact,
    }));
  } catch (err) {
    console.warn('[fetchShirtNumberPuzzles] Unexpected error:', err);
    return [];
  }
}
