/**
 * Perfect Season engine core. Sport-agnostic: adapters supply rosters and
 * ratings, this module handles randomness, win probability, and the sim.
 * Reused later for NHL 82-0, NBA, NFL, and the Conquest match sim.
 */

import { getTodayET, dateSeed } from '@/lib/dateUtils';

export interface SeasonSlot {
  key: string;      // 'C', '1B', 'SP', ...
  label: string;    // display label
  weight: number;   // contribution to team overall
}

export interface DraftablePlayer {
  playerId: string;
  name: string;
  rating: number;          // 40-99
  eligible: string[];      // slot keys this player can fill
  detail: string;          // one-line season stat summary
}

export interface SpinSquad {
  squadId: string;         // unique per team-season
  teamName: string;
  year: number;
  players: DraftablePlayer[];
}

export interface SimResult {
  wins: number;
  losses: number;
  games: boolean[];        // true = win, in order
  perfect: boolean;
  overall: number;
}

/** Deterministic RNG (mulberry32) so daily seeds are reproducible. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

/** Team overall from filled slots (weighted mean). */
export function teamOverall(slots: SeasonSlot[], picks: Record<string, DraftablePlayer | null>): number {
  let sum = 0;
  let wsum = 0;
  for (const s of slots) {
    const p = picks[s.key];
    if (!p) continue;
    sum += p.rating * s.weight;
    wsum += s.weight;
  }
  return wsum > 0 ? sum / wsum : 0;
}

/**
 * Per-game win probability. Tuned so a drafted team of all-99 legends wins a
 * 162 game season unbeaten several percent of the time, while a merely great
 * team racks up wins but almost never goes perfect.
 */
export function winProbability(overall: number): number {
  const x = (overall - 77) / 5;
  const p = 1 / (1 + Math.exp(-x));
  return Math.min(0.985, Math.max(0.05, p));
}

export function simulateSeason(overall: number, games: number, seed: number): SimResult {
  const rand = rng(seed);
  const p = winProbability(overall);
  const results: boolean[] = [];
  let wins = 0;
  for (let i = 0; i < games; i++) {
    // A pinch of streakiness: losing yesterday stings today, winning helps
    const momentum = i > 0 ? (results[i - 1] ? 0.004 : -0.006) : 0;
    const win = rand() < Math.min(0.988, p + momentum);
    results.push(win);
    if (win) wins++;
  }
  return {
    wins,
    losses: games - wins,
    games: results,
    perfect: wins === games,
    overall: Math.round(overall),
  };
}

/** Ratings color tier for UI. */
export function ratingTier(r: number): 'elite' | 'great' | 'good' | 'meh' {
  if (r >= 90) return 'elite';
  if (r >= 80) return 'great';
  if (r >= 68) return 'good';
  return 'meh';
}

/** Squads must be able to fill an open slot, so spins never come up dead. */
export function squadFillsAny(squad: SpinSquad, openSlots: string[], usedNames: Set<string>): boolean {
  return squad.players.some(
    p => !usedNames.has(p.name) && p.eligible.some(e => openSlots.includes(e))
  );
}

// ---------------------------------------------------------------------------
// Retention modes: Classic / Hard / Daily
// ---------------------------------------------------------------------------
//
// Additive only. Classic behavior is unchanged if a page never reads
// GameMode or calls any of the helpers below.

export type GameMode = 'classic' | 'hard' | 'daily';

export const GAME_MODE_LABELS: Record<GameMode, string> = {
  classic: 'Classic',
  hard: 'Hard',
  daily: 'Daily',
};

export const GAME_MODE_BLURBS: Record<GameMode, string> = {
  classic: 'Ratings visible. Play as many runs as you want.',
  hard: 'Ratings hidden until the sim ends. Draft on reputation alone.',
  daily: 'Everyone gets the same wheel today. One attempt.',
};

/**
 * Hidden-rating display value for Hard Mode. Never returns the real number;
 * callers gate the real `rating` field behind `mode !== 'hard' || revealed`.
 */
export const HIDDEN_RATING_DISPLAY = '??';

/** True while a numeric rating should stay masked in the UI. */
export function isRatingHidden(mode: GameMode, revealed: boolean): boolean {
  return mode === 'hard' && !revealed;
}

// --- Daily seeding -----------------------------------------------------

/**
 * Per-sport salt so MLB/NHL/NBA/NFL don't all draw the identical sequence
 * of wheel indices on the same calendar day. Small distinct primes, not
 * secret, just decorrelation.
 */
const SPORT_SALTS: Record<string, number> = {
  mlb: 104729,
  nhl: 105143,
  nba: 105167,
  nfl: 105229,
};

/** Today's date string in the shared ET convention (`YYYY-MM-DD`). */
export function getDailyDateET(): string {
  return getTodayET();
}

/**
 * Deterministic integer seed for a sport's daily run. Same ET date + same
 * sport => same seed for every player, so wheel spins and squad picks line
 * up sitewide. Different sports get different seeds on the same date.
 */
export function dailySportSeed(sportKey: string, dateStr: string = getDailyDateET()): number {
  const salt = SPORT_SALTS[sportKey] ?? 100003;
  // dateSeed('2026-07-03') -> 20260703; combine multiplicatively with the
  // sport salt and re-seed through rng() once so small date deltas don't
  // produce trivially adjacent seeds.
  const base = (dateSeed(dateStr) * salt) >>> 0;
  return rng(base)() * 2 ** 31 | 0;
}

/**
 * Deterministic index picker for daily mode. Swap in place of
 * `Math.floor(Math.random() * arr.length)` when `mode === 'daily'`.
 * Advancing the shared rng() each call keeps successive daily picks
 * (reroll, next spin) reproducible in sequence for a given date+sport.
 */
export function makeDailyPicker(sportKey: string, dateStr: string = getDailyDateET()) {
  const rand = rng(dailySportSeed(sportKey, dateStr));
  return (len: number) => Math.floor(rand() * len);
}

// --- One-attempt-per-day persistence ------------------------------------

const DAILY_SCHEMA_VERSION = 1 as const;

export interface DailyAttemptRecord {
  v: typeof DAILY_SCHEMA_VERSION;
  date: string;          // ET date this attempt belongs to
  sim: SimResult;
  overall: number;
  spins: number;
  teamNames: string[];   // squads landed on, for the result recap
}

/** Namespaced localStorage key: `perfect-season-{sport}-daily-{date}`. */
function dailyStorageKey(sportKey: string, dateStr: string): string {
  return `perfect-season-${sportKey}-daily-${dateStr}`;
}

/** Reads today's stored attempt for a sport, if one exists and matches today. */
export function loadDailyAttempt(sportKey: string, dateStr: string = getDailyDateET()): DailyAttemptRecord | null {
  try {
    const raw = localStorage.getItem(dailyStorageKey(sportKey, dateStr));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DailyAttemptRecord;
    if (parsed.v !== DAILY_SCHEMA_VERSION || parsed.date !== dateStr) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Persists the single daily attempt for a sport. Overwrites any prior entry
 *  for the same date (there should never be one, since the UI blocks replay). */
export function saveDailyAttempt(
  sportKey: string,
  record: Omit<DailyAttemptRecord, 'v'>,
): void {
  try {
    const payload: DailyAttemptRecord = { v: DAILY_SCHEMA_VERSION, ...record };
    localStorage.setItem(dailyStorageKey(sportKey, record.date), JSON.stringify(payload));
  } catch {
    // localStorage unavailable, so daily mode still plays, it just won't lock.
  }
}

/** Milliseconds until the next ET midnight, for a "next puzzle in" countdown. */
export function msUntilNextDailyET(): number {
  const now = new Date();
  // Find the current ET wall-clock time, then compute ms remaining today.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value ?? 0);
  const hours = get('hour') % 24;
  const secondsIntoDay = hours * 3600 + get('minute') * 60 + get('second');
  const secondsRemaining = 24 * 3600 - secondsIntoDay;
  return Math.max(0, secondsRemaining * 1000);
}

/** Formats a countdown duration as `HH:MM:SS`. */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
