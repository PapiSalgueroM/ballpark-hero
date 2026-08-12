import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';

export interface TransferValuePlayer {
  name: string;
  club: string;
  position: string;
  age: number;
  nationality: string;
  marketValue: number; // USD
  matches: number;
  goals: number;
  assists: number;
}

/**
 * Fetch top ~1500 players from player_market_values (year 2026), ordered by
 * market_value_usd desc. Deduped by player_name to avoid the per-position
 * rank duplicates that exist in the table.
 */
export async function fetchTransferValuePool(): Promise<TransferValuePlayer[]> {
  try {
    // .limit(1500) was silently capped to 1,000 rows by the API, page instead.
    const { data, error } = await fetchAllRows<{
      player_name: string; position: string | null; age: number | null;
      nationality: string | null; club: string | null;
      market_value_usd: number | null; matches: number | null;
      goals: number | null; assists: number | null;
    }>(
      (from, to) =>
        supabase
          .from('player_market_values')
          .select('player_name, position, age, nationality, club, market_value_usd, matches, goals, assists')
          .eq('year', 2026)
          .order('market_value_usd', { ascending: false })
          .range(from, to),
      1500,
    );

    if (error || !data || data.length === 0) {
      console.warn('[fetchTransferValuePool] empty/error', error);
      return [];
    }

    const seen = new Set<string>();
    const pool: TransferValuePlayer[] = [];
    for (const row of data) {
      if (!row.player_name || !row.club || !row.market_value_usd) continue;
      if (seen.has(row.player_name)) continue;
      seen.add(row.player_name);
      pool.push({
        name: row.player_name,
        club: row.club,
        position: row.position ?? 'Unknown',
        age: row.age ?? 0,
        nationality: row.nationality ?? 'Unknown',
        marketValue: Number(row.market_value_usd),
        matches: row.matches ?? 0,
        goals: row.goals ?? 0,
        assists: row.assists ?? 0,
      });
    }
    return pool;
  } catch (err) {
    console.warn('[fetchTransferValuePool] unexpected', err);
    return [];
  }
}
