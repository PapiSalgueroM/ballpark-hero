/**
 * Canonical date utilities for DoUKnowBall daily puzzle selection.
 *
 * All game hooks must use getTodayET() as the single source of "today".
 * Do not call new Date().toISOString().slice(0, 10) directly in game hooks -
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
 * Round 212: the seed to use when a date has to START A RANDOM STREAM.
 *
 * dateSeed above is exactly right for `puzzles[seed % puzzles.length]`,
 * which is what most of the daily games do: consecutive days differ by one,
 * so the index moves by one and the pool rotates.
 *
 * It is exactly WRONG for seeding a Lehmer generator, which several games
 * were doing, and the failure is not subtle. A Lehmer step is
 * `s = (s * 16807) % 2147483647`, so the first number it produces is very
 * nearly a straight line in the seed: two seeds one apart give first
 * outputs 16807 / 2147483647 apart, which is eight parts in a million.
 * Multiply that by a pool of twenty and floor it and you get the same
 * index for tens of thousands of consecutive days.
 *
 * That is not theory. Measured over a simulated year before this round:
 * Missing XI dealt TWO different lineups in three hundred and sixty five
 * days, one of them for two hundred and forty three days running, and
 * Sign the Player used one formation for the entire year. A daily game
 * that is the same every day is not a daily game.
 *
 * So this hashes the date string properly first, with an avalanche pass on
 * the end, and returns a value inside the Lehmer modulus so that two dates
 * cannot fold onto the same stream. getDailyTier has used the same idea
 * since it was written; this makes it available to everything.
 */
export function dailyPrngSeed(dateStr: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < dateStr.length; i += 1) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909) >>> 0;
  h ^= h >>> 16;
  return (h % 2147483646) + 1;
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
