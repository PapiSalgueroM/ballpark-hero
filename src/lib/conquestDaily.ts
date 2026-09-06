/* ────────────────────────────────────────────────────────────────────────────
   conquestDaily.ts (Round 50, rewritten Round 476)
   Makes the Conquest daily badge REAL for all five sports. One shared,
   date-seeded Imperialism season per sport per day: every player on earth
   gets the same start, the same fixtures, and the same results, so the skill
   is picking the right empire and calling games. One scored attempt per day,
   with streaks and a share line. Free play stays exactly as it was.

   Determinism note: the imperialism engine accepts an rng parameter in
   randomPairings/resolveGame, and the sim consumes rolls in fixture order,
   which player predictions never touch. Seeding that rng with the ET date
   makes the whole season identical for everyone.

   Round 476, THE RUN IS RECORDED AS IT GOES. Until this round nothing was
   written down between the first pick and the final screen, so a player who
   reloaded on the last matchday was dealt the identical season back with
   every result already known and could call every game right. What is
   written after each settled round is an ACTION LOG rather than a state
   dump: the club the player rode plus the winner they called each round,
   which src/lib/conquestRun.ts replays into the exact run. It lives on the
   shared Round 428 record shape (src/lib/dailyRecord.ts), so the key is
   `conquest-<sport>-daily-<YYYY-MM-DD>`, the read fails closed on shape, and
   scripts/sweepSaves.mjs finds it like every other daily. The pre Round 428
   key it used to write is migrated forward on the first read of the day.
   ──────────────────────────────────────────────────────────────────────────── */
import { getTodayET } from '@/lib/dateUtils';
import { readDailyRecord, writeDailyRecord } from '@/lib/dailyRecord';

/* Round 459 added soccer: the fifth sport on the same daily shape. */
export type ConquestSport = 'nfl' | 'nba' | 'mlb' | 'nhl' | 'soccer';

/** xmur3-style string hash, gives a well-mixed 32-bit seed. */
function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** mulberry32: tiny, fast, good-enough PRNG for game sims. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Round 428 part two: every one of these takes the day as a parameter, so a
   caller can pin it once at mount and be sure the rng that dealt the map, the
   record it reads and the record it writes all name the same day. Reading the
   clock separately inside each of them filed a run that crossed midnight ET
   under TOMORROW, and the next day then opened already finished. The default
   keeps every existing caller working. */
/** The one rng every player shares for a given sport on a given ET date. */
export function dailyConquestRng(sport: ConquestSport, dateStr: string = getTodayET()): () => number {
  return mulberry32(hashString(`conquest-daily-${sport}-${dateStr}`));
}

export interface ConquestDailyResult {
  date: string;        // ET date this run was played
  team: string;        // franchise id the player rode
  score: number;
  empire: number;      // territories held at the end
  calls: number;       // correct predictions
  callsTotal: number;
  champion: string;    // franchise id that took the map
  championWasYou: boolean;
}

/** The daily slug for a sport, on the shared `<slug>-daily-<date>` key shape. */
export const dailySlug = (sport: ConquestSport) => `conquest-${sport}`;
/** The key this file wrote before Round 476, read once and migrated forward. */
const legacyResultKey = (sport: ConquestSport) => `conquest-daily-result-${sport}`;
const streakKey = (sport: ConquestSport) => `conquest-daily-streak-${sport}`;

/** Today's run: the club, every call made so far, and the result once it ends. */
export interface ConquestDailyRun {
  team: string;
  /** The winner called on each settled round, in order. Replays the season. */
  picks: string[];
  done: boolean;
  result: ConquestDailyResult | null;
}

function validResult(v: unknown): ConquestDailyResult | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const r = v as Record<string, unknown>;
  const strings = ['date', 'team', 'champion'] as const;
  const numbers = ['score', 'empire', 'calls', 'callsTotal'] as const;
  if (strings.some(k => typeof r[k] !== 'string' || !r[k])) return null;
  if (numbers.some(k => typeof r[k] !== 'number' || !Number.isFinite(r[k] as number))) return null;
  if (typeof r.championWasYou !== 'boolean') return null;
  return r as unknown as ConquestDailyResult;
}

/** Today's run in progress or finished, or null. Fails closed on any shape. */
export function loadDailyRun(sport: ConquestSport, dateStr: string = getTodayET()): ConquestDailyRun | null {
  const fresh = readDailyRecord<ConquestDailyRun>(dailySlug(sport), dateStr, fields => {
    if (typeof fields.team !== 'string' || !fields.team) return null;
    if (!Array.isArray(fields.picks) || fields.picks.some(p => typeof p !== 'string' || !p)) return null;
    if (typeof fields.done !== 'boolean') return null;
    const result = fields.result == null ? null : validResult(fields.result);
    if (fields.result != null && !result) return null;
    if (fields.done && !result) return null;
    return { team: fields.team, picks: fields.picks as string[], done: fields.done, result };
  });
  if (fresh) return fresh;
  /* The migration: a run finished today under the pre Round 428 key, before
     this build shipped. It carries no call log, so it can only ever be read
     as a finished run, which is exactly what it is. */
  try {
    const raw = localStorage.getItem(legacyResultKey(sport));
    if (!raw) return null;
    const result = validResult(JSON.parse(raw));
    if (!result || result.date !== dateStr) return null;
    return { team: result.team, picks: [], done: true, result };
  } catch {
    return null;
  }
}

/** Write the run as it stands. Called after the pick and after every round. */
export function saveDailyRun(sport: ConquestSport, run: ConquestDailyRun, dateStr: string = getTodayET()): void {
  writeDailyRecord(dailySlug(sport), dateStr, { team: run.team, picks: run.picks, done: run.done, result: run.result });
  try {
    localStorage.removeItem(legacyResultKey(sport));
  } catch {
    /* storage blocked: the old key is unreadable anyway */
  }
}

/** Is there a daily going today that the player has not finished? The two
 *  mode-select routes ask before they decide which screen to open on. */
export function hasUnfinishedDaily(sport: ConquestSport, dateStr: string = getTodayET()): boolean {
  const run = loadDailyRun(sport, dateStr);
  return !!run && !run.done;
}

/** Today's completed daily run, or null if the player has not finished one. */
export function loadDailyResult(sport: ConquestSport, dateStr: string = getTodayET()): ConquestDailyResult | null {
  const run = loadDailyRun(sport, dateStr);
  return run && run.done ? run.result : null;
}

interface StreakRecord { count: number; lastDate: string }

export function loadDailyStreak(sport: ConquestSport, dateStr: string = getTodayET()): number {
  try {
    const raw = localStorage.getItem(streakKey(sport));
    if (!raw) return 0;
    const s = JSON.parse(raw) as StreakRecord;
    // A streak survives until a full ET day is skipped.
    const today = dateStr;
    if (s.lastDate === today) return s.count;
    const last = new Date(s.lastDate + 'T12:00:00Z').getTime();
    const now = new Date(today + 'T12:00:00Z').getTime();
    const dayGap = Math.round((now - last) / 86400000);
    return dayGap <= 1 ? s.count : 0;
  } catch {
    return 0;
  }
}

/** Persist a finished daily run and bump the streak. Returns the new streak.
 *  The call log goes in with it, so the finished run still replays. */
export function saveDailyResult(
  sport: ConquestSport,
  result: ConquestDailyResult,
  dateStr: string = getTodayET(),
  picks: string[] = [],
): number {
  const today = dateStr;
  let newStreak = 1;
  try {
    const raw = localStorage.getItem(streakKey(sport));
    if (raw) {
      const s = JSON.parse(raw) as StreakRecord;
      if (s.lastDate === today) {
        newStreak = s.count; // already counted today, keep it
      } else {
        const last = new Date(s.lastDate + 'T12:00:00Z').getTime();
        const now = new Date(today + 'T12:00:00Z').getTime();
        const dayGap = Math.round((now - last) / 86400000);
        newStreak = dayGap === 1 ? s.count + 1 : 1;
      }
    }
    localStorage.setItem(streakKey(sport), JSON.stringify({ count: newStreak, lastDate: today } satisfies StreakRecord));
  } catch {
    /* storage unavailable (private mode): the run still plays, it just won't streak */
  }
  saveDailyRun(sport, { team: result.team, picks, done: true, result }, today);
  return newStreak;
}

export function dailyShareText(
  gameName: string,
  path: string,
  r: ConquestDailyResult,
  streak: number,
  championLabel: string,
  teamLabel: string,
): string {
  const streakPart = streak >= 2 ? ` 🔥${streak} day streak.` : '';
  const crownPart = r.championWasYou
    ? `MY ${teamLabel} took the whole map.`
    : `${championLabel} took the map, my ${teamLabel} held ${r.empire}.`;
  return `Daily Conquest 🗺️ ${r.date}: ${crownPart} Called ${r.calls}/${r.callsTotal} games. Score ${r.score}.${streakPart} Same fixtures for everyone, beat me: douknowball.com${path}`;
}
