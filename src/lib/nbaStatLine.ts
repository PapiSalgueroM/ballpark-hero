import { supabase } from '@/integrations/supabase/client';
import { dailyDraw } from '@/lib/dateUtils';

/**
 * NBA Stat Line (Round 336): a target per-36 stat line is shown, you build
 * it. Pick five real player seasons by search; their combined minutes
 * weighted per-36 line is scored against the target by similarity, 0 to 100.
 * Daily mode deals everyone the same target, unlimited deals a fresh one.
 *
 * Data source: bref_nba_player_seasons (re-verified in SQL for this round):
 * - Every stat column is a SEASON TOTAL and `games` is NULL on all 30,462
 *   rows, so true per-game rates are impossible. Everything here is per-36,
 *   which is this site's established NBA convention (see perfectSeasonNba.ts
 *   and statDetective.ts for the same reasoning).
 * - `minutes` is null before 1951-52, and the sitewide 500 minute floor
 *   quietly limits the pool to 1951-52 through today.
 * - `stl` and `blk` are NULL before the league tracked them (1973-74). When
 *   a target includes steals or blocks the pickable pool is gated to 1973-74
 *   and later; when it does not, the whole pool plays.
 * - `three_pa` is NULL before the line existed (1979-80); a 3P% target gates
 *   the pool to 1979-80 and later the same way.
 * - Traded players carry a combined 2TM..5TM row; those are excluded from
 *   the pickable pool so every pick is a real single team season.
 * - Combined shooting splits are recomputed from SUMMED makes and attempts,
 *   never by averaging percentages. simNbaStatLine plants a fixture where
 *   the two disagree and fails on the averaged answer.
 *
 * The target is built from an ANCHOR: one real season drawn from the pool,
 * its per-36 line rounded to one decimal. That way every target is a line a
 * real season actually produced, so a five pick combination scoring near the
 * maximum provably exists. The anchor player is never shown.
 *
 * Everything below the fetch is pure over injected rows on purpose, so the
 * harness can drive it with synthetic fixtures.
 */

export const MIN_MINUTES = 500;   // sitewide floor, same as both NBA libs
export const PICK_COUNT = 5;
export const HIT_SCORE = 90;      // a run at or above this counts as a hit
export const STOCKS_FLOOR_YEAR = 1974;  // stl/blk tracked from 1973-74
export const THREES_FLOOR_YEAR = 1980;  // 3P line exists from 1979-80

const PAGE_SIZE = 1000;   // PostgREST caps rows per request
const PAGES = 25;         // ~19.9k qualifying rows today, headroom for growth

const COMBINED_ROWS = new Set(['2TM', '3TM', '4TM', '5TM']);

/** '1987-88' -> 1988. Returns 0 for anything malformed. */
export function endYearOf(season: string): number {
  if (!/^\d{4}-\d{2}$/.test(season)) return 0;
  return Number(season.slice(0, 4)) + 1;
}

export function per36(total: number, minutes: number): number {
  return minutes > 0 ? (total / minutes) * 36 : 0;
}

const round1 = (v: number) => Math.round(v * 10) / 10;

/** Accent and case insensitive key for name search. */
export function normalizeSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export interface RawSeasonRow {
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
  fg: number | null;
  fga: number | null;
  three_p: number | null;
  three_pa: number | null;
  ft: number | null;
  fta: number | null;
}

export interface StatLineSeason {
  key: string;        // stable identity: player|season|team
  player: string;
  season: string;     // '1987-88'
  endYear: number;    // 1988
  position: string;   // raw primary token, display only
  team: string;
  minutes: number;
  pts: number;
  trb: number;
  ast: number;
  stl: number | null; // null before 1973-74
  blk: number | null;
  fg: number;
  fga: number;
  ft: number;
  fta: number;
  threeP: number | null;  // null before 1979-80
  threePa: number | null;
}

export type SplitKind = 'FG' | 'FT' | '3P';

export const SPLIT_LABEL: Record<SplitKind, string> = {
  FG: 'FG%', FT: 'FT%', '3P': '3P%',
};

export interface StatTarget {
  pts: number;          // per-36, one decimal
  trb: number;
  ast: number;
  stl: number | null;   // null when the anchor era did not track them
  blk: number | null;
  split: SplitKind;
  splitPct: number;     // 0 to 100, one decimal
  floorYear: number;    // pool gate: 0, 1974 or 1980
}

/**
 * Validate raw rows into the pickable pool: 500+ minutes, a real single
 * team, non-null counting stats and shooting columns, sorted by key so the
 * daily draw cannot depend on fetch page order.
 */
export function buildPool(rows: RawSeasonRow[]): StatLineSeason[] {
  const out: StatLineSeason[] = [];
  const seen = new Set<string>();
  for (const raw of rows) {
    const player = String(raw.player_name ?? '').trim();
    const season = typeof raw.season === 'string' ? raw.season : '';
    const team = typeof raw.team === 'string' ? raw.team.trim() : '';
    const minutes = Number(raw.minutes) || 0;
    const year = endYearOf(season);
    if (!player || !year || !team || minutes < MIN_MINUTES) continue;
    if (COMBINED_ROWS.has(team)) continue;
    if (raw.pts == null || raw.trb == null || raw.ast == null) continue;
    if (raw.fg == null || raw.fga == null || raw.fga <= 0) continue;
    if (raw.ft == null || raw.fta == null) continue;
    const key = `${player}|${season}|${team}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      key,
      player,
      season,
      endYear: year,
      position: String(raw.position ?? '').split(/[-/,]/)[0].trim(),
      team,
      minutes,
      pts: Number(raw.pts),
      trb: Number(raw.trb),
      ast: Number(raw.ast),
      stl: raw.stl == null ? null : Number(raw.stl),
      blk: raw.blk == null ? null : Number(raw.blk),
      fg: Number(raw.fg),
      fga: Number(raw.fga),
      ft: Number(raw.ft),
      fta: Number(raw.fta),
      threeP: raw.three_p == null ? null : Number(raw.three_p),
      threePa: raw.three_pa == null ? null : Number(raw.three_pa),
    });
  }
  out.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return out;
}

/** [makes, attempts] of one season for a split kind. Null 3P columns read
 *  as zero attempts, which is factually right: no line existed to shoot at. */
function splitParts(s: StatLineSeason, split: SplitKind): [number, number] {
  if (split === 'FG') return [s.fg, s.fga];
  if (split === 'FT') return [s.ft, s.fta];
  return [s.threeP ?? 0, s.threePa ?? 0];
}

/** Which split targets this anchor can honestly set. A split needs enough
 *  attempts to mean something (100 over a season), and 3P% additionally
 *  needs the line to have existed. FG% is the fallback so the list is
 *  never empty. */
export function splitOptionsFor(anchor: StatLineSeason): SplitKind[] {
  const opts: SplitKind[] = [];
  if (anchor.fga >= 100) opts.push('FG');
  if (anchor.fta >= 100) opts.push('FT');
  if (anchor.endYear >= THREES_FLOOR_YEAR && anchor.threePa != null && anchor.threePa >= 100) opts.push('3P');
  return opts.length > 0 ? opts : ['FG'];
}

/** The target an anchor season sets: its own per-36 line, rounded. */
export function targetFrom(anchor: StatLineSeason, split: SplitKind): StatTarget {
  const hasStocks = anchor.stl != null && anchor.blk != null;
  const [makes, atts] = splitParts(anchor, split);
  const floorYear = Math.max(
    hasStocks ? STOCKS_FLOOR_YEAR : 0,
    split === '3P' ? THREES_FLOOR_YEAR : 0,
  );
  return {
    pts: round1(per36(anchor.pts, anchor.minutes)),
    trb: round1(per36(anchor.trb, anchor.minutes)),
    ast: round1(per36(anchor.ast, anchor.minutes)),
    stl: hasStocks ? round1(per36(anchor.stl as number, anchor.minutes)) : null,
    blk: hasStocks ? round1(per36(anchor.blk as number, anchor.minutes)) : null,
    split,
    splitPct: round1(atts > 0 ? (makes / atts) * 100 : 0),
    floorYear,
  };
}

/** The pickable pool for a target. When the target includes steals or
 *  blocks only seasons from 1973-74 on qualify; a 3P% target gates to
 *  1979-80 on. A target with neither opens the whole pool. */
export function eligiblePoolFor(pool: StatLineSeason[], target: StatTarget): StatLineSeason[] {
  return pool.filter(s => {
    if (s.endYear < target.floorYear) return false;
    if (target.stl != null && (s.stl == null || s.blk == null)) return false;
    if (target.split === '3P' && s.threePa == null) return false;
    return true;
  });
}

export interface BuiltTarget {
  target: StatTarget;
  anchorKey: string;  // kept for the harness and the pool gate proof, never shown
}

/**
 * The daily target: one anchor and one split drawn through dailyDraw with
 * date labeled streams (the Round 212 rule: never seed a hand rolled PRNG
 * with dateSeed). Same date, same target, for everyone.
 */
export function buildDailyTarget(pool: StatLineSeason[], dateStr: string): BuiltTarget | null {
  if (pool.length === 0) return null;
  const anchor = pool[dailyDraw(pool.length, `nba-stat-line:${dateStr}:anchor`)];
  const opts = splitOptionsFor(anchor);
  const split = opts[dailyDraw(opts.length, `nba-stat-line:${dateStr}:split`)];
  return { target: targetFrom(anchor, split), anchorKey: anchor.key };
}

/** An unlimited mode target from an injected random stream. */
export function buildRandomTarget(pool: StatLineSeason[], rand: () => number = Math.random): BuiltTarget | null {
  if (pool.length === 0) return null;
  const anchor = pool[Math.floor(rand() * pool.length)];
  const opts = splitOptionsFor(anchor);
  const split = opts[Math.floor(rand() * opts.length)];
  return { target: targetFrom(anchor, split), anchorKey: anchor.key };
}

export interface CombinedLine {
  minutes: number;
  pts: number;          // per-36 of the combined totals, minutes weighted
  trb: number;
  ast: number;
  stl: number | null;   // null when any pick predates the stat
  blk: number | null;
  splitMakes: number;
  splitAtts: number;
  splitPct: number;     // 0 to 100; zero attempts reads as 0
}

/**
 * The combined line of a set of picks: totals summed, then per-36, which is
 * exactly the minutes weighted average of the individual rates. The split is
 * recomputed from summed makes over summed attempts.
 */
export function combineLine(picks: StatLineSeason[], split: SplitKind): CombinedLine {
  let minutes = 0; let pts = 0; let trb = 0; let ast = 0;
  let stl = 0; let blk = 0; let stocksKnown = true;
  let splitMakes = 0; let splitAtts = 0;
  for (const p of picks) {
    minutes += p.minutes;
    pts += p.pts;
    trb += p.trb;
    ast += p.ast;
    if (p.stl == null || p.blk == null) stocksKnown = false;
    else { stl += p.stl; blk += p.blk; }
    const [mk, at] = splitParts(p, split);
    splitMakes += mk;
    splitAtts += at;
  }
  const splitPct = splitAtts > 0 ? (splitMakes / splitAtts) * 100 : 0;
  return {
    minutes,
    pts: per36(pts, minutes),
    trb: per36(trb, minutes),
    ast: per36(ast, minutes),
    stl: stocksKnown && picks.length > 0 ? per36(stl, minutes) : null,
    blk: stocksKnown && picks.length > 0 ? per36(blk, minutes) : null,
    splitMakes,
    splitAtts,
    splitPct,
  };
}

/** How far off a stat can be before it scores zero. Per-36 units for the
 *  counting stats, percentage points for the splits. */
const SCALES = { pts: 10, trb: 7, ast: 5, stl: 1.6, blk: 1.6 } as const;
const SPLIT_SCALES: Record<SplitKind, number> = { FG: 10, '3P': 12, FT: 10 };

export interface StatScore {
  key: string;      // 'pts' | 'trb' | 'ast' | 'stl' | 'blk' | 'split'
  label: string;    // 'PTS', 'REB', ..., 'FG%'
  target: number;
  actual: number;
  closeness: number;  // 0 to 1, linear in the distance
}

export interface ScoreResult {
  total: number;        // 0 to 100
  breakdown: StatScore[];
}

/**
 * Similarity score: per stat closeness is linear in the distance, clamped
 * at zero, and the total is the mean mapped to 0 to 100. An exact match on
 * every stat is exactly 100; a line off by a full scale on every stat is
 * exactly 0; closing the gap on any one stat never lowers the score.
 */
export function scoreCombined(target: StatTarget, combined: CombinedLine): ScoreResult {
  const closeness = (diff: number, scale: number) => Math.max(0, 1 - Math.abs(diff) / scale);
  const breakdown: StatScore[] = [
    { key: 'pts', label: 'PTS', target: target.pts, actual: combined.pts, closeness: closeness(combined.pts - target.pts, SCALES.pts) },
    { key: 'trb', label: 'REB', target: target.trb, actual: combined.trb, closeness: closeness(combined.trb - target.trb, SCALES.trb) },
    { key: 'ast', label: 'AST', target: target.ast, actual: combined.ast, closeness: closeness(combined.ast - target.ast, SCALES.ast) },
  ];
  if (target.stl != null) {
    const actual = combined.stl ?? 0;
    breakdown.push({ key: 'stl', label: 'STL', target: target.stl, actual, closeness: closeness(actual - target.stl, SCALES.stl) });
  }
  if (target.blk != null) {
    const actual = combined.blk ?? 0;
    breakdown.push({ key: 'blk', label: 'BLK', target: target.blk, actual, closeness: closeness(actual - target.blk, SCALES.blk) });
  }
  breakdown.push({
    key: 'split',
    label: SPLIT_LABEL[target.split],
    target: target.splitPct,
    actual: combined.splitPct,
    closeness: closeness(combined.splitPct - target.splitPct, SPLIT_SCALES[target.split]),
  });
  const total = Math.round((breakdown.reduce((a, s) => a + s.closeness, 0) / breakdown.length) * 100);
  return { total, breakdown };
}

/**
 * Season search for the pick box, requires 2+ letters. Same tiering as the
 * other search games: full name prefixes first, then word prefixes, then
 * substrings; big minute seasons float up within each tier so the famous
 * version of a name lands first.
 */
export function suggestSeasons(
  pool: StatLineSeason[],
  query: string,
  exclude?: Set<string>,
  limit = 10,
): StatLineSeason[] {
  const q = normalizeSearch(query);
  if (q.length < 2) return [];
  const starts: StatLineSeason[] = [];
  const wordStarts: StatLineSeason[] = [];
  const contains: StatLineSeason[] = [];
  for (const s of pool) {
    if (exclude && exclude.has(s.key)) continue;
    const n = normalizeSearch(s.player);
    if (!n.includes(q)) continue;
    if (n.startsWith(q)) starts.push(s);
    else if (n.split(' ').some(w => w.startsWith(q))) wordStarts.push(s);
    else contains.push(s);
  }
  const byMinutes = (a: StatLineSeason, b: StatLineSeason) => b.minutes - a.minutes || (a.key < b.key ? -1 : 1);
  starts.sort(byMinutes);
  wordStarts.sort(byMinutes);
  contains.sort(byMinutes);
  return [...starts, ...wordStarts, ...contains].slice(0, limit);
}

/**
 * Boot fetch: every 500+ minute player season, paged in parallel under the
 * PostgREST 1000 row cap, id descending so a future data refresh overflows
 * the oldest rows first (same pattern as statDetective.ts). Returns null on
 * failure OR when the pull is implausibly small, so the page shows an error
 * state instead of quietly playing on a sliver of history. The live table
 * yields about 18k pool seasons; anything far below that means pages went
 * missing.
 */
export async function fetchNbaStatLinePool(): Promise<StatLineSeason[] | null> {
  try {
    const pages = await Promise.all(
      Array.from({ length: PAGES }, (_, i) =>
        supabase
          .from('bref_nba_player_seasons' as never)
          .select('season, player_name, position, team, minutes, pts, trb, ast, stl, blk, fg, fga, three_p, three_pa, ft, fta')
          .gte('minutes', MIN_MINUTES)
          .order('id', { ascending: false })
          .range(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1)
      )
    );
    const rows: RawSeasonRow[] = [];
    for (const page of pages) {
      /* ROUND 366: fail the whole pull rather than skipping the page. This
         `continue` left roughly 18,938 of the rows on a single dropped page,
         which clears the 10,000 floor below by a wide margin, so the visitor
         got a different pool length and therefore a different anchor season and
         daily target, with no error and nothing to tell them. Both franchise
         grids already answer this exact risk the other way (see the ROUND 358
         note in nbaGrid.ts): retry, then return null. Do not raise the floor
         instead; no floor can tell a 1,000 row shortfall from ordinary growth. */
      if (page.error || !page.data) return null;
      for (const raw of page.data as unknown as RawSeasonRow[]) rows.push(raw);
    }
    const pool = buildPool(rows);
    if (pool.length < 10000) return null;
    return pool;
  } catch {
    return null;
  }
}
