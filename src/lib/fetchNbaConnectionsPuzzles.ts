import { supabase } from '@/integrations/supabase/client';
import type {
  NbaConnectionsPuzzle,
  NbaConnectionGroup,
} from '@/data/nbaConnectionsPuzzles';

function isValidPuzzle(p: NbaConnectionsPuzzle): boolean {
  const all = p.groups.flatMap((g) => g.players);
  return (
    p.groups.length === 4 &&
    p.groups.every((g) => g.players.length === 5) &&
    new Set(all).size === 20
  );
}

/**
 * Fetches all NBA Connections puzzle definitions from Supabase, ordered by
 * sort_order. Mirrors fetchBaseballConnectionsPuzzles: groups_json is JSONB,
 * returned parsed by the client. Applies the same 4×5×20-unique validity
 * filter used in useNbaConnections so malformed rows never reach the hook.
 *
 * Returns [] on any error — the caller falls back to the hardcoded
 * nbaConnectionsPuzzles. The table is not in the generated Supabase types,
 * so the query is cast to any (same approach as the other connections libs).
 */
export async function fetchNbaConnectionsPuzzles(): Promise<NbaConnectionsPuzzle[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('nba_connections_puzzles')
      .select('puzzle_id, groups_json')
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) return [];

    const puzzles: NbaConnectionsPuzzle[] = data.map((row: any) => ({
      id: row.puzzle_id,
      groups: row.groups_json as NbaConnectionGroup[],
    }));

    return puzzles.filter(isValidPuzzle);
  } catch {
    return [];
  }
}
