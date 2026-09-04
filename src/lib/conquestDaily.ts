/* ────────────────────────────────────────────────────────────────────────────
   conquestDaily.ts (Round 50)
   Makes the Conquest daily badge REAL for all four sports. One shared,
   date-seeded Imperialism season per sport per day: every player on earth
   gets the same Voronoi start, the same fixtures, and the same results,
   so the skill is picking the right empire and calling games. One scored
   attempt per day, with streaks and a share line. Free play stays exactly
   as it was.

   Determinism note: the imperialism libs already accept an rng parameter in
   randomPairings/resolveGame, and the sim consumes rolls in fixture order,
   which player predictions never touch. Seeding that rng with the ET date
   makes the whole season identical for everyone.
   ──────────────────────────────────────────────────────────────────────────── */
import { getTodayET } from '@/lib/dateUtils';

export type ConquestSport = 'nfl' | 'nba' | 'mlb' | 'nhl';

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

const resultKey = (sport: ConquestSport) => `conquest-daily-result-${sport}`;
const streakKey = (sport: ConquestSport) => `conquest-daily-streak-${sport}`;

/** Today's completed daily run, or null if the player has not finished one. */
export function loadDailyResult(sport: ConquestSport, dateStr: string = getTodayET()): ConquestDailyResult | null {
  try {
    const raw = localStorage.getItem(resultKey(sport));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConquestDailyResult;
    return parsed.date === dateStr ? parsed : null;
  } catch {
    return null;
  }
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

/** Persist a finished daily run and bump the streak. Returns the new streak. */
export function saveDailyResult(sport: ConquestSport, result: ConquestDailyResult, dateStr: string = getTodayET()): number {
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
    localStorage.setItem(resultKey(sport), JSON.stringify(result));
  } catch {
    /* storage unavailable (private mode): the run still plays, it just won't lock or streak */
  }
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
