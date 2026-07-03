import { supabase } from '@/integrations/supabase/client';
import type { PlayerSourceConfig } from '@/lib/playerSearch';

/**
 * Data layer for the NHL Franchise Grid (a 3x3 Immaculate-Grid-style board),
 * built entirely on nhl_player_stats.
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
// Types
// ---------------------------------------------------------------------------

export type CategoryKind = 'franchise' | 'achievement';

export interface GridCategory {
  kind: CategoryKind;
  /** Stable id used for column/row identity, e.g. 'TOR' or 'pts500'. */
  id: string;
  /** Short label shown on the grid axis, e.g. 'Maple Leafs' or '500+ Points'. */
  label: string;
}

export interface IndexedPlayer {
  name: string;
  franchises: Set<string>;
  points: number;
  goals: number;
  assists: number;
  games: number;
}

export interface HockeyGridData {
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

function matchesCategory(player: IndexedPlayer, cat: GridCategory): boolean {
  if (cat.kind === 'franchise') return player.franchises.has(cat.id);
  if (cat.id === 'pts500') return player.points >= 500;
  if (cat.id === 'goals300') return player.goals >= 300;
  if (cat.id === 'gp1000') return player.games >= 1000;
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
  goals: number | null;
  assists: number | null;
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

export const MIN_POOL_SIZE = 2000;

/**
 * Fetches the full nhl_player_stats table once and builds an in-memory
 * index (franchise set + career totals per player). Returns null on failure
 * or an implausibly small result, so the page can show an error state
 * instead of a broken grid.
 */
export async function fetchHockeyGridData(): Promise<HockeyGridData | null> {
  try {
    const { data, error } = await supabase
      .from('nhl_player_stats' as any)
      .select('player_name, teams, points, goals, assists, games')
      .not('teams', 'is', null)
      .limit(8000);
    if (error || !data) return null;

    const players: IndexedPlayer[] = [];
    const byNormalizedName = new Map<string, IndexedPlayer>();

    for (const raw of data as RawStatsRow[]) {
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
        goals: Number(raw.goals) || 0,
        assists: Number(raw.assists) || 0,
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

/**
 * Builds a 3x3 puzzle: 6 categories split into 3 rows + 3 cols, at most one
 * achievement per axis (so a franchise axis category is always available to
 * pair against, keeping every cell franchise-anchored on at least one side).
 * Every possible row/col pairing this can produce was verified in the module
 * docstring to clear a healthy player-count minimum, so no cell can come up
 * empty.
 */
export function buildGridPuzzle(seed: number): GridPuzzle {
  const rng = mulberry32(seed);
  const franchises = pickN(FRANCHISE_POOL, 5, rng);
  const achievement = pickN(ACHIEVEMENT_POOL, 1, rng)[0];

  // Distribute: achievement goes on whichever axis rng picks; the other 5
  // franchise picks split 2/3 (rows/cols) or 3/2, decided by the same rng
  // draw so it is still deterministic for a given seed.
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
