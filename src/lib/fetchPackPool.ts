import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { Player } from '@/types/game';
import { normalizePosition } from '@/lib/squadDeal';
import { getEnrichment } from '@/data/footleEnrichment';

export type PackTier = 'fringe' | 'squad' | 'quality' | 'star' | 'superstar';

export interface PackPlayer extends Player {
  tier: PackTier;
}

/**
 * Full 2026 pool for Mystery Box, bucketed by the value_band the
 * game_player_pool view already computes (fringe <5m, squad <15m,
 * quality <40m, star <80m, superstar 81m+).
 *
 * Uses game_player_pool — NOT player_market_values — so the >=4m floor filter
 * and (name, nationality) identity rules apply (see the view's comment and
 * PAPER-trajectory-data-findings.md). Unlike fetchOverratedPool this takes the
 * WHOLE year (~2,900 rows), because packs need fringe-through-superstar spread,
 * not just the famous top.
 */
export async function fetchPackPool(): Promise<PackPlayer[]> {
  try {
    const { data, error } = await fetchAllRows<{
      player_name: string; position: string | null; age: number | null;
      nationality: string | null; club: string | null;
      market_value_usd: number | null; value_millions: number | null;
      value_band: string | null; goals: number | null; assists: number | null;
    }>(
      (from, to) =>
        supabase
          .from('game_player_pool')
          .select('player_name, position, age, nationality, club, market_value_usd, value_millions, value_band, goals, assists')
          .eq('year', 2026)
          .order('market_value_usd', { ascending: false })
          .range(from, to),
      3000,
    );

    if (error || !data || data.length === 0) {
      console.warn('[fetchPackPool] empty/error', error);
      return [];
    }

    const seen = new Set<string>();
    const out: PackPlayer[] = [];
    for (const row of data) {
      const pos = normalizePosition(row.position || '');
      if (!pos || !row.player_name || !row.nationality || !row.club) continue;
      const identity = `${row.player_name}|${row.nationality}`;
      if (seen.has(identity)) continue;
      seen.add(identity);
      out.push({
        name: row.player_name,
        club: row.club,
        nationality: row.nationality,
        league: getEnrichment(row.player_name, row.club).league,
        goals: row.goals ?? 0,
        assists: row.assists ?? 0,
        position: pos,
        kitNumber: 0,
        age: row.age ?? 0,
        marketValue: Math.max(1, Number(row.value_millions ?? Math.round((row.market_value_usd ?? 4_000_000) / 1_000_000))),
        difficulty: 'easy',
        tier: (row.value_band ?? 'fringe') as PackTier,
      });
    }
    return out;
  } catch (err) {
    console.warn('[fetchPackPool] unexpected', err);
    return [];
  }
}
