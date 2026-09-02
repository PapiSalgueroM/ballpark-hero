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
 * Data layer for the MLB Franchise Grid (3x3 board of franchise and stat
 * criteria, one player per cell),
 * built on the mlb_grid_players view, a port of src/lib/hockeyGrid.ts /
 * src/lib/nbaGrid.ts (task #24). Since Round 402 the shared mechanic lives in
 * src/lib/gridEngine.ts and this file is the MLB configuration of it.
 *
 * DATA NOTE (view created + verified 2026-07-21): mlb_grid_players is a
 * Lahman aggregate, one row per career, franchises = comma list of Lahman
 * franchID (stable across relocations: Ruth's Boston Braves year shows as
 * ATL), restricted to complete careers (last season <= 2019, since the
 * Lahman copy ends 2021) with 500+ games. 3,264 rows. Colliding display
 * names carry a career-span suffix (e.g. "Frank Thomas (1990-2008)").
 * Famous rows verified: Ruth ATL,BOS,NYY / 714 HR; Aaron ATL,MIL / 755;
 * Mays NYM,SFG / 660; Jeter 3,465 hits; Rickey Henderson's 9 franchises.
 *
 * Pair verification: worst pairing among the 16 franchises below is
 * MIN x STL with 50 shared players; worst achievement coverage is
 * MIN x 300+ HR with 12 qualifiers, every cell always has answers.
 * The whole view is fetched once (4 pages) and guesses validate against
 * the in-memory index; no per-guess round trips.
 *
 * IMPORTANT for players: the pool is careers FINISHED by 2019, guessing
 * active stars will not validate. The page copy says so.
 */

// ---------------------------------------------------------------------------
// Types (the shared shapes come from the engine under their old names)
// ---------------------------------------------------------------------------

export type { CategoryKind, GridCategory, GridCell, GridPuzzle, CellStatus, GridDifficulty } from '@/lib/gridEngine';

export interface IndexedPlayer {
  name: string;
  franchises: Set<string>;
  hits: number;
  hrs: number;
  games: number;
}

export type MlbGridData = FranchiseGridData<IndexedPlayer>;

// ---------------------------------------------------------------------------
// Franchise pool
// ---------------------------------------------------------------------------

/** 16 history-rich franchises, all identified by Lahman's stable franchID
 * (relocations already merged upstream in the view, no aliasing here). */
export const FRANCHISE_POOL: GridCategory[] = [
  { kind: 'franchise', id: 'NYY', label: 'Yankees' },
  { kind: 'franchise', id: 'BOS', label: 'Red Sox' },
  { kind: 'franchise', id: 'LAD', label: 'Dodgers' },
  { kind: 'franchise', id: 'SFG', label: 'Giants' },
  { kind: 'franchise', id: 'CHC', label: 'Cubs' },
  { kind: 'franchise', id: 'STL', label: 'Cardinals' },
  { kind: 'franchise', id: 'CIN', label: 'Reds' },
  { kind: 'franchise', id: 'PIT', label: 'Pirates' },
  { kind: 'franchise', id: 'PHI', label: 'Phillies' },
  { kind: 'franchise', id: 'DET', label: 'Tigers' },
  { kind: 'franchise', id: 'CLE', label: 'Cleveland' },
  { kind: 'franchise', id: 'CHW', label: 'White Sox' },
  { kind: 'franchise', id: 'BAL', label: 'Orioles' },
  { kind: 'franchise', id: 'OAK', label: 'Athletics' },
  { kind: 'franchise', id: 'ATL', label: 'Braves' },
  { kind: 'franchise', id: 'MIN', label: 'Twins' },
];

/**
 * 3 achievement tiers. Verified 2026-07-21: worst franchise coverage is
 * 12 qualifiers (Twins x 300+ HR); hits/games tiers are 27+ everywhere.
 * Pitchers can only fill franchise x franchise cells, by design.
 */
export const ACHIEVEMENT_POOL: GridCategory[] = [
  { kind: 'achievement', id: 'h2k', label: '2,000+ Career Hits' },
  { kind: 'achievement', id: 'hr300', label: '300+ Career Home Runs' },
  { kind: 'achievement', id: 'g2k', label: '2,000+ Games Played' },
];

function achievement(player: IndexedPlayer, id: string): boolean {
  if (id === 'h2k') return player.hits >= 2000;
  if (id === 'hr300') return player.hrs >= 300;
  if (id === 'g2k') return player.games >= 2000;
  return false;
}

export function playerMatchesCell(player: IndexedPlayer, cell: GridCell): boolean {
  return playerMatchesFranchiseCell(player, cell, achievement);
}

// ---------------------------------------------------------------------------
// Fetch + index
// ---------------------------------------------------------------------------

// View has 3,264 rows (verified); far fewer means a broken fetch.
export const MIN_POOL_SIZE = 2500;

const MLB_GRID: FranchiseGridConfig<IndexedPlayer> = {
  table: 'mlb_grid_players',
  select: 'player_name, franchises, hits, hrs, games',
  franchiseColumn: 'franchises',
  orderColumn: 'player_name',
  minPoolSize: MIN_POOL_SIZE,
  toPlayer(raw) {
    const name = String(raw.player_name ?? '').trim();
    const frStr = String(raw.franchises ?? '').trim();
    if (!name || !frStr) return null;
    const franchises = splitFranchises(frStr);
    if (franchises.size === 0) return null;
    return {
      name,
      franchises,
      hits: Number(raw.hits) || 0,
      hrs: Number(raw.hrs) || 0,
      games: Number(raw.games) || 0,
    };
  },
};

/**
 * Fetches the full mlb_grid_players view once and builds an in-memory index.
 * Returns null on failure or an implausibly small result.
 */
export function fetchMlbGridData(): Promise<MlbGridData | null> {
  return fetchFranchiseGridData(MLB_GRID);
}

/** Bespoke PlayerAutocomplete source for the mlb_grid_players view. */
export const MLB_GRID_PLAYER_SOURCE: PlayerSourceConfig = {
  table: 'mlb_grid_players',
  nameColumn: 'player_name',
  prominenceColumn: 'hits',
  ilikeLimit: 200,
  prominenceLimit: 1000,
};

// ---------------------------------------------------------------------------
// Puzzle generation
// ---------------------------------------------------------------------------

// Difficulty tiers, same semantics as hockeyGrid/nbaGrid: Easy = both
// milestone slots, Normal = exactly one, Hard = franchises only. Daily mode
// always uses 'normal'; correctness never depends on tier.
const DIFFICULTY_STORAGE_KEY = 'mlb-grid-difficulty';

export function loadGridDifficulty(): GridDifficulty {
  return loadGridDifficultyFor(DIFFICULTY_STORAGE_KEY);
}

export function saveGridDifficulty(next: GridDifficulty): void {
  saveGridDifficultyFor(DIFFICULTY_STORAGE_KEY, next);
}

/**
 * Builds a 3x3 puzzle: 6 categories split into 3 rows + 3 cols. Category mix
 * depends on difficulty; axis placement and shuffling stay seed-deterministic
 * either way, so a daily seed reproduces the same grid for everyone.
 */
export function buildGridPuzzle(seed: number, difficulty: GridDifficulty = 'normal') {
  return buildFranchisePuzzle(FRANCHISE_POOL, ACHIEVEMENT_POOL, seed, difficulty);
}

// ---------------------------------------------------------------------------
// Share grid
// ---------------------------------------------------------------------------

export { gridToEmoji } from '@/lib/gridEngine';
