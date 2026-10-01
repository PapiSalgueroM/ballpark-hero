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

  /* Round 712: the diary is written from the state BEFORE this finish lands,
     so the runs it starts with (and the best runs it marks as already held)
     are the ones the counters had, not the ones this finish is about to make.
     Taken after, a five day streak finished today would be filed as held
     before the diary began and never get its date. */
  writeDiary(notePlay(readDiary() ?? startDiary(state, today), state, gameSlug, today));

  state.global = advanceEntry(state.global, today);

  const perGamePrev = state.perGame[gameSlug] ?? { ...EMPTY_ENTRY };
  state.perGame[gameSlug] = advanceEntry(perGamePrev, today);

  // Lifetime totals for the Profile stats. Every finished game counts as one
  // play; scores accumulate. Round 301, audit finding 14: since Round 300 the
  // server tables also record signed in play, so this is the guest era and
  // same browser record that the Profile page merges with the server's.
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
  // Round 712: start the diary on the first visit, so the days it can vouch
  // for begin the day this browser first loads it rather than the first finish.
  if (!readDiary()) writeDiary(startDiary(state, today));
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

/* ─── Round 712: the play diary, the history half of spec item 15 ──────────

   The counters above know three things per streak: how long the run is, the
   best it has ever been, and the last day it was credited. That is enough for
   the flame in the header and nowhere near enough for a calendar, because "5 in
   a row, last on the 12th" does not say which of the last eight weeks' days
   were played. So from this round a second key keeps the days themselves.

   A SEPARATE KEY, ON PURPOSE. StreakState is uploaded to profiles.streak_state
   on every signed in save and that column is publicly readable, so a list of
   every day somebody played does not belong in it. And a tab still running the
   previous build rewrites StreakState from only the fields it knows, which
   would quietly wipe anything added to it. The diary sits beside the counters
   under its own key, which older code never touches.

   IT NEVER CLAIMS A DAY IT DID NOT SEE. Three marks, not two:
     played   a finish was credited that day.
     rest     the diary can vouch that nothing was.
     unknown  the day is from before this browser kept a diary.
   When the diary starts, the run each counter already holds is copied in,
   because a current run of 5 ending on the 12th IS five played days, the 8th
   to the 12th: advanceEntry cannot have produced it any other way. Days before
   that run are unknown rather than rest, since an older run may have been
   there. A line the counters had never credited (a brand new browser, or a
   game first played after the diary began) is complete for all time, because a
   finish on this browser would have credited it.

   Writes happen in exactly two places, recordGameCompletion and recordVisit,
   and only to this key. Everything else below is a pure function of what it
   is handed, which is what scripts/simStreakHistory.mjs drives. */

const DIARY_KEY = 'dukb-play-diary-v1';

/** Days one line keeps, a little over two years. Past that the oldest drop
 *  off and become unknown, never rest (see trimLine). */
const DIARY_CAP = 800;

export interface DiaryLine {
  /** First ET day this line vouches for; earlier days are unknown. null means
   *  every day, because nothing had been credited when the line began. */
  from: string | null;
  /** ET days with a credited finish, ascending, no repeats. */
  days: string[];
}

export interface PlayDiary {
  version: 1;
  /** ET day this browser started keeping the diary. */
  keptSince: string;
  global: DiaryLine;
  perGame: Record<string, DiaryLine>;
  /** The best runs the counters already held before the diary could see
   *  them. A run that long may have happened out of sight, so nothing that
   *  needs one is ever dated from the diary. */
  heldAtStart: { longest: number; bestGameStreak: number };
}

/** The days of the run an entry holds: `current` days in a row ending on
 *  lastDate. A credited entry always has at least its last day. */
export function runDays(entry: StreakEntry | undefined | null): string[] {
  if (!entry || typeof entry.lastDate !== 'string') return [];
  const n = Math.min(DIARY_CAP, Math.max(1, Math.floor(Number(entry.current)) || 1));
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(shiftDate(entry.lastDate, -i));
  return out;
}

/** A line built from what the counters know: the held run, vouched for from
 *  its first day, or complete for all time if nothing was ever credited. */
function lineFromEntry(entry: StreakEntry | undefined | null): DiaryLine {
  const days = runDays(entry);
  return { from: days.length ? days[0] : null, days };
}

const bestOf = (perGame: Record<string, StreakEntry> | undefined): number =>
  Object.values(perGame ?? {}).reduce((top, e) => Math.max(top, e?.longest ?? 0), 0);

/** Pure. A fresh diary from the counters as they stand before anything new lands. */
export function startDiary(state: StreakState, today: string): PlayDiary {
  const perGame: Record<string, DiaryLine> = {};
  for (const [slug, entry] of Object.entries(state.perGame ?? {})) perGame[slug] = lineFromEntry(entry);
  return {
    version: 1,
    keptSince: today,
    global: lineFromEntry(state.global),
    perGame,
    heldAtStart: { longest: state.global?.longest ?? 0, bestGameStreak: bestOf(state.perGame) },
  };
}

function withDay(line: DiaryLine, day: string): DiaryLine {
  if (line.days.includes(day)) return line;
  return { from: line.from, days: [...line.days, day].sort() };
}

/** Keeps a line under the cap. The days dropped become unknown, never rest. */
function trimLine(line: DiaryLine): { line: DiaryLine; trimmed: boolean } {
  if (line.days.length <= DIARY_CAP) return { line, trimmed: false };
  const days = line.days.slice(line.days.length - DIARY_CAP);
  return { line: { from: days[0], days }, trimmed: true };
}

/**
 * Pure: the diary after a finish of `slug` on `today`. `before` is the counter
 * state before that finish is applied. Idempotent per (line, day), exactly like
 * advanceEntry, so a replay or a second game the same day adds nothing twice.
 * When a line drops old days, the best runs held at that moment are folded
 * into heldAtStart, because a run in the dropped days can no longer be seen.
 */
export function notePlay(diary: PlayDiary, before: StreakState, slug: string, today: string): PlayDiary {
  const g = trimLine(withDay(diary.global, today));
  const p = trimLine(withDay(diary.perGame[slug] ?? lineFromEntry(before.perGame?.[slug]), today));
  const heldAtStart = { ...diary.heldAtStart };
  if (g.trimmed) heldAtStart.longest = Math.max(heldAtStart.longest, before.global?.longest ?? 0);
  if (p.trimmed) heldAtStart.bestGameStreak = Math.max(heldAtStart.bestGameStreak, bestOf(before.perGame));
  return { ...diary, global: g.line, perGame: { ...diary.perGame, [slug]: p.line }, heldAtStart };
}

function isLine(v: unknown): v is DiaryLine {
  if (!v || typeof v !== 'object') return false;
  const l = v as DiaryLine;
  return (l.from === null || typeof l.from === 'string')
    && Array.isArray(l.days) && l.days.every(d => typeof d === 'string');
}

/** This browser's diary, or null if there is none yet (or it is unreadable,
 *  in which case the next write starts a new one and the old days read as
 *  unknown, which is true). */
export function readDiary(): PlayDiary | null {
  try {
    const raw = localStorage.getItem(DIARY_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || d.version !== 1 || typeof d.keptSince !== 'string' || !isLine(d.global)) return null;
    const perGame: Record<string, DiaryLine> = {};
    if (d.perGame && typeof d.perGame === 'object') {
      for (const [slug, line] of Object.entries(d.perGame)) if (isLine(line)) perGame[slug] = line;
    }
    const held = d.heldAtStart && typeof d.heldAtStart === 'object' ? d.heldAtStart : {};
    return {
      version: 1,
      keptSince: d.keptSince,
      global: d.global,
      perGame,
      heldAtStart: { longest: Number(held.longest) || 0, bestGameStreak: Number(held.bestGameStreak) || 0 },
    };
  } catch {
    return null;
  }
}

/** The counters exactly as stored, with no liveness check. The calendar needs
 *  the stored run length: getStreakState shows a broken run as 0, and a run of
 *  0 would hide the days that run really covered. */
export function readStreakCounters(): StreakState {
  return readState();
}

function writeDiary(diary: PlayDiary): void {
  try {
    localStorage.setItem(DIARY_KEY, JSON.stringify(diary));
  } catch {
    // Same as writeState: a full or blocked storage must never break a game.
  }
}

export type DayMark = 'played' | 'rest' | 'unknown' | 'ahead';

export interface CalendarDay {
  day: string;
  mark: DayMark;
}

/**
 * Pure: `weeks` weeks of one line, Monday to Sunday, oldest week first, the
 * last week holding `today`. Days after today are 'ahead'. The counters' own
 * run is folded in as well, so a day credited by a tab that never wrote the
 * diary still shows as played. With no line at all the counters are all there
 * is: their run is played, the days after it are rest, the days before it are
 * unknown. Every date here is plain calendar arithmetic on ET date strings, so
 * a clock change cannot stretch or shrink a week.
 */
export function playCalendar(
  line: DiaryLine | null | undefined,
  entry: StreakEntry | null | undefined,
  today: string,
  weeks = 8,
): CalendarDay[][] {
  const counted = lineFromEntry(entry);
  const played = new Set([...(line?.days ?? []), ...counted.days]);
  const from = line ? line.from : counted.from;
  const monday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  const start = shiftDate(today, -monday - 7 * (weeks - 1));
  const out: CalendarDay[][] = [];
  for (let w = 0; w < weeks; w++) {
    const week: CalendarDay[] = [];
    for (let d = 0; d < 7; d++) {
      const day = shiftDate(start, w * 7 + d);
      let mark: DayMark;
      if (day > today) mark = 'ahead';
      else if (played.has(day)) mark = 'played';
      else if (from !== null && day < from) mark = 'unknown';
      else mark = 'rest';
      week.push({ day, mark });
    }
    out.push(week);
  }
  return out;
}
