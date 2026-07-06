import { supabase } from '@/integrations/supabase/client';

/**
 * Shared player-search layer for the site's autocomplete inputs.
 *
 * Replaces five near-identical suggestion components (PlayerSuggestions,
 * NbaPlayerSuggestions, ChainSuggestions, Connect4Suggestions,
 * FootballConnect4Suggestions) that each called an AI edge function and
 * rendered whatever text came back, which is why suggestion text could stop
 * matching what the user actually typed. This layer queries Postgres
 * directly (through PostgREST) and both the matching and the display text
 * are derived from the same normalized data, so highlighted text always
 * lines up with the typed letters.
 *
 * ACCENT HANDLING
 * The `unaccent` Postgres extension is available on this project but not
 * installed, and pg_trgm is likewise available-but-uninstalled (verified via
 * list_extensions on flawuiqbvjobmkfkauhw, 2026-07-02). A plain
 * `ilike('%mbappe%')` against the accented column value "Kylian Mbappé"
 * returns zero rows (verified with execute_sql), so an unaccented query
 * cannot be trusted to find accented names through ilike alone.
 *
 * The fix used here has two legs that run in parallel:
 *   1. An `ilike` substring query using the RAW (un-normalized) typed text.
 *      This is fast and correct whenever the query's accent state already
 *      matches the stored data (the common case: unaccented query vs
 *      unaccented data, e.g. "haaland", "mahomes", "kelce", or a query typed
 *      with the correct accents).
 *   2. A "prominence pool" fetch: the top N rows ordered by whatever
 *      ranking column the source provides (market value, recency, etc),
 *      filtered and ranked client-side after NFD-normalizing both the query
 *      and every candidate name. This is what catches "mbappe" -> "Mbappé":
 *      famous accented players sit near the top of the prominence pool, so
 *      a few hundred to a thousand rows is enough to cover them without
 *      needing a database-side unaccent() call.
 * Both legs are deduped together before ranking, so a name found by either
 * path is treated identically.
 *
 * Verified against live data on flawuiqbvjobmkfkauhw (2026-07-02):
 *   "mbappe"  -> finds "Kylian Mbappé" (ranked #3 by market value in the
 *                latest year, well inside a 1000-row prominence pool) and
 *                "Ethan Mbappé"
 *   "haaland" -> finds "Erling Haaland" via the raw ilike leg
 *   "salah"   -> finds "Mohamed Salah" via the raw ilike leg (surname-only,
 *                word-prefix match, not a full-string prefix)
 *   "kelce"   -> finds "Travis Kelce" and "Jason Kelce" in nflfastr_rosters
 *                via the raw ilike leg
 * Player rows in player_market_values repeat per year and sometimes per
 * position rank (Salah: 19 rows across 15 distinct years), so every result
 * is deduped by normalized name, keeping the row with the highest value
 * (ties broken by the most recent year).
 */

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

// Combining diacritical marks block (U+0300 to U+036F), built from char codes
// so the range never contains a literal accented character that could be
// mangled by copy/paste or re-encoding.
const DIACRITICS = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

/**
 * Lowercase, diacritics stripped via NFD decomposition, trimmed, internal
 * whitespace collapsed to single spaces. This is the single source of truth
 * for "does this text match that text" throughout the search layer and the
 * autocomplete component, so matching and highlighting never drift apart.
 */
export function normalizeName(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Title-cases every word in a name for display, e.g. "kylian mbappe" (or any
 * mixed-case source value) -> "Kylian Mbappe". Hyphens and apostrophes start
 * a new capitalized segment too, so "o'brien" -> "O'Brien" and
 * "jean-pierre" -> "Jean-Pierre".
 *
 * This intentionally title-cases from the (possibly already-correct) source
 * string rather than from the accent-stripped normalized one, so real
 * accented letters in the source data are preserved. It is only meant to fix
 * casing, not to fabricate accents that weren't already present.
 */
export function displayName(s: string | null | undefined): string {
  const raw = (s ?? '').trim().replace(/\s+/g, ' ');
  if (!raw) return '';
  return raw
    .toLowerCase()
    .split(' ')
    .map(word =>
      word
        .split('-')
        .map(seg => capitalizeSegment(seg))
        .join('-'),
    )
    .join(' ');
}

function capitalizeSegment(seg: string): string {
  if (!seg) return seg;
  // Capitalize after an apostrophe too (O'Brien), but only for short
  // trailing segments so we don't mangle things like "d'Angelo" -> "D'Angelo"
  // vs accidentally capitalizing mid-word possessives.
  const parts = seg.split("'");
  return parts
    .map((p, i) => {
      if (!p) return p;
      if (i === 0) return p.charAt(0).toUpperCase() + p.slice(1);
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join("'");
}

// ---------------------------------------------------------------------------
// Search types
// ---------------------------------------------------------------------------

export interface PlayerEntity {
  /** Stable key for React lists and dedupe: normalized name, unique per player within a search. */
  key: string;
  /** Display-ready name (title-cased, accents from source preserved). */
  name: string;
  /** Raw name exactly as stored, kept for callers that need the untouched value. */
  rawName: string;
  /** Free-form metadata for rendering a suggestion row (club, nationality, position, etc). */
  meta: PlayerEntityMeta;
  /** Relevance tier this result matched on, lowest number is the best match. */
  matchRank: MatchRank;
  /** Prominence value used to order same-tier results (market value, recency, etc). Higher is more prominent. */
  prominence: number;
}

export interface PlayerEntityMeta {
  club?: string;
  nationality?: string;
  position?: string;
  team?: string;
  value?: number;
  year?: number;
  [key: string]: string | number | undefined;
}

/** 0 = exact full-name prefix, 1 = word-prefix (surname etc), 2 = contains anywhere. */
export type MatchRank = 0 | 1 | 2;

/**
 * Describes one queryable player source. Every table this app treats as a
 * "player pool" (soccer market values, NFL rosters, NBA/NHL/MLB player
 * tables) can be described with one of these instead of writing a bespoke
 * fetch function per game.
 */
export interface PlayerSourceConfig {
  /** Table name, passed straight to supabase.from(). */
  table: string;
  /** Column holding the player's full name. */
  nameColumn: string;
  /**
   * Extra equality/ilike filters applied before the name search, e.g.
   * { column: 'position', op: 'eq', value: 'QB' } or
   * { column: 'team', op: 'eq', value: currentTeam.name }.
   */
  filters?: PlayerSourceFilter[];
  /** Column used to rank prominence within a tier and to pick the "best" row when deduping (e.g. market_value_usd). Higher = more prominent. */
  prominenceColumn?: string;
  /** Column used as a tiebreaker when prominenceColumn values are equal (e.g. year or season). Higher = more recent = preferred. */
  recencyColumn?: string;
  /** Columns copied into PlayerEntity.meta, keyed by the meta property name they should populate. */
  metaColumns?: Record<string, string>;
  /** Row cap for the raw ilike leg. Default 200. */
  ilikeLimit?: number;
  /** Row cap for the prominence-pool accent-fallback leg. Default 1000 (PostgREST's per-request cap). */
  prominenceLimit?: number;
}

export interface PlayerSourceFilter {
  column: string;
  op: 'eq' | 'ilike';
  value: string | number | boolean;
}

export interface SearchPlayersOptions {
  source: PlayerSourceConfig;
  query: string;
  /** Minimum normalized query length before a search runs. Default 3. */
  minChars?: number;
  /** Max results returned after ranking and dedupe. Default 8. */
  limit?: number;
  /** Normalized names to exclude from results (e.g. players already picked). */
  exclude?: Set<string>;
  /** Abort signal so an in-flight request can be cancelled by a newer one. */
  signal?: AbortSignal;
}

export interface SearchPlayersResult {
  results: PlayerEntity[];
  error: string | null;
}

// ---------------------------------------------------------------------------
// Core search
// ---------------------------------------------------------------------------

const DEFAULT_MIN_CHARS = 3;
const DEFAULT_LIMIT = 8;
const DEFAULT_ILIKE_LIMIT = 200;
const DEFAULT_PROMINENCE_LIMIT = 1000; // PostgREST's per-request row cap

type RawRow = Record<string, unknown>;

function applyFilters(builder: any, filters: PlayerSourceFilter[] | undefined) {
  if (!filters) return builder;
  let b = builder;
  for (const f of filters) {
    if (f.op === 'eq') b = b.eq(f.column, f.value);
    else b = b.ilike(f.column, `%${f.value}%`);
  }
  return b;
}

function buildSelectColumns(source: PlayerSourceConfig): string {
  const cols = new Set<string>([source.nameColumn]);
  if (source.prominenceColumn) cols.add(source.prominenceColumn);
  if (source.recencyColumn) cols.add(source.recencyColumn);
  if (source.metaColumns) {
    for (const col of Object.values(source.metaColumns)) cols.add(col);
  }
  return [...cols].join(', ');
}

function rowToRaw(row: RawRow, source: PlayerSourceConfig): {
  name: string;
  prominence: number;
  recency: number;
  meta: PlayerEntityMeta;
} | null {
  const nameVal = row[source.nameColumn];
  const name = typeof nameVal === 'string' ? nameVal.trim() : '';
  if (!name) return null;

  const prominence = source.prominenceColumn ? Number(row[source.prominenceColumn]) || 0 : 0;
  const recency = source.recencyColumn ? Number(row[source.recencyColumn]) || 0 : 0;

  const meta: PlayerEntityMeta = {};
  if (source.metaColumns) {
    for (const [metaKey, col] of Object.entries(source.metaColumns)) {
      const v = row[col];
      if (v === null || v === undefined) continue;
      if (typeof v === 'number' || typeof v === 'string') meta[metaKey] = v;
    }
  }

  return { name, prominence, recency, meta };
}

/** Classifies how a normalized candidate name matches a normalized query. Returns null when it doesn't match at all. */
function classifyMatch(normalizedName: string, normalizedQuery: string): MatchRank | null {
  if (!normalizedName.includes(normalizedQuery)) return null;
  if (normalizedName.startsWith(normalizedQuery)) return 0;
  if (normalizedName.split(' ').some(word => word.startsWith(normalizedQuery))) return 1;
  return 2;
}

/**
 * Searches a configured player source with accent-insensitive, surname-aware
 * matching. Two queries run in parallel (see module docstring for why): a
 * direct ilike substring match on the raw typed text, and a fetch of the
 * source's most prominent rows used as an accent-fallback candidate pool.
 * Both are merged, deduped by normalized name (keeping the highest
 * prominence, then most recent), ranked (exact prefix, then word prefix,
 * then contains) and sliced to `limit`.
 */
export async function searchPlayers(options: SearchPlayersOptions): Promise<SearchPlayersResult> {
  const { source, query, exclude, signal } = options;
  const minChars = options.minChars ?? DEFAULT_MIN_CHARS;
  const limit = options.limit ?? DEFAULT_LIMIT;

  const normalizedQuery = normalizeName(query);
  if (normalizedQuery.length < minChars) {
    return { results: [], error: null };
  }

  const rawQuery = query.trim();
  const ilikeLimit = source.ilikeLimit ?? DEFAULT_ILIKE_LIMIT;
  const prominenceLimit = source.prominenceLimit ?? DEFAULT_PROMINENCE_LIMIT;
  const selectCols = buildSelectColumns(source);

  try {
    // Leg 1: direct ilike substring search on the raw typed text. Correct and
    // fast whenever query/data accent state already matches.
    let ilikeQuery = supabase.from(source.table).select(selectCols).ilike(source.nameColumn, `%${rawQuery}%`);
    ilikeQuery = applyFilters(ilikeQuery, source.filters);
    if (source.prominenceColumn) ilikeQuery = ilikeQuery.order(source.prominenceColumn, { ascending: false });
    ilikeQuery = ilikeQuery.limit(ilikeLimit);
    if (signal) ilikeQuery = ilikeQuery.abortSignal(signal);

    // Leg 2: prominence pool, used as an accent-insensitive fallback. Only
    // worth running once the query is short enough that the pool plausibly
    // still helps (very long queries are unlikely to be accent-mismatched
    // AND only findable this way, so skip the extra request past ~24 chars).
    const runProminenceLeg = normalizedQuery.length <= 24;
    let prominenceQuery = runProminenceLeg
      ? supabase.from(source.table).select(selectCols)
      : null;
    if (prominenceQuery) {
      prominenceQuery = applyFilters(prominenceQuery, source.filters);
      if (source.prominenceColumn) {
        prominenceQuery = prominenceQuery.order(source.prominenceColumn, { ascending: false });
      }
      prominenceQuery = prominenceQuery.limit(prominenceLimit);
      if (signal) prominenceQuery = prominenceQuery.abortSignal(signal);
    }

    const [ilikeRes, prominenceRes] = await Promise.all([
      ilikeQuery,
      prominenceQuery ?? Promise.resolve({ data: [] as RawRow[], error: null }),
    ]);

    if (ilikeRes.error && prominenceRes.error) {
      return { results: [], error: ilikeRes.error.message || 'Search failed' };
    }

    const byNormalizedName = new Map<string, { raw: ReturnType<typeof rowToRaw>; rank: MatchRank }>();

    const consider = (rows: RawRow[] | null | undefined) => {
      for (const row of rows ?? []) {
        const parsed = rowToRaw(row, source);
        if (!parsed) continue;
        const normalized = normalizeName(parsed.name);
        if (!normalized) continue;
        const rank = classifyMatch(normalized, normalizedQuery);
        if (rank === null) continue;
        if (exclude?.has(normalized)) continue;

        const existing = byNormalizedName.get(normalized);
        if (!existing) {
          byNormalizedName.set(normalized, { raw: parsed, rank });
          continue;
        }
        // Keep the better match rank, and within equal rank keep the row with
        // the higher prominence (ties broken by recency).
        const better =
          rank < existing.rank ||
          (rank === existing.rank &&
            parsed &&
            existing.raw &&
            (parsed.prominence > existing.raw.prominence ||
              (parsed.prominence === existing.raw.prominence && parsed.recency > existing.raw.recency)));
        if (better) byNormalizedName.set(normalized, { raw: parsed, rank: Math.min(rank, existing.rank) as MatchRank });
      }
    };

    consider(ilikeRes.data as RawRow[] | null);
    consider(prominenceRes.data as RawRow[] | null);

    const entities: PlayerEntity[] = [...byNormalizedName.entries()]
      .filter(([, v]) => v.raw !== null)
      .map(([normalized, v]) => {
        const raw = v.raw!;
        return {
          key: normalized,
          name: displayName(raw.name),
          rawName: raw.name,
          meta: raw.meta,
          matchRank: v.rank,
          prominence: raw.prominence,
        };
      });

    entities.sort((a, b) => {
      if (a.matchRank !== b.matchRank) return a.matchRank - b.matchRank;
      return b.prominence - a.prominence;
    });

    return { results: entities.slice(0, limit), error: null };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { results: [], error: null };
    }
    return { results: [], error: err instanceof Error ? err.message : 'Search failed' };
  }
}

// ---------------------------------------------------------------------------
// Ready-made source configs for the tables this app already treats as player
// pools. Callers can use these directly or build their own PlayerSourceConfig
// for a one-off filter shape (e.g. a specific team or position).
// ---------------------------------------------------------------------------

/** Soccer market-value pool: player_market_values (171k rows, verified 2026-07-02). */
export const SOCCER_MARKET_VALUE_SOURCE: PlayerSourceConfig = {
  table: 'player_market_values',
  nameColumn: 'player_name',
  prominenceColumn: 'market_value_usd',
  recencyColumn: 'year',
  metaColumns: {
    club: 'club',
    nationality: 'nationality',
    position: 'position',
    value: 'market_value_usd',
    year: 'year',
    // #196: Who Am I needs age to score a wide-pool guess (any of the
    // site's 27k+ soccer players, not just the curated 400-player boot
    // pool), so age rides along in meta like every other scoring field.
    age: 'age',
  },
  ilikeLimit: 200,
  prominenceLimit: 1000,
};

/** NFL roster pool: nflfastr_rosters (60k rows, verified 2026-07-02). No market-value column, so prominence falls back to recency (season). */
export const NFL_ROSTER_SOURCE: PlayerSourceConfig = {
  table: 'nflfastr_rosters',
  nameColumn: 'full_name',
  prominenceColumn: 'season',
  metaColumns: {
    team: 'team',
    position: 'position',
    year: 'season',
  },
  ilikeLimit: 200,
  prominenceLimit: 1000,
};

/**
 * NBA player pool: nba_players_extended_v2 (5.1k rows, verified 2026-07-02,
 * bigger than the older 500-row nba_players_extended).
 *
 * This table has NO `full_name` column (verified via information_schema on
 * flawuiqbvjobmkfkauhw, 2026-07-02): it stores `first_name` and `last_name`
 * separately. `last_name` is used as nameColumn (populated on 5134 of 5135
 * rows) with `first_name` carried in metaColumns, mirroring
 * NBA_PLAYER_SOURCE_V2 in src/hooks/useNbaLineup.ts so both NBA integrations
 * agree on how this table is queried.
 */
export const NBA_PLAYER_SOURCE: PlayerSourceConfig = {
  table: 'nba_players_extended_v2',
  nameColumn: 'last_name',
  metaColumns: {
    firstName: 'first_name',
    team: 'team',
    position: 'position',
  },
  ilikeLimit: 200,
  prominenceLimit: 1000,
};

/** NHL player pool: nhl_players (1.75k rows, verified 2026-07-02). */
export const NHL_PLAYER_SOURCE: PlayerSourceConfig = {
  table: 'nhl_players',
  nameColumn: 'full_name',
  metaColumns: {
    team: 'team',
    position: 'position',
  },
  ilikeLimit: 200,
  prominenceLimit: 1000,
};

/** MLB player pool: mlb_players (2.28k rows, verified 2026-07-02). */
export const MLB_PLAYER_SOURCE: PlayerSourceConfig = {
  table: 'mlb_players',
  nameColumn: 'full_name',
  metaColumns: {
    team: 'team',
    position: 'position',
  },
  ilikeLimit: 200,
  prominenceLimit: 1000,
};

/**
 * Transfer Path player pool: career_players. Deliberately NOT
 * SOCCER_MARKET_VALUE_SOURCE: Transfer Path validates guesses by shared-club
 * overlap (see useTransferPath's playersShareClub), which requires each
 * candidate to already have career_seasons rows loaded client-side. A player
 * from the much larger player_market_values pool with no career_seasons
 * entry would appear as a valid suggestion but always fail the club-overlap
 * check, so the searchable set here is intentionally scoped to the same
 * career_players table the game's chain logic is built from.
 */
export const TRANSFER_PATH_PLAYER_SOURCE: PlayerSourceConfig = {
  table: 'career_players',
  nameColumn: 'player_name',
  metaColumns: {
    nationality: 'nationality',
    position: 'position',
  },
  ilikeLimit: 200,
  prominenceLimit: 1000,
};
