import type { PlayerSourceConfig } from '@/lib/playerSearch';
import {
  buildFranchisePuzzle,
  fetchFranchiseGridData,
  loadGridDifficultyFor,
  playerMatchesFranchiseCell,
  saveGridDifficultyFor,
  type FranchiseGridConfig,
  type FranchiseGridData,
  type GridCategory,
  type GridCell,
  type GridDifficulty,
} from '@/lib/gridEngine';

/**
 * Data layer for the NFL grid on the shared engine (Round 405, phase 3 of
 * docs/designs/NFL-GRID-ENGINE-DESIGN.md), built entirely on
 * public.nfl_grid_players: the answer key scripts/genNflGridData.mjs derives
 * from the nflverse season rosters (1970 to 2001), the site's roster table
 * (2002 to 2025), the draft table, the regular season weekly stats (1999 to
 * 2024) and the Super Bowl table, one row per player keyed on the NFL's own
 * id or on name plus birth date where the old files carry none. Every rule
 * behind a row is written on the committed key file and held by
 * scripts/simNflGridData.mjs; this module only reads the facts.
 *
 * DATA NOTE (measured on the key file 2026-09-02, 22,008 players): every
 * pair of the 32 franchises shares at least 23 players (HOU x PIT is the
 * floor), and every achievement below clears 38 or more qualifiers on every
 * franchise (the floor is a Ravens or Texans quarterback, the two youngest
 * franchises). Stat seasons (1,000 yard rushing, 4,000 yard passing) were
 * measured too thin per franchise for a cell (seven Chargers with a 1,000
 * yard rushing season, two Eagles with a 4,000 yard passing season) and are
 * not offered; they stay in the key for the archive and for later boards.
 * scripts/simNflGrid.mjs recomputes both floors from the key file.
 *
 * NAMES. 1,584 of the players share a name with another player in the key.
 * The table carries a display_name that tells namesakes apart with a season
 * span (and a team, and a position, when the span is not enough); the
 * search box offers display names and a guess is matched on them, so a
 * "Chris Johnson" guess is either the Titans back (2008-2016) or the
 * cornerback (2003-2012), never a coin toss. The rule is the key's, not
 * this module's.
 */

// ---------------------------------------------------------------------------
// Types (the shared shapes come from the engine under their old names)
// ---------------------------------------------------------------------------

export type { CategoryKind, GridCategory, GridCell, GridPuzzle, CellStatus, GridDifficulty } from '@/lib/gridEngine';

export interface IndexedPlayer {
  /** The display name: the name alone, or the name with a span and more for a namesake. */
  name: string;
  franchises: Set<string>;
  /** Position groups: QB, RB, WR, TE, OL, DL, LB, DB (kickers and punters carry ST). */
  groups: Set<string>;
  draftRound: number | null;
  draftPick: number | null;
  undrafted: boolean;
  pass4k: number;
  rush1k: number;
  rec1k: number;
  sbWins: number;
}

export type NflGridData = FranchiseGridData<IndexedPlayer>;

// ---------------------------------------------------------------------------
// Pools
// ---------------------------------------------------------------------------

/** All 32 franchises by their current code, labelled by nickname the way the
 * old NFL boards labelled them ("Played for Bills"). The key already merged
 * every historical code (Oilers to TEN, St. Louis Rams to LA), so a Titans
 * cell counts Earl Campbell and a Rams cell counts Kurt Warner. */
export const FRANCHISE_POOL: GridCategory[] = [
  { kind: 'franchise', id: 'ARI', label: 'Cardinals' },
  { kind: 'franchise', id: 'ATL', label: 'Falcons' },
  { kind: 'franchise', id: 'BAL', label: 'Ravens' },
  { kind: 'franchise', id: 'BUF', label: 'Bills' },
  { kind: 'franchise', id: 'CAR', label: 'Panthers' },
  { kind: 'franchise', id: 'CHI', label: 'Bears' },
  { kind: 'franchise', id: 'CIN', label: 'Bengals' },
  { kind: 'franchise', id: 'CLE', label: 'Browns' },
  { kind: 'franchise', id: 'DAL', label: 'Cowboys' },
  { kind: 'franchise', id: 'DEN', label: 'Broncos' },
  { kind: 'franchise', id: 'DET', label: 'Lions' },
  { kind: 'franchise', id: 'GB', label: 'Packers' },
  { kind: 'franchise', id: 'HOU', label: 'Texans' },
  { kind: 'franchise', id: 'IND', label: 'Colts' },
  { kind: 'franchise', id: 'JAX', label: 'Jaguars' },
  { kind: 'franchise', id: 'KC', label: 'Chiefs' },
  { kind: 'franchise', id: 'LA', label: 'Rams' },
  { kind: 'franchise', id: 'LAC', label: 'Chargers' },
  { kind: 'franchise', id: 'LV', label: 'Raiders' },
  { kind: 'franchise', id: 'MIA', label: 'Dolphins' },
  { kind: 'franchise', id: 'MIN', label: 'Vikings' },
  { kind: 'franchise', id: 'NE', label: 'Patriots' },
  { kind: 'franchise', id: 'NO', label: 'Saints' },
  { kind: 'franchise', id: 'NYG', label: 'Giants' },
  { kind: 'franchise', id: 'NYJ', label: 'Jets' },
  { kind: 'franchise', id: 'PHI', label: 'Eagles' },
  { kind: 'franchise', id: 'PIT', label: 'Steelers' },
  { kind: 'franchise', id: 'SEA', label: 'Seahawks' },
  { kind: 'franchise', id: 'SF', label: '49ers' },
  { kind: 'franchise', id: 'TB', label: 'Buccaneers' },
  { kind: 'franchise', id: 'TEN', label: 'Titans' },
  { kind: 'franchise', id: 'WAS', label: 'Commanders' },
];

/** Twelve criteria the key answers for every franchise (see the data note). */
export const ACHIEVEMENT_POOL: GridCategory[] = [
  { kind: 'achievement', id: 'sb', label: 'Won a Super Bowl' },
  { kind: 'achievement', id: 'first', label: 'First Round Pick' },
  { kind: 'achievement', id: 'undrafted', label: 'Undrafted' },
  { kind: 'achievement', id: 'late', label: 'Round 6 or Later Pick' },
  { kind: 'achievement', id: 'pos:QB', label: 'Quarterback' },
  { kind: 'achievement', id: 'pos:RB', label: 'Running Back' },
  { kind: 'achievement', id: 'pos:WR', label: 'Wide Receiver' },
  { kind: 'achievement', id: 'pos:TE', label: 'Tight End' },
  { kind: 'achievement', id: 'pos:OL', label: 'Offensive Lineman' },
  { kind: 'achievement', id: 'pos:DL', label: 'Defensive Lineman' },
  { kind: 'achievement', id: 'pos:LB', label: 'Linebacker' },
  { kind: 'achievement', id: 'pos:DB', label: 'Defensive Back' },
];

/** The roster position codes (raw on the key, coarse in the old files) to the
 * eight groups a board can ask for. Codes not listed (K, P, LS, SPEC, KR, PR)
 * fold to ST and are not offered as a criterion. */
export const POSITION_GROUPS: Record<string, string> = {
  QB: 'QB',
  RB: 'RB', FB: 'RB', HB: 'RB',
  WR: 'WR',
  TE: 'TE',
  OL: 'OL', T: 'OL', G: 'OL', C: 'OL', OT: 'OL', OG: 'OL',
  DL: 'DL', DE: 'DL', DT: 'DL', NT: 'DL',
  LB: 'LB', ILB: 'LB', OLB: 'LB', MLB: 'LB',
  DB: 'DB', CB: 'DB', S: 'DB', SS: 'DB', FS: 'DB',
};

export function positionGroup(code: string): string {
  return POSITION_GROUPS[String(code || '').toUpperCase()] ?? 'ST';
}

function achievement(player: IndexedPlayer, id: string): boolean {
  if (id === 'sb') return player.sbWins > 0;
  if (id === 'first') return player.draftRound === 1;
  if (id === 'undrafted') return player.undrafted;
  if (id === 'late') return player.draftRound !== null && player.draftRound >= 6;
  if (id.startsWith('pos:')) return player.groups.has(id.slice(4));
  return false;
}

export function playerMatchesCell(player: IndexedPlayer, cell: GridCell): boolean {
  return playerMatchesFranchiseCell(player, cell, achievement);
}

// ---------------------------------------------------------------------------
// Fetch + index
// ---------------------------------------------------------------------------

// The key holds 22,008 players (2026-09-02); far fewer means a broken fetch.
export const MIN_POOL_SIZE = 15000;

const NFL_GRID: FranchiseGridConfig<IndexedPlayer> = {
  table: 'nfl_grid_players',
  select: 'display_name, teams, pos, draft_round, draft_pick, undrafted, pass4k, rush1k, rec1k, sb_wins',
  franchiseColumn: 'teams',
  orderColumn: 'id',
  minPoolSize: MIN_POOL_SIZE,
  toPlayer(raw) {
    const name = String(raw.display_name ?? '').trim();
    const teams = Array.isArray(raw.teams) ? (raw.teams as string[]) : [];
    if (!name || teams.length === 0) return null;
    const franchises = new Set(teams.map((t) => String(t).toUpperCase()));
    const pos = Array.isArray(raw.pos) ? (raw.pos as string[]) : [];
    const draftRound = raw.draft_round == null ? null : Number(raw.draft_round);
    const draftPick = raw.draft_pick == null ? null : Number(raw.draft_pick);
    return {
      name,
      franchises,
      groups: new Set(pos.map(positionGroup)),
      draftRound: Number.isFinite(draftRound as number) ? draftRound : null,
      draftPick: Number.isFinite(draftPick as number) ? draftPick : null,
      undrafted: raw.undrafted === true,
      pass4k: Number(raw.pass4k) || 0,
      rush1k: Number(raw.rush1k) || 0,
      rec1k: Number(raw.rec1k) || 0,
      sbWins: Number(raw.sb_wins) || 0,
    };
  },
};

/**
 * Fetches the whole key once and builds the in-memory index the page
 * validates every guess against. Returns null on failure or an implausibly
 * small result, so the page can show an error state instead of a broken grid.
 */
export function fetchNflGridData(): Promise<NflGridData | null> {
  return fetchFranchiseGridData(NFL_GRID);
}

/** The search box source: the key's display names, recent careers first. */
export const NFL_GRID_PLAYER_SOURCE: PlayerSourceConfig = {
  table: 'nfl_grid_players',
  nameColumn: 'display_name',
  prominenceColumn: 'last_season',
  ilikeLimit: 200,
  prominenceLimit: 1000,
};

// ---------------------------------------------------------------------------
// Puzzle generation
// ---------------------------------------------------------------------------

const DIFFICULTY_STORAGE_KEY = 'nfl-grid-difficulty';

export function loadGridDifficulty(): GridDifficulty {
  return loadGridDifficultyFor(DIFFICULTY_STORAGE_KEY);
}

export function saveGridDifficulty(next: GridDifficulty): void {
  saveGridDifficultyFor(DIFFICULTY_STORAGE_KEY, next);
}

/**
 * Builds a 3x3 puzzle from the two pools: the engine's shapes (easy, normal,
 * hard) and its seed sequence, so a date seed reproduces the same board for
 * everyone and never repeats a hand authored pool.
 */
export function buildGridPuzzle(seed: number, difficulty: GridDifficulty = 'normal') {
  return buildFranchisePuzzle(FRANCHISE_POOL, ACHIEVEMENT_POOL, seed, difficulty);
}

export { gridToEmoji } from '@/lib/gridEngine';
