import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';
import type { ConnectionGroup } from '@/types/connections';

interface ConnectionsPuzzle {
  id: string;
  groups: ConnectionGroup[];
}

function isValidPuzzle(p: ConnectionsPuzzle): boolean {
  const all = p.groups.flatMap((g) => g.players);
  const unique = new Set(all);
  return p.groups.length === 4 && p.groups.every((g) => g.players.length === 4) && unique.size === 16;
}

/**
 * Fetches all Connections puzzle definitions from Supabase, ordered by sort_order.
 * groups_json is JSONB in Postgres, the client returns it as a parsed JS object,
 * so a direct cast to ConnectionGroup[] is safe.
 *
 * Applies the same isValidPuzzle filter used in useConnections to exclude any
 * malformed rows before they reach the hook.
 *
 * Returns [] on any error, the caller falls back to the hardcoded connectionsPuzzles.
 */
export async function fetchConnectionsPuzzles(): Promise<ConnectionsPuzzle[]> {
  try {
    // The table is past the API's 1,000-row cap (1,012 rows), a plain select
    // silently dropped the hand-crafted puzzles at the tail, so page through.
    const { data, error } = await fetchAllRows<{ puzzle_id: string; groups_json: unknown }>(
      (from, to) =>
        supabase
          .from('connections_puzzles')
          .select('puzzle_id, groups_json')
          .order('sort_order', { ascending: true })
          .range(from, to),
    );

    if (error || !data || data.length === 0) return [];

    const puzzles = data.map((row) => ({
      id: row.puzzle_id,
      groups: row.groups_json as unknown as ConnectionGroup[],
    }));

    return puzzles.filter(isValidPuzzle);
  } catch {
    return [];
  }
}
