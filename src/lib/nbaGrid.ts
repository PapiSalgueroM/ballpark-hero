import { supabase } from '@/integrations/supabase/client';
import type { PlayerSourceConfig } from '@/lib/playerSearch';

/**
 * Data layer for the NBA Franchise Grid (3x3 Immaculate-Grid-style board),
 * built entirely on nba_player_stats, a direct port of src/lib/hockeyGrid.ts
 * (task #24). Keep the two in lockstep if the mechanic changes.
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
// Types
// ---------------------------------------------------------------------------

export type CategoryKind = 'franchise' | 'achievement';

export interface GridCategory {
  kind: CategoryKind;
  /** Stable id used for column/row identity, e.g. 'LAL' or 'pts10k'. */
  id: string;
  /** Short label shown on the grid axis, e.g. 'Lakers' or '10,000+ Points'. */
  label: string;
}

export interface IndexedPlayer {
  name: string;
  franchises: Set<string>;
  points: number;
  rebounds: number;
  assists: number;
  games: number;
}

export interface NbaGridData {
  players: IndexedPlayer[];
  byNormalizedName: Map<string, IndexedPlayer>;
}

export interface GridCell {
  row: GridCategory;
  col: GridCategory;
}

export interface GridPuzzle {
  id: string;
  rows: GridCategory[];
  cols: GridCategory[];
}

export type CellStatus = 'empty' | 'correct' | 'wrong';

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

function matchesCategory(player: IndexedPlayer, cat: GridCategory): boolean {
  if (cat.kind === 'franchise') return player.franchises.has(cat.id);
  if (cat.id === 'pts10k') return player.points >= 10000;
  if (cat.id === 'trb5k') return player.rebounds >= 5000;
  if (cat.id === 'gp900') return player.games >= 900;
  return false;
}

export function playerMatchesCell(player: IndexedPlayer, cell: GridCell): boolean {
  return matchesCategory(player, cell.row) && matchesCategory(player, cell.col);
}

// ---------------------------------------------------------------------------
// Fetch + index
// ---------------------------------------------------------------------------

interface RawStatsRow {
  player_name: string | null;
  teams: string | null;
  points: number | null;
  trb: number | null;
  ast: number | null;
  games: number | null;
}

// Combining diacritical marks block (U+0300 to U+036F), built from char codes
// (never literal accented characters) so it cannot be mangled by copy/paste
// or re-encoding, matching the DIACRITICS regex in src/lib/playerSearch.ts.
const DIACRITICS = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

function normalize(name: string): string {
  return name
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

// Table has 3,227 rows (verified); anything far below that means a broken fetch.
export const MIN_POOL_SIZE = 2000;

/**
 * Fetches the full nba_player_stats table once and builds an in-memory
 * index (franchise set + career totals per player). Returns null on failure
 * or an implausibly small result, so the page can show an error state
 * instead of a broken grid.
 */
export async function fetchNbaGridData(): Promise<NbaGridData | null> {
  try {
    // PostgREST caps every select at 1000 rows regardless of .limit(),
    // so page through the table with .range() until a short page arrives.
    const PAGE_SIZE = 1000;
    const rows: RawStatsRow[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('nba_player_stats' as any)
        .select('player_name, teams, points, trb, ast, games')
        .not('teams', 'is', null)
        .order('player_name', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error || !data) return null;
      rows.push(...(data as RawStatsRow[]));
      if (data.length < PAGE_SIZE) break;
    }

    const players: IndexedPlayer[] = [];
    const byNormalizedName = new Map<string, IndexedPlayer>();

    for (const raw of rows) {
      const name = String(raw.player_name ?? '').trim();
      const teamsStr = String(raw.teams ?? '').trim();
      if (!name || !teamsStr) continue;

      const franchises = new Set(
        teamsStr
          .split(',')
          .map((t) => t.trim().toUpperCase())
          .filter(Boolean),
      );
      if (franchises.size === 0) continue;

      const entry: IndexedPlayer = {
        name,
        franchises,
        points: Number(raw.points) || 0,
        rebounds: Number(raw.trb) || 0,
        assists: Number(raw.ast) || 0,
        games: Number(raw.games) || 0,
      };
      players.push(entry);
      byNormalizedName.set(normalize(name), entry);
    }

    return players.length >= MIN_POOL_SIZE ? { players, byNormalizedName } : null;
  } catch {
    return null;
  }
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

function pickN<T>(pool: T[], n: number, rng: () => number): T[] {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, n);
}

/** Deterministic PRNG (mulberry32) so a date seed reproduces the same grid for every player on the same day. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Difficulty tiers, same semantics as hockeyGrid (see that module's #40 note):
// Easy = both milestone slots, Normal = exactly one, Hard = franchises only.
// Daily mode always uses 'normal'; correctness never depends on tier.
export type GridDifficulty = 'easy' | 'normal' | 'hard';
const DIFFICULTY_STORAGE_KEY = 'nba-grid-difficulty';

export function loadGridDifficulty(): GridDifficulty {
  try {
    const raw = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
    if (raw === 'easy' || raw === 'normal' || raw === 'hard') return raw;
  } catch { /* localStorage unavailable, fall back to default */ }
  return 'normal';
}

export function saveGridDifficulty(next: GridDifficulty): void {
  try { localStorage.setItem(DIFFICULTY_STORAGE_KEY, next); } catch { /* ignore */ }
}

/**
 * Builds a 3x3 puzzle: 6 categories split into 3 rows + 3 cols. Category mix
 * depends on difficulty; axis placement and shuffling stay seed-deterministic
 * either way, so a daily seed reproduces the same grid for everyone.
 */
export function buildGridPuzzle(seed: number, difficulty: GridDifficulty = 'normal'): GridPuzzle {
  const rng = mulberry32(seed);

  if (difficulty === 'hard') {
    // All 6 categories are franchises, no achievement slot at all.
    const franchises = pickN(FRANCHISE_POOL, 6, rng);
    const rows = franchises.slice(0, 3);
    const cols = franchises.slice(3);
    return {
      id: `grid-${seed}`,
      rows: pickN(rows, rows.length, rng),
      cols: pickN(cols, cols.length, rng),
    };
  }

  if (difficulty === 'easy') {
    // Both achievement categories are used (one per axis), 2 franchises fill
    // out each axis alongside them.
    const franchises = pickN(FRANCHISE_POOL, 4, rng);
    const achievements = pickN(ACHIEVEMENT_POOL, 2, rng);
    const rowFranchises = franchises.slice(0, 2);
    const colFranchises = franchises.slice(2);
    const rows: GridCategory[] = [achievements[0], ...rowFranchises];
    const cols: GridCategory[] = [achievements[1], ...colFranchises];
    return {
      id: `grid-${seed}`,
      rows: pickN(rows, rows.length, rng),
      cols: pickN(cols, cols.length, rng),
    };
  }

  // Normal (default): exactly 1 achievement on a random axis.
  const franchises = pickN(FRANCHISE_POOL, 5, rng);
  const achievement = pickN(ACHIEVEMENT_POOL, 1, rng)[0];

  const achievementOnRows = rng() < 0.5;
  const rowFranchiseCount = achievementOnRows ? 2 : 3;

  const rowFranchises = franchises.slice(0, rowFranchiseCount);
  const colFranchises = franchises.slice(rowFranchiseCount);

  const rows: GridCategory[] = achievementOnRows ? [achievement, ...rowFranchises] : rowFranchises;
  const cols: GridCategory[] = achievementOnRows ? colFranchises : [achievement, ...colFranchises];

  return {
    id: `grid-${seed}`,
    rows: pickN(rows, rows.length, rng),
    cols: pickN(cols, cols.length, rng),
  };
}

// ---------------------------------------------------------------------------
// Share grid
// ---------------------------------------------------------------------------

export function gridToEmoji(statuses: CellStatus[]): string {
  const sq = (s: CellStatus) => (s === 'correct' ? '🟩' : s === 'wrong' ? '⬛' : '⬛');
  return [
    statuses.slice(0, 3).map(sq).join(''),
    statuses.slice(3, 6).map(sq).join(''),
    statuses.slice(6, 9).map(sq).join(''),
  ].join('\n');
}
