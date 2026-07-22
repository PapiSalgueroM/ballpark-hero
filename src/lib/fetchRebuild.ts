import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { Player } from '@/types/game';
import { normalizePosition } from '@/lib/squadDeal';
import { getEnrichment } from '@/data/footleEnrichment';

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
 * Filtered to >= 4m because ~40% of player_market_values sits at exactly 1m —
 * that's a floor, not a valuation, and a market full of identical "€1M" players
 * would make signing meaningless. See PAPER-trajectory-data-findings.md.
 */
export async function fetchMarket(excludeClub: string): Promise<Player[]> {
  try {
    const { data, error } = await fetchAllRows<{
      player_name: string; position: string | null; age: number | null;
      nationality: string | null; club: string | null;
      market_value_usd: number | null; goals: number | null; assists: number | null;
    }>(
      (from, to) =>
        supabase
          .from('game_player_pool')
          .select('player_name, position, age, nationality, club, market_value_usd, goals, assists')
          .eq('year', 2026)
          .order('market_value_usd', { ascending: false })
          .range(from, to),
      900,
    );

    if (error || !data) return [];
    const seen = new Set<string>();
    const out: Player[] = [];
    for (const row of data) {
      const pos = normalizePosition(row.position || '');
      if (!pos || !row.player_name || row.club === excludeClub) continue;
      const identity = `${row.player_name}|${row.nationality ?? ''}`;
      if (seen.has(identity)) continue;
      seen.add(identity);
      out.push({
        name: row.player_name,
        club: row.club || 'Unknown',
        nationality: row.nationality || 'Unknown',
        league: getEnrichment(row.player_name, row.club || '').league,
        goals: row.goals ?? 0,
        assists: row.assists ?? 0,
        position: pos,
        kitNumber: 0,
        age: row.age ?? 0,
        marketValue: Math.max(1, Math.round((row.market_value_usd || 4_000_000) / 1_000_000)),
        difficulty: 'easy',
      });
    }
    return out;
  } catch {
    return [];
  }
}
