import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';

export interface OverratedPlayer {
  name: string;
  club: string;
  position: string;
  age: number;
  nationality: string;
  marketValue: number; // USD
  valueMillions: number;
  goals: number;
  assists: number;
  matches: number;
  year: number;
}

/**
 * Pool for Overrated or Underrated.
 *
 * Reads public.game_player_pool, NOT player_market_values directly. That view
 * exists because of a data investigation on 2026-07-15 and enforces two things
 * this game depends on:
 *
 *  1. market_value_usd is quantised to whole millions and ~40% of the raw table
 *     (56,660 rows) sits at exactly 1,000,000 — that is a FLOOR, not a real
 *     valuation. The view filters to >= 4m. Without that filter, four in ten
 *     cards would show "£1m" for wildly different players and the whole
 *     over/under premise collapses.
 *  2. player_name alone is not a stable identity — 226 names cover two or more
 *     real players (two Aaron Ramseys, three Adama Traorés). Identity here is
 *     (name, nationality), so the dedupe below keys on both.
 *
 * We take year 2026 and bias toward recognisable players by ordering on value,
 * because an over/under vote is only interesting if you've heard of the guy.
 */
export async function fetchOverratedPool(): Promise<OverratedPlayer[]> {
  try {
    const { data, error } = await fetchAllRows<{
      player_name: string; position: string | null; age: number | null;
      nationality: string | null; club: string | null;
      market_value_usd: number | null; value_millions: number | null;
      goals: number | null; assists: number | null; matches: number | null;
      year: number | null;
    }>(
      (from, to) =>
        supabase
          .from('game_player_pool')
          .select('player_name, position, age, nationality, club, market_value_usd, value_millions, goals, assists, matches, year')
          .eq('year', 2026)
          .order('market_value_usd', { ascending: false })
          .range(from, to),
      600,
    );

    if (error || !data || data.length === 0) {
      console.warn('[fetchOverratedPool] empty/error', error);
      return [];
    }

    // Key on name+nationality, not name alone — see note above.
    const seen = new Set<string>();
    const pool: OverratedPlayer[] = [];
    for (const row of data) {
      if (!row.player_name || !row.club || !row.market_value_usd || !row.nationality) continue;
      const identity = `${row.player_name}|${row.nationality}`;
      if (seen.has(identity)) continue;
      seen.add(identity);
      pool.push({
        name: row.player_name,
        club: row.club,
        position: row.position ?? 'Unknown',
        age: row.age ?? 0,
        nationality: row.nationality,
        marketValue: Number(row.market_value_usd),
        valueMillions: Number(row.value_millions ?? Math.round(Number(row.market_value_usd) / 1_000_000)),
        goals: row.goals ?? 0,
        assists: row.assists ?? 0,
        matches: row.matches ?? 0,
        year: row.year ?? 2026,
      });
    }
    return pool;
  } catch (err) {
    console.warn('[fetchOverratedPool] unexpected', err);
    return [];
  }
}
