import { supabase } from '@/integrations/supabase/client';
import { SoccerGridPuzzle, SoccerGridAttribute } from '@/types/soccerGrid';

/**
 * Fetches all Soccer Grid puzzle definitions from Supabase, ordered by sort_order.
 * rows_json and cols_json are JSONB in Postgres — the client returns them as parsed
 * JS objects, so a direct cast to SoccerGridAttribute[] is safe.
 *
 * Returns [] on any error — the caller falls back to the hardcoded soccerGridPuzzles.
 */
export async function fetchSoccerGridPuzzles(): Promise<SoccerGridPuzzle[]> {
  try {
    const { data, error } = await supabase
      .from('soccer_grid_puzzles')
      .select('puzzle_id, rows_json, cols_json')
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) return [];

    return data.map((row) => ({
      id: row.puzzle_id,
      rows: row.rows_json as unknown as SoccerGridAttribute[],
      cols: row.cols_json as unknown as SoccerGridAttribute[],
    }));
  } catch {
    return [];
  }
}
