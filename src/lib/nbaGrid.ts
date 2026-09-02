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
 * Data layer for the NBA Franchise Grid (3x3 board of franchise and stat
 * criteria, one player per cell),
 * built entirely on nba_player_stats, a direct port of src/lib/hockeyGrid.ts
 * (task #24). Since Round 402 the shared mechanic lives in
 * src/lib/gridEngine.ts and this file is the NBA configuration of it: the
 * pools, the thresholds, the table and the columns.
 *
 * DATA NOTE (verified live against flawuiqbvjobmkfkauhw on 2026-07-21):
 * nba_player_stats holds CAREER totals, one row per player (3,227 rows,
 * zero duplicate names, zero null/blank `teams`, verified via execute_sql).
 * `teams` is a comma-separated list of basketball-reference franchise codes.
 * Current through 2025-26. Famous rows verified exactly: LeBron 43,394 pts /
 * CLE,LAL,MIA; Kareem 38,387; Jordan 32,292 / CHI,WAS; KG BOS,BRK,MIN;
 * Shaq's six teams.
 *
 * The 16-franchise pool below uses ONLY codes that are single-code
 * franchises in this dataset (275-429 players each), Washington (WAS+WSB),
 * the Nets (NJN+BRK+NYN), Hornets/Pelicans (CHH/CHO/CHA/NOH/NOK/NOP),
 * Kings (SAC+KCK+KCO+CIN), Clippers (LAC+SDC+BUF), Thunder (OKC+SEA) and
 * Grizzlies (MEM+VAN) are all EXCLUDED so no relocation-alias merging is
 * ever needed. Pair-intersection verification: the worst pairing among the
 * 16 (Bulls x Heat) still shares 25 players; worst achievement coverage is
 * 33+ qualifiers per franchise (POR x 5,000 rebounds). Whole table is
 * fetched once and guesses validate against the in-memory index, no edge
 * function, no per-guess round trip.
 */

// ---------------------------------------------------------------------------
// Types (the shared shapes come from the engine under their old names)
// ---------------------------------------------------------------------------

export type { CategoryKind, GridCategory, GridCell, GridPuzzle, CellStatus, GridDifficulty } from '@/lib/gridEngine';

export interface IndexedPlayer {
  name: string;
  franchises: Set<string>;
  points: number;
  rebounds: number;
  assists: number;
  games: number;
}

export type NbaGridData = FranchiseGridData<IndexedPlayer>;

// ---------------------------------------------------------------------------
// Franchise pool
// ---------------------------------------------------------------------------

/** 16 well-populated single-code franchises (see module docstring for why
 * multi-code relocation franchises are excluded). */
export const FRANCHISE_POOL: GridCategory[] = [
  { kind: 'franchise', id: 'LAL', label: 'Lakers' },
  { kind: 'franchise', id: 'BOS', label: 'Celtics' },
  { kind: 'franchise', id: 'CHI', label: 'Bulls' },
  { kind: 'franchise', id: 'GSW', label: 'Warriors' },
  { kind: 'franchise', id: 'NYK', label: 'Knicks' },
  { kind: 'franchise', id: 'PHI', label: '76ers' },
  { kind: 'franchise', id: 'DET', label: 'Pistons' },
  { kind: 'franchise', id: 'MIA', label: 'Heat' },
  { kind: 'franchise', id: 'PHO', label: 'Suns' },
  { kind: 'franchise', id: 'DAL', label: 'Mavericks' },
  { kind: 'franchise', id: 'HOU', label: 'Rockets' },
  { kind: 'franchise', id: 'MIL', label: 'Bucks' },
  { kind: 'franchise', id: 'CLE', label: 'Cavaliers' },
  { kind: 'franchise', id: 'ATL', label: 'Hawks' },
  { kind: 'franchise', id: 'SAS', label: 'Spurs' },
  { kind: 'franchise', id: 'POR', label: 'Trail Blazers' },
];

/**
 * 3 achievement tiers, each verified (2026-07-21) to clear 33+ qualifying
 * players on every one of the 16 franchises above (worst cases: CHI x
 * 10k points = 40, POR x 5k rebounds = 33, DET x 900 games = 41).
 */
export const ACHIEVEMENT_POOL: GridCategory[] = [
  { kind: 'achievement', id: 'pts10k', label: '10,000+ Career Points' },
  { kind: 'achievement', id: 'trb5k', label: '5,000+ Career Rebounds' },
  { kind: 'achievement', id: 'gp900', label: '900+ Games Played' },
];

function achievement(player: IndexedPlayer, id: string): boolean {
  if (id === 'pts10k') return player.points >= 10000;
  if (id === 'trb5k') return player.rebounds >= 5000;
  if (id === 'gp900') return player.games >= 900;
  return false;
}

export function playerMatchesCell(player: IndexedPlayer, cell: GridCell): boolean {
  return playerMatchesFranchiseCell(player, cell, achievement);
}

// ---------------------------------------------------------------------------
// Fetch + index
// ---------------------------------------------------------------------------

// Table has 3,227 rows (verified); anything far below that means a broken fetch.
export const MIN_POOL_SIZE = 2000;

const NBA_GRID: FranchiseGridConfig<IndexedPlayer> = {
  table: 'nba_player_stats',
  select: 'player_name, teams, points, trb, ast, games',
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
      rebounds: Number(raw.trb) || 0,
      assists: Number(raw.ast) || 0,
      games: Number(raw.games) || 0,
    };
  },
};

/**
 * Fetches the full nba_player_stats table once and builds an in-memory
 * index (franchise set + career totals per player). Returns null on failure
 * or an implausibly small result, so the page can show an error state
 * instead of a broken grid.
 */
export function fetchNbaGridData(): Promise<NbaGridData | null> {
  return fetchFranchiseGridData(NBA_GRID);
}

/** Bespoke PlayerAutocomplete source for nba_player_stats (career-history
 * pool; NOT a current-roster table, a franchise grid needs every era). */
export const NBA_STATS_PLAYER_SOURCE: PlayerSourceConfig = {
  table: 'nba_player_stats',
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

// Difficulty tiers, same semantics as hockeyGrid (see that module's #40 note):
// Easy = both milestone slots, Normal = exactly one, Hard = franchises only.
// Daily mode always uses 'normal'; correctness never depends on tier.
const DIFFICULTY_STORAGE_KEY = 'nba-grid-difficulty';

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
