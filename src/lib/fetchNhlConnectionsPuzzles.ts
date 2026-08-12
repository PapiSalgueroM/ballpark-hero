import { supabase } from '@/integrations/supabase/client';
import type {
  NhlConnectionsPuzzle,
  NhlConnectionGroup,
} from '@/data/nhlConnectionsPuzzles';

function isValidPuzzle(p: NhlConnectionsPuzzle): boolean {
  const all = p.groups.flatMap((g) => g.players);
  return (
    p.groups.length === 4 &&
    p.groups.every((g) => g.players.length === 5) &&
    new Set(all).size === 20
  );
}

/**
 * Fetches all NHL Connections puzzle definitions from Supabase, ordered by
 * sort_order. Mirrors the NBA/NFL fetchers: groups_json is JSONB, returned
 * parsed by the client, with the 4×5×20-unique validity filter applied so
 * malformed rows never reach the hook. Returns [] on any error, callers
 * fall back to the hardcoded nhlConnectionsPuzzles.
 */
export async function fetchNhlConnectionsPuzzles(): Promise<NhlConnectionsPuzzle[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('nhl_connections_puzzles')
      .select('puzzle_id, groups_json')
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) return [];

    const puzzles: NhlConnectionsPuzzle[] = data.map((row: any) => ({
      id: row.puzzle_id,
      groups: row.groups_json as NhlConnectionGroup[],
    }));

    return puzzles.filter(isValidPuzzle);
  } catch {
    return [];
  }
}
