import { supabase } from '@/integrations/supabase/client';
import type { PlayerSourceConfig } from '@/lib/playerSearch';

/**
 * Data layer for the MLB Franchise Grid (3x3 board of franchise and stat
 * criteria, one player per cell),
 * built on the mlb_grid_players view, a port of src/lib/hockeyGrid.ts /
 * src/lib/nbaGrid.ts (task #24). Keep the grid libs in lockstep.
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
// Types
// ---------------------------------------------------------------------------

export type CategoryKind = 'franchise' | 'achievement';

export interface GridCategory {
  kind: CategoryKind;
  /** Stable id used for column/row identity, e.g. 'NYY' or 'h2k'. */
  id: string;
  /** Short label shown on the grid axis, e.g. 'Yankees' or '2,000+ Hits'. */
  label: string;
}

export interface IndexedPlayer {
  name: string;
  franchises: Set<string>;
  hits: number;
  hrs: number;
  games: number;
}

export interface MlbGridData {
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

function matchesCategory(player: IndexedPlayer, cat: GridCategory): boolean {
  if (cat.kind === 'franchise') return player.franchises.has(cat.id);
  if (cat.id === 'h2k') return player.hits >= 2000;
  if (cat.id === 'hr300') return player.hrs >= 300;
  if (cat.id === 'g2k') return player.games >= 2000;
  return false;
}

export function playerMatchesCell(player: IndexedPlayer, cell: GridCell): boolean {
  return matchesCategory(player, cell.row) && matchesCategory(player, cell.col);
}

// ---------------------------------------------------------------------------
// Fetch + index
// ---------------------------------------------------------------------------

interface RawRow {
  player_name: string | null;
  franchises: string | null;
  hits: number | string | null;
  hrs: number | string | null;
  games: number | string | null;
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

// View has 3,264 rows (verified); far fewer means a broken fetch.
export const MIN_POOL_SIZE = 2500;

/**
 * Fetches the full mlb_grid_players view once and builds an in-memory index.
 * Returns null on failure or an implausibly small result.
 */
export async function fetchMlbGridData(): Promise<MlbGridData | null> {
  try {
    // PostgREST caps every select at 1000 rows regardless of .limit(),
    // so page through with .range() until a short page arrives.
    const PAGE_SIZE = 1000;
    const rows: RawRow[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      /* ROUND 358: A TRANSIENT PAGE FAILURE MUST NOT COST THE WHOLE GAME.
         This gave up the moment any page errored, and each page is a query the
         database sometimes cancels under load (Postgres 57014, statement
         timeout). One dropped page and the visitor gets the error card instead
         of a playable grid. It was found because the archive generator, which
         calls this same function, failed on two separate runs and succeeded
         between them, which is what a transient looks like rather than a bug
         in the query. Two more attempts with a short backoff, then give up as
         before, because a database that is genuinely down should still surface
         rather than hang. */
      const page = async () => await supabase
        .from('mlb_grid_players' as any)
        .select('player_name, franchises, hits, hrs, games')
        .not('franchises', 'is', null)
        .order('player_name', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      let { data, error } = await page();
      for (let attempt = 1; attempt <= 2 && (error || !data); attempt++) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
        ({ data, error } = await page());
      }
      if (error || !data) return null;
      rows.push(...(data as unknown as RawRow[]));
      if (data.length < PAGE_SIZE) break;
    }

    const players: IndexedPlayer[] = [];
    const byNormalizedName = new Map<string, IndexedPlayer>();

    for (const raw of rows) {
      const name = String(raw.player_name ?? '').trim();
      const frStr = String(raw.franchises ?? '').trim();
      if (!name || !frStr) continue;

      const franchises = new Set(
        frStr
          .split(',')
          .map((t) => t.trim().toUpperCase())
          .filter(Boolean),
      );
      if (franchises.size === 0) continue;

      const entry: IndexedPlayer = {
        name,
        franchises,
        hits: Number(raw.hits) || 0,
        hrs: Number(raw.hrs) || 0,
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

// Difficulty tiers, same semantics as hockeyGrid/nbaGrid: Easy = both
// milestone slots, Normal = exactly one, Hard = franchises only. Daily mode
// always uses 'normal'; correctness never depends on tier.
export type GridDifficulty = 'easy' | 'normal' | 'hard';
const DIFFICULTY_STORAGE_KEY = 'mlb-grid-difficulty';

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
