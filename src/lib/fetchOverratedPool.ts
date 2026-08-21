import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { shuffledRange } from '@/lib/dateUtils';

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
 *     (56,660 rows) sits at exactly 1,000,000, that is a FLOOR, not a real
 *     valuation. The view filters to >= 4m. Without that filter, four in ten
 *     cards would show "£1m" for wildly different players and the whole
 *     over/under premise collapses.
 *  2. player_name alone is not a stable identity, 226 names cover two or more
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
          /* value alone is a heavily tied sort (the 2026 pool has 2,879 rows
             across only 48 distinct values), and fetchAllRows' own rule is
             that the order must be deterministic or the page cut lands
             differently per fetch. Name and nationality break every tie, so
             two fetches, and therefore two visitors and the two games that
             share this pool, always see the same 600 in the same order. */
          .order('market_value_usd', { ascending: false })
          .order('player_name', { ascending: true })
          .order('nationality', { ascending: true })
          .range(from, to),
      600,
    );

    if (error || !data || data.length === 0) {
      console.warn('[fetchOverratedPool] empty/error', error);
      return [];
    }

    // Key on name+nationality, not name alone, see note above.
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
    /* Canonical order, applied client side as well: the daily picks below
       address players by INDEX, so the mapping from index to man has to be
       identical for every visitor even if the server ever returns tied rows
       in a different order. Plain code unit compares, never localeCompare,
       which moves with the viewer's locale. */
    pool.sort((a, b) =>
      b.marketValue - a.marketValue
      || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
      || (a.nationality < b.nationality ? -1 : a.nationality > b.nationality ? 1 : 0));
    return pool;
  } catch (err) {
    console.warn('[fetchOverratedPool] unexpected', err);
    return [];
  }
}

/**
 * The daily picks for the two games that share this pool, in ONE place so
 * the rule the owner asked for on 2026-08-05 (the two dailies never show
 * the same player on the same day) is enforced by construction instead of
 * by two files mirroring each other's arithmetic.
 *
 * Round 223 replaced both games' hand rolled pickers with draws from
 * shuffledRange, the same well mixed generator the rest of the dailies
 * stand on, after a measured year showed the old walk was the Round 212
 * bug in a new costume: `seed * (i + 1) * 1103515245` passes 2 to the 53rd
 * for every 2026 date, the float rounds the low bits away, and after the
 * modulo the Overrated pick could only ever reach every 4th pool index and
 * the Tier List every 8th. In practice that meant 450 of the 600 pool
 * players could never appear at all, the tier list repeated yesterday's
 * board outright 17 days a year, and on a typical day only one of its
 * eight names changed, which is the exact "u are reusing people" the owner
 * reported. A full shuffle reaches the whole pool uniformly: measured over
 * the same simulated year, both games now deal an identical set to
 * yesterday's zero times and turn over about 9.8 of 10 and 7.9 of 8 names
 * a day.
 */
const OVERRATED_DAILY = 10;
const TIER_LIST_DAILY = 8;

/** The 10 pool indices Overrated or Underrated shows on an ET day. */
export function overratedDailyIndices(poolLen: number, today: string): number[] {
  if (poolLen <= 0) return [];
  return shuffledRange(poolLen, `overrated:${today}`).slice(0, Math.min(OVERRATED_DAILY, poolLen));
}

/** The 8 pool indices Tier List shows on the same day, never overlapping
    Overrated's 10, walked in its own shuffled order. */
export function tierListDailyIndices(poolLen: number, today: string): number[] {
  if (poolLen <= 0) return [];
  const taken = new Set(overratedDailyIndices(poolLen, today));
  return shuffledRange(poolLen, `tierlist:${today}`)
    .filter(i => !taken.has(i))
    .slice(0, Math.min(TIER_LIST_DAILY, Math.max(0, poolLen - taken.size)));
}
