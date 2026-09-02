import type { PlayerSourceConfig } from '@/lib/playerSearch';
import {
  buildFranchisePuzzle,
  fetchFranchiseGridData,
  loadGridDifficultyFor,
  playerMatchesFranchiseCell,
  saveGridDifficultyFor,
  splitFranchises,
  type FranchiseGridConfig,
  type FranchiseGridData,
  type GridCategory,
  type GridCell,
  type GridDifficulty,
} from '@/lib/gridEngine';

/**
 * Data layer for the NHL Franchise Grid (a 3x3 board of franchise and stat
 * criteria, one player per cell),
 * built entirely on nhl_player_stats. Since Round 402 the shared mechanic
 * lives in src/lib/gridEngine.ts and this file is the NHL configuration of
 * it: the pools, the thresholds, the table and the columns.
 *
 * DATA NOTE (verified live against flawuiqbvjobmkfkauhw on 2026-07-03):
 * nhl_player_stats holds CAREER totals, one row per player (6353 rows,
 * player_name has zero blanks and zero duplicate rows, verified via
 * execute_sql). Its `teams` column is a comma-separated list of 3-letter
 * franchise codes a player's career touched (already used the same way by
 * src/lib/perfectSeasonNhl.ts for the Perfect Season wheel). Splitting that
 * column into an array per player and cross-referencing franchise pairs
 * confirmed every pair among the 16 franchises used below shares well over
 * the minimum cell population a 3x3 grid needs: the worst pairing in the
 * verification query (Edmonton x Washington) still shares 35 players, and
 * every franchise individually has 500+ point scorers, 300+ goal scorers and
 * 1000+ game players in the double digits at minimum (worst case Calgary: 23
 * players with 300+ goals). This module fetches the whole table ONCE and
 * validates every guess against that in-memory index, so there is no edge
 * function and no per-guess round trip: this is the "SQL-derived static or
 * fetched pool" validation path called for in the brief, not an AI/text
 * validator.
 *
 * This does NOT reuse NHL_PLAYER_SOURCE from playerSearch.ts (that source
 * points at nhl_players, a current-roster-only table with only 876 real
 * players after dedup, verified separately for Puck Detective). A franchise
 * grid needs historical players too (any career that touched, say, the
 * Montreal Canadiens across any decade), so this module builds its own
 * PlayerSourceConfig pointed at nhl_player_stats.player_name instead.
 */

// ---------------------------------------------------------------------------
// Types (the shared shapes come from the engine under their old names)
// ---------------------------------------------------------------------------

export type { CategoryKind, GridCategory, GridCell, GridPuzzle, CellStatus, GridDifficulty } from '@/lib/gridEngine';

export interface IndexedPlayer {
  name: string;
  franchises: Set<string>;
  points: number;
  goals: number;
  assists: number;
  games: number;
}

export type HockeyGridData = FranchiseGridData<IndexedPlayer>;

// ---------------------------------------------------------------------------
// Franchise pool
// ---------------------------------------------------------------------------

/**
 * 16 well-populated Original-Six-plus franchises. Restricting to this list
 * (rather than all 47 codes that appear in `teams`, several of which are
 * defunct/relocated franchises with under 100 total players, e.g. Kansas
 * City Scouts at 45) keeps every possible row/column pairing in the healthy
 * range verified above. Label is the common-name short form used on the grid
 * axis; franchise history (relocations, renames) is intentionally not shown
 * here since the mystery is "did this player's career touch this code", not
 * a history quiz.
 */
export const FRANCHISE_POOL: GridCategory[] = [
  { kind: 'franchise', id: 'NYR', label: 'Rangers' },
  { kind: 'franchise', id: 'PIT', label: 'Penguins' },
  { kind: 'franchise', id: 'TOR', label: 'Maple Leafs' },
  { kind: 'franchise', id: 'STL', label: 'Blues' },
  { kind: 'franchise', id: 'BOS', label: 'Bruins' },
  { kind: 'franchise', id: 'LAK', label: 'Kings' },
  { kind: 'franchise', id: 'PHI', label: 'Flyers' },
  { kind: 'franchise', id: 'VAN', label: 'Canucks' },
  { kind: 'franchise', id: 'DET', label: 'Red Wings' },
  { kind: 'franchise', id: 'MTL', label: 'Canadiens' },
  { kind: 'franchise', id: 'EDM', label: 'Oilers' },
  { kind: 'franchise', id: 'WSH', label: 'Capitals' },
  { kind: 'franchise', id: 'CHI', label: 'Blackhawks' },
  { kind: 'franchise', id: 'CGY', label: 'Flames' },
  { kind: 'franchise', id: 'NYI', label: 'Islanders' },
  { kind: 'franchise', id: 'BUF', label: 'Sabres' },
];

/**
 * 3 achievement tiers, each verified to clear 20+ qualifying players on
 * every one of the 16 franchises above (worst case: 23 for Calgary x 300
 * goals). Kept to 3 so a random grid can safely place at most one
 * achievement per axis without starving the other axis's franchise options.
 */
export const ACHIEVEMENT_POOL: GridCategory[] = [
  { kind: 'achievement', id: 'pts500', label: '500+ Career Points' },
  { kind: 'achievement', id: 'goals300', label: '300+ Career Goals' },
  { kind: 'achievement', id: 'gp1000', label: '1000+ Games Played' },
];

function achievement(player: IndexedPlayer, id: string): boolean {
  if (id === 'pts500') return player.points >= 500;
  if (id === 'goals300') return player.goals >= 300;
  if (id === 'gp1000') return player.games >= 1000;
  return false;
}

export function playerMatchesCell(player: IndexedPlayer, cell: GridCell): boolean {
  return playerMatchesFranchiseCell(player, cell, achievement);
}

// ---------------------------------------------------------------------------
// Fetch + index
// ---------------------------------------------------------------------------

export const MIN_POOL_SIZE = 2000;

const NHL_GRID: FranchiseGridConfig<IndexedPlayer> = {
  table: 'nhl_player_stats',
  select: 'player_name, teams, points, goals, assists, games',
  franchiseColumn: 'teams',
  orderColumn: 'player_name',
  minPoolSize: MIN_POOL_SIZE,
  toPlayer(raw) {
    const name = String(raw.player_name ?? '').trim();
    const teamsStr = String(raw.teams ?? '').trim();
    if (!name || !teamsStr) return null;
    const franchises = splitFranchises(teamsStr);
    if (franchises.size === 0) return null;
    return {
      name,
      franchises,
      points: Number(raw.points) || 0,
      goals: Number(raw.goals) || 0,
      assists: Number(raw.assists) || 0,
      games: Number(raw.games) || 0,
    };
  },
};

/**
 * Fetches the full nhl_player_stats table once and builds an in-memory
 * index (franchise set + career totals per player). Returns null on failure
 * or an implausibly small result, so the page can show an error state
 * instead of a broken grid.
 */
export function fetchHockeyGridData(): Promise<HockeyGridData | null> {
  return fetchFranchiseGridData(NHL_GRID);
}

/** Bespoke PlayerAutocomplete source for nhl_player_stats (NOT the shared NHL_PLAYER_SOURCE, see module docstring). */
export const NHL_STATS_PLAYER_SOURCE: PlayerSourceConfig = {
  table: 'nhl_player_stats',
  nameColumn: 'player_name',
  prominenceColumn: 'points',
  metaColumns: {
    position: 'position',
  },
  ilikeLimit: 200,
  prominenceLimit: 1000,
};

// ---------------------------------------------------------------------------
// Puzzle generation
// ---------------------------------------------------------------------------

// #40: prominence tiers for unlimited/practice play only. Daily mode always
// calls buildGridPuzzle with 'normal' (its historical, unaffected behavior).
// Grid structure (franchise/achievement categories, cell answer validation
// against the full nhl_player_stats index) is intentionally NOT changed by
// tier, since playerMatchesCell's correctness must never depend on
// difficulty. What varies is which categories a puzzle draws from:
//   Easy:   both achievement slots used (2 of 6 categories), each an
//           inherently "big name" milestone filter (500+ points, 300+ goals
//           or 1000+ games). Verified via SQL on 2026-07-03: every one of the
//           16 pool franchises clears at least 23 qualifying players on the
//           worst achievement (goals300), so both achievement slots are
//           always populated on every franchise pairing.
//   Normal: unchanged original behavior, exactly 1 achievement placed on a
//           random axis, 5 franchises fill the rest.
//   Hard:   0 achievements, all 6 categories are franchises. Verified via SQL
//           on 2026-07-03: the worst franchise-pair intersection across the
//           16-franchise pool is EDM x WSH with 35 shared players, so a
//           pure-franchise grid always clears a healthy minimum too. This is
//           harder because every cell needs a specific two-franchise career
//           overlap with no "just name a 500-point scorer" fallback.
const DIFFICULTY_STORAGE_KEY = 'hockey-grid-difficulty';

export function loadGridDifficulty(): GridDifficulty {
  return loadGridDifficultyFor(DIFFICULTY_STORAGE_KEY);
}

export function saveGridDifficulty(next: GridDifficulty): void {
  saveGridDifficultyFor(DIFFICULTY_STORAGE_KEY, next);
}

/**
 * Builds a 3x3 puzzle: 6 categories split into 3 rows + 3 cols. Category mix
 * depends on difficulty (see #40 note above); axis placement and shuffling
 * stay seed-deterministic either way, so a daily seed always reproduces the
 * same grid for every player on the same date.
 */
export function buildGridPuzzle(seed: number, difficulty: GridDifficulty = 'normal') {
  return buildFranchisePuzzle(FRANCHISE_POOL, ACHIEVEMENT_POOL, seed, difficulty);
}

// ---------------------------------------------------------------------------
// Share grid
// ---------------------------------------------------------------------------

export { gridToEmoji } from '@/lib/gridEngine';
