import { supabase } from '@/integrations/supabase/client';
import { normalizeName } from '@/lib/whoAmI';
import { positionCodes, teamNameOf } from '@/lib/statDetective';

/**
 * BLIND RANK — KOT4Q's signature format (docs/YOUTUBER_FORMATS.md).
 * 5 players revealed ONE AT A TIME; the player must commit each to a rank
 * slot immediately, no rearranging. Then the true order by the hidden stat
 * is revealed. Daily (date-seeded, same 5 for everyone) + unlimited.
 *
 * Two sports share the format:
 * - Soccer (the original): player_market_values top-200. Pool, modes and
 *   seed math are UNTOUCHED by the NBA addition, so existing daily boards
 *   never shift.
 * - NBA: bref_nba_player_seasons peak-season stats — see the NBA section
 *   at the bottom of this file.
 */

export interface RankPlayer {
  name: string;
  club: string;
  nationality: string;
  age: number;
  marketValueM: number; // millions USD
  goals: number;
  assists: number;
}

export type StatMode = 'value' | 'goals' | 'assists' | 'age';

export type Sport = 'soccer' | 'nba';

export const SPORT_EMOJI: Record<Sport, string> = { soccer: '⚽', nba: '🏀' };

/**
 * Generic over the player shape so soccer (RankPlayer, the default — keeps
 * startBenchCut.ts and every older import compiling untouched) and NBA
 * (NbaRankPlayer) share trueOrder/scoreRound and the whole page UI.
 */
export interface ModeDef<T = RankPlayer> {
  id: string;
  title: string;
  question: string;
  unit: (p: T) => string;
  stat: (p: T) => number;
  /** true = rank 1 is the HIGHEST stat */
  descending: boolean;
}

export const MODES: ModeDef[] = [
  {
    id: 'value',
    title: 'Market Value',
    question: 'Rank 1 = most valuable player (2026 market value)',
    unit: p => `$${p.marketValueM}M`,
    stat: p => p.marketValueM,
    descending: true,
  },
  {
    id: 'goals',
    title: 'Career Goals',
    question: 'Rank 1 = most career goals',
    unit: p => `${p.goals} goals`,
    stat: p => p.goals,
    descending: true,
  },
  {
    id: 'assists',
    title: 'Career Assists',
    question: 'Rank 1 = most career assists',
    unit: p => `${p.assists} assists`,
    stat: p => p.assists,
    descending: true,
  },
  {
    id: 'age',
    title: 'Age',
    question: 'Rank 1 = the YOUNGEST player',
    unit: p => `${p.age} years old`,
    stat: p => p.age,
    descending: false,
  },
];

/* ---------------- deterministic RNG for the daily puzzle ---------------- */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function daySeed(date = new Date()): number {
  // ET-anchored day number so the daily flips at the same moment as the polls
  const et = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return Math.floor(Date.UTC(et.getFullYear(), et.getMonth(), et.getDate()) / 86_400_000);
}

interface MarketRow {
  player_name: string;
  age: number;
  nationality: string;
  club: string;
  market_value_usd: number;
  goals: number | null;
  assists: number | null;
}

/** Famous top-200 by current value — recognizable names make Blind Rank fun. */
export async function fetchBlindRankPool(): Promise<RankPlayer[]> {
  try {
    const { data, error } = await supabase
      .from('player_market_values')
      .select('player_name, age, nationality, club, market_value_usd, goals, assists')
      .eq('year', 2026)
      .not('age', 'is', null)
      .order('market_value_usd', { ascending: false })
      .order('player_name', { ascending: true })
      .limit(200);
    if (error || !data) return [];
    const seen = new Set<string>();
    const pool: RankPlayer[] = [];
    for (const row of data as MarketRow[]) {
      const key = row.player_name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push({
        name: row.player_name,
        club: row.club,
        nationality: row.nationality,
        age: row.age,
        marketValueM: Math.round(row.market_value_usd / 1_000_000),
        goals: row.goals ?? 0,
        assists: row.assists ?? 0,
      });
    }
    return pool;
  } catch {
    return [];
  }
}

/**
 * Pick a mode + 5 players. Players are re-drawn until the 5 have strictly
 * distinct stat values (ties would make ranking unfair). Deterministic when
 * a seed is provided (daily), random otherwise (unlimited).
 */
export function buildRound(pool: RankPlayer[], seed?: number): { mode: ModeDef; players: RankPlayer[] } | null {
  if (pool.length < 20) return null;
  const rng = seed !== undefined ? mulberry32(seed) : Math.random;
  const mode = MODES[Math.floor(rng() * MODES.length)];
  for (let attempt = 0; attempt < 40; attempt++) {
    const picked: RankPlayer[] = [];
    const used = new Set<number>();
    while (picked.length < 5) {
      const i = Math.floor(rng() * pool.length);
      if (used.has(i)) continue;
      used.add(i);
      picked.push(pool[i]);
    }
    const stats = picked.map(mode.stat);
    if (new Set(stats).size === 5) {
      // goals/assists mode with a bunch of low numbers is boring — require spread
      const spread = Math.max(...stats) - Math.min(...stats);
      if ((mode.id === 'goals' || mode.id === 'assists') && spread < 25) continue;
      return { mode, players: picked };
    }
  }
  return null;
}

/** True ranking: array of player indices, best (rank 1) first. */
export function trueOrder<T>(players: T[], mode: ModeDef<T>): number[] {
  const idx = players.map((_, i) => i);
  idx.sort((a, b) => mode.descending
    ? mode.stat(players[b]) - mode.stat(players[a])
    : mode.stat(players[a]) - mode.stat(players[b]));
  return idx;
}

/**
 * Score: +20 per exact slot, +10 for off-by-one, perfect-board bonus +50.
 * Max 150.
 */
export function scoreRound<T>(placements: (number | null)[], players: T[], mode: ModeDef<T>): {
  total: number; exact: number; close: number; perfect: boolean; truth: number[];
} {
  const truth = trueOrder(players, mode);
  let exact = 0, close = 0;
  placements.forEach((playerIdx, slot) => {
    if (playerIdx === null) return;
    const trueSlot = truth.indexOf(playerIdx);
    if (trueSlot === slot) exact++;
    else if (Math.abs(trueSlot - slot) === 1) close++;
  });
  const perfect = exact === 5;
  const total = exact * 20 + close * 10 + (perfect ? 50 : 0);
  return { total, exact, close, perfect, truth };
}

/* ------------------------------ NBA dimension ------------------------------ */

/**
 * NBA pool: the ~150 most famous players in bref_nba_player_seasons, where
 * "famous" = best single season by the composite
 * pts + 1.2*trb + 1.5*ast + 3*(stl+blk).
 *
 * The table stores SEASON TOTALS and `games` is null on every row (verified
 * in SQL for Stat Detective on 2026-07-02, re-verified 2026-07-10), so true
 * per-game rates are impossible: every NBA mode ranks and reveals
 * single-season TOTALS with the season attached ('2,868 pts in 1987-88').
 * stl/blk are null before 1973-74 and count as 0 in the composite — the 60s
 * monsters clear the fame bar on points and rebounds alone.
 */
export interface NbaRankPlayer {
  name: string;
  teamName: string;    // team of the peak-composite season, shown on the card
  position: string;    // primary position code in that season
  startYear: number;   // 1984 for a '1984-85' debut (500+ minute seasons)
  startSeason: string; // '1984-85'
  pts: number;         // career-best single-season totals + their seasons
  ptsSeason: string;
  trb: number;
  trbSeason: string;
  ast: number;
  astSeason: string;
}

export type AnyRankPlayer = RankPlayer | NbaRankPlayer;

/** Second line of the mystery card, per sport. */
export function playerSubtitle(p: AnyRankPlayer): string {
  return 'club' in p ? `${p.club} · ${p.nationality}` : `${p.teamName} · ${p.position}`;
}

/**
 * NBA daily = daySeed() + this offset: a different-but-stable board that
 * flips at the same ET midnight as the soccer daily (which keeps its exact
 * historical seed).
 */
export const NBA_DAILY_SEED_OFFSET = 7777;

export const NBA_MODES: ModeDef<NbaRankPlayer>[] = [
  {
    id: 'nba-pts',
    title: 'Peak Scoring Season',
    question: 'Rank 1 = highest-scoring season (total points)',
    unit: p => `${p.pts.toLocaleString('en-US')} pts in ${p.ptsSeason}`,
    stat: p => p.pts,
    descending: true,
  },
  {
    id: 'nba-trb',
    title: 'Peak Rebound Season',
    question: 'Rank 1 = biggest rebounding season (total boards)',
    unit: p => `${p.trb.toLocaleString('en-US')} rebounds in ${p.trbSeason}`,
    stat: p => p.trb,
    descending: true,
  },
  {
    id: 'nba-ast',
    title: 'Peak Assist Season',
    question: 'Rank 1 = biggest assist season (total dimes)',
    unit: p => `${p.ast.toLocaleString('en-US')} assists in ${p.astSeason}`,
    stat: p => p.ast,
    descending: true,
  },
  {
    id: 'nba-debut',
    title: 'Career Start',
    question: 'Rank 1 = the EARLIEST debut',
    unit: p => `Debuted in ${p.startSeason}`,
    stat: p => p.startYear,
    descending: false,
  },
];

const NBA_MIN_MINUTES = 500;   // fetch floor, same as statDetective.ts
const NBA_PEAK_MINUTES = 1000; // a peak season must be real minutes, not garbage time
const NBA_PAGE_SIZE = 1000;    // PostgREST caps rows per request
const NBA_PAGES = 25;          // ~19.9k qualifying rows today, same budget as statDetective
const NBA_POOL_SIZE = 150;

const NBA_COMBINED = new Set(['2TM', '3TM', '4TM', '5TM']); // bref multi-team season rows

/** '1984-85' -> 1984. 0 for anything malformed. */
export function startYearOf(season: string): number {
  return /^\d{4}-\d{2}$/.test(season) ? Number(season.slice(0, 4)) : 0;
}

interface NbaSeasonRow {
  season: string | null;
  player_name: string | null;
  position: string | null;
  team: string | null;
  minutes: number | null;
  pts: number | null;
  trb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
}

interface NbaAgg {
  name: string;
  startYear: number;
  startSeason: string;
  composite: number;
  team: string;
  position: string;
  pts: number; ptsSeason: string;
  trb: number; trbSeason: string;
  ast: number; astSeason: string;
}

/**
 * Same paged fetch as fetchStatDetectiveData (25 x 1000, minutes >= 500,
 * id-descending). Unlike Stat Detective, a partially failed fetch is
 * DISCARDED rather than skipped over: this pool feeds a seeded daily board
 * that must be identical for every player, so a missing page can never be
 * allowed to silently shift it.
 */
async function loadNbaPool(): Promise<NbaRankPlayer[]> {
  try {
    const pages = await Promise.all(
      Array.from({ length: NBA_PAGES }, (_, i) =>
        supabase
          .from('bref_nba_player_seasons' as any)
          .select('season, player_name, position, team, minutes, pts, trb, ast, stl, blk')
          .gte('minutes', NBA_MIN_MINUTES)
          .order('id', { ascending: false })
          .range(i * NBA_PAGE_SIZE, (i + 1) * NBA_PAGE_SIZE - 1)
      )
    );
    if (pages.some(p => p.error || !p.data)) return [];

    const byName = new Map<string, NbaAgg>();
    let rows = 0;
    for (const page of pages) {
      for (const raw of page.data as unknown as NbaSeasonRow[]) {
        const name = String(raw.player_name ?? '').trim();
        const season = typeof raw.season === 'string' ? raw.season : '';
        const year = startYearOf(season);
        const minutes = Number(raw.minutes) || 0;
        if (!name || !year || minutes < NBA_MIN_MINUTES) continue;
        rows++;

        // bref occasionally reuses one name for two humans; like Stat
        // Detective, they merge into one generous profile — fine for trivia.
        const key = normalizeName(name);
        let agg = byName.get(key);
        if (!agg) {
          agg = {
            name, startYear: year, startSeason: season, composite: 0, team: '', position: '',
            pts: 0, ptsSeason: '', trb: 0, trbSeason: '', ast: 0, astSeason: '',
          };
          byName.set(key, agg);
        }
        if (year < agg.startYear) { agg.startYear = year; agg.startSeason = season; }

        if (minutes < NBA_PEAK_MINUTES) continue;
        const pts = Number(raw.pts) || 0;
        const trb = Number(raw.trb) || 0;
        const ast = Number(raw.ast) || 0;
        const composite = pts + 1.2 * trb + 1.5 * ast + 3 * ((Number(raw.stl) || 0) + (Number(raw.blk) || 0));
        if (composite > agg.composite) {
          agg.composite = composite;
          const teamCode = typeof raw.team === 'string' ? raw.team.trim() : '';
          agg.team = NBA_COMBINED.has(teamCode) ? 'Multiple teams' : teamNameOf(teamCode);
          agg.position = positionCodes(raw.position)[0] ?? '—';
        }
        if (pts > agg.pts) { agg.pts = pts; agg.ptsSeason = season; }
        if (trb > agg.trb) { agg.trb = trb; agg.trbSeason = season; }
        if (ast > agg.ast) { agg.ast = ast; agg.astSeason = season; }
      }
    }
    // ~19.9k qualifying rows live today; far fewer means a broken fetch.
    if (rows < 15000) return [];

    const ranked = [...byName.values()].filter(a => a.pts > 0);
    // Code-unit name tiebreak (NOT localeCompare): pool order feeds the
    // seeded daily, so it must be identical on every browser locale.
    ranked.sort((a, b) => (b.composite - a.composite) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    return ranked.slice(0, NBA_POOL_SIZE).map(a => ({
      name: a.name,
      teamName: a.team,
      position: a.position,
      startYear: a.startYear,
      startSeason: a.startSeason,
      pts: a.pts, ptsSeason: a.ptsSeason,
      trb: a.trb, trbSeason: a.trbSeason,
      ast: a.ast, astSeason: a.astSeason,
    }));
  } catch {
    return [];
  }
}

let nbaPoolPromise: Promise<NbaRankPlayer[]> | null = null;

/**
 * Module-level cache: sport/mode switches never refetch. A failed or
 * incomplete load resolves [] and clears the cache so a retry can succeed.
 */
export function fetchNbaBlindRankPool(): Promise<NbaRankPlayer[]> {
  if (!nbaPoolPromise) {
    nbaPoolPromise = loadNbaPool().then(pool => {
      if (pool.length < NBA_POOL_SIZE) {
        nbaPoolPromise = null;
        return [];
      }
      return pool;
    });
  }
  return nbaPoolPromise;
}

/** Neck-and-neck hidden numbers make coin-flip boards; require daylight. */
const NBA_MIN_SPREAD: Record<string, number> = {
  'nba-pts': 300,  // total points
  'nba-trb': 150,  // total rebounds
  'nba-ast': 100,  // total assists
  'nba-debut': 10, // years between earliest and latest debut
};

/** Same re-draw rules as buildRound, with NBA modes and spread guards. */
export function buildNbaRound(pool: NbaRankPlayer[], seed?: number): { mode: ModeDef<NbaRankPlayer>; players: NbaRankPlayer[] } | null {
  if (pool.length < 20) return null;
  const rng = seed !== undefined ? mulberry32(seed) : Math.random;
  const mode = NBA_MODES[Math.floor(rng() * NBA_MODES.length)];
  for (let attempt = 0; attempt < 40; attempt++) {
    const picked: NbaRankPlayer[] = [];
    const used = new Set<number>();
    while (picked.length < 5) {
      const i = Math.floor(rng() * pool.length);
      if (used.has(i)) continue;
      used.add(i);
      picked.push(pool[i]);
    }
    const stats = picked.map(mode.stat);
    if (new Set(stats).size !== 5) continue;
    if (Math.max(...stats) - Math.min(...stats) < NBA_MIN_SPREAD[mode.id]) continue;
    return { mode, players: picked };
  }
  return null;
}
