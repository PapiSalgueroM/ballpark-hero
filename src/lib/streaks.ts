/**
 * Local-first streak engine (#101).
 *
 * Round 301, audit finding 14, context brought back to the truth: until
 * Round 300 the `profiles`, `user_scores` and `daily_completions` tables
 * received no writes from most games, so this local engine was the only
 * honest source for streaks. Since Round 300 every completion also feeds
 * those tables through src/lib/completions.ts, so the server is live now
 * and this module remains the guest half plus the instant same-browser
 * half for signed in players. It still computes everything from
 * localStorage and touches no tables, so streaks work for every player,
 * logged in or not.
 *
 * Design:
 * - All dates are US Eastern Time (ET) calendar dates, "YYYY-MM-DD", so a
 *   streak's day boundary matches when this site's daily puzzles roll over,
 *   not the player's local timezone or the server's UTC clock. A player in
 *   London and a player in LA who both play at 8pm their own time should not
 *   get inconsistent streak behavior relative to "today" as the site defines
 *   it elsewhere (daily_completions/game_completions already key off ET-ish
 *   daily boundaries in spirit; this makes streaks agree).
 * - Two kinds of streak are tracked:
 *     1. Per-game streaks: consecutive ET days a specific gameSlug was
 *        completed at least once.
 *     2. A global streak: consecutive ET days ANY game was completed at
 *        least once. This is the "played any daily today" streak from the
 *        spec, deliberately tolerant of which specific game(s) were played
 *        each day (a player who does Footle on Monday and Soccer Grid on
 *        Tuesday keeps the global streak alive).
 * - Gaps: if a day is skipped (no completion of any game for the global
 *   streak, or of that specific game for a per-game streak), the streak
 *   resets to 1 on the next completion rather than continuing. There is no
 *   streak-freeze concept here (the dead profiles-based code had one; this
 *   module intentionally does not resurrect it since it would need durable
 *   server state to be meaningful, i.e. it depends on the very tables that
 *   don't exist).
 * - Multiple completions of the same game on the same ET day, or of several
 *   different games on the same ET day, only ever count once per streak per
 *   day: recording a completion is idempotent per (streak, ET day).
 * - Best/longest streak (current all-time high) is tracked per-game and
 *   globally, independent of whether the current streak later resets.
 *
 * Storage shape (single localStorage key, see STORAGE_KEY):
 * {
 *   version: 1,
 *   global: { current: number, longest: number, lastDate: 'YYYY-MM-DD' | null },
 *   perGame: {
 *     [gameSlug]: { current: number, longest: number, lastDate: 'YYYY-MM-DD' | null }
 *   },
 *   loginDates: string[] // distinct ET dates the app was opened (for #13 days-visited stat, and days-logged-in on Profile)
 * }
 *
 * Everything here is synchronous and side-effect-free except for the
 * localStorage read/write helpers, so it's cheap to call from render paths
 * and from the useGameCompletion hook-in without any network round trip.
 */

import { capOf, dayValue, pointsDay, recordedPoints, type ScoreCaps } from '@/lib/pointsRule';

export interface StreakEntry {
  /** Consecutive ET days up to and including lastDate. 0 if never recorded or broken with no replay yet. */
  current: number;
  /** Highest `current` has ever reached. */
  longest: number;
  /** Last ET date (YYYY-MM-DD) this streak was credited, or null if never. */
  lastDate: string | null;
}

export interface StreakState {
  version: 1;
  global: StreakEntry;
  perGame: Record<string, StreakEntry>;
  /** Distinct ET dates (YYYY-MM-DD) the app was opened at least once. Used for the days-visited / days-logged-in stats (#13, Profile). */
  loginDates: string[];
  /** Lifetime count of game completions on this browser (every finished game counts once). */
  totalPlays: number;
  /** Lifetime points from completed games on this browser, summed since Round 648 by the profile's rule (src/lib/pointsRule.ts): per game per day, the day's best, capped. */
  totalPoints: number;
  /** Round 648: the rule totalPoints is kept under. A store without it holds a pre 648 raw sum, which readState retires once. */
  pointsRule: typeof POINTS_RULE;
  /** Round 648: the pre 648 raw sum, set aside once and never shown. The browser kept no plays behind it, so the rule cannot recount it. */
  retiredPoints: number;
  /** Round 648: per game, the points already credited for its latest points day, so a second play that day adds only what it beats the first by. */
  dayPoints: Record<string, DayPoints>;
  /** Round 648: plays recorded before this browser had a cap for their game, held here until a fresh read of the caps settles them into totalPoints. */
  pendingPoints: PendingPoints[];
}

/** What the rule has credited for one game on one points day. */
export interface DayPoints {
  day: string;
  points: number;
}

/** A play waiting for its game's cap: the slug, its points day and the points it recorded. */
export interface PendingPoints {
  game: string;
  day: string;
  score: number;
}

const STORAGE_KEY = 'dukb-streaks-v1';

/* Round 648: the marker a store carries once its points are kept under the
   profile's rule. */
const POINTS_RULE = 648 as const;

/* Round 648: a bound on the pending list, so a browser that can never reach
   the caps table (an ad blocker on the database host, say) cannot grow the
   streak record without limit. Two hundred unsettled plays is weeks of play
   offline; the oldest are dropped past it. */
const PENDING_LIMIT = 200;

const EMPTY_ENTRY: StreakEntry = { current: 0, longest: 0, lastDate: null };

function emptyState(): StreakState {
  return {
    version: 1, global: { ...EMPTY_ENTRY }, perGame: {}, loginDates: [], totalPlays: 0,
    totalPoints: 0, pointsRule: POINTS_RULE, retiredPoints: 0, dayPoints: {}, pendingPoints: [],
  };
}

function validPending(p: unknown): p is PendingPoints {
  return !!p && typeof p === 'object'
    && typeof (p as PendingPoints).game === 'string' && (p as PendingPoints).game.length > 0
    && typeof (p as PendingPoints).day === 'string' && (p as PendingPoints).day.length > 0
    && typeof (p as PendingPoints).score === 'number' && Number.isFinite((p as PendingPoints).score) && (p as PendingPoints).score > 0;
}

function validDayPoints(raw: unknown): Record<string, DayPoints> {
  const out: Record<string, DayPoints> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [game, entry] of Object.entries(raw as Record<string, unknown>)) {
    const e = entry as DayPoints;
    if (e && typeof e.day === 'string' && typeof e.points === 'number' && Number.isFinite(e.points)) out[game] = { day: e.day, points: e.points };
  }
  return out;
}

/**
 * Today's date as an ET calendar date string "YYYY-MM-DD".
 *
 * Uses Intl.DateTimeFormat with America/New_York so DST transitions are
 * handled correctly (no fixed UTC-4/UTC-5 offset math that would drift
 * twice a year). en-CA locale gives YYYY-MM-DD formatting directly.
 */
export function getEtDateString(d: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    // Intl/timezone data unavailable (extremely old browser) - fall back to
    // local calendar date rather than throwing. Streaks still work, just
    // keyed to the visitor's local midnight instead of ET midnight.
    return d.toISOString().slice(0, 10);
  }
}

/** Number of whole calendar days between two YYYY-MM-DD strings (b - a), treating both as UTC-midnight dates so DST/local-tz never skews the diff. */
function daysBetween(a: string, b: string): number {
  const toUtcMs = (s: string) => Date.parse(`${s}T00:00:00Z`);
  const ms = toUtcMs(b) - toUtcMs(a);
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

/*
 * Round 648: the repair, run on read, once per browser.
 *
 * Before this round the tally added every play's raw score: a Pack Battle
 * pack's banked dollars (8,800,000 is an ordinary pack), every Club Manager
 * match's running season score, every reload of a finished daily. That sum
 * is what the own profile showed whenever it beat the server's number, and
 * what the points badges read. The profile's rule (src/lib/pointsRule.ts)
 * counts one row per game per day at the day's best, capped, and it can only
 * be applied to plays it can see. This store never kept the plays, only the
 * sum, so the rule can vouch for none of it: whatever a pre 648 sum holds is
 * more than the rule allows on the records this browser has, which are none.
 * The sum is set aside in retiredPoints (kept, never shown) and the tally
 * counts from here under the rule, which is also what the badges read. A
 * signed in player's own profile still shows the larger of this and the
 * server total, and the server total is the rule over every record the
 * database holds, so nothing a signed in player earned is lost from the page.
 */
function readState(): StreakState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) return emptyState();
    const state: StreakState = {
      version: 1,
      global: { ...EMPTY_ENTRY, ...(parsed.global || {}) },
      perGame: parsed.perGame && typeof parsed.perGame === 'object' ? parsed.perGame : {},
      loginDates: Array.isArray(parsed.loginDates) ? parsed.loginDates : [],
      totalPlays: typeof parsed.totalPlays === 'number' ? parsed.totalPlays : 0,
      totalPoints: typeof parsed.totalPoints === 'number' && Number.isFinite(parsed.totalPoints) ? parsed.totalPoints : 0,
      pointsRule: POINTS_RULE,
      retiredPoints: typeof parsed.retiredPoints === 'number' && Number.isFinite(parsed.retiredPoints) ? parsed.retiredPoints : 0,
      dayPoints: validDayPoints(parsed.dayPoints),
      pendingPoints: Array.isArray(parsed.pendingPoints) ? parsed.pendingPoints.filter(validPending) : [],
    };
    if (parsed.pointsRule !== POINTS_RULE) {
      state.retiredPoints += Math.max(0, state.totalPoints);
      state.totalPoints = 0;
      state.dayPoints = {};
      state.pendingPoints = [];
      writeState(state);
    }
    return state;
  } catch {
    return emptyState();
  }
}

function writeState(state: StreakState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable (quota / private mode) - streaks just won't
    // persist this session. Never throw, this must not break gameplay.
  }
}

/**
 * Advances a single streak entry given a new completion on `today`.
 * Idempotent: calling this again the same day with the same `today` is a
 * no-op (returns the entry unchanged) so replays / multiple games in one
 * day never double-increment.
 */
function advanceEntry(entry: StreakEntry, today: string): StreakEntry {
  if (entry.lastDate === today) return entry; // already credited today

  let nextCurrent: number;
  if (entry.lastDate === null) {
    nextCurrent = 1;
  } else {
    const gap = daysBetween(entry.lastDate, today);
    // gap === 1 means yesterday -> today, consecutive. gap <= 0 shouldn't
    // happen (today should never be before lastDate) but is treated as a
    // no-op-safe reset-to-1 rather than trusting stale/clock-skewed data.
    nextCurrent = gap === 1 ? entry.current + 1 : 1;
  }

  return {
    current: nextCurrent,
    longest: Math.max(entry.longest, nextCurrent),
    lastDate: today,
  };
}

/**
 * Call this once per completed game (see the one-line hook-in inside
 * useGameCompletion.ts). Updates both the global streak and the per-game
 * streak for `gameSlug`, then persists. Safe to call multiple times for the
 * same game on the same day (idempotent) and safe to call for many
 * different games on the same day (global streak still only advances once).
 *
 * Returns the resulting state so callers (e.g. useStreaks) can update
 * without a second localStorage read.
 *
 * Round 648: `cap` is the game's cap from public.game_score_caps
 * (src/lib/scoreCaps.ts knownCap): a number, null for a game with no ceiling
 * on record, or undefined when this browser has no cap for the game yet. The
 * play is credited by the profile's rule (creditDay below); with no cap to
 * hand it is held on pendingPoints and settled by settlePendingPoints when a
 * fresh read lands. A play that records nothing (a score of 0, or one above
 * what the server can store) has nothing to add and is never held.
 */
export function recordGameCompletion(gameSlug: string, when: Date = new Date(), score = 0, cap?: number | null): StreakState {
  const today = getEtDateString(when);
  const state = readState();

  state.global = advanceEntry(state.global, today);

  const perGamePrev = state.perGame[gameSlug] ?? { ...EMPTY_ENTRY };
  state.perGame[gameSlug] = advanceEntry(perGamePrev, today);

  // Lifetime totals for the Profile stats. Every finished game counts as one
  // play; scores accumulate. Round 301, audit finding 14: since Round 300 the
  // server tables also record signed in play, so this is the guest era and
  // same browser record that the Profile page merges with the server's.
  state.totalPlays = (state.totalPlays || 0) + 1;
  const points = recordedPoints(score);
  if (points > 0) {
    const day = pointsDay(when);
    if (cap === undefined) {
      state.pendingPoints.push({ game: gameSlug, day, score: points });
      if (state.pendingPoints.length > PENDING_LIMIT) state.pendingPoints.splice(0, state.pendingPoints.length - PENDING_LIMIT);
    } else {
      creditDay(state, gameSlug, day, points, cap === null ? null : Math.max(1, cap));
    }
  }

  writeState(state);
  return state;
}

/**
 * Round 648: one play credited by the profile's rule. A game day is worth its
 * best play at most the cap, so the first play of the day adds its value and
 * a later play the same day adds only what it beats the day's best by. A
 * held play settled late may belong to a day older than the game's latest
 * credited one; that day was never credited (a play is only held when no cap
 * was known), so it adds its value in full and the latest day stays tracked.
 */
function creditDay(state: StreakState, game: string, day: string, points: number, cap: number | null): void {
  const value = dayValue(points, cap);
  if (value <= 0) return;
  const held = state.dayPoints[game];
  if (held && held.day === day) {
    if (value > held.points) {
      state.totalPoints = (state.totalPoints || 0) + (value - held.points);
      held.points = value;
    }
    return;
  }
  state.totalPoints = (state.totalPoints || 0) + value;
  if (!held || held.day < day) state.dayPoints[game] = { day, points: value };
}

/**
 * Round 648: credit every held play by the profile's rule, in the order it
 * was played. `caps` must be a FRESH read of public.game_score_caps, because
 * a play whose game is absent from it is dropped for nothing: that is the
 * board's own rule for a game that is not on the allowlist, and it is only
 * true of a complete list. The held plays are first reduced to one per game
 * per day at that day's best, so a day is credited once however many of its
 * plays were held. Idempotent: the list is emptied as it is settled.
 */
export function settlePendingPoints(caps: ScoreCaps): StreakState {
  const state = readState();
  if (!state.pendingPoints.length) return state;
  const days = new Map<string, PendingPoints>();
  for (const pending of state.pendingPoints) {
    const key = `${pending.game}|${pending.day}`;
    const seen = days.get(key);
    if (!seen || pending.score > seen.score) days.set(key, { ...pending });
  }
  for (const pending of days.values()) {
    const cap = capOf(caps, pending.game);
    if (cap !== undefined) creditDay(state, pending.game, pending.day, pending.score, cap);
  }
  state.pendingPoints = [];
  writeState(state);
  return state;
}

/**
 * Call once per app load (e.g. from useStreaks' mount effect) to record
 * "the app was opened today" for the days-visited / days-logged-in stats.
 * Idempotent per ET day. Does not affect play streaks.
 */
export function recordVisit(when: Date = new Date()): StreakState {
  const today = getEtDateString(when);
  const state = readState();
  if (!state.loginDates.includes(today)) {
    state.loginDates.push(today);
    state.loginDates.sort();
  }
  writeState(state);
  return state;
}

/** Distinct ET dates the app has been opened, per this browser's localStorage. */
export function getVisitedDayCount(): number {
  return readState().loginDates.length;
}

/** The ET date string `delta` whole days away from `dateStr` (negative = earlier). */
function shiftDate(dateStr: string, delta: number): string {
  const ms = Date.parse(`${dateStr}T00:00:00Z`) + delta * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Consecutive ET days visited, ending today (owner Aug 2026: "the days
 * visited should be days in a row. Not in general"). Same yesterday-grace as
 * the play streak: if the last visit was yesterday the run is still alive, so
 * a player checking the site after dinner doesn't watch their number die at
 * midnight. A gap of 2+ days means the run is over and this returns 0 until
 * the next visit starts a new one.
 */
export function getVisitStreakFrom(loginDates: string[], today: string = getEtDateString()): number {
  const days = new Set(loginDates);
  let anchor = today;
  if (!days.has(anchor)) {
    const yesterday = shiftDate(today, -1);
    if (!days.has(yesterday)) return 0;
    anchor = yesterday;
  }
  let count = 0;
  let cursor = anchor;
  while (days.has(cursor)) {
    count++;
    cursor = shiftDate(cursor, -1);
  }
  return count;
}

/** Convenience read of the current consecutive-days-visited run from localStorage. */
export function getVisitStreakDays(): number {
  try {
    return getVisitStreakFrom(readState().loginDates);
  } catch {
    return 0;
  }
}

/**
 * Reads current state without mutating anything. Also applies a "is the
 * streak still alive as of right now" check: if the global/per-game
 * lastDate is neither today nor yesterday (ET), the *displayed* current
 * streak is presented as broken (0) even though the stored `current` value
 * is left untouched until the player's next completion explicitly resets it
 * via advanceEntry. This avoids a stale localStorage value showing "5 day
 * streak" days after the player actually stopped playing, while keeping the
 * write path simple (only ever written from recordGameCompletion).
 */
export function getStreakState(): StreakState {
  const state = readState();
  const today = getEtDateString();

  const isAlive = (entry: StreakEntry): StreakEntry => {
    if (entry.lastDate === null) return entry;
    const gap = daysBetween(entry.lastDate, today);
    if (gap <= 1) return entry; // today or yesterday - still alive (yesterday = "keep it going, not broken yet")
    return { ...entry, current: 0 };
  };

  return {
    ...state,
    global: isAlive(state.global),
    perGame: Object.fromEntries(
      Object.entries(state.perGame).map(([slug, entry]) => [slug, isAlive(entry)])
    ),
  };
}

/** Convenience: just the global current streak, post-liveness-check, for header/nav display. Returns 0 on any error (e.g. no localStorage). */
export function getGlobalCurrentStreak(): number {
  try {
    return getStreakState().global.current;
  } catch {
    return 0;
  }
}

/** Top N per-game streaks by longest streak, for the Profile page. Ties broken alphabetically by slug for stable rendering. */
export function getTopPerGameStreaks(n: number = 5): Array<{ gameSlug: string; entry: StreakEntry }> {
  const state = getStreakState();
  return Object.entries(state.perGame)
    .map(([gameSlug, entry]) => ({ gameSlug, entry }))
    .filter(({ entry }) => entry.longest > 0)
    .sort((a, b) => b.entry.longest - a.entry.longest || a.gameSlug.localeCompare(b.gameSlug))
    .slice(0, n);
}
