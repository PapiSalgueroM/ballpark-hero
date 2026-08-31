/**
 * College Basketball Grid: the grid engine extended to the college game.
 *
 * Round 363, Milestone 0 Task 5. Generated from ncaa_player_stats (43,800 rows,
 * 39,798 distinct players, 407 schools) and validated deterministically, like
 * the NBA, MLB and NHL grids, rather than hand authored and model validated
 * like the college FOOTBALL grid. That matters twice: the answers are checked
 * without a model in the loop, and the boards can be published as an archive.
 *
 * WHY THIS BOARD IS SCHOOLS AGAINST ACHIEVEMENTS AND NOT SCHOOLS AGAINST
 * SCHOOLS. The franchise grids cross team with team because professionals move
 * between franchises constantly. College players mostly attend one school, and
 * the data says so plainly: among the thirty best represented schools only 36
 * pairs share three or more players and the very best pair is Utah with Utah
 * State at eight. A team by team college board would be mostly unanswerable.
 * School by achievement is rich: 1,500+ career points runs 13 to 33 players per
 * school and 120+ games runs 53 to 83. The board was designed around what the
 * data actually supports, which is why it was measured before it was built.
 *
 * WHY THE SCHOOL POOL IS DERIVED AT RUNTIME AND NOT LISTED HERE. The obvious
 * shape would be a constant list of famous schools, the way FRANCHISE_POOL
 * works in nbaGrid.ts. That is right for the NBA, where the thirty franchises
 * are fixed forever. It is wrong here: 407 schools qualify to different degrees,
 * the table grows, and a hand kept list of "schools with enough players" is
 * exactly the stale allowlist this repo has already paid for twice (the
 * leaderboard caps in Round 360, the Transfer Path hints in Round 294). The
 * pool is computed from the loaded data every time instead, so it cannot
 * disagree with the table it came from.
 */
import { supabase } from '@/integrations/supabase/client';
import type { PlayerSourceConfig } from '@/lib/playerSearch';

export type CbbCategoryKind = 'school' | 'achievement';

export interface CbbCategory {
  kind: CbbCategoryKind;
  /** Stable id used for row and column identity, e.g. 'Kentucky' or 'pts1500'. */
  id: string;
  /** Short label shown on the grid axis. */
  label: string;
}

export interface CbbPlayer {
  name: string;
  schools: Set<string>;
  points: number;
  rebounds: number;
  assists: number;
  games: number;
  position: string;
  /** First and last season, as the leading year of a season string like 2005-06. */
  fromYear: number;
  toYear: number;
}

export interface CbbGridData {
  players: CbbPlayer[];
  byNormalizedName: Map<string, CbbPlayer>;
}

export interface CbbGridCell {
  row: CbbCategory;
  col: CbbCategory;
}

export interface CbbGridPuzzle {
  id: string;
  rows: CbbCategory[];
  cols: CbbCategory[];
}

export type CbbCellStatus = 'empty' | 'correct' | 'wrong';

/**
 * Eight achievements. Every threshold was chosen by measuring the whole table
 * rather than by picking a round number: each one leaves at least ten
 * qualifying players at every school the generator is allowed to use, and the
 * eligibility pass below enforces that rather than trusting this comment.
 */
export const CBB_ACHIEVEMENTS: CbbCategory[] = [
  { kind: 'achievement', id: 'pts1500', label: '1,500+ Career Points' },
  { kind: 'achievement', id: 'reb700', label: '700+ Career Rebounds' },
  { kind: 'achievement', id: 'ast350', label: '350+ Career Assists' },
  { kind: 'achievement', id: 'gp120', label: '120+ Games Played' },
  { kind: 'achievement', id: 'guard', label: 'Played Guard' },
  { kind: 'achievement', id: 'forward', label: 'Played Forward' },
  { kind: 'achievement', id: 'era90s', label: 'Played in the 1990s' },
  { kind: 'achievement', id: 'era2010s', label: 'Started 2010 or Later' },
];

function matchesCategory(player: CbbPlayer, cat: CbbCategory): boolean {
  if (cat.kind === 'school') return player.schools.has(cat.id);
  switch (cat.id) {
    case 'pts1500': return player.points >= 1500;
    case 'reb700': return player.rebounds >= 700;
    case 'ast350': return player.assists >= 350;
    case 'gp120': return player.games >= 120;
    case 'guard': return player.position.includes('G');
    case 'forward': return player.position.includes('F');
    case 'era90s': return player.fromYear > 0 && player.fromYear <= 1999 && player.toYear >= 1990;
    case 'era2010s': return player.fromYear >= 2010;
    default: return false;
  }
}

export function playerMatchesCell(player: CbbPlayer, cell: CbbGridCell): boolean {
  return matchesCategory(player, cell.row) && matchesCategory(player, cell.col);
}

// ---------------------------------------------------------------------------
// Fetch and index
// ---------------------------------------------------------------------------

interface RawCbbRow {
  player_name: string | null;
  schools: string | null;
  points: number | null;
  trb: number | null;
  ast: number | null;
  games: number | null;
  position: string | null;
  year_from: string | null;
  year_to: string | null;
}

const DIACRITICS = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

function normalize(name: string): string {
  return name.normalize('NFD').replace(DIACRITICS, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/** A season is stored as a string like "2005-06", so the year is its first four
 *  characters. Returns 0 when it is missing or malformed, and every check that
 *  reads a year treats 0 as "unknown" rather than as year zero. */
function seasonYear(v: string | null): number {
  const n = parseInt(String(v ?? '').slice(0, 4), 10);
  return Number.isFinite(n) ? n : 0;
}

/** The table holds 43,800 rows. Anything far below that is a broken read, not a
 *  small league, so the page shows its error state instead of a thin grid. */
export const CBB_MIN_POOL_SIZE = 30000;

export async function fetchCbbGridData(): Promise<CbbGridData | null> {
  try {
    const PAGE_SIZE = 1000;
    const rows: RawCbbRow[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      /* Paged because PostgREST caps every select at 1,000 rows, and retried
         because each page is a query the database sometimes cancels under load
         (Postgres 57014). Round 358 found that one dropped page meant an
         unplayable grid, silently, and Round 359 found the same shape in the
         shared paging helper. */
      const page = async () => await supabase
        .from('ncaa_player_stats' as never)
        .select('player_name, schools, points, trb, ast, games, position, year_from, year_to')
        .not('schools', 'is', null)
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      let { data, error } = await page();
      for (let attempt = 1; attempt <= 2 && (error || !data); attempt++) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
        ({ data, error } = await page());
      }
      if (error || !data) return null;
      rows.push(...(data as unknown as RawCbbRow[]));
      if (data.length < PAGE_SIZE) break;
    }

    const players: CbbPlayer[] = [];
    const byNormalizedName = new Map<string, CbbPlayer>();

    for (const raw of rows) {
      const name = String(raw.player_name ?? '').trim();
      const schoolsStr = String(raw.schools ?? '').trim();
      if (!name || !schoolsStr) continue;

      const schools = new Set(schoolsStr.split(',').map((t) => t.trim()).filter(Boolean));
      if (schools.size === 0) continue;

      const entry: CbbPlayer = {
        name,
        schools,
        points: Number(raw.points) || 0,
        rebounds: Number(raw.trb) || 0,
        assists: Number(raw.ast) || 0,
        games: Number(raw.games) || 0,
        position: String(raw.position ?? '').toUpperCase(),
        fromYear: seasonYear(raw.year_from),
        toYear: seasonYear(raw.year_to),
      };
      players.push(entry);
      byNormalizedName.set(normalize(name), entry);
    }

    return players.length >= CBB_MIN_POOL_SIZE ? { players, byNormalizedName } : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Eligibility, computed from the data rather than remembered
// ---------------------------------------------------------------------------

/** Every cell the generator can produce must have at least this many real
 *  answers. Measured: 143 schools clear 8 on all eight achievements and 106
 *  clear 10, so 10 is inside the healthy part of the distribution rather than
 *  on its edge, and it still leaves a pool six times larger than the NBA
 *  grid's sixteen franchises. */
export const CBB_MIN_PER_CELL = 10;

/**
 * The schools a board may use: those where EVERY achievement has at least
 * CBB_MIN_PER_CELL players. Computed from the loaded pool, so it can never
 * disagree with the data, and so a school that grows into eligibility is
 * included the day it does.
 */
export function eligibleSchools(data: CbbGridData, minPerCell = CBB_MIN_PER_CELL): CbbCategory[] {
  const counts = new Map<string, number[]>();
  for (const p of data.players) {
    for (const school of p.schools) {
      let row = counts.get(school);
      if (!row) { row = new Array(CBB_ACHIEVEMENTS.length).fill(0); counts.set(school, row); }
      for (let i = 0; i < CBB_ACHIEVEMENTS.length; i++) {
        if (matchesCategory(p, CBB_ACHIEVEMENTS[i])) row[i] += 1;
      }
    }
  }
  const out: CbbCategory[] = [];
  for (const [school, row] of counts) {
    if (row.every((n) => n >= minPerCell)) out.push({ kind: 'school', id: school, label: school });
  }
  /* Sorted so the pool order is a property of the data and not of Map insertion
     order, which follows the order rows arrived in. Round 362 is the reason
     that distinction is taken seriously here: a date indexed pick over an
     unordered pool is not stable. */
  out.sort((a, b) => a.id.localeCompare(b.id));
  return out;
}

export const CBB_PLAYER_SOURCE: PlayerSourceConfig = {
  table: 'ncaa_player_stats',
  nameColumn: 'player_name',
  prominenceColumn: 'points',
  metaColumns: { position: 'position' },
  ilikeLimit: 200,
  prominenceLimit: 1000,
};

// ---------------------------------------------------------------------------
// Puzzle generation
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickN<T>(pool: T[], n: number, rng: () => number): T[] {
  const copy = [...pool];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
  }
  return out;
}

/**
 * Three schools on one axis, three achievements on the other. Deterministic in
 * the seed AND in the school pool, so the same date plus the same data always
 * produces the same board, which is what lets the archive republish it.
 *
 * Takes the pool as an argument rather than reading a module constant, because
 * the pool is derived from the data (see eligibleSchools). That is a deliberate
 * departure from nbaGrid.ts, whose FRANCHISE_POOL is a fixed list.
 */
export function buildCbbGridPuzzle(seed: number, schools: CbbCategory[]): CbbGridPuzzle | null {
  if (schools.length < 3) return null;
  const rng = mulberry32(seed);
  const rows = pickN(schools, 3, rng);
  const cols = pickN(CBB_ACHIEVEMENTS, 3, rng);
  return { id: `cbb-grid-${seed}`, rows, cols };
}

export function cbbGridToEmoji(statuses: CbbCellStatus[]): string {
  const sq = (s: CbbCellStatus) => (s === 'correct' ? '🟩' : '⬛');
  return [
    statuses.slice(0, 3).map(sq).join(''),
    statuses.slice(3, 6).map(sq).join(''),
    statuses.slice(6, 9).map(sq).join(''),
  ].join('\n');
}
