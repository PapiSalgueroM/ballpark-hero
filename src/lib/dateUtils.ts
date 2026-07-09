/**
 * Canonical date utilities for DoUKnowBall daily puzzle selection.
 *
 * All game hooks must use getTodayET() as the single source of "today".
 * Do not call new Date().toISOString().slice(0, 10) directly in game hooks —
 * that returns UTC, which breaks the shared daily experience for US users.
 */

/**
 * Returns today's date as YYYY-MM-DD in the America/New_York timezone.
 *
 * Using en-CA locale with Intl.DateTimeFormat because it natively produces
 * the YYYY-MM-DD format without any string manipulation.
 *
 * All users share the same puzzle rollover at midnight ET, regardless of
 * their local clock or browser timezone.
 */
export function getTodayET(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
  }).format(new Date()); // e.g. "2026-05-25"
}

/**
 * Poll-of-the-day rollover: polls flip at NOON Eastern, not midnight (owner
 * request: the day's polls should rotate in at 12pm ET). Implemented by
 * shifting the instant back 12h before taking the ET date, so 11:59am ET
 * still shows yesterday's polls and 12:00pm ET flips to today's.
 */
export function getPollDayET(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
  }).format(new Date(Date.now() - 12 * 60 * 60 * 1000));
}

/**
 * Converts a YYYY-MM-DD date string to an integer for use as a modulo seed.
 * e.g. "2026-05-25" → 20260525
 *
 * Used as: puzzleIndex = dateSeed(todayStr) % puzzles.length
 * This produces the same puzzle index for every user on the same ET date.
 */
export function dateSeed(dateStr: string): number {
  return parseInt(dateStr.replace(/-/g, ''), 10);
}

/**
 * Returns today's deterministic difficulty tier for Footle's daily puzzle.
 * Every user on the same ET date gets the same tier.
 *
 * Distribution: ~55% Hard, ~40% Easy, ~5% Insane.
 *
 * Uses a djb2-style polynomial hash of the date string rather than a simple
 * dateSeed() modulo, which would produce a predictable +N-per-day pattern
 * across consecutive dates and could be easily reverse-engineered by players.
 */
export function getDailyTier(dateStr: string): 'easy' | 'hard' | 'insane' {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0; // keep as signed 32-bit integer
  }
  const tierValue = Math.abs(hash) % 100;
  if (tierValue < 5) return 'insane';  //  5%
  if (tierValue < 60) return 'hard';   // 55%
  return 'easy';                        // 40%
}
