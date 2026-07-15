import { supabase } from '@/integrations/supabase/client';

/**
 * Offline judge (2026-07-10). The AI referee (Gemini free tier) has a daily
 * quota; when it's out, Build-Your-XI and NBA Starting 5 used to dead-end
 * with "could not evaluate". These local evaluators rate squads directly
 * from the project's own data so the games ALWAYS finish with a verdict.
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

export async function localEvaluateSoccerXI(playerNames: string[]): Promise<LocalVerdict> {
  const found = await Promise.all(playerNames.map(lookupMarketValue));
  const rated = found
    .map((f, i) => ({ input: playerNames[i], hit: f }))
    .map(x => ({
      name: x.hit?.name ?? x.input,
      rating: x.hit ? soccerRating(x.hit.mv) : 64, // unknown = decent squad player benefit-of-doubt
      known: !!x.hit,
    }));
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
    `Squad average ${avg} on current 2026 market values.`,
    star ? `Star man: ${star.name} (${star.rating}).` : '',
    weakest && weakest !== star ? `Weak link: ${weakest.name} (${weakest.rating}).` : '',
    unknowns > 0 ? `${unknowns} pick${unknowns === 1 ? '' : 's'} weren't in the value database, rated on trust.` : '',
    'Verdict by the offline judge (AI referee back soon).',
  ].filter(Boolean);

  return { rating: band.rating, headline: band.headline, analysis: lines.join(' ') };
}

/* ---------------- NBA: Starting 5 ---------------- */

interface BrefSeasonRow {
  player_name: string;
  pts: number | null;
  trb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  minutes: number | null;
}

async function lookupPeakComposite(name: string): Promise<{ name: string; peak: number } | null> {
  try {
    const { data } = await supabase
      .from('bref_nba_player_seasons' as never)
      .select('player_name, pts, trb, ast, stl, blk, minutes')
      .ilike('player_name', `%${name.trim()}%`)
      .limit(40);
    const rows = (data ?? []) as unknown as BrefSeasonRow[];
    if (rows.length === 0) return null;
    let best = 0;
    let matched = rows[0].player_name;
    for (const r of rows) {
      const comp = (r.pts ?? 0) + 1.2 * (r.trb ?? 0) + 1.5 * (r.ast ?? 0) + 3 * ((r.stl ?? 0) + (r.blk ?? 0));
      if (comp > best) { best = comp; matched = r.player_name; }
    }
    return { name: matched, peak: best };
  } catch {
    return null;
  }
}

/** Map a peak composite (~15 role player, ~45 star, ~60+ all-timer) to 60-99. */
function nbaRating(peak: number): number {
  return Math.max(60, Math.min(99, Math.round(60 + (peak - 12) * (39 / 50))));
}

export async function localEvaluateNbaFive(playerNames: string[], challengeLabel: string): Promise<LocalVerdict> {
  const found = await Promise.all(playerNames.map(lookupPeakComposite));
  const rated = found.map((f, i) => ({
    name: f?.name ?? playerNames[i],
    rating: f ? nbaRating(f.peak) : 74,
    known: !!f,
  }));
  const avg = Math.round(rated.reduce((s, r) => s + r.rating, 0) / Math.max(1, rated.length));
  const sorted = [...rated].sort((a, b) => b.rating - a.rating);
  const unknowns = rated.filter(r => !r.known).length;

  const band =
    avg >= 90 ? { rating: 'All-Time Five 🏆', headline: 'This five hangs banners' } :
    avg >= 83 ? { rating: 'Contender Core 🔥', headline: 'Deep playoff basketball, guaranteed' } :
    avg >= 75 ? { rating: 'Playoff Team 💪', headline: 'Dangerous on the right night' } :
    avg >= 68 ? { rating: 'Play-In Bound 😐', headline: 'Talented but flawed' } :
                { rating: 'Lottery Five 😬', headline: 'Trust the process' };

  const lines = [
    `Challenge: ${challengeLabel}.`,
    `Lineup average ${avg} from career statistical peaks.`,
    `Best pick: ${sorted[0].name} (${sorted[0].rating}).`,
    sorted.length > 1 ? `Weakest link: ${sorted[sorted.length - 1].name} (${sorted[sorted.length - 1].rating}).` : '',
    unknowns > 0 ? `${unknowns} name${unknowns === 1 ? '' : 's'} missing from the stats table, rated on reputation.` : '',
    'Verdict by the offline judge (AI referee back soon).',
  ].filter(Boolean);

  return { rating: band.rating, headline: band.headline, analysis: lines.join(' ') };
}
