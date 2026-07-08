/**
 * Local-first streak engine (#101).
 *
 * IMPORTANT CONTEXT: as of this writing, the `profiles`, `user_scores`, and
 * `daily_completions` tables referenced by AuthContext.tsx / useGameCompletion.ts
 * do NOT exist in the live Supabase project (verified via information_schema
 * and list_tables against flawuiqbvjobmkfkauhw). Every read/write against
 * them in the existing code silently no-ops or fails (caught/swallowed).
 * That existing "streak" logic inside useGameCompletion.ts is therefore dead
 * code in production today. This module does not depend on any of it and
 * does not touch those tables. It computes everything from localStorage so
 * streaks work correctly for every player, logged in or not.
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
  /** Lifetime sum of scores from completed games on this browser. */
  totalPoints: number;
}

const STORAGE_KEY = 'dukb-streaks-v1';

const EMPTY_ENTRY: StreakEntry = { current: 0, longest: 0, lastDate: null };

function emptyState(): StreakState {
  return { version: 1, global: { ...EMPTY_ENTRY }, perGame: {}, loginDates: [], totalPlays: 0, totalPoints: 0 };
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

function readState(): StreakState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) return emptyState();
    return {
      version: 1,
      global: { ...EMPTY_ENTRY, ...(parsed.global || {}) },
      perGame: parsed.perGame && typeof parsed.perGame === 'object' ? parsed.perGame : {},
      loginDates: Array.isArray(parsed.loginDates) ? parsed.loginDates : [],
      totalPlays: typeof parsed.totalPlays === 'number' ? parsed.totalPlays : 0,
      totalPoints: typeof parsed.totalPoints === 'number' ? parsed.totalPoints : 0,
    };
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
 */
export function recordGameCompletion(gameSlug: string, when: Date = new Date(), score = 0): StreakState {
  const today = getEtDateString(when);
  const state = readState();

  state.global = advanceEntry(state.global, today);

  const perGamePrev = state.perGame[gameSlug] ?? { ...EMPTY_ENTRY };
  state.perGame[gameSlug] = advanceEntry(perGamePrev, today);

  // Lifetime totals for the Profile stats. Every finished game counts as one
  // play; scores accumulate. The flat profiles/user_scores columns these used
  // to read don't exist in the live project, so this is the source of truth.
  state.totalPlays = (state.totalPlays || 0) + 1;
  state.totalPoints = (state.totalPoints || 0) + (Number.isFinite(score) ? Math.max(0, Math.round(score)) : 0);

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
