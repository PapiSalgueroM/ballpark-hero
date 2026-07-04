/**
 * Go Unbeaten mode for Perfect Lineup (R6 Wave 12).
 *
 * Reuses the deterministic sim core from perfectSeason.ts: a lineup's rating
 * (0..100, from src/data/perfectLineup.ts's `simulate`) is mapped onto the
 * same overall-to-win-probability curve the Perfect Season games use, then
 * a 38 match league season is simulated match by match. A draw does not end
 * the run, a loss does. This module only adds the league-season framing on
 * top of perfectSeason.ts; it does not change that file.
 */

import { rng, winProbability } from '@/lib/perfectSeason';

export const SEASON_MATCHES = 38;

export type MatchOutcome = 'W' | 'D' | 'L';

export interface UnbeatenMatch {
  matchNumber: number; // 1-indexed
  outcome: MatchOutcome;
  points: 3 | 1 | 0;
}

export interface UnbeatenRunResult {
  matches: UnbeatenMatch[]; // only the matches actually played, stops at the first loss
  played: number; // matches.length
  wins: number;
  draws: number;
  points: number;
  invincible: boolean; // true if all SEASON_MATCHES were played with no loss
  endedAtMatch: number | null; // match number of the loss that ended the run, or null if invincible
}

/**
 * Maps a Perfect Lineup rating (0..100 squad rating, not a Perfect Season
 * "overall") onto perfectSeason.ts's overall-to-win-probability curve so the
 * two systems feel consistent. winProbability() is tuned around overalls in
 * the 40-99 range, so this scales rating up into that same band rather than
 * treating 0..100 as if it were already an overall.
 */
export function ratingToOverall(rating: number): number {
  const clamped = Math.max(0, Math.min(100, rating));
  return 40 + (clamped / 100) * 59; // 0 -> 40, 100 -> 99
}

/** Draw probability, independent of rating: a fixed slice of the non-win chance. */
const DRAW_SHARE = 0.28;

/**
 * Simulates a 38 match league season one match at a time, stopping the run
 * at the first loss. Draws never end the run. Deterministic for a given
 * rating + seed, same rng() core as perfectSeason.ts.
 */
export function simulateUnbeatenRun(rating: number, seed: number): UnbeatenRunResult {
  const rand = rng(seed);
  const overall = ratingToOverall(rating);
  const winP = winProbability(overall);
  const drawP = (1 - winP) * DRAW_SHARE;

  const matches: UnbeatenMatch[] = [];
  let wins = 0;
  let draws = 0;
  let points = 0;
  let endedAtMatch: number | null = null;

  for (let i = 1; i <= SEASON_MATCHES; i++) {
    const roll = rand();
    let outcome: MatchOutcome;
    let matchPoints: 3 | 1 | 0;
    if (roll < winP) {
      outcome = 'W';
      matchPoints = 3;
      wins++;
    } else if (roll < winP + drawP) {
      outcome = 'D';
      matchPoints = 1;
      draws++;
    } else {
      outcome = 'L';
      matchPoints = 0;
    }
    points += matchPoints;
    matches.push({ matchNumber: i, outcome, points: matchPoints });
    if (outcome === 'L') {
      endedAtMatch = i;
      break;
    }
  }

  const played = matches.length;
  const invincible = endedAtMatch === null && played === SEASON_MATCHES;

  return { matches, played, wins, draws, points, invincible, endedAtMatch };
}

/** Plain-language final verdict line for the result screen. */
export function unbeatenVerdict(result: UnbeatenRunResult): string {
  if (result.invincible) return 'Invincibles! A full 38 match season with no losses.';
  return `The run ended at match ${result.endedAtMatch}.`;
}

/** Emoji-grid block for the share card: one row of W/D/dot per match played, 10 per row. */
export function unbeatenEmojiGrid(result: UnbeatenRunResult): string {
  const cells = result.matches.map((m) => (m.outcome === 'W' ? '🟩' : m.outcome === 'D' ? '🟨' : '🟥'));
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += 10) rows.push(cells.slice(i, i + 10).join(''));
  return rows.join('\n');
}
