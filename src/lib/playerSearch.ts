import { foldSpecialLatin } from '@/lib/nameFold';
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
 * A plain `ilike('%mbappe%')` against the accented column value "Kylian
 * Mbappé" returns zero rows, so an unaccented query cannot be trusted to
 * find accented names through ilike on the raw column alone. When this was
 * written (2026-07-02) neither `unaccent` nor `pg_trgm` was installed on the
 * project. Both are now (Round 386, 2026-09-01), and player_market_values
 * carries a stored `name_folded` column, lower(unaccent(player_name)), with a
 * trigram index, so the soccer source declares `foldedNameColumn` and its
 * substring leg compares folded against folded. Before that, "gundogan",
 * "rudiger" and "yaya toure" returned zero rows from leg 1 and were found or
 * not depending on whether the man sat inside leg 2's pool.
 *
 * The two legs that run in parallel:
 *   1. An `ilike` substring query. On a source with `foldedNameColumn` it is
 *      the folded column against the normalized query; otherwise it uses the
 *      RAW (un-normalized) typed text, which is fast and correct whenever the
 *      query's accent state already matches the stored data (the common
 *      case: unaccented query vs unaccented data, e.g. "haaland", "mahomes",
 *      "kelce", or a query typed with the correct accents).
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
 *
 * NAMESAKES (Round 668, a Who Am I "Wrong answer" report of 2026-09-26).
 * Deduping by normalized name alone folds two different people into one row
 * whenever their names fold to the same letters: Atalanta's midfielder
 * "Éderson" and the Fenerbahce keeper "Ederson" came back as one result,
 * always the keeper (his peak value is higher), so the midfielder could not
 * be picked anywhere the soccer search is used. A source can now say how it
 * tells people apart (PlayerSourceConfig.identity) and the dedupe then keeps
 * one row per PERSON, with a short disambiguator on any row whose name
 * another row shares. A source that declares no identity is deduped exactly
 * as before, which src/test/playerSearchIdentity.test.ts proves against a
 * copy of the pre-668 dedupe.
 */

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

// Combining diacritical marks block (U+0300 to U+036F), built from char codes
// so the range never contains a literal accented character that could be
// mangled by copy/paste or re-encoding.
const DIACRITICS = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');
// Unicode format characters (zero-width and directional marks, the byte
// order mark): invisible, and never part of a name.
const FORMAT_CHARS = /\p{Cf}/gu;

/**
 * Lowercase, diacritics stripped via NFD decomposition, trimmed, internal
 * whitespace collapsed to single spaces. This is the single source of truth
 * for "does this text match that text" throughout the search layer and the
 * autocomplete component, so matching and highlighting never drift apart.
 */
export function normalizeName(s: string | null | undefined): string {
  return foldSpecialLatin(
    (s ?? '')
      // Round 383: invisible format characters are not part of a name.
      // player_market_values carries a second "Nemanja Vidic" row with a
      // trailing U+200E, which the search offered as its own player and
      // Missing XI then refused. Mirrored in PlayerAutocomplete's index map.
      .replace(FORMAT_CHARS, '')
      .normalize('NFD')
      .replace(DIACRITICS, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' '),
  );
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
  /**
   * Stable key for React lists and dedupe: normalized name, unique per player
   * within a search. Round 668: on a source that can tell namesakes apart two
   * results can share it (Éderson and Ederson are both "ederson"), and it is
   * kept that way on purpose, because callers compare it with normalized
   * names (Rarity Round's pool, simRarityAgreement). A list renders by
   * `personKey ?? key`, which is unique.
   */
  key: string;
  /**
   * Round 668. Which person this row is, on a source that declares
   * PlayerSourceConfig.identity (see personKeyOf). Absent on every other
   * source, so nothing there changes.
   */
  personKey?: string;
  /**
   * Round 668. Only present when another result shares this one's normalized
   * name: the club, position and year of the shown man's own latest row (see
   * ownLatestRow), so two namesakes can be told apart in the list.
   */
  disambiguator?: string;
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
  /**
   * When set, the player's name is stored split across two columns: this column
   * holds the FIRST name and `nameColumn` holds the last name. The searchable
   * and display name then become "First Last", and the substring (ilike) leg
   * matches the first typed word against EITHER column so a first name
   * ("LeBron") or a surname both resolve. For tables like
   * nba_players_extended_v2 that have no full_name column.
   */
  firstNameColumn?: string;
  /** When true, a LOWER prominenceColumn value means MORE prominent (e.g. player_id, where long-established stars hold the smallest ids). */
  prominenceAscending?: boolean;
  /** Columns copied into PlayerEntity.meta, keyed by the meta property name they should populate. */
  metaColumns?: Record<string, string>;
  /**
   * Round 386: a stored column holding lower(unaccent(nameColumn)). When set,
   * the substring leg searches it with the NORMALIZED query instead of the
   * raw column with the raw text, so "gundogan" finds "İlkay Gündoğan" at
   * the database rather than hoping he sits inside the prominence pool.
   * player_market_values.name_folded is the one that exists.
   */
  foldedNameColumn?: string;
  /** Row cap for the raw ilike leg. Default 200. */
  ilikeLimit?: number;
  /** Row cap for the prominence-pool accent-fallback leg. Default 1000 (PostgREST's per-request cap). */
  prominenceLimit?: number;
  /**
   * Round 668. How this source tells two people who share a name apart. When
   * set, results are deduped per person (personKeyOf) instead of per
   * normalized name. Leave it unset and the dedupe is exactly the old one.
   */
  identity?: PlayerIdentityConfig;
}

export interface PlayerIdentityConfig {
  /**
   * A column holding a stable id per person. A row that carries a value is
   * that person whatever it is called, and it wins over every other rule.
   */
  personKeyColumn?: string;
  /**
   * Two different stored spellings of one normalized name are two different
   * people. Only declare this where it has been measured to hold, see
   * SOCCER_MARKET_VALUE_SOURCE.
   */
  bySpelling?: boolean;
}

/**
 * Round 668. A stored name as the source spelled it, minus what is never part
 * of a name: format characters (the trailing U+200E on one "Nemanja Vidic"
 * row, Round 383) and stray whitespace. Case and accents are kept, because
 * they are the part that tells "Éderson" from "Ederson".
 */
export function storedSpelling(s: string | null | undefined): string {
  return (s ?? '').replace(FORMAT_CHARS, '').trim().replace(/\s+/g, ' ');
}

/**
 * Round 668. The one identity rule: which person a row is. The search dedupe
 * uses it, and so does every game that has to compare what the search handed
 * over with its own rows (Who Am I's pool, its judge and its club history),
 * so the two sides can never disagree about who is who.
 *
 * Undefined on a source with no identity config. Otherwise a person_key when
 * the row carries one, else the stored spelling when the source declares
 * bySpelling, else the normalized name (one person per name, as before).
 */
export function personKeyOf(
  identity: PlayerIdentityConfig | undefined,
  name: string | null | undefined,
  personKeyValue?: unknown,
): string | undefined {
  if (!identity) return undefined;
  if (identity.personKeyColumn && personKeyValue !== null && personKeyValue !== undefined) {
    const id = String(personKeyValue).trim();
    if (id) return 'pk:' + id;
  }
  if (identity.bySpelling) return 'sp:' + storedSpelling(name);
  return 'nm:' + normalizeName(name);
}

/**
 * ROUND 385, lifted into Who Am I in Round 668 so its club history shares it,
 * and down into this file after the Round 668 re-review so the search's
 * namesake line can use it too (whoAmI.ts imports this file, so it could not
 * import back). person_key is NULL on every row of player_market_values, so
 * one spelling can be several men: the table's 18 "Rodri" rows are four (a
 * Barcelona centre-back aged 21 in 2006, a Betis right midfielder aged 20 in
 * 2007, a Huesca left midfielder aged 32 in 2009, and the Manchester City
 * one), and "Lucas Hernández" is a Frenchman and a Uruguayan. A history row
 * is the pool player's only if its age walks with its year: the pool row
 * says 29 in 2026, so a 2006 row should say about 9, and 21 is somebody
 * else. Rows with no age cannot be checked and are kept.
 */
export function isSameMan(
  ref: { age: number; year: number },
  row: { age: number | null; year: number | null },
): boolean {
  if (!(ref.age > 0) || !(ref.year > 0)) return true;
  if (row.age == null || row.year == null || !(row.age > 0) || !(row.year > 0)) return true;
  return Math.abs((ref.age - row.age) - (ref.year - row.year)) <= 1;
}

export interface PlayerSourceFilter {
  column: string;
  /**
   * Round 483 added 'in'. A substring `ilike` on a club name is how Build Your
   * XI's dropdown came to offer 448 players for Barcelona when 194 ever played
   * there: "Barcelona" also matches RCD Espanyol Barcelona and Barcelona SC
   * Guayaquil. 'in' takes the exact stored names instead, so a pool can be
   * scoped to a club without swallowing every club whose name contains it.
   */
  op: 'eq' | 'ilike' | 'in';
  value: string | number | boolean | string[];
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
  /**
   * Round 484. NORMALIZED names that are known to satisfy the slot's real rule,
   * ranked above everything else of the same match quality. It changes the
   * ORDER only: it adds nobody to the pool and removes nobody from it.
   *
   * Build Your XI is why it exists. Its nation slots ask who has PLAYED FOR a
   * country and the only pool wide enough to keep every slot fillable is
   * everyone who holds the passport, which is roughly twenty times too big:
   * Argentina offers 1,567 names and 76 have ever been named in a squad we
   * hold. Filtering to the proven ones would empty slots instead (we hold no
   * Italy squad at all), which is the failure Round 442 was spent removing, so
   * the proven ones are lifted to the top of the list the player actually
   * looks at and the rest stay reachable underneath.
   *
   * Deliberately ranked BELOW matchRank: a boosted substring match must never
   * outrank an exact match on what the player typed, or the boost would start
   * hiding the man he is spelling out.
   */
  boostNames?: Set<string>;
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
    else if (f.op === 'in') b = b.in(f.column, Array.isArray(f.value) ? f.value : [f.value]);
    else b = b.ilike(f.column, `%${f.value}%`);
  }
  return b;
}

/**
 * Round 386: one order for both legs, with a full tiebreak. The prominence
 * pool used to be "order by value, limit 1000" and nothing else, and 317 rows
 * tie at its 1,000th seat, so ten identical requests returned eight different
 * name sets and a man on the tie was found or not on a coin toss. Value, then
 * the most recent row, then the name: one answer.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function orderForProminence(builder: any, source: PlayerSourceConfig) {
  let b = builder;
  if (source.prominenceColumn) b = b.order(source.prominenceColumn, { ascending: source.prominenceAscending === true });
  if (source.recencyColumn && source.recencyColumn !== source.prominenceColumn) b = b.order(source.recencyColumn, { ascending: false });
  b = b.order(source.nameColumn, { ascending: true });
  return b;
}

function buildSelectColumns(source: PlayerSourceConfig): string {
  const cols = new Set<string>([source.nameColumn]);
  if (source.firstNameColumn) cols.add(source.firstNameColumn);
  if (source.prominenceColumn) cols.add(source.prominenceColumn);
  if (source.recencyColumn) cols.add(source.recencyColumn);
  if (source.metaColumns) {
    for (const col of Object.values(source.metaColumns)) cols.add(col);
  }
  if (source.identity?.personKeyColumn) cols.add(source.identity.personKeyColumn);
  return [...cols].join(', ');
}

const DUP_MARK = /\(\s*dup\s*\)/i;

function rowToRaw(row: RawRow, source: PlayerSourceConfig): {
  name: string;
  prominence: number;
  recency: number;
  meta: PlayerEntityMeta;
  personKeyValue: unknown;
} | null {
  const lastVal = row[source.nameColumn];
  const last = typeof lastVal === 'string' ? lastVal.trim() : '';
  let name = last;
  if (source.firstNameColumn) {
    const firstVal = row[source.firstNameColumn];
    const first = typeof firstVal === 'string' ? firstVal.trim() : '';
    // Split-name tables (e.g. nba_players_extended_v2) build "First Last" so
    // autocomplete matches and shows the whole name, not just the surname.
    name = [first, last].filter(Boolean).join(' ');
  }
  if (!name) return null;
  /* Round 668 fix: a row whose name carries "(dup)" is a leftover copy, never
     a player. player_market_values holds 15 of them (2023, e.g. "Pepê (dup)"
     at Gremio), each the exact twin of a row under the plain name, measured
     2026-09-28. They are never offered, whatever the cleanup migration has or
     has not removed yet. */
  if (DUP_MARK.test(name)) return null;

  let prominence = source.prominenceColumn ? Number(row[source.prominenceColumn]) || 0 : 0;
  // Some sources rank prominence by an ASCENDING column (e.g. player_id, where
  // long-established stars were ingested first and hold the smallest ids).
  // Invert so the rest of the pipeline's "higher = more prominent" still holds.
  if (source.prominenceColumn && source.prominenceAscending) prominence = 1e15 - prominence;
  const recency = source.recencyColumn ? Number(row[source.recencyColumn]) || 0 : 0;

  const meta: PlayerEntityMeta = {};
  if (source.metaColumns) {
    for (const [metaKey, col] of Object.entries(source.metaColumns)) {
      const v = row[col];
      if (v === null || v === undefined) continue;
      if (typeof v === 'number' || typeof v === 'string') meta[metaKey] = v;
    }
  }

  const personKeyValue = source.identity?.personKeyColumn ? row[source.identity.personKeyColumn] : undefined;
  return { name, prominence, recency, meta, personKeyValue };
}

/** Classifies how a normalized candidate name matches a normalized query. Returns null when it doesn't match at all. */
function classifyMatch(normalizedName: string, normalizedQuery: string): MatchRank | null {
  if (!normalizedName.includes(normalizedQuery)) return null;
  if (normalizedName.startsWith(normalizedQuery)) return 0;
  if (normalizedName.split(' ').some(word => word.startsWith(normalizedQuery))) return 1;
  return 2;
}

type ParsedRow = NonNullable<ReturnType<typeof rowToRaw>>;

/** Round 668: "club · position · year" of a person's latest row, whatever of the three the source carries. */
function disambiguatorFor(row: ParsedRow): string {
  const club = row.meta.club ?? row.meta.team;
  const year = row.meta.year ?? (row.recency > 0 ? row.recency : undefined);
  return [club, row.meta.position, year]
    .filter(v => v !== undefined && v !== '')
    .map(String)
    .join(' · ');
}

/**
 * Round 668 re-review: the row a namesake line describes. One spelling can still
 * be several men, so the latest row under a spelling is not always the man on
 * screen: measured 2026-09-28 over every name the table stores more than one
 * way, 8 of the 91 lines described somebody else, "Cafu" among them (the Milan
 * right-back shown, the line of a Portuguesa left midfielder born 26 years
 * later). The line now comes from the shown row's own latest row. A later row
 * counts as his when a person_key says so, or when both rows list an age and
 * it walks with the year (isSameMan). A row that proves nothing is never used,
 * so at worst the line describes the shown row itself.
 */
function ownLatestRow(shown: ParsedRow, rows: ParsedRow[], byPersonKey: boolean): ParsedRow {
  const ageYear = (r: ParsedRow) => ({ age: Number(r.meta.age) || 0, year: Number(r.meta.year ?? r.recency) || 0 });
  const s = ageYear(shown);
  const provable = s.age > 0 && s.year > 0;
  let best = shown;
  for (const r of rows) {
    if (!(r.recency > best.recency || (r.recency === best.recency && r.prominence > best.prominence))) continue;
    const a = ageYear(r);
    if (byPersonKey || (provable && a.age > 0 && a.year > 0 && isSameMan(s, a))) best = r;
  }
  return best;
}

/**
 * The merge, dedupe and ranking half of searchPlayers, pure so it can be run
 * on rows without a database (src/test/playerSearchIdentity.test.ts).
 *
 * Rows from every leg are merged into one result per normalized name, keeping
 * the better match rank, then the higher prominence, then the more recent
 * row. Round 668: on a source that declares an identity the merge is per
 * person instead (personKeyOf), and a result whose normalized name another
 * result shares carries a disambiguator from the shown man's own latest row
 * (ownLatestRow). The sharing is counted before the slice, so a namesake just
 * past `limit` still marks the one on screen. `exclude` takes normalized names
 * (every person of that name) and, on such a source, person keys (that one
 * person).
 *
 * Ranked exact prefix, then word prefix, then contains; boosted names first
 * within a tier; then prominence. Sliced to `limit`.
 */
export function dedupeAndRank(
  rowSets: (RawRow[] | null | undefined)[],
  source: PlayerSourceConfig,
  normalizedQuery: string,
  options: { exclude?: Set<string>; boostNames?: Set<string>; limit: number },
): PlayerEntity[] {
  const { exclude } = options;
  const byPerson = new Map<
    string,
    { raw: ParsedRow; rank: MatchRank; normalized: string; personKey?: string; rows: ParsedRow[] }
  >();

  for (const rows of rowSets) {
    for (const row of rows ?? []) {
      const parsed = rowToRaw(row, source);
      if (!parsed) continue;
      const normalized = normalizeName(parsed.name);
      if (!normalized) continue;
      const rank = classifyMatch(normalized, normalizedQuery);
      if (rank === null) continue;
      if (exclude?.has(normalized)) continue;
      const personKey = personKeyOf(source.identity, parsed.name, parsed.personKeyValue);
      if (personKey !== undefined && exclude?.has(personKey)) continue;
      const dedupeKey = personKey ?? normalized;

      const existing = byPerson.get(dedupeKey);
      if (!existing) {
        byPerson.set(dedupeKey, { raw: parsed, rank, normalized, personKey, rows: [parsed] });
        continue;
      }
      existing.rows.push(parsed);
      // Keep the better match rank, and within equal rank keep the row with
      // the higher prominence (ties broken by recency).
      const better =
        rank < existing.rank ||
        (rank === existing.rank &&
          (parsed.prominence > existing.raw.prominence ||
            (parsed.prominence === existing.raw.prominence && parsed.recency > existing.raw.recency)));
      if (better) {
        existing.raw = parsed;
        existing.rank = Math.min(rank, existing.rank) as MatchRank;
      }
    }
  }

  const entries = [...byPerson.values()];
  const sharing = new Map<string, number>();
  for (const e of entries) sharing.set(e.normalized, (sharing.get(e.normalized) ?? 0) + 1);

  const ranked = entries.map(e => {
    const shared = (sharing.get(e.normalized) ?? 0) > 1;
    const entity: PlayerEntity = {
      key: e.normalized,
      name: displayName(e.raw.name),
      rawName: e.raw.name,
      meta: e.raw.meta,
      matchRank: e.rank,
      prominence: e.raw.prominence,
    };
    if (e.personKey !== undefined) entity.personKey = e.personKey;
    if (shared) {
      const hint = disambiguatorFor(ownLatestRow(e.raw, e.rows, e.personKey?.startsWith('pk:') === true));
      if (hint) entity.disambiguator = hint;
    }
    return { entity, normalized: e.normalized };
  });

  const boost = options.boostNames;
  ranked.sort((a, b) => {
    if (a.entity.matchRank !== b.entity.matchRank) return a.entity.matchRank - b.entity.matchRank;
    if (boost && boost.size > 0) {
      const ab = boost.has(a.normalized) ? 0 : 1;
      const bb = boost.has(b.normalized) ? 0 : 1;
      if (ab !== bb) return ab - bb;
    }
    return b.entity.prominence - a.entity.prominence;
  });

  return ranked.slice(0, options.limit).map(r => r.entity);
}

/**
 * Searches a configured player source with accent-insensitive, surname-aware
 * matching. Two queries run in parallel (see module docstring for why): a
 * direct ilike substring match on the raw typed text, and a fetch of the
 * source's most prominent rows used as an accent-fallback candidate pool.
 * Both are merged, deduped by normalized name (keeping the highest
 * prominence, then most recent; per person on a source with an identity,
 * see dedupeAndRank), ranked (exact prefix, then word prefix, then contains)
 * and sliced to `limit`.
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
    // fast whenever query/data accent state already matches. For split-name
    // sources, match the first typed word against EITHER the first- or
    // last-name column so a first name ("LeBron") or surname both resolve.
    // Round 55: source.table is dynamic, so postgrest-js resolves the select
    // against a union of every table in the schema and errors out. The query
    // is correct at runtime (verified against the live DB), so the builder is
    // typed loosely here rather than fighting the union.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ilikeQuery: any;
    if (source.firstNameColumn) {
      const token = rawQuery.split(/\s+/)[0].replace(/[,()%]/g, ' ').trim() || rawQuery;
      ilikeQuery = (supabase as any)
        .from(source.table)
        .select(selectCols)
        .or(`${source.firstNameColumn}.ilike.%${token}%,${source.nameColumn}.ilike.%${token}%`);
    } else if (source.foldedNameColumn) {
      // Round 386: the folded column against the folded query, so accent
      // state can no longer differ between the two sides.
      ilikeQuery = (supabase as any).from(source.table).select(selectCols).ilike(source.foldedNameColumn, `%${normalizedQuery}%`);
    } else {
      ilikeQuery = (supabase as any).from(source.table).select(selectCols).ilike(source.nameColumn, `%${rawQuery}%`);
    }
    ilikeQuery = applyFilters(ilikeQuery, source.filters);
    ilikeQuery = orderForProminence(ilikeQuery, source);
    ilikeQuery = ilikeQuery.limit(ilikeLimit);
    if (signal) ilikeQuery = ilikeQuery.abortSignal(signal);

    // Leg 2: prominence pool, used as an accent-insensitive fallback. Only
    // worth running once the query is short enough that the pool plausibly
    // still helps (very long queries are unlikely to be accent-mismatched
    // AND only findable this way, so skip the extra request past ~24 chars).
    const runProminenceLeg = normalizedQuery.length <= 24;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let prominenceQuery: any = runProminenceLeg
      ? (supabase as any).from(source.table).select(selectCols)
      : null;
    if (prominenceQuery) {
      prominenceQuery = applyFilters(prominenceQuery, source.filters);
      prominenceQuery = orderForProminence(prominenceQuery, source);
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

    const results = dedupeAndRank(
      [ilikeRes.data as RawRow[] | null, prominenceRes.data as RawRow[] | null],
      source,
      normalizedQuery,
      { exclude, boostNames: options.boostNames, limit },
    );
    return { results, error: null };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { results: [], error: null };
    }
    return { results: [], error: err instanceof Error ? err.message : 'Search failed' };
  }
}

// ---------------------------------------------------------------------------
// Local names
// ---------------------------------------------------------------------------

/** How many caller-supplied names a single query may append after the remote results. */
const LOCAL_NAME_CAP = 6;

/**
 * Round 84, moved here in Round 383. Names the caller's own answer pool knows
 * and the remote source may not (an NFL legend from before the roster table
 * starts, a lineup spelling the market value table does not use) are matched
 * CLIENT-SIDE and appended after the remote results. Up to LOCAL_NAME_CAP
 * matches are taken in the caller's order, `exclude` is honoured, and a man
 * the remote search already found is not listed twice.
 *
 * This lives here rather than inside PlayerAutocomplete so a harness can run
 * the exact merge the component runs: simMissingXiReach walks every Missing
 * XI answer through searchPlayers plus this function and fails if a player
 * could not lock the answer in.
 */
export function mergeLocalNames(
  remote: PlayerEntity[],
  localNames: string[] | undefined,
  query: string,
  exclude?: Set<string>,
): PlayerEntity[] {
  if (!localNames || localNames.length === 0) return remote;
  const q = normalizeName(query);
  const locals: PlayerEntity[] = [];
  const localKeys = new Set<string>();
  for (const n of localNames) {
    const key = normalizeName(n);
    if (!key.includes(q)) continue;
    if (exclude?.has(key)) continue;
    // Two spellings of one man in the caller's list are one row, never two
    // rows sharing a React key.
    if (localKeys.has(key)) continue;
    localKeys.add(key);
    locals.push({ key, name: n, rawName: n, meta: {}, matchRank: 2, prominence: 0 });
    if (locals.length >= LOCAL_NAME_CAP) break;
  }
  if (locals.length === 0) return remote;
  const seen = new Set(remote.map(r => r.key));
  return [...remote, ...locals.filter(l => !seen.has(l.key))];
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
  foldedNameColumn: 'name_folded',
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
  /* Round 668. person_key is declared so the day it is filled it wins, but on
     2026-09-28 it was NULL on all 141,916 rows, so today the spelling is the
     only thing this table says about who is who. Measured the same day:
     27,803 normalized names, 45 of them stored under more than one spelling.
     Every one of the 3 such names in Who Am I's 600 player pool is two or
     more different men (Éderson and Ederson, Ladislav Krejčí and Krejci,
     Pepê, Pêpê and Pepe). Two known exceptions across the whole table are
     one man typed two ways (Michal and Michał Karbownik, Martin and Martín
     Erlić); each spelling then shows as its own row with its own latest club,
     which is untidy but never wrong, where folding them hid a real player.
     One spelling shared by several men (four Rodris) stays one row: the
     table cannot tell them apart and this does not pretend to. */
  identity: { personKeyColumn: 'person_key', bySpelling: true },
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
 * separately. `last_name` is nameColumn and `first_name` is firstNameColumn,
 * so the search layer builds "First Last" for both matching and display and
 * the ilike leg matches either column, this is what makes first-name queries
 * ("LeBron", "Kobe") resolve instead of returning nothing. There is no stats
 * column, so `player_id` (ascending: balldontlie gave established stars the
 * smallest ids) is used as a "surface obvious stars" prominence proxy.
 */
export const NBA_PLAYER_SOURCE: PlayerSourceConfig = {
  table: 'nba_players_extended_v2',
  nameColumn: 'last_name',
  firstNameColumn: 'first_name',
  prominenceColumn: 'player_id',
  prominenceAscending: true,
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
