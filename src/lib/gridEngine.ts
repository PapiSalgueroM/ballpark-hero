import { supabase } from '@/integrations/supabase/client';

/**
 * The franchise grid engine (Round 402, phase 1 of
 * docs/designs/NFL-GRID-ENGINE-DESIGN.md).
 *
 * Until this round src/lib/nbaGrid.ts, src/lib/mlbGrid.ts and
 * src/lib/hockeyGrid.ts were textual clones: the same types, the same paged
 * fetch with the Round 358 retry, the same name normaliser, the same PRNG,
 * the same difficulty persistence, the same three branch puzzle builder and
 * the same emoji share, differing only in the table, the columns, the two
 * pools and the storage key. Every hunk of their diff was a docstring or a
 * constant. This file owns what was identical; each lib keeps its docstring,
 * its pools and the few lines that are genuinely its own, and re-exports the
 * engine under the names it always exported, so the pages,
 * scripts/genGridArchive.mjs and the fences do not move.
 *
 * TWO PROMISES THIS FILE KEEPS:
 *
 *   1. THE SEQUENCE. buildFranchisePuzzle draws from mulberry32 in exactly
 *      the order the three libs drew before, so a date seed still rebuilds
 *      the exact board every published archive page was generated from.
 *      scripts/simGridEngine.mjs rebuilds every board in
 *      src/data/gridArchive.json through this file and fails on any
 *      difference, with a control that perturbs the PRNG and must go red.
 *      Do not "tidy" the draw order, the slice boundaries or the rng() call
 *      that picks the achievement axis: each is part of the sequence.
 *   2. NOTHING SPORT SPECIFIC LIVES HERE. Pools, thresholds, tables and
 *      columns arrive through the config. The CBB grid (src/lib/cbbGrid.ts)
 *      is deliberately NOT on this engine yet: it derives its pool from the
 *      data and carries a different mulberry32, and unifying that sequence
 *      would silently change every future daily board.
 */

// ---------------------------------------------------------------------------
// Types shared by every franchise grid
// ---------------------------------------------------------------------------

export type CategoryKind = 'franchise' | 'achievement';

export interface GridCategory {
  kind: CategoryKind;
  /** Stable id used for column/row identity, e.g. 'LAL' or 'pts10k'. */
  id: string;
  /** Short label shown on the grid axis, e.g. 'Lakers' or '10,000+ Points'. */
  label: string;
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

export type GridDifficulty = 'easy' | 'normal' | 'hard';

/** What every sport's indexed player must carry; the stats are the sport's own. */
export interface FranchisePlayer {
  name: string;
  franchises: Set<string>;
}

export interface FranchiseGridData<P extends FranchisePlayer> {
  players: P[];
  byNormalizedName: Map<string, P>;
}

/** One sport's configuration of the engine. */
export interface FranchiseGridConfig<P extends FranchisePlayer> {
  /** Table or view to page through, and the columns to select. */
  table: string;
  select: string;
  /** The comma separated franchise column; rows where it is null are skipped at the source. */
  franchiseColumn: string;
  /** Column to order pages by, so paging is stable. */
  orderColumn: string;
  /** Builds the sport's indexed player from a raw row, or null to skip the row. */
  toPlayer: (raw: Record<string, unknown>) => P | null;
  /** Below this many indexed players the fetch is treated as broken and the page shows its error state. */
  minPoolSize: number;
}

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

// Combining diacritical marks block (U+0300 to U+036F), built from char codes
// (never literal accented characters) so it cannot be mangled by copy/paste
// or re-encoding, matching the DIACRITICS regex in src/lib/playerSearch.ts.
const DIACRITICS = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

export function normalizeGridName(name: string): string {
  return name
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/** 'CLE,LAL,MIA' to a Set of upper case codes; empty when the string is blank. */
export function splitFranchises(list: string): Set<string> {
  return new Set(
    list
      .split(',')
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean),
  );
}

// ---------------------------------------------------------------------------
// Fetch + index
// ---------------------------------------------------------------------------

/**
 * Fetches a sport's whole table once and builds the in-memory index the page
 * validates every guess against. Returns null on failure or an implausibly
 * small result, so the page can show an error state instead of a broken grid.
 */
export async function fetchFranchiseGridData<P extends FranchisePlayer>(cfg: FranchiseGridConfig<P>): Promise<FranchiseGridData<P> | null> {
  try {
    // PostgREST caps every select at 1000 rows regardless of .limit(),
    // so page through the table with .range() until a short page arrives.
    const PAGE_SIZE = 1000;
    const rows: Record<string, unknown>[] = [];
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
        .from(cfg.table as any)
        .select(cfg.select)
        .not(cfg.franchiseColumn, 'is', null)
        .order(cfg.orderColumn, { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      let { data, error } = await page();
      for (let attempt = 1; attempt <= 2 && (error || !data); attempt++) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
        ({ data, error } = await page());
      }
      if (error || !data) return null;
      rows.push(...(data as unknown as Record<string, unknown>[]));
      if (data.length < PAGE_SIZE) break;
    }

    const players: P[] = [];
    const byNormalizedName = new Map<string, P>();
    for (const raw of rows) {
      const entry = cfg.toPlayer(raw);
      if (!entry) continue;
      players.push(entry);
      byNormalizedName.set(normalizeGridName(entry.name), entry);
    }

    return players.length >= cfg.minPoolSize ? { players, byNormalizedName } : null;
  } catch {
    return null;
  }
}

/** A cell is answered when the player satisfies both of its categories. */
export function playerMatchesFranchiseCell<P extends FranchisePlayer>(
  player: P,
  cell: GridCell,
  achievement: (player: P, id: string) => boolean,
): boolean {
  const one = (cat: GridCategory) => (cat.kind === 'franchise' ? player.franchises.has(cat.id) : achievement(player, cat.id));
  return one(cell.row) && one(cell.col);
}

// ---------------------------------------------------------------------------
// Puzzle generation
// ---------------------------------------------------------------------------

export function pickN<T>(pool: T[], n: number, rng: () => number): T[] {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, n);
}

/** Deterministic PRNG (mulberry32) so a date seed reproduces the same grid for every player on the same day. */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function loadGridDifficultyFor(storageKey: string): GridDifficulty {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === 'easy' || raw === 'normal' || raw === 'hard') return raw;
  } catch { /* localStorage unavailable, fall back to default */ }
  return 'normal';
}

export function saveGridDifficultyFor(storageKey: string, next: GridDifficulty): void {
  try { localStorage.setItem(storageKey, next); } catch { /* ignore */ }
}

/**
 * Builds a 3x3 puzzle: 6 categories split into 3 rows + 3 cols. Category mix
 * depends on difficulty; axis placement and shuffling stay seed-deterministic
 * either way, so a daily seed reproduces the same grid for everyone.
 * Easy = both milestone slots, Normal = exactly one, Hard = franchises only.
 * Daily mode always uses 'normal'; correctness never depends on tier.
 */
export function buildFranchisePuzzle(
  franchisePool: GridCategory[],
  achievementPool: GridCategory[],
  seed: number,
  difficulty: GridDifficulty = 'normal',
): GridPuzzle {
  const rng = mulberry32(seed);

  if (difficulty === 'hard') {
    // All 6 categories are franchises, no achievement slot at all.
    const franchises = pickN(franchisePool, 6, rng);
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
    const franchises = pickN(franchisePool, 4, rng);
    const achievements = pickN(achievementPool, 2, rng);
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
  const franchises = pickN(franchisePool, 5, rng);
  const achievement = pickN(achievementPool, 1, rng)[0];

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
