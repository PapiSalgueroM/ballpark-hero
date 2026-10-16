import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { Player } from '@/types/game';
import { normalizePosition } from '@/lib/squadDeal';
import { getEnrichment } from '@/data/footleEnrichment';
import { buildMarket, type MarketRow } from '@/lib/rebuildDeck';

export type ClubTier = 'elite' | 'strong' | 'mid' | 'modest';

export interface RebuildClub {
  club: string;
  squadSize: number;
  squadValueM: number;
  tier: ClubTier;
}

/**
 * Clubs with a squad complete enough to rebuild, from public.rebuild_clubs.
 *
 * That view exists because player_market_values is a top-500-per-position
 * scrape: 1,178 clubs appear but only 63 have a fillable 4-3-3 AND 18+ players.
 * The rest would give you a club with no goalkeeper. Don't query
 * player_market_values directly for the club list.
 */
export async function fetchRebuildClubs(): Promise<RebuildClub[]> {
  try {
    const { data, error } = await supabase
      .from('rebuild_clubs')
      .select('club, squad_size, squad_value_m, tier')
      .order('squad_value_m', { ascending: false });

    if (error || !data) {
      console.warn('[fetchRebuildClubs] error', error);
      return [];
    }
    return data
      .filter(r => r.club)
      .map(r => ({
        club: r.club!,
        squadSize: r.squad_size ?? 0,
        squadValueM: r.squad_value_m ?? 0,
        tier: (r.tier ?? 'modest') as ClubTier,
      }));
  } catch (err) {
    console.warn('[fetchRebuildClubs] unexpected', err);
    return [];
  }
}

/** Every 2026 player at a given club, as Players (marketValue in MILLIONS). */
export async function fetchClubSquad(club: string): Promise<Player[]> {
  try {
    const { data, error } = await supabase
      .from('player_market_values')
      .select('player_name, position, age, nationality, club, market_value_usd, goals, assists')
      .eq('year', 2026)
      .eq('club', club)
      .order('market_value_usd', { ascending: false });

    if (error || !data) return [];
    const seen = new Set<string>();
    const out: Player[] = [];
    for (const row of data) {
      const pos = normalizePosition(row.position || '');
      if (!pos || !row.player_name || seen.has(row.player_name)) continue;
      seen.add(row.player_name);
      out.push({
        name: row.player_name,
        club: row.club || club,
        nationality: row.nationality || 'Unknown',
        league: getEnrichment(row.player_name, row.club || '').league,
        goals: row.goals ?? 0,
        assists: row.assists ?? 0,
        position: pos,
        kitNumber: 0,
        age: row.age ?? 0,
        marketValue: Math.max(1, Math.round((row.market_value_usd || 1_000_000) / 1_000_000)),
        difficulty: 'easy',
      });
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * The transfer market: everyone NOT at this club.
 *
 * game_player_pool is already filtered to >= 4m because ~40% of
 * player_market_values sits at exactly 1m, that's a floor, not a valuation,
 * and a market full of identical "€1M" players would make signing
 * meaningless. See PAPER-trajectory-data-findings.md.
 *
 * Round 456: every row of the pool, not the top 900. The pager used to be
 * capped at 900 rows ordered by value, so the market's cheapest man was worth
 * 15 million and the scouts' "cheap seat" never was. The shaping lives in
 * buildMarket so the harness deals from the same market the page does.
 */
export async function fetchMarket(excludeClub: string): Promise<Player[]> {
  return marketFromRows(await fetchMarketRows(), excludeClub);
}

/** Round 461: the raw pool, fetched once, so a table of several clubs can
 *  cut one market per seat (marketFromRows) without paging the pool again
 *  for every seat. */
export async function fetchMarketRows(): Promise<MarketRow[]> {
  try {
    const { data, error } = await fetchAllRows<MarketRow>(
      (from, to) =>
        supabase
          .from('game_player_pool')
          .select('player_name, position, age, nationality, club, market_value_usd, goals, assists')
          .eq('year', 2026)
          .order('market_value_usd', { ascending: false })
          .order('player_name', { ascending: true })
          .range(from, to),
    );
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

/** The market for one club from rows already fetched: everyone not at that club. */
export function marketFromRows(rows: MarketRow[], excludeClub: string): Player[] {
  return buildMarket(rows, excludeClub, (name, club) => getEnrichment(name, club).league);
}
