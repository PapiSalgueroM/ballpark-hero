/**
 * Round 648: the one rule every points total on the profile is summed by.
 *
 * THE RULE is the owner directed recompute of 2026-09-19 (docs/PROJECT-STATE.md,
 * the decisions list, item 5, RESOLVED): one row per game per day, that day's
 * best, capped. It is how user_scores.total_points was rebuilt for every
 * account that morning, and
 * supabase/migrations/20260928_round_648_profile_clamp.sql holds the stored
 * total to the same sum from here on, so the total the profile shows and the
 * total its all time rank counts cannot disagree:
 *
 *   total = the sum over (game, day) of least(that day's best score, the cap)
 *
 * The day is user_game_scores.puzzle_date, the date record_auth_completion
 * writes (the UTC date of the save), exactly as the recompute grouped it.
 * One day, one row per game: a Club Manager season that recorded once per
 * match, or a daily that recorded again on every reload, counts once, at its
 * best. Those two leaks were most of what the recompute took out, and a sum
 * of every record would put them straight back.
 *
 * THE CAPS are public.game_score_caps, the table. Not the game_denominators
 * view over it: for a NULL cap the view runs a percentile over
 * game_completions, the query Round 370 had to take off the page path after
 * the Disk IO alert. After Round 646 every scored game's row is its engine's
 * ceiling. A game with no row is not on the allowlist and counts nothing, the
 * board's own rule. A row whose cap is NULL has no ceiling on record (the
 * games that record no score, plus list-quiz and higher-lower-transfers,
 * which Round 646 left for a scale of their own), and its day's best counts
 * as recorded. That is the one place this differs from the view the
 * 2026-09-19 recompute joined, where a NULL cap fell back to the game's 99th
 * percentile, which by its own definition clamps about one play in a hundred
 * of those two games. A cap below 1 counts as 1, as the view floors it.
 *
 * THE CAP IS A CEILING, NOT A SCALE. The World Leaderboard divides by the same
 * number (100 * best / cap per game day); the profile does not, because the
 * recompute did not. So a game whose cap is not a real ceiling (Pack Battle at
 * 54,000,000 dollars, Sports Millionaire at 1,000,000, both left by Round 646
 * until they have a scale of their own) counts its day's best up to that cap.
 *
 * Pure: no imports, no clock, no storage. The profile hook
 * (src/hooks/useProfileTotal.ts) sums a player's records with profileTotal,
 * and the browser's own tally (src/lib/streaks.ts) credits each play with
 * dayValue under the same caps.
 *
 * Fence: scripts/simProfileTotal.mjs (src/test/profileTotal.test.tsx).
 */

/** Completion slug to its cap: a number of at least 1, or null for a row with no ceiling on record. A slug that is absent is not on the allowlist. */
export type ScoreCaps = Record<string, number | null>;

/** One record as the rule reads it: the game, the score, and the day it counts on. */
export interface PointsRecord {
  game: string;
  score: number | null | undefined;
  day: string | null | undefined;
}

/**
 * The most one record can hold. The insert policy on user_game_scores refuses
 * a score above 100,000 (supabase/migrations/
 * 20260309004627_c9aca0c6-898c-4a9e-99d4-7194d287b37b.sql), and
 * record_auth_completion is SECURITY INVOKER, so a signed in save above it is
 * refused whole: no row, nothing added to the stored total. The browser's own
 * tally counts a play exactly as the server could store it, so a play above
 * this adds nothing there either. A Pack Battle pack is recorded as its banked
 * dollars, and 8,800,000 is an ordinary pack.
 */
export const RECORD_MAX = 100_000;

/** A cap as the rule uses it: undefined when the game is not on the allowlist, null for no ceiling on record, else at least 1. */
export function capOf(caps: ScoreCaps, game: string): number | null | undefined {
  if (!Object.prototype.hasOwnProperty.call(caps, game)) return undefined;
  const cap = caps[game];
  if (cap === null) return null;
  if (typeof cap !== 'number' || !Number.isFinite(cap)) return undefined;
  return Math.max(1, cap);
}

/** What one game day is worth: its best, at most the cap (a null cap has no ceiling on record). */
export function dayValue(best: number, cap: number | null): number {
  return cap === null ? best : Math.min(best, cap);
}

/**
 * The rule over a player's records: the day's best per game per day, capped,
 * summed. A record with no finite score is skipped (a SQL max ignores a
 * NULL). A null day is one group of its own, as GROUP BY treats NULLs.
 */
export function profileTotal(records: PointsRecord[], caps: ScoreCaps): number {
  const best = new Map<string, { game: string; best: number }>();
  for (const record of records) {
    if (!record || typeof record.game !== 'string') continue;
    if (capOf(caps, record.game) === undefined) continue;
    if (record.score === null || record.score === undefined) continue;
    const score = Number(record.score);
    if (!Number.isFinite(score)) continue;
    const key = `${record.game}\u0000${record.day ?? '\u0000null'}`;
    const held = best.get(key);
    if (!held || score > held.best) best.set(key, { game: record.game, best: score });
  }
  let total = 0;
  for (const { game, best: dayBest } of best.values()) {
    total += dayValue(dayBest, capOf(caps, game) as number | null);
  }
  return total;
}

/** The points one play records, as the server could store it: a whole number, never negative, and nothing above RECORD_MAX. */
export function recordedPoints(score: number): number {
  if (!Number.isFinite(score)) return 0;
  const points = Math.max(0, Math.round(score));
  return points > RECORD_MAX ? 0 : points;
}

/** The day a play counts on: the UTC date, the same day record_auth_completion writes as puzzle_date. */
export function pointsDay(when: Date): string {
  return when.toISOString().slice(0, 10);
}
