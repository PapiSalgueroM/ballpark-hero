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

/** Whole days since the epoch for an ET date string. Calendar arithmetic,
    not clock arithmetic, so daylight saving cannot move it. */
export function dayNumber(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 86_400_000);
}

/**
 * Round 213: which puzzle today is, when the pool is walked in an order
 * nobody can guess.
 *
 * Nearly every daily game on this site picked its board with
 * `pool[dateSeed(today) % pool.length]`. That has one good property and one
 * bad one. The good one is COVERAGE: the index moves by one a day, so a
 * pool of fourteen shows all fourteen before it shows any of them twice,
 * which matters a lot when a pool is small. The bad one is that it is
 * completely predictable. Tomorrow is today plus one, forever, on every
 * game, and there is a leaderboard.
 *
 * This keeps the good property and drops the bad one. The days are cut into
 * cycles the length of the pool; each cycle is a full shuffle of the pool,
 * seeded from the cycle number, so within any run of `pool.length` days you
 * still see every board exactly once, and the order is different every
 * cycle and cannot be worked out from yesterday.
 *
 * One extra rule: if a new cycle would open on the board the last one
 * closed with, it is rotated by one. Otherwise the one thing this was
 * supposed to prevent, the same puzzle two days running, could still
 * happen at a cycle boundary about once per pool length.
 */
export function dailyIndex(dateStr: string, poolSize: number): number {
  if (!Number.isFinite(poolSize) || poolSize <= 1) return 0;
  const day = dayNumber(dateStr);
  const cycle = Math.floor(day / poolSize);
  const pos = ((day % poolSize) + poolSize) % poolSize;
  return cycleOrder(cycle, poolSize)[pos];
}

/**
 * One cycle's shuffled walk of the pool, deterministic in the cycle number.
 *
 * The first two entries are swapped when the cycle would otherwise open on
 * the board the previous cycle closed with. Swapping rather than skipping
 * matters: skipping would drop one board from the cycle and show another
 * twice, which is the exact thing this is here to prevent.
 */
function cycleOrder(cycle: number, poolSize: number): number[] {
  const out = shuffledRange(poolSize, `cycle:${cycle}:${poolSize}`);
  if (poolSize > 2) {
    const previous = shuffledRange(poolSize, `cycle:${cycle - 1}:${poolSize}`);
    if (out[0] === previous[poolSize - 1]) {
      [out[0], out[1]] = [out[1], out[0]];
    }
  }
  return out;
}

/** 0..n-1 shuffled by a well mixed generator seeded from a label. */
function shuffledRange(n: number, label: string): number[] {
  const out = Array.from({ length: n }, (_, i) => i);
  /* mulberry32, not a Lehmer step: this is exactly the situation Round 212
     was about, and a multiplicative generator seeded from a short label
     does not scatter well enough to shuffle with. */
  let a = dailyPrngSeed(label) >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
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
