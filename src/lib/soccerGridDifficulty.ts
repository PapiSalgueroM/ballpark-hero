import { SoccerGridAttribute, SoccerGridPuzzle } from '@/types/soccerGrid';

/**
 * Soccer Grid difficulty tiers, timer modes, and Overtime support.
 *
 * Difficulty is derived from data actually present in soccer_grid_puzzles,
 * not from a stored per-cell answer count (soccer_grid_selections has 0 rows
 * live, validity is decided at guess-time by the soccer-grid-validate edge
 * function against an LLM, not a fixed candidate list per cell). The closest
 * real signal we have is each cell's row/column attribute `type`, and how
 * common that type is across the full 500-puzzle pool:
 *
 *   club        1704   \
 *   league       463    |  broad, many real players satisfy these
 *   position     419    |  (common types, large answer pools in real life)
 *   nationality  373   /
 *   misc          13   \
 *   champions_league 11 |  narrow, few real players satisfy these
 *   world_cup     10    |  (rare types, small answer pools in real life)
 *   award          7   /
 *
 * A cell that pairs two broad types (e.g. club + league) has a large real
 * answer pool and plays Easy; a cell pairing a narrow type (award, Champions
 * League winner, World Cup winner, misc caps threshold) is much harder to
 * fill and plays Hard. Puzzle difficulty is the average narrowness of its
 * 9 cells (every row paired with every column).
 */

export type SoccerGridDifficulty = 'easy' | 'normal' | 'hard';

/** Higher = narrower = fewer real-world valid answers for that attribute type. */
const TYPE_NARROWNESS: Record<SoccerGridAttribute['type'], number> = {
  club: 1,
  league: 1,
  position: 1,
  nationality: 1,
  misc: 3,
  award: 3,
  champions_league: 3,
  world_cup: 3,
};

function attrNarrowness(attr: SoccerGridAttribute): number {
  return TYPE_NARROWNESS[attr.type] ?? 2;
}

/**
 * Average narrowness across all 9 row x column pairings for a puzzle.
 * Range: 2 (all-broad, e.g. club x league everywhere) to 6 (all-narrow).
 */
export function puzzleNarrownessScore(puzzle: SoccerGridPuzzle): number {
  let total = 0;
  let count = 0;
  for (const row of puzzle.rows) {
    for (const col of puzzle.cols) {
      total += attrNarrowness(row) + attrNarrowness(col);
      count += 1;
    }
  }
  return count > 0 ? total / count : 4;
}

/**
 * Classifies a puzzle into Easy / Normal / Hard using the narrowness score.
 * Thresholds split the observed 2-6 range into three bands.
 */
export function classifyPuzzleDifficulty(puzzle: SoccerGridPuzzle): SoccerGridDifficulty {
  const score = puzzleNarrownessScore(puzzle);
  if (score <= 2.75) return 'easy';
  if (score <= 4.25) return 'normal';
  return 'hard';
}

/**
 * Filters a puzzle pool down to a single difficulty tier. Falls back to the
 * full pool if a tier has too few puzzles to safely date-seed against
 * (avoids a tiny pool cycling the same handful of puzzles every few days).
 */
export function filterPoolByDifficulty(
  pool: SoccerGridPuzzle[],
  tier: SoccerGridDifficulty,
): SoccerGridPuzzle[] {
  const filtered = pool.filter((p) => classifyPuzzleDifficulty(p) === tier);
  return filtered.length >= 20 ? filtered : pool;
}

export const DIFFICULTY_TIERS: { tier: SoccerGridDifficulty; label: string; hint: string }[] = [
  { tier: 'easy', label: 'Easy', hint: 'Clubs, leagues, positions: the widest answer pools' },
  { tier: 'normal', label: 'Normal', hint: 'A mix of clubs, leagues, and nationalities' },
  { tier: 'hard', label: 'Hard', hint: 'Awards, Champions League and World Cup winners: narrow pools' },
];

// ---------------------------------------------------------------------------
// Timer modes
// ---------------------------------------------------------------------------

/** 0 means Unlimited (no clock). Matches the Futbol11 40/60/90/unlimited convention. */
export type SoccerGridTimerMode = 0 | 40 | 60 | 90;

export const TIMER_MODES: { mode: SoccerGridTimerMode; label: string }[] = [
  { mode: 0, label: 'Unlimited' },
  { mode: 90, label: '90s' },
  { mode: 60, label: '60s' },
  { mode: 40, label: '40s' },
];

export function formatTimeLeft(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
}

// ---------------------------------------------------------------------------
// Persisted settings (difficulty + timer choice), separate from
// useDailyPuzzle's own guesses/gameStatus storage key so this file never
// needs to know about that hook's internal schema.
// ---------------------------------------------------------------------------

export interface SoccerGridSettings {
  difficulty: SoccerGridDifficulty;
  timerMode: SoccerGridTimerMode;
}

const DEFAULT_SETTINGS: SoccerGridSettings = { difficulty: 'normal', timerMode: 0 };

function settingsKey(dateStr: string): string {
  return `soccer-grid-settings-${dateStr}`;
}

export function loadSoccerGridSettings(dateStr: string): SoccerGridSettings | null {
  try {
    const raw = localStorage.getItem(settingsKey(dateStr));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SoccerGridSettings>;
    if (
      (parsed.difficulty === 'easy' || parsed.difficulty === 'normal' || parsed.difficulty === 'hard') &&
      (parsed.timerMode === 0 || parsed.timerMode === 40 || parsed.timerMode === 60 || parsed.timerMode === 90)
    ) {
      return { difficulty: parsed.difficulty, timerMode: parsed.timerMode };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSoccerGridSettings(dateStr: string, settings: SoccerGridSettings): void {
  try {
    localStorage.setItem(settingsKey(dateStr), JSON.stringify(settings));
  } catch {
    // Quota exceeded or private browsing, silently skip persistence
  }
}

export { DEFAULT_SETTINGS };

// ---------------------------------------------------------------------------
// Overtime
// ---------------------------------------------------------------------------

/**
 * Overtime lets a player keep filling remaining cells after the main game
 * ends (win or out-of-guesses/time), without touching the recorded main
 * score. Overtime correct picks are tracked completely separately from the
 * main correctCount/rarityScore used for scoring and sharing.
 */
export interface OvertimeCell {
  cellIndex: number;
  playerName: string;
  rarity: number;
}

const overtimeKey = (dateStr: string) => `soccer-grid-overtime-${dateStr}`;

export function loadOvertimeCells(dateStr: string): OvertimeCell[] {
  try {
    const raw = localStorage.getItem(overtimeKey(dateStr));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OvertimeCell[]) : [];
  } catch {
    return [];
  }
}

export function saveOvertimeCells(dateStr: string, cells: OvertimeCell[]): void {
  try {
    localStorage.setItem(overtimeKey(dateStr), JSON.stringify(cells));
  } catch {
    // Quota exceeded or private browsing, silently skip persistence
  }
}

/** Whether the player has opted into Overtime after the main game ended. */
const overtimeActiveKey = (dateStr: string) => `soccer-grid-overtime-active-${dateStr}`;

export function loadOvertimeActive(dateStr: string): boolean {
  try {
    return localStorage.getItem(overtimeActiveKey(dateStr)) === '1';
  } catch {
    return false;
  }
}

export function saveOvertimeActive(dateStr: string, active: boolean): void {
  try {
    if (active) localStorage.setItem(overtimeActiveKey(dateStr), '1');
    else localStorage.removeItem(overtimeActiveKey(dateStr));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Timer expiry persistence, so a mid-timer refresh doesn't reset the clock
// and let a player who was about to run out keep going for free.
// ---------------------------------------------------------------------------

const timerExpiredKey = (dateStr: string) => `soccer-grid-timer-expired-${dateStr}`;
const timerStartedAtKey = (dateStr: string) => `soccer-grid-timer-started-${dateStr}`;

export function loadTimerExpired(dateStr: string): boolean {
  try {
    return localStorage.getItem(timerExpiredKey(dateStr)) === '1';
  } catch {
    return false;
  }
}

export function saveTimerExpired(dateStr: string): void {
  try {
    localStorage.setItem(timerExpiredKey(dateStr), '1');
  } catch {
    // ignore
  }
}

/** Records the epoch ms when the timer started, so remaining time survives a refresh. */
export function loadTimerStartedAt(dateStr: string): number | null {
  try {
    const raw = localStorage.getItem(timerStartedAtKey(dateStr));
    return raw ? parseInt(raw, 10) : null;
  } catch {
    return null;
  }
}

export function saveTimerStartedAt(dateStr: string, epochMs: number): void {
  try {
    localStorage.setItem(timerStartedAtKey(dateStr), String(epochMs));
  } catch {
    // ignore
  }
}
