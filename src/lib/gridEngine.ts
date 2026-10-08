import { supabase } from '@/integrations/supabase/client';
import { normalizeName } from '@/lib/playerSearch';

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
  /** The source's own id for this player, present only when the fetch was
      asked for it (see GridFetchOptions). The games never ask. */
  id?: string;
}

/** Round 653: what a caller can ask the fetch for beyond what the game needs.
    The grid archive counts players by id, because a table can hold the same
    player twice or two players under one name, and the page cannot. The games
    do not need ids, so they do not download the column. */
export interface GridFetchOptions {
  withIds?: boolean;
}

export interface FranchiseGridData<P extends FranchisePlayer> {
  players: P[];
  /** Every player under a normalized name, in the order the rows loaded.
      Round 653: this held ONE player per name, whichever row loaded last, so
      a name two players share was judged on one of them only. The college
      table has 1,697 such names, and typing "Danny Manning" for Kansas was
      judged on a later Danny Manning with 59 games and refused. See
      pickNamesake for how a guess reads this. */
  byNormalizedName: Map<string, P[]>;
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
  /** The column that identifies a player, loaded only when a caller passes withIds. */
  idColumn?: string;
  /**
   * Round 1105. When set, the rows come from files that ship with the site and
   * NO request goes to the table: table, select, franchiseColumn and
   * orderColumn are then never read. A grid that leaves it unset makes exactly
   * the requests it always made.
   */
  staticSource?: GridStaticSource;
}

/** Rows that ship with the site instead of living in a table (Round 1105). */
export interface GridStaticSource {
  /** Hashed asset URLs. Import them with ?url in a browser only module, never in a lib a node harness bundles. */
  urls: string[];
  /** The parsed files, in the order of urls, to the rows the paged read would have returned; null when their shape is wrong. Pure, never throws. */
  toRows: (files: unknown[]) => Record<string, unknown>[] | null;
}

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

/**
 * The key a player is indexed under, and the key a typed name is looked up
 * by. It IS the search layer's normalizeName, on purpose. Round 653 fix: this
 * used to be its own NFD strip and lowercase, while the four grid pages look a
 * typed name up with normalizeName, which also folds the Latin letters NFD
 * cannot decompose (ð, ø, ł, æ, ß, þ). The two agreed on every name but the
 * ones with such a letter, and there the index said "petur guðmundsson" while
 * the page asked for "petur gudmundsson": Pétur Guðmundsson was refused in the
 * live NBA grid for Lakers x Spurs, a cell the archive lists him under. The
 * generator's lookup check found it the first time it ran. One normaliser for
 * the index and every lookup, and the drift cannot come back.
 */
export function normalizeGridName(name: string): string {
  return normalizeName(name);
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
export async function fetchFranchiseGridData<P extends FranchisePlayer>(cfg: FranchiseGridConfig<P>, opts: GridFetchOptions = {}): Promise<FranchiseGridData<P> | null> {
  /* Asked for ids with no column to read them from: refuse rather than hand
     back players the caller will count wrong. */
  if (opts.withIds && !cfg.idColumn) return null;
  const select = opts.withIds ? `${cfg.idColumn}, ${cfg.select}` : cfg.select;
  try {
    const rows = cfg.staticSource ? await readStaticRows(cfg.staticSource) : await readPagedRows(cfg, select);
    if (!rows) return null;
    return indexFranchiseRows(cfg, rows, opts);
  } catch {
    return null;
  }
}

/**
 * The paged door: the whole table, 1,000 rows a request. Null when a page
 * fails three times. Round 1105 lifted this out of fetchFranchiseGridData
 * unchanged, and src/test/gridEngineSource.test.ts (recorded before the lift)
 * pins every request it makes.
 */
async function readPagedRows<P extends FranchisePlayer>(cfg: FranchiseGridConfig<P>, select: string): Promise<Record<string, unknown>[] | null> {
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
        .select(select)
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
    return rows;
}

/**
 * Rows to the in-memory index a page judges against, in load order. Null under
 * the config's floor, so a short read is a broken read. Lifted out of
 * fetchFranchiseGridData unchanged (Round 1105) so both doors index alike.
 */
export function indexFranchiseRows<P extends FranchisePlayer>(cfg: FranchiseGridConfig<P>, rows: Record<string, unknown>[], opts: GridFetchOptions = {}): FranchiseGridData<P> | null {
    const players: P[] = [];
    const byNormalizedName = new Map<string, P[]>();
    for (const raw of rows) {
      const entry = cfg.toPlayer(raw);
      if (!entry) continue;
      if (opts.withIds && cfg.idColumn && raw[cfg.idColumn] != null) entry.id = String(raw[cfg.idColumn]);
      players.push(entry);
      const key = normalizeGridName(entry.name);
      const under = byNormalizedName.get(key);
      if (under) under.push(entry); else byNormalizedName.set(key, [entry]);
    }

    return players.length >= cfg.minPoolSize ? { players, byNormalizedName } : null;
}

// ---------------------------------------------------------------------------
// The static door (Round 1105)
// ---------------------------------------------------------------------------

/** Round 358's backoff, reused: a second attempt after 400 ms, a third after 800 more. */
const STATIC_RETRY_MS = [400, 800];
/** How long one attempt waits for the response HEADERS. The body is never cut. */
const STATIC_HEADERS_MS = 20_000;

const staticJson = new Map<string, Promise<unknown | null>>();

async function attemptStaticJson(url: string): Promise<unknown | null> {
  const abort = new AbortController();
  /* The timer covers the wait for the headers only. On a slow line the body of
     a 200 KB file can take longer than any fixed limit, and cutting it would
     restart the download forever where the old small pages would have
     finished. It is cleared on every path, so a failed attempt leaves no live
     timer behind. */
  const timer = setTimeout(() => abort.abort(), STATIC_HEADERS_MS);
  let res: Response;
  try {
    res = await fetch(url, { signal: abort.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) return null;
  try {
    /* The host answers a missing address with index.html and a 200, so a 200
       proves nothing: only a body that parses as JSON is an answer. */
    const body: unknown = await res.json();
    return body === null || body === undefined ? null : body;
  } catch {
    return null;
  }
}

/**
 * One request per URL per page life, shared by every caller: the parsed JSON,
 * or null. Never rejects. One call is up to three attempts. When all three
 * fail the URL is forgotten, so the next call tries again; and a caller that
 * refuses the parsed body (wrong shape) forgets it with forgetStaticJson. So:
 * one request per URL until a caller refuses the parsed body.
 */
export function fetchStaticJson(url: string): Promise<unknown | null> {
  const held = staticJson.get(url);
  if (held) return held;
  const load: Promise<unknown | null> = (async () => {
    for (let attempt = 0; ; attempt++) {
      const body = await attemptStaticJson(url);
      if (body !== null) return body;
      if (attempt >= STATIC_RETRY_MS.length) break;
      await new Promise((r) => setTimeout(r, STATIC_RETRY_MS[attempt]));
    }
    if (staticJson.get(url) === load) staticJson.delete(url);
    return null;
  })();
  staticJson.set(url, load);
  return load;
}

/** Drops parsed bodies a caller refused, so the next fetchStaticJson asks the network again. */
export function forgetStaticJson(urls: string[]): void {
  for (const url of urls) staticJson.delete(url);
}

async function readStaticRows(source: GridStaticSource): Promise<Record<string, unknown>[] | null> {
  const files = await Promise.all(source.urls.map((url) => fetchStaticJson(url)));
  if (files.some((f) => f === null)) return null;
  const rows = source.toRows(files);
  /* A body that parsed but is not the key (a changed stamp, a short column) is
     refused AND forgotten: kept, every later load would get the same bad files
     back with no request and the page could never recover without a reload. */
  if (!rows) forgetStaticJson(source.urls);
  return rows;
}

/**
 * The player a typed name is judged as, for one cell. A guess is right when
 * ANY player under that name fits the cell, so the one who fits is the one
 * recorded; when none fits, the first stands in so the miss still names a
 * real player. Null when nobody carries the name.
 *
 * Round 653. Every grid page and both grid hooks read the index through this,
 * and scripts/simGridArchive.mjs resolves every published answer through it
 * too, so the archive lists only names this path accepts. The same shape in
 * every sport: a fix here is a fix in all of them.
 */
export function pickNamesake<P>(candidates: P[] | undefined, fits: (player: P) => boolean): P | null {
  if (!candidates || candidates.length === 0) return null;
  return candidates.find(fits) ?? candidates[0];
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
  exclusiveAchievements = false,
): GridPuzzle {
  const rng = mulberry32(seed);

  /* Round 412: easy mode puts one achievement on each axis, which crosses
     them, and that is only a question when a player can satisfy both. The
     basketball, baseball and hockey pools are career totals (10,000 points
     AND 5,000 rebounds is an ordinary career), but the NFL pool is mutually
     exclusive by construction: nobody is undrafted and a first round pick,
     nobody is a quarterback and a defensive lineman. Measured on the
     committed key, easy dealt 57 unanswerable cells across 400 boards. A
     pool that says so is dealt one achievement, exactly as normal does, and
     the other three sports keep their draw untouched. */
  const effective: GridDifficulty = exclusiveAchievements && difficulty === 'easy' ? 'normal' : difficulty;

  if (effective === 'hard') {
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

  if (effective === 'easy') {
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
