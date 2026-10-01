import {
  ACHIEVEMENTS, buildAchievementFacts, emptyAchievementFacts,
  type AchievementDef, type AchievementFacts, type CompletionRow,
} from '@/lib/achievements';
import { getEtDateString, readDiary, type PlayDiary, type StreakState } from '@/lib/streaks';

/* Round 712: when each achievement was earned, spec item 16's unlock date.

   THE CASE STAYS DERIVED. src/lib/achievements.ts still decides what is earned
   from the facts every time it is opened and still writes nothing. This file
   only answers "since when", and it writes exactly one thing: a small ledger of
   dates under its own localStorage key. No table, no score, no streak, no call
   into the recorder. scripts/simStreakHistory.mjs reads this file and fails if
   it ever writes anything else.

   A DATE IS ONLY PRINTED WHEN IT IS TRUE. Three kinds, and every label is a
   statement the evidence backs:

     exact    worked out from dated evidence: the player's own game days (the
              same rows the case counts) or this browser's play diary. The day
              the facts first cross the line is the day it was earned. Shown
              as "Earned 12 Sep 2026", and it never moves again.
     seen     nothing dated stands behind it (points and saved scores carry no
              day), so the ledger keeps the first day the case saw it earned.
              That is "on or before", so it is shown as "Earned by 30 Sep 2026".
     before   it was already earned the first time this browser opened a case
              that kept dates, and there is no dated evidence for it. Shown as
              "Earned before dates were kept".

   HOW THE DATES ARE WORKED OUT. Every definition is replayed, not re-written:
   the same earned() predicate the case uses is asked about the facts as they
   stood at the end of each day, and the first day it says yes is the date.
   So a threshold changed in achievements.ts moves its date with it, and there
   is no second copy of any rule here to drift. Facts nothing dated can speak
   for are held at zero in the replay, so an achievement that needs them is
   never dated from evidence that does not cover it. */

export interface UnlockMark {
  /** ET day, or null for "earned before dates were kept". */
  day: string | null;
  /** true when the day comes from dated evidence, false when it is the first
   *  day the case saw it (read as "on or before"). */
  exact: boolean;
}

export interface UnlockLedger {
  version: 1;
  /** ET day this browser started keeping unlock dates. */
  keptSince: string;
  marks: Record<string, UnlockMark>;
}

const LEDGER_KEY = 'dukb-achievement-dates-v1';

/** A streak state with nothing in it, so the replay's streak facts are zero. */
function noStreaks(): StreakState {
  return {
    version: 1,
    global: { current: 0, longest: 0, lastDate: null },
    perGame: {},
    loginDates: [],
    totalPlays: 0,
    totalPoints: 0,
  };
}

/**
 * The first day each definition is earned, over `days` in ascending order.
 * `factsAt(i)` is the facts at the end of days[i]. Every definition in the
 * case is monotone (simAchievements section 6 holds that), so once earned it
 * stays earned and the first day can be found by halving rather than by
 * building the facts for every day, which matters for a player with years of
 * game days. Facts are built once per day asked about and shared.
 */
function firstDays(days: string[], factsAt: (i: number) => AchievementFacts, skip: (d: AchievementDef) => boolean): Record<string, string> {
  const out: Record<string, string> = {};
  if (!days.length) return out;
  const memo = new Map<number, AchievementFacts>();
  const at = (i: number): AchievementFacts => {
    let f = memo.get(i);
    if (!f) { f = factsAt(i); memo.set(i, f); }
    return f;
  };
  const last = days.length - 1;
  for (const def of ACHIEVEMENTS) {
    if (skip(def) || !def.earned(at(last))) continue;
    let lo = 0;
    let hi = last;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (def.earned(at(mid))) hi = mid; else lo = mid + 1;
    }
    out[def.id] = days[lo];
  }
  return out;
}

/**
 * Pure. The first day the player's own game days earn each achievement, with
 * every fact that is not counted off those rows held at zero. The rows are the
 * ones the case itself reads (one per game per Eastern day), so the replay's
 * last day is exactly the case's own row facts.
 */
export function datesFromRows(rows: CompletionRow[]): Record<string, string> {
  const clean = (rows ?? []).filter(r => r && typeof r.game === 'string' && r.game && typeof r.completed_on === 'string' && r.completed_on);
  const sorted = [...clean].sort((a, b) => (a.completed_on < b.completed_on ? -1 : a.completed_on > b.completed_on ? 1 : 0));
  const days: string[] = [];
  const ends: number[] = [];
  sorted.forEach((r, i) => {
    if (days[days.length - 1] !== r.completed_on) { days.push(r.completed_on); ends.push(i + 1); }
    else ends[ends.length - 1] = i + 1;
  });
  const empty = noStreaks();
  return firstDays(days, i => buildAchievementFacts(sorted.slice(0, ends[i]), empty, {}, 0), () => false);
}

/** Pure. The longest run of consecutive days in `line` up to and including
 *  each day of `days`, as an array aligned with `days`. */
function bestRunAt(days: string[], lineDays: string[]): number[] {
  const set = new Set(lineDays);
  const out: number[] = [];
  let prev: string | null = null;
  let run = 0;
  let best = 0;
  for (const day of days) {
    if (set.has(day)) {
      const gap = prev === null ? 0 : (Date.parse(`${day}T00:00:00Z`) - Date.parse(`${prev}T00:00:00Z`)) / 86400000;
      run = gap === 1 ? run + 1 : 1;
      best = Math.max(best, run);
      prev = day;
    }
    out.push(best);
  }
  return out;
}

/**
 * Pure. The first day this browser's play diary shows each streak achievement
 * earned. Anything the counters already held when the diary began is skipped,
 * since the run that earned it may have happened out of the diary's sight.
 */
export function datesFromDiary(diary: PlayDiary | null): Record<string, string> {
  if (!diary) return {};
  const held: AchievementFacts = {
    ...emptyAchievementFacts(),
    longestStreak: diary.heldAtStart.longest,
    bestGameStreak: diary.heldAtStart.bestGameStreak,
  };
  const lines = Object.values(diary.perGame);
  const days = [...new Set([...diary.global.days, ...lines.flatMap(l => l.days)])].sort();
  const longest = bestRunAt(days, diary.global.days);
  const games = lines.map(l => bestRunAt(days, l.days));
  const bestGame = days.map((_, i) => games.reduce((top, g) => Math.max(top, g[i]), 0));
  return firstDays(days, i => ({
    ...emptyAchievementFacts(),
    longestStreak: longest[i],
    bestGameStreak: bestGame[i],
  }), def => def.earned(held));
}

/**
 * Pure. The ledger after the case has seen `earnedIds`. Rules, in order:
 *   an exact day never moves;
 *   dated evidence replaces a guess, but only if it does not contradict it
 *     (an "earned by the 30th" is not replaced by the 31st, and an "earned
 *     before dates were kept" only by a day on or before the ledger began);
 *   anything new with no evidence is "before" on the very first sight and
 *     "earned by today" after that.
 * Ids not earned are left alone, and nothing is ever removed.
 */
export function settleLedger(
  prev: UnlockLedger | null,
  earnedIds: string[],
  derived: Record<string, string>,
  today: string,
): UnlockLedger {
  const keptSince = prev?.keptSince ?? today;
  const marks: Record<string, UnlockMark> = { ...(prev?.marks ?? {}) };
  for (const id of earnedIds) {
    const had = marks[id];
    const day = derived[id];
    if (had?.exact) continue;
    if (day) {
      const fits = !had
        || (had.day === null ? day <= keptSince : day <= had.day);
      if (fits) { marks[id] = { day, exact: true }; continue; }
    }
    if (had) continue;
    marks[id] = prev ? { day: today, exact: false } : { day: null, exact: false };
  }
  return { version: 1, keptSince, marks };
}

export function readUnlockLedger(): UnlockLedger | null {
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    if (!raw) return null;
    const l = JSON.parse(raw);
    if (!l || l.version !== 1 || typeof l.keptSince !== 'string' || !l.marks || typeof l.marks !== 'object') return null;
    const marks: Record<string, UnlockMark> = {};
    for (const [id, m] of Object.entries(l.marks as Record<string, UnlockMark>)) {
      if (m && (m.day === null || typeof m.day === 'string') && typeof m.exact === 'boolean') marks[id] = { day: m.day, exact: m.exact };
    }
    return { version: 1, keptSince: l.keptSince, marks };
  } catch {
    return null;
  }
}

/**
 * The one writer. Called by the achievement case once its facts have loaded,
 * on the player's own profile only. Reads the ledger and the diary, settles,
 * saves, and hands back the marks. Never throws: a blocked storage just means
 * no dates are shown.
 */
export function settleUnlockDates(earnedIds: string[], rows: CompletionRow[]): Record<string, UnlockMark> {
  try {
    const prev = readUnlockLedger();
    const derived = { ...datesFromDiary(readDiary()), ...datesFromRows(rows) };
    const next = settleLedger(prev, earnedIds, derived, getEtDateString());
    try {
      localStorage.setItem(LEDGER_KEY, JSON.stringify(next));
    } catch {
      // storage full or blocked: show what we worked out, keep nothing
    }
    return next.marks;
  } catch {
    return {};
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-09-12" to "12 Sep 2026", by hand so no timezone can shift the day. */
export function formatEtDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  if (!y || !m || !d || m < 1 || m > 12) return day;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** The line under an earned tile. */
export function unlockLabel(mark: UnlockMark | undefined): string | null {
  if (!mark) return null;
  if (mark.day === null) return 'Earned before dates were kept';
  return mark.exact ? `Earned ${formatEtDay(mark.day)}` : `Earned by ${formatEtDay(mark.day)}`;
}
