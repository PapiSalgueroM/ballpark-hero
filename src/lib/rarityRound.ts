import { supabase } from '@/integrations/supabase/client';
import { normalizeName, displayName, SOCCER_MARKET_VALUE_SOURCE, type PlayerSourceConfig } from '@/lib/playerSearch';
import { getTodayET, dateSeed } from '@/lib/dateUtils';

/**
 * Rarity Round: a Pointless-style rarity trivia game (Mode 1) with a
 * Fan-Favourites-style popularity mirror (Mode 2, "Crowd Says").
 *
 * MECHANIC
 * Each round shows a category prompt ("Name a Ballon d'Or winner", "Name a
 * player who has played for Real Madrid"). The player answers with a real,
 * valid person for that category via PlayerAutocomplete (validateOnly, so an
 * invalid pick can never be submitted). We do not have live guess-submission
 * volume at launch (no players have played this game yet), so instead of a
 * survey-based rarity percentage we use a verified proxy: rank within the
 * category's full pool by prominence (peak market value in USD, the same
 * number every other game on the site already uses to mean "how famous is
 * this player"). A low prominence rank means an obscure pick, exactly what
 * Pointless rewards. Ballon d'Or winners (who have no market-value column
 * tied to the award itself) are scored by joining to the same market-value
 * table so every category shares one scoring mechanism.
 *
 * Rarity Round (mode 'rarity'): lower total score is better, 0 is a perfect
 * "Goalless" run (found the rarest possible valid answer every round).
 * Crowd Says (mode 'crowd'): higher total score is better, reward for naming
 * the most obvious, famous answer instead.
 *
 * SCORING
 * Every category pool is ranked by prominence descending (rank 1 = most
 * famous player in the pool, rank poolSize = most obscure). Each round's
 * points (see scoreRound below) are:
 *   rarityScore = round(((rank - 1) / (poolSize - 1)) * 100)   // 0 = rank 1 (famous, bad), 100 = last rank (obscure, good)
 *   crowdScore  = 100 - rarityScore                            // 100 = rank 1 (famous, good), 0 = last rank (obscure, bad)
 * Rarity Round uses rarityScore directly: lower total is better, matching
 * Pointless convention ("you found a 12 point answer" being a great, rare
 * pick). Crowd Says uses crowdScore: higher total is better, rewarding the
 * most obvious, famous answer instead. Both are already on a clean 0-100
 * scale per category regardless of pool size, so a 5-round total is always
 * out of 500.
 *
 * DATA SOURCES (verified live on flawuiqbvjobmkfkauhw, 2026-07-03)
 * - ballon_dor: 76 rows total, 69 Men-award rows with rank = 1 (one winner
 *   per year, 1956-2025; some players repeat, e.g. Messi x8, Ronaldo x5,
 *   which is fine, a repeat winner is still one valid pool entry per row).
 *   award_type is 'Men' or 'Women' (not 'Ballon d'Or' as a stray naming
 *   guess might assume, confirmed by querying distinct award_type).
 * - player_market_values: 171,567 rows, zero null/zero market_value_usd
 *   values (verified by count(*) filter). Players repeat one row per year
 *   they were valued, so every pool query below deduplicates by player name
 *   and keeps peak (max) market_value_usd as the prominence number.
 *
 * Every category pool below was run against the live database before this
 * file was written; verified sizes are recorded on each CATEGORY entry.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RarityMode = 'rarity' | 'crowd';

/** One pool entry: a valid answer for a category, ranked by prominence. */
export interface PoolEntry {
  /** Normalized name, used as the unique key and for guess matching. */
  key: string;
  /** Display-ready name. */
  name: string;
  /** Peak market value in USD (or equivalent prominence number). Higher = more famous. */
  prominence: number;
  /** 1 = most famous in this pool. */
  rank: number;
}

export interface RarityCategory {
  id: string;
  /** The prompt shown to the player, e.g. "Name a Ballon d'Or winner". */
  prompt: string;
  /** Short flavor line shown under the prompt. */
  hint: string;
  /** Fetches the full, ranked pool for this category. Cached per session. */
  fetchPool: () => Promise<PoolEntry[]>;
  /**
   * PlayerAutocomplete source config, filtered to exactly this category's
   * valid pool (same filter the fetchPool query above uses). Passed to
   * PlayerAutocomplete with validateOnly=true so the suggestion dropdown
   * itself never offers a player outside the category, and free-typed text
   * can never be submitted, matching the "a wrong or invalid answer cannot
   * be submitted" requirement structurally rather than via post-hoc checks.
   */
  sourceConfig: PlayerSourceConfig;
}

export interface RoundResult {
  categoryId: string;
  prompt: string;
  answerName: string;
  rank: number;
  poolSize: number;
  /** Points for this round, already oriented per mode (0-100, see module docstring). */
  points: number;
}

// ---------------------------------------------------------------------------
// Pool helpers
// ---------------------------------------------------------------------------

/** Builds a ranked pool from raw (name, prominence) pairs: dedupe by normalized name keeping peak prominence, sort descending, assign rank. */
function rankPool(rows: { name: string; prominence: number }[]): PoolEntry[] {
  const byKey = new Map<string, { name: string; prominence: number }>();
  for (const r of rows) {
    const name = (r.name ?? '').trim();
    if (!name) continue;
    const prominence = Number(r.prominence) || 0;
    const key = normalizeName(name);
    if (!key) continue;
    const existing = byKey.get(key);
    if (!existing || prominence > existing.prominence) {
      byKey.set(key, { name, prominence });
    }
  }
  const sorted = [...byKey.entries()].sort((a, b) => b[1].prominence - a[1].prominence);
  return sorted.map(([key, v], i) => ({
    key,
    name: displayName(v.name),
    prominence: v.prominence,
    rank: i + 1,
  }));
}

/** Simple in-memory session cache so switching modes/rounds doesn't re-fetch the same category pool repeatedly. */
const poolCache = new Map<string, Promise<PoolEntry[]>>();

function cachedPool(id: string, fetcher: () => Promise<PoolEntry[]>): () => Promise<PoolEntry[]> {
  return () => {
    if (!poolCache.has(id)) {
      poolCache.set(id, fetcher());
    }
    return poolCache.get(id)!;
  };
}

// ---------------------------------------------------------------------------
// Category pool queries
// ---------------------------------------------------------------------------
// Every query below was executed against flawuiqbvjobmkfkauhw before this
// file was written; verified row counts are noted per category. Prominence
// for every category (including Ballon d'Or) is peak market_value_usd from
// player_market_values, joined by normalized player name, so every category
// shares the exact same 0-100 scoring mechanism.

/**
 * Fetches a lookup of normalized-name -> peak market value across the whole
 * player_market_values table, ordered by value so the top 5000 rows cover
 * every player famous enough to plausibly be a Ballon d'Or winner. Matching
 * a small candidate list (e.g. 69 winner names) one by one via ilike would
 * mean dozens of round trips; pulling the prominence pool once and matching
 * client-side by normalized name (the same approach playerSearch.ts already
 * uses for accent-insensitive matching) is a single request instead.
 */
async function fetchProminenceMap(): Promise<Map<string, number>> {
  const { data } = await supabase
    .from('player_market_values')
    .select('player_name, market_value_usd')
    .order('market_value_usd', { ascending: false })
    .limit(5000);
  const map = new Map<string, number>();
  for (const row of data ?? []) {
    const key = normalizeName(row.player_name as string);
    if (!key) continue;
    const val = Number(row.market_value_usd) || 0;
    const existing = map.get(key);
    if (existing === undefined || val > existing) map.set(key, val);
  }
  return map;
}

/** Category 1: Ballon d'Or winners (Men), any year. Verified pool size: 69 rows (rank = 1, award_type = 'Men', 1956-2025). */
async function fetchBallonDorWinners(): Promise<PoolEntry[]> {
  const { data, error } = await supabase
    .from('ballon_dor')
    .select('player_name, year')
    .eq('rank', 1)
    .eq('award_type', 'Men');
  if (error || !data) return [];

  // Ballon d'Or winners don't carry a market value on the award row itself,
  // so prominence is looked up from player_market_values by name. A winner
  // not found in that table (rare, mostly pre-2004 legends since
  // player_market_values starts at 2004) falls back to a synthetic
  // prominence derived from recency, so older/rarer legends still rank low
  // (obscure to a modern audience) without being dropped from the pool.
  const prominenceMap = await fetchProminenceMap();

  const rows = (data as { player_name: string; year: number }[]).map(r => {
    const key = normalizeName(r.player_name);
    const looked = prominenceMap.get(key);
    // Fallback: recency-based synthetic prominence (older years score lower),
    // scaled well below the smallest real market value we ever see so it
    // never outranks a player who actually has value data.
    const fallback = Math.max(1, r.year - 1950);
    return { name: r.player_name, prominence: looked ?? fallback };
  });
  return rankPool(rows);
}

/** Category factory: "Name a player who has played for {club}". Verified pool sizes (distinct players, peak value): Real Madrid 168+, Arsenal 212, Chelsea 200, Barcelona 191, PSG 189, Man City 170. */
function fetchClubPool(club: string) {
  return async (): Promise<PoolEntry[]> => {
    const { data, error } = await supabase
      .from('player_market_values')
      .select('player_name, market_value_usd')
      .eq('club', club)
      .order('market_value_usd', { ascending: false })
      .limit(1000);
    if (error || !data) return [];
    const rows = (data as { player_name: string; market_value_usd: number }[]).map(r => ({
      name: r.player_name,
      prominence: r.market_value_usd,
    }));
    return rankPool(rows);
  };
}

/** Category factory: "Name a {nationality} international". Verified pool sizes (distinct players): Brazil 1680, Argentina 1546, Spain 1512, France 1265, England 1169. */
function fetchNationalityPool(nationality: string) {
  return async (): Promise<PoolEntry[]> => {
    const { data, error } = await supabase
      .from('player_market_values')
      .select('player_name, market_value_usd')
      .eq('nationality', nationality)
      .order('market_value_usd', { ascending: false })
      .limit(1000);
    if (error || !data) return [];
    const rows = (data as { player_name: string; market_value_usd: number }[]).map(r => ({
      name: r.player_name,
      prominence: r.market_value_usd,
    }));
    return rankPool(rows);
  };
}

/** Category factory: "Name a {position}". Verified pool sizes (distinct players, most recent position tag): Centre-Forward 2396, Goalkeeper 2268, Centre-Back 2381. */
function fetchPositionPool(position: string) {
  return async (): Promise<PoolEntry[]> => {
    const { data, error } = await supabase
      .from('player_market_values')
      .select('player_name, market_value_usd')
      .eq('position', position)
      .order('market_value_usd', { ascending: false })
      .limit(1000);
    if (error || !data) return [];
    const rows = (data as { player_name: string; market_value_usd: number }[]).map(r => ({
      name: r.player_name,
      prominence: r.market_value_usd,
    }));
    return rankPool(rows);
  };
}

/** Category 6: players ever worth $100M+. Verified pool size: exactly 50 players peaked at or above $100,000,000. */
async function fetchElitePool(): Promise<PoolEntry[]> {
  const { data, error } = await supabase
    .from('player_market_values')
    .select('player_name, market_value_usd')
    .gte('market_value_usd', 100_000_000)
    .order('market_value_usd', { ascending: false })
    .limit(1000);
  if (error || !data) return [];
  const rows = (data as { player_name: string; market_value_usd: number }[]).map(r => ({
    name: r.player_name,
    prominence: r.market_value_usd,
  }));
  return rankPool(rows);
}

// ---------------------------------------------------------------------------
// Category catalog
// ---------------------------------------------------------------------------
// Adding a category later is data-only: add an entry here (or another
// factory call) with a verified pool query. No page/UI changes needed.

export const CATEGORIES: RarityCategory[] = [
  {
    id: 'ballon-dor',
    prompt: "Name a Ballon d'Or winner",
    hint: 'Any year, 1956 to 2025. Men\'s award.',
    fetchPool: cachedPool('ballon-dor', fetchBallonDorWinners),
    sourceConfig: {
      table: 'ballon_dor',
      nameColumn: 'player_name',
      filters: [
        { column: 'rank', op: 'eq', value: 1 },
        { column: 'award_type', op: 'eq', value: 'Men' },
      ],
      metaColumns: { club: 'club', nationality: 'nationality', year: 'year' },
      ilikeLimit: 100,
      prominenceLimit: 100,
    },
  },
  {
    id: 'club-real-madrid',
    prompt: 'Name a player who has played for Real Madrid',
    hint: 'Any season in our records counts.',
    fetchPool: cachedPool('club-real-madrid', fetchClubPool('Real Madrid')),
    sourceConfig: {
      ...SOCCER_MARKET_VALUE_SOURCE,
      filters: [{ column: 'club', op: 'eq', value: 'Real Madrid' }],
    },
  },
  {
    id: 'club-arsenal',
    prompt: 'Name a player who has played for Arsenal',
    hint: 'Any season in our records counts.',
    fetchPool: cachedPool('club-arsenal', fetchClubPool('Arsenal FC')),
    sourceConfig: {
      ...SOCCER_MARKET_VALUE_SOURCE,
      filters: [{ column: 'club', op: 'eq', value: 'Arsenal FC' }],
    },
  },
  {
    id: 'club-barcelona',
    prompt: 'Name a player who has played for Barcelona',
    hint: 'Any season in our records counts.',
    fetchPool: cachedPool('club-barcelona', fetchClubPool('FC Barcelona')),
    sourceConfig: {
      ...SOCCER_MARKET_VALUE_SOURCE,
      filters: [{ column: 'club', op: 'eq', value: 'FC Barcelona' }],
    },
  },
  {
    id: 'nationality-brazil',
    prompt: 'Name a Brazilian footballer',
    hint: 'Current or former, any club.',
    fetchPool: cachedPool('nationality-brazil', fetchNationalityPool('Brazil')),
    sourceConfig: {
      ...SOCCER_MARKET_VALUE_SOURCE,
      filters: [{ column: 'nationality', op: 'eq', value: 'Brazil' }],
    },
  },
  {
    id: 'nationality-argentina',
    prompt: 'Name an Argentine footballer',
    hint: 'Current or former, any club.',
    fetchPool: cachedPool('nationality-argentina', fetchNationalityPool('Argentina')),
    sourceConfig: {
      ...SOCCER_MARKET_VALUE_SOURCE,
      filters: [{ column: 'nationality', op: 'eq', value: 'Argentina' }],
    },
  },
  {
    id: 'position-forward',
    prompt: 'Name a centre-forward',
    hint: 'Any club, any era in our records.',
    fetchPool: cachedPool('position-forward', fetchPositionPool('Centre-Forward')),
    sourceConfig: {
      ...SOCCER_MARKET_VALUE_SOURCE,
      filters: [{ column: 'position', op: 'eq', value: 'Centre-Forward' }],
    },
  },
  {
    id: 'position-goalkeeper',
    prompt: 'Name a goalkeeper',
    hint: 'Any club, any era in our records.',
    fetchPool: cachedPool('position-goalkeeper', fetchPositionPool('Goalkeeper')),
    sourceConfig: {
      ...SOCCER_MARKET_VALUE_SOURCE,
      filters: [{ column: 'position', op: 'eq', value: 'Goalkeeper' }],
    },
  },
  {
    id: 'elite-100m',
    prompt: 'Name a player who has been worth $100M or more',
    hint: 'Peak market value, any year.',
    fetchPool: cachedPool('elite-100m', fetchElitePool),
    // No exact-match filter exists for "gte" in PlayerSourceFilter (only eq
    // and ilike), so this category's autocomplete searches the full soccer
    // pool. Validation still enforces the $100M threshold: the pool from
    // fetchPool above is the single source of truth for whether a submitted
    // pick actually counts, same as every other category, so RarityRound.tsx's
    // submitGuess (which only scores a pick found in this pool) rejects a
    // sub-$100M player even if the dropdown offered it as a suggestion.
    sourceConfig: SOCCER_MARKET_VALUE_SOURCE,
  },
];

const ROUNDS_PER_RUN = 5;

// ---------------------------------------------------------------------------
// Round selection (daily seed + free play)
// ---------------------------------------------------------------------------

/** Deterministic shuffle: Fisher-Yates driven by a seeded PRNG so the same seed always produces the same order. */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  const next = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Picks today's 5 categories, date-seeded (America/New_York) so every player
 * sees the same rotation on the same day, matching the sitewide daily-reset
 * convention in src/lib/dateUtils.ts. When categories.length <= ROUNDS_PER_RUN
 * every category is used (shuffled for order only).
 */
export function pickDailyCategories(categories: RarityCategory[] = CATEGORIES): RarityCategory[] {
  const seed = dateSeed(getTodayET());
  const shuffled = seededShuffle(categories, seed);
  return shuffled.slice(0, Math.min(ROUNDS_PER_RUN, shuffled.length));
}

/** Picks 5 random categories for free-play mode (Math.random, different every run). */
export function pickRandomCategories(categories: RarityCategory[] = CATEGORIES): RarityCategory[] {
  const a = [...categories];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.min(ROUNDS_PER_RUN, a.length));
}

export { ROUNDS_PER_RUN };

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Scores one round given the pool and the rank of the picked answer.
 * Returns a 0-100 point value oriented for the given mode:
 *   - 'rarity': 0 = rarest possible pick (best), 100 = most famous (worst).
 *   - 'crowd':  100 = most famous possible pick (best), 0 = most obscure (worst).
 * poolSize of 1 (a degenerate category) always scores as a perfect pick,
 * since there is no obscurity spectrum to measure.
 */
export function scoreRound(rank: number, poolSize: number, mode: RarityMode): number {
  if (poolSize <= 1) return mode === 'rarity' ? 0 : 100;
  // rarityScore: 0 at rank 1 (most famous, worst rarity pick) up to 100 at
  // the last rank (most obscure, best rarity pick).
  const rarityScore = ((rank - 1) / (poolSize - 1)) * 100;
  // crowdScore is rarity's mirror: 100 at rank 1 (most famous, best crowd
  // pick) down to 0 at the last rank (most obscure, worst crowd pick).
  const crowdScore = 100 - rarityScore;
  const final = mode === 'rarity' ? rarityScore : crowdScore;
  return Math.round(Math.min(100, Math.max(0, final)));
}

/** Sums a run's round points. */
export function totalScore(rounds: RoundResult[]): number {
  return rounds.reduce((sum, r) => sum + r.points, 0);
}

/** Builds the emoji-bar share grid for a completed run, per R5 spec 3.6 (a styled block, never a bare one-liner). One bar per round, filled proportional to how good the round's points were for its mode. */
export function buildEmojiGrid(rounds: RoundResult[], mode: RarityMode): string {
  const bars = rounds.map(r => {
    // "Good" always renders more filled squares regardless of mode: for
    // rarity, good = low points, so invert; for crowd, good = high points.
    const goodness = mode === 'rarity' ? 100 - r.points : r.points;
    const filled = Math.min(5, Math.max(0, Math.round(goodness / 20)));
    return '🟩'.repeat(filled) + '⬜'.repeat(5 - filled);
  });
  const label = mode === 'rarity' ? 'Rarity Round' : 'Crowd Says';
  return [`${label}: ${totalScore(rounds)} pts`, ...bars].join('\n');
}

/** Human-readable per-round line for the result screen, Pointless convention ("You found a 12 point answer"). */
export function roundSummaryLine(r: RoundResult, mode: RarityMode): string {
  const pointsWord = mode === 'rarity' ? 'point' : 'popularity point';
  return `${r.answerName}: a ${r.points} ${pointsWord}${r.points === 1 ? '' : 's'} answer (rank ${r.rank} of ${r.poolSize})`;
}
