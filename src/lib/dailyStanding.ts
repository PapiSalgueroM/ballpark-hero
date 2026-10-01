/**
 * Round 716: today's standing on a daily game's result, the one shared piece.
 *
 * The panel (src/components/game/PostGameStats.tsx) asks the database for
 * the day's numbers through public.daily_score_standing
 * (supabase/migrations/20260930_round_716_daily_score_standing.sql), which
 * returns counts and nothing else. Everything here is pure so the harness
 * (scripts/simDailyStanding.mjs) can run it without a browser.
 *
 * Buckets run on each game's OWN recorded scale. They used to default to 0
 * to 1000 for everyone, so Footle's best possible day (700) never reached the
 * top row and a Higher or Lower day tops out at 325.
 */

export interface ScoreBucket {
  label: string;
  min: number;
  max: number;
}

/** Hidden under this many players today, the viewer included. The SQL holds
    the same number in its HAVING clause and the harness fails if they drift. */
export const DAILY_STANDING_MIN_PLAYERS = 20;

/** The RPC's name, in one place for the component and the harness. */
export const DAILY_STANDING_RPC = 'daily_score_standing';

const NICE_STEPS = [1, 2, 5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 200, 250, 300, 400, 500, 750, 1000, 2000, 2500, 5000];

/**
 * Even rows from 0 to a game's recorded ceiling, best row first (the order
 * the panel draws them). The width is rounded up to a round number so the
 * labels read like a person wrote them, and the top row stops at the ceiling.
 */
export function evenScoreBuckets(max: number, count = 5): ScoreBucket[] {
  const top = Math.max(1, Math.floor(max));
  const raw = (top + 1) / Math.max(1, count);
  const width = NICE_STEPS.find(s => s >= raw) ?? Math.ceil(raw);
  const rows: ScoreBucket[] = [];
  for (let lo = 0; lo <= top; lo += width) {
    const hi = Math.min(top, lo + width - 1);
    rows.push({ label: lo === hi ? `${lo}` : `${lo}-${hi}`, min: lo, max: hi });
  }
  return rows.reverse();
}

/**
 * The lower edge of each row, ascending, which is what the RPC takes.
 * Null when the rows are not one gapless run of whole numbers: the panel then
 * shows nothing rather than a count that skips somebody.
 */
export function bucketEdges(buckets: ReadonlyArray<ScoreBucket>): number[] | null {
  if (buckets.length < 2 || buckets.length > 12) return null;
  const asc = [...buckets].sort((a, b) => a.min - b.min);
  for (let i = 0; i < asc.length; i += 1) {
    const b = asc[i];
    if (!Number.isInteger(b.min) || !Number.isInteger(b.max) || b.max < b.min) return null;
    if (i > 0 && b.min !== asc[i - 1].max + 1) return null;
  }
  return asc.map(b => b.min);
}

export interface DailyStanding {
  /** Everyone who finished today, the viewer included. */
  players: number;
  /** How many of the OTHER players finished below the viewer. */
  below: number;
  median: number;
  top: number;
  /** Count per row, in the same order as the buckets passed in. */
  counts: number[];
}

/**
 * Reads the RPC's row into the panel's shape, in the caller's bucket order.
 * Null (so the panel hides) for anything short of a whole, consistent answer:
 * no row, under the floor, a count per row that does not match, or counts
 * that do not add up to the players.
 */
export function parseStanding(raw: unknown, buckets: ReadonlyArray<ScoreBucket>): DailyStanding | null {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const players = Number(r.players);
  const below = Number(r.below);
  const median = Number(r.median);
  const top = Number(r.top);
  const ascCounts = Array.isArray(r.bucket_counts) ? r.bucket_counts.map(Number) : null;
  if (![players, below, median, top].every(Number.isFinite) || !ascCounts) return null;
  if (players < DAILY_STANDING_MIN_PLAYERS) return null;
  if (below < 0 || below > players - 1) return null;
  if (ascCounts.length !== buckets.length || ascCounts.some(c => !Number.isInteger(c) || c < 0)) return null;
  if (ascCounts.reduce((a, c) => a + c, 0) !== players) return null;
  const ascMins = [...buckets].map(b => b.min).sort((a, b) => a - b);
  const counts = buckets.map(b => ascCounts[ascMins.indexOf(b.min)]);
  return { players, below, median, top, counts };
}

/** "You beat X% of players today": the share of the OTHER players you
    finished above. Ties are not beaten. */
export function beatPercent(s: Pick<DailyStanding, 'players' | 'below'>): number {
  const others = s.players - 1;
  if (others <= 0) return 0;
  return Math.round((s.below / others) * 100);
}

/** Which row the viewer's score sits in, by the same rule as the SQL: the
    lowest row takes anything under it, the top row anything over it. */
export function bucketIndexFor(score: number, buckets: ReadonlyArray<ScoreBucket>): number {
  if (buckets.length === 0) return -1;
  const lo = buckets.reduce((m, b) => (b.min < m.min ? b : m), buckets[0]);
  const hi = buckets.reduce((m, b) => (b.max > m.max ? b : m), buckets[0]);
  if (score < lo.min) return buckets.indexOf(lo);
  if (score > hi.max) return buckets.indexOf(hi);
  return buckets.findIndex(b => score >= b.min && score <= b.max);
}

/**
 * The reference the SQL is held to: the same answer from a plain list of
 * each other player's best score today. The harness runs both shapes of the
 * rule through it; the panel itself never sees a row.
 */
export function standingFromScores(
  otherBests: ReadonlyArray<number>,
  viewerScore: number,
  buckets: ReadonlyArray<ScoreBucket>,
): DailyStanding | null {
  const everyone = [...otherBests, viewerScore].sort((a, b) => a - b);
  const n = everyone.length;
  if (n < DAILY_STANDING_MIN_PLAYERS) return null;
  const mid = (n - 1) / 2;
  const median = (everyone[Math.floor(mid)] + everyone[Math.ceil(mid)]) / 2;
  const counts = buckets.map(() => 0);
  for (const s of everyone) counts[bucketIndexFor(s, buckets)] += 1;
  return {
    players: n,
    below: otherBests.filter(s => s < viewerScore).length,
    median,
    top: everyone[n - 1],
    counts,
  };
}
