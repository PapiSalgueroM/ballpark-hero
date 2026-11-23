import { supabase } from '@/integrations/supabase/client';
import { buildXiNamesake } from '@/lib/buildXiPlayers';
import type { FilledSlot } from '@/types/lineupBuilder';

/**
 * Offline judge (2026-07-10). The AI referee (Gemini free tier) has a daily
 * quota; when it's out, Build-Your-XI and NBA Starting 5 used to dead-end
 * with "could not evaluate". These local evaluators rate squads directly
 * from the project's own data so the games ALWAYS finish with a verdict.
 *
 * Round 1555 retired the NBA half: it summed season totals as if they were
 * per game, so nearly every five clamped to 99. NBA Starting 5 is scored
 * from the record in src/lib/nbaStartingFiveScore.ts now. The soccer judge
 * below is unchanged.
 */

export interface LocalVerdict {
  rating: string;
  headline: string;
  analysis: string;
}

/* ---------------- soccer: Build Your XI ---------------- */

function soccerRating(mvUsd: number): number {
  const mvM = Math.max(1, mvUsd / 1_000_000);
  const r = 35 + 64 * (Math.log10(mvM + 1) / Math.log10(1001));
  return Math.max(35, Math.min(99, Math.round(r)));
}

async function lookupMarketValue(name: string): Promise<{ name: string; mv: number } | null> {
  try {
    const { data } = await supabase
      .from('player_market_values')
      .select('player_name, market_value_usd')
      .eq('year', 2026)
      .ilike('player_name', `%${name.trim()}%`)
      .order('market_value_usd', { ascending: false })
      .limit(1);
    if (data && data.length > 0) return { name: data[0].player_name, mv: data[0].market_value_usd };
    return null;
  } catch {
    return null;
  }
}

export async function localEvaluateSoccerXI(slots: FilledSlot[]): Promise<LocalVerdict> {
  const rated = await Promise.all(slots.map(async slot => {
    const scope = buildXiNamesake(slot.playerName, slot.pick);
    const value = slot.pick?.value;
    const picked = Boolean(scope?.person && typeof value === 'number' && Number.isFinite(value) && value > 0);
    const current = scope ? null : await lookupMarketValue(slot.playerName);
    const marketValue = picked ? value : current?.mv;
    return {
      name: scope?.person ?? current?.name ?? slot.playerName,
      rating: marketValue === undefined ? 64 : soccerRating(marketValue),
      known: marketValue !== undefined,
      picked,
      reviewed: Boolean(scope),
    };
  }));
  if (rated.some(row => row.reviewed && !row.known)) {
    return {
      rating: 'Unrated XI',
      headline: 'Missing player values',
      analysis: 'We could not match a selected player to a verified value for this lineup.',
    };
  }
  const avg = Math.round(rated.reduce((s, r) => s + r.rating, 0) / Math.max(1, rated.length));
  const sorted = [...rated].sort((a, b) => b.rating - a.rating);
  const star = sorted[0];
  const weakest = sorted[sorted.length - 1];
  const unknowns = rated.filter(r => !r.known).length;

  const band =
    avg >= 78 ? { rating: 'World Class 🏆', headline: 'A genuinely elite XI' } :
    avg >= 71 ? { rating: 'Contenders 🔥', headline: 'Built to challenge for the title' } :
    avg >= 63 ? { rating: 'Solid 💪', headline: 'European nights are realistic' } :
    avg >= 55 ? { rating: 'Mid-Table 😐', headline: 'Respectable, not feared' } :
                { rating: 'Relegation Scrap 😬', headline: 'This squad needs January signings' };

  const lines = [
    rated.some(row => row.picked) ? `Squad average ${avg} using available market values for your picks.`
      : `Squad average ${avg} on current 2026 market values.`,
    star ? `Star man: ${star.name} (${star.rating}).` : '',
    weakest && weakest !== star ? `Weak link: ${weakest.name} (${weakest.rating}).` : '',
    unknowns === 1 ? "1 pick wasn't in the value database, rated on trust."
      : unknowns > 1 ? `${unknowns} picks weren't in the value database, rated on trust.` : '',
    'Verdict by the offline judge (AI referee back soon).',
  ].filter(Boolean);

  return { rating: band.rating, headline: band.headline, analysis: lines.join(' ') };
}
