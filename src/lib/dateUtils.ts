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
 * Converts a YYYY-MM-DD date string to an integer for use as a modulo seed.
 * e.g. "2026-05-25" → 20260525
 *
 * Used as: puzzleIndex = dateSeed(todayStr) % puzzles.length
 * This produces the same puzzle index for every user on the same ET date.
 */
export function dateSeed(dateStr: string): number {
  return parseInt(dateStr.replace(/-/g, ''), 10);
}
