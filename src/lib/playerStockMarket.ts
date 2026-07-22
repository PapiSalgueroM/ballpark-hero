import { supabase } from '@/integrations/supabase/client';
import { getTodayET, dateSeed } from '@/lib/dateUtils';

/**
 * Player Stock Market (task #36): the market shows 6 real players at a real
 * past year with their real transfermarkt-style market values (and a 3-year
 * value history sparkline). You BUY exactly 3. The market then advances one
 * real year and your portfolio return is computed from the players' actual
 * next-year market values (player_market_values, 2004-2026, ~141k rows).
 *
 * Everything is DB-derived at runtime — no authored facts. Selection is
 * seeded and deterministic for the daily (same date -> same year + cohort),
 * random for unlimited. Scoring maps your trio against all C(6,3)=20
 * possible trios: 100 = the optimal portfolio, 0 = the worst.
 *
 * Identity (task #15): resolution prefers person_key and falls back to
 * player_name. person_key is NULL for every row today, so this is a no-op now,
 * but once identities are keyed a same-named journeyman can no longer pollute a
 * star's series. Dedup/series still keep the max value per (key, year).
 */

export interface StockPlayer {
  name: string;
  club: string;
  position: string;
  age: number;
  nationality: string;
  /** Value history ending at the market year: [{year, value}], oldest first. */
  series: { year: number; value: number }[];
  /** Market value at the market year (the "price you pay"). */
  current: number;
  /** Real market value one year later (the outcome — hide until reveal). */
  next: number;
}

export interface StockRound {
  year: number;
  players: StockPlayer[];
}

export const STOCK_PICKS = 3;

// ---------------------------------------------------------------------------
// Seeded helpers
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Daily market year: 2010..2025 (next-year data exists through 2026). */
export function dailyStockSeed(): { seed: number; year: number } {
  const seed = dateSeed(getTodayET());
  return { seed, year: 2010 + (seed % 16) };
}

export function randomStockSeed(): { seed: number; year: number } {
  const seed = Math.floor(Math.random() * 2 ** 31);
  return { seed, year: 2010 + (seed % 16) };
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

export async function fetchStockRound(year: number, seed: number): Promise<StockRound | null> {
  try {
    // 1) Candidate pool: top players by value at the market year.
    const { data: poolRows, error: e1 } = await supabase
      .from('player_market_values')
      .select('person_key, player_name, club, position, age, nationality, market_value_usd')
      .eq('year', year)
      .gte('market_value_usd', 15000000)
      .order('market_value_usd', { ascending: false })
      .limit(400);
    if (e1 || !poolRows || poolRows.length < 20) {
      console.warn('[stockMarket] pool empty/error', e1);
      return null;
    }

    // Identity prefers person_key (task #15), falling back to player_name.
    // Every person_key is NULL today, so this behaves exactly like name-keying
    // now, but stays forward-compatible once identities are populated.
    const keyOf = (r: { person_key?: string | null; player_name: string }) =>
      (r.person_key && String(r.person_key).trim()) || r.player_name;

    // Dedup by identity (per-position rank duplicates exist), keep highest value.
    const seen = new Set<string>();
    const pool = poolRows.filter((r) => {
      if (!r.player_name || !r.club || !r.market_value_usd) return false;
      const k = keyOf(r);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // 2) Seeded candidate order; take 14, resolve their histories + outcomes.
    const candidates = seededShuffle(pool, seed).slice(0, 14);
    const names = candidates.map((c) => c.player_name);

    const { data: histRows, error: e2 } = await supabase
      .from('player_market_values')
      .select('person_key, player_name, year, market_value_usd')
      .in('player_name', names)
      .gte('year', year - 2)
      .lte('year', year + 1);
    if (e2 || !histRows) {
      console.warn('[stockMarket] history error', e2);
      return null;
    }

    // (key, year) -> max value, where key prefers person_key over player_name.
    const byKeyYear = new Map<string, number>();
    for (const r of histRows) {
      if (!r.player_name || !r.market_value_usd) continue;
      const k = `${keyOf(r)}|${r.year}`;
      byKeyYear.set(k, Math.max(byKeyYear.get(k) ?? 0, Number(r.market_value_usd)));
    }

    const players: StockPlayer[] = [];
    for (const c of candidates) {
      if (players.length >= 6) break;
      const ckey = keyOf(c);
      const next = byKeyYear.get(`${ckey}|${year + 1}`);
      const current = byKeyYear.get(`${ckey}|${year}`) ?? Number(c.market_value_usd);
      if (!next || !current) continue; // must have a real next-year value
      const series: { year: number; value: number }[] = [];
      for (let y = year - 2; y <= year; y++) {
        const v = byKeyYear.get(`${ckey}|${y}`);
        if (v) series.push({ year: y, value: v });
      }
      players.push({
        name: c.player_name,
        club: c.club ?? 'Unknown',
        position: c.position ?? 'Unknown',
        age: c.age ?? 0,
        nationality: c.nationality ?? 'Unknown',
        series,
        current,
        next,
      });
    }

    if (players.length < 6) {
      console.warn('[stockMarket] only', players.length, 'resolvable players for', year);
      return null;
    }
    return { year, players };
  } catch (err) {
    console.warn('[stockMarket] unexpected', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export function playerReturn(p: StockPlayer): number {
  return (p.next - p.current) / p.current;
}

export function portfolioReturn(players: StockPlayer[], picks: string[]): number {
  const chosen = players.filter((p) => picks.includes(p.name));
  if (chosen.length === 0) return 0;
  return chosen.reduce((s, p) => s + playerReturn(p), 0) / chosen.length;
}

export interface StockResult {
  yourReturn: number;
  bestReturn: number;
  worstReturn: number;
  bestPicks: string[];
  /** 0-100: where your trio lands between the worst and best possible trio. */
  score: number;
}

export function scoreRound(players: StockPlayer[], picks: string[]): StockResult {
  const combos: string[][] = [];
  for (let i = 0; i < players.length; i++)
    for (let j = i + 1; j < players.length; j++)
      for (let k = j + 1; k < players.length; k++)
        combos.push([players[i].name, players[j].name, players[k].name]);

  let best = -Infinity, worst = Infinity, bestPicks: string[] = [];
  for (const c of combos) {
    const r = portfolioReturn(players, c);
    if (r > best) { best = r; bestPicks = c; }
    if (r < worst) worst = r;
  }
  const yours = portfolioReturn(players, picks);
  const score = best === worst ? 100 : Math.round(100 * (yours - worst) / (best - worst));
  return { yourReturn: yours, bestReturn: best, worstReturn: worst, bestPicks, score: Math.max(0, Math.min(100, score)) };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatMoney(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${Math.round(v / 1e6)}M`;
  return `$${Math.round(v / 1e3)}K`;
}

export function formatPct(r: number): string {
  const pct = r * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}
