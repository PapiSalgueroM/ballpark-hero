import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';
import type { PlayerEntity } from '@/lib/playerSearch';
import { foldSpecialLatin } from '@/lib/nameFold';

/**
 * Who Am I? (a secret-footballer game: each guess tells you how warm you are)
 *
 * Data source: player_market_values (player_name, nationality, position, club,
 * market_value_usd, age, year). Rows exist for 2004-2026; only CURRENT rows
 * (year >= 2025, latest year per player, 2026 preferred) feed the pool and
 * every displayed attribute, while all years feed each player's club-history
 * set. See the CURRENT-ROW ATTRIBUTES section below for why.
 *
 * SIMILARITY SCORING (exact weights, verified in SQL against live rows):
 *   +22  same nationality (primary nationality, accent-insensitive)
 *   +18  same position group (GK / DEF / MID / FWD)
 *   +10  extra when the exact position also matches (so exact position = 28)
 *   +25  same current club, OR
 *   +10  any shared club across full career history (never stacks with +25)
 *   +15 * max(0, 1 - |ageDiff| / 12)            age closeness, 0 pts at 12+ years apart
 *   +20 * max(0, 1 - |log10(valueRatio)| / 1)   market value closeness on a log scale,
 *                                               0 pts when values are 10x or more apart
 *   Raw maximum is 110; non-exact guesses are capped at 99.
 *   Guessing the secret player itself always returns exactly 100.
 *
 * WEIGHT AUDIT (2026-07-03), before -> after, against a ~400 player pool:
 *   positionExact  +6 -> +10   Going from "same group" (MID is ~120 of 400
 *     players) to "same exact position" (e.g. just CDMs, ~15-20 players) is
 *     one of the sharpest single narrows in the whole scorer, yet it was
 *     worth barely a quarter of nationality's +22 for a similar or tighter
 *     narrow. Bumped so nailing the exact position is felt, not a rounding
 *     error next to the group match it sits on top of.
 *   sharedClub     +15 -> +10  A career-history club link is real signal but
 *     far noisier than a current club: any well-traveled pro accumulates
 *     shared ex-clubs with dozens of other pool players, so it does not
 *     narrow the pool anywhere near as much as sameClub's +25. Dropped from
 *     60% to 40% of sameClub's weight to match that gap in reliability.
 *   nationality, positionGroup, sameClub, age, value: left unchanged. Each
 *     already tracks its real narrowing power: sameClub and nationality both
 *     cut a 400 pool to a few dozen; value is the strongest continuous
 *     signal for guessing-game tiering (a 5M squad player is never confused
 *     for a 180M superstar); age is a fair continuous tiebreaker but rarely
 *     narrows the pool sharply on its own, hence sitting below value.
 *
 * Verified sample pairs (SQL run on flawuiqbvjobmkfkauhw, latest rows, 2026-07-01;
 * none of the three hit sharedClub or positionExact, so the totals below are
 * unaffected by the 2026-07-03 reweight above):
 *   Dembele -> Doue (PSG teammates, both France, both FWD):
 *     22 + 18 + 25 + 5.00 + 19.07 = 89
 *   Rice -> Bellingham (both England, both MID, no shared club):
 *     22 + 18 + 0 + 10.00 + 18.70 = 69
 *   Alisson -> Julian Alvarez (GK vs FWD, Brazil vs Argentina, no club link):
 *     0 + 0 + 0 + 5.00 + 5.37 = 10
 *
 * WIDE-POOL GUESSING (2026-07-06, owner complaint: "I put ron to guess
 * Ronaldo and it didn't suggest it, Messi and Ronaldo aren't able to be
 * guessed"). Root cause, verified via SQL: the boot-time GUESSABLE pool
 * (fetchWhoAmIPool, POOL_SIZE=400) is the top 400 rows by CURRENT market
 * value, and both Ronaldo (13M, Al-Nassr, 2026) and Messi (19M, Inter Miami,
 * 2025) are worth far less now than active top-400 stars, so neither ever
 * made that pool despite being the two most famous players alive.
 *
 * Fix: the guess/suggestion box no longer reads from the 400-player boot
 * pool at all. It uses the shared PlayerAutocomplete component against
 * SOCCER_MARKET_VALUE_SOURCE (src/lib/playerSearch.ts), the same
 * prominence-ranked, paginated, accent-insensitive search every other game
 * on the site uses. That source spans all 27,850+ distinct players in
 * player_market_values (verified via SQL), so literally any player, however
 * obscure or however far past their peak value, can be typed and guessed.
 * "ron" now surfaces Ronaldo within the first few suggestions because the
 * ilike leg matches the substring directly regardless of current value.
 * Famous-first ordering still holds: results are ranked by match tier first
 * (full-name prefix, then word prefix, then substring) and prominence
 * (market_value_usd) second, exactly like every other PlayerAutocomplete
 * consumer, so "messi" surfaces Lionel Messi above lower-profile namesakes
 * (verified: "Rayane Messi" is a real but far less notable row).
 *
 * The SECRET pool is deliberately untouched: it stays the curated top-200
 * current-value pool (SECRET_POOL_SIZE) so the answer is always someone
 * playing at a recognizable level today, which is what makes the difficulty
 * tiers (easy/normal/hard) and the "open with any big name" onboarding hint
 * make sense. Only the space of ALLOWED GUESSES was too narrow; the space of
 * POSSIBLE SECRETS was always fine and is not widened here.
 *
 * Because a wide-pool guess can now be any of 27k+ players, whoAmIPlayerFromEntity
 * below converts PlayerAutocomplete's PlayerEntity into a WhoAmIPlayer.
 * scoreGuess() degrades gracefully for a guess outside the curated pool:
 * sameClub still compares current clubs directly (no lookup needed), and
 * sharedClubPast simply reports false for a guess whose name isn't a key in
 * the boot pool's clubHistory map (nothing throws, that one signal is just
 * unavailable, an acceptable trade for "every player is guessable").
 *
 * CURRENT-ROW ATTRIBUTES (2026-07-08, owner complaint: "put Messi but it says
 * he's 30 and plays for Arsenal. He's 39 at Inter Miami. Ozil was guessable
 * even though he's retired"). Two related root causes, verified via SQL:
 *   1. The old boot fetch pulled the top 1000 rows by value across year >=
 *      2024 and deduped keeping the latest FETCHED row, but for a faded star
 *      only the peak-value seasons survive a value-ordered fetch, so the
 *      "latest" row kept could still be years old. Worse, the guess converter
 *      read PlayerEntity.meta, and playerSearch's dedupe keeps each player's
 *      HIGHEST-VALUE row across all years, i.e. the peak-year row (Ozil's
 *      Arsenal seasons, Messi in his 20s), which is what got displayed.
 *   2. Long-retired players have big historical values, so nothing stopped
 *      them appearing with those stale attributes.
 * Fix: fetchWhoAmIPool now pages ALL rows for year >= 2025 (via fetchAllRows,
 * ~13.8k rows across 2025+2026, verified via SQL 2026-07-08), keeps each
 * player's latest row (2026 preferred, else 2025; value breaks ties), THEN
 * takes the top POOL_SIZE by that CURRENT value. The full current-row map is
 * kept module-level so whoAmIPlayerFromEntity resolves every guess to its
 * current row (Messi -> Inter Miami CF, age 39, $12.8M). A guessed player
 * with NO 2025+ row is retired: they are impossible as secrets (not in the
 * pool) and are never displayed with stale peak-year attributes, the guess
 * is still accepted, but it renders as club "Retired" with no age/value, and
 * scores accordingly low. Attribute comparisons therefore always run on
 * current rows only.
 */

export interface WhoAmIPlayer {
  name: string;
  nationality: string; // raw value, can hold dual nationality like "France / Algeria"
  position: string; // Transfermarkt style, e.g. "Attacking Midfield"
  club: string; // club on the player's most recent row
  value: number; // market value in USD from the most recent row
  age: number; // age on the most recent row
  year: number; // year of the row we kept
}

export interface WhoAmIData {
  pool: WhoAmIPlayer[]; // sorted by value desc
  clubHistory: Map<string, Set<string>>; // player name -> normalized club keys across all years
}

export interface GuessBreakdown {
  isExact: boolean;
  natMatch: boolean;
  posGroupMatch: boolean;
  posExactMatch: boolean;
  sameClub: boolean;
  sharedClubPast: boolean; // shared a club at some point, but not the current one
  ageDiff: number; // secret.age - guess.age; positive means the secret player is older
  valueLogDiff: number; // log10(secret.value / guess.value); positive means the secret is worth more
  score: number; // 0-100
}

export interface GuessResult {
  player: WhoAmIPlayer;
  breakdown: GuessBreakdown;
}

export const WEIGHTS = {
  nationality: 22,
  positionGroup: 18,
  positionExact: 10, // was 6 (2026-07-03 weight audit, see file header)
  sameClub: 25,
  sharedClub: 10, // was 15 (2026-07-03 weight audit, see file header)
  age: 15,
  value: 20,
} as const;

/** Age points fall linearly to zero across this many years of difference. */
export const AGE_RANGE = 12;
/** Value points fall linearly to zero across this many log10 units (1 = 10x apart). */
export const VALUE_LOG_RANGE = 1;

export const POOL_SIZE = 500; // notable current-ish players kept in the guessable pool
// Owner task 60 (2026-08-05): "lots more puzzles". The secret pool grows
// 200 -> 300, which adds a hundred fresh, less-obvious secrets to Who Am I
// AND Clue Auction (it draws from the same pickSecret pool). Value bands in
// clueAuction were checked against the wider spread: the sub-$45M band just
// absorbs the new tail.
export const SECRET_POOL_SIZE = 300; // the secret is always drawn from the top of the pool

// #40: prominence tiers for the secret pick, unlimited/practice play only
// (this game has no separate daily mode; Casual/Expert guess budgets are
// untouched by this setting). The secret pool splits into thirds by CURRENT
// market value: Easy draws the top third (most famous), Hard the bottom
// third, Normal the whole pool. Since the 2026-07-08 current-rows fix the
// pool ranks by each player's latest 2025/2026 value, so the exact dollar
// cutoffs drift with live data.
export type WhoAmIDifficulty = 'easy' | 'normal' | 'hard';
const DIFFICULTY_STORAGE_KEY = 'who-am-i-difficulty';

export function loadWhoAmIDifficulty(): WhoAmIDifficulty {
  try {
    const raw = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
    if (raw === 'easy' || raw === 'normal' || raw === 'hard') return raw;
  } catch { /* localStorage unavailable, fall back to default */ }
  return 'normal';
}

export function saveWhoAmIDifficulty(next: WhoAmIDifficulty): void {
  try { localStorage.setItem(DIFFICULTY_STORAGE_KEY, next); } catch { /* ignore */ }
}

/**
 * Splits the secret-eligible pool (top SECRET_POOL_SIZE by value) into
 * thirds by value. Falls back to the full secret pool if there are too few
 * players to split sanely.
 */
export function buildWhoAmISecretPool(
  difficulty: WhoAmIDifficulty,
  pool: WhoAmIPlayer[],
): WhoAmIPlayer[] {
  const top = pool.slice(0, Math.min(SECRET_POOL_SIZE, pool.length));
  if (difficulty === 'normal' || top.length < 9) return top;
  const sorted = [...top].sort((a, b) => b.value - a.value);
  const third = Math.ceil(sorted.length / 3);
  return difficulty === 'easy' ? sorted.slice(0, third) : sorted.slice(sorted.length - third);
}

/** Years whose rows count as "current". A player with no row in any of these is treated as retired. */
const CURRENT_YEARS = [2026, 2025] as const;
const CURRENT_ROWS_MAX = 12000; // per-year safety valve for the paged boot fetch (~5.4k/8.4k real rows)
const HISTORY_CHUNK = 80; // names per .in() filter, keeps request URLs comfortably small
const HISTORY_PAGE = 1000; // PostgREST row cap per request
const HISTORY_MAX_PAGES = 6; // safety valve: 80 names x 23 seasons is well under 6000 rows

export type PositionGroup = 'GK' | 'DEF' | 'MID' | 'FWD';

// Combining diacritical marks block (U+0300 to U+036F), built from char codes
// so the range contains no escape sequences that could be mangled on re-encode.
const DIACRITICS = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

/** Lowercase, trimmed, accents stripped. Used for names, clubs and matching. */
export function normalizeName(s: string): string {
  return foldSpecialLatin((s || '').normalize('NFD').replace(DIACRITICS, '').toLowerCase().trim());
}

/** First nationality when the row stores duals like "France / Algeria". */
export function primaryNationality(nationality: string): string {
  return normalizeName((nationality || '').split(/[/,]/)[0]);
}

const NON_CLUB = /without club|retired|unknown|career break|^-+$/;

/** Normalized club key; empty string for placeholder values so they never count as a match. */
export function clubKey(club: string): string {
  const key = normalizeName(club);
  if (!key || NON_CLUB.test(key)) return '';
  return key;
}

export function positionGroup(position: string): PositionGroup {
  const p = (position || '').toLowerCase();
  if (p.includes('keeper')) return 'GK';
  // "midfield" must be checked before defence words so Defensive Midfield lands in MID
  if (p.includes('midfield')) return 'MID';
  if (p.includes('back') || p.includes('defen')) return 'DEF';
  if (p.includes('wing') || p.includes('striker') || p.includes('forward') || p.includes('attack')) return 'FWD';
  return 'MID';
}

const SHORT_POS: Record<string, string> = {
  goalkeeper: 'GK',
  'centre-back': 'CB',
  'right-back': 'RB',
  'left-back': 'LB',
  'defensive midfield': 'DM',
  'central midfield': 'CM',
  'attacking midfield': 'AM',
  'right midfield': 'RM',
  'left midfield': 'LM',
  'right winger': 'RW',
  'left winger': 'LW',
  'centre-forward': 'ST',
  'second striker': 'SS',
};

export function shortPosition(position: string): string {
  return SHORT_POS[(position || '').trim().toLowerCase()] ?? positionGroup(position);
}

/**
 * Scores a guess against the secret player using the weights documented above.
 * Club history sets come from WhoAmIData.clubHistory.
 */
export function scoreGuess(
  guess: WhoAmIPlayer,
  secret: WhoAmIPlayer,
  clubHistory: Map<string, Set<string>>,
): GuessBreakdown {
  const isExact = guess.name === secret.name;

  const gNat = primaryNationality(guess.nationality);
  const natMatch = gNat !== '' && gNat === primaryNationality(secret.nationality);

  const posGroupMatch = positionGroup(guess.position) === positionGroup(secret.position);
  const posExactMatch =
    posGroupMatch && guess.position !== '' && normalizeName(guess.position) === normalizeName(secret.position);

  const gClub = clubKey(guess.club);
  const sameClub = gClub !== '' && gClub === clubKey(secret.club);
  let sharedClubPast = false;
  if (!sameClub) {
    const gHist = clubHistory.get(guess.name);
    const sHist = clubHistory.get(secret.name);
    if (gHist && sHist) {
      for (const c of gHist) {
        if (sHist.has(c)) {
          sharedClubPast = true;
          break;
        }
      }
    }
  }

  const ageDiff = secret.age - guess.age;
  const agePts = WEIGHTS.age * Math.max(0, 1 - Math.abs(ageDiff) / AGE_RANGE);

  const valueLogDiff = Math.log10(Math.max(1, secret.value) / Math.max(1, guess.value));
  const valuePts = WEIGHTS.value * Math.max(0, 1 - Math.abs(valueLogDiff) / VALUE_LOG_RANGE);

  let total = agePts + valuePts;
  if (natMatch) total += WEIGHTS.nationality;
  if (posGroupMatch) total += WEIGHTS.positionGroup;
  if (posExactMatch) total += WEIGHTS.positionExact;
  if (sameClub) total += WEIGHTS.sameClub;
  else if (sharedClubPast) total += WEIGHTS.sharedClub;

  const score = isExact ? 100 : Math.min(99, Math.round(total));

  return { isExact, natMatch, posGroupMatch, posExactMatch, sameClub, sharedClubPast, ageDiff, valueLogDiff, score };
}

/** Random secret from the recognizable top of the pool, avoiding an immediate repeat. */
export function pickSecret(pool: WhoAmIPlayer[], excludeName?: string): WhoAmIPlayer {
  const top = pool.slice(0, Math.min(SECRET_POOL_SIZE, pool.length));
  const candidates = excludeName ? top.filter(p => p.name !== excludeName) : top;
  const list = candidates.length > 0 ? candidates : top;
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Full current-row map built by fetchWhoAmIPool: normalized player name ->
 * that player's latest 2025/2026 row. Module-level so the synchronous guess
 * converter below can resolve ANY guessed player to current attributes
 * without an extra round-trip per guess. Null until the boot fetch succeeds
 * (the game can't start before that, so guesses never race it).
 */
let currentRowsCache: Map<string, WhoAmIPlayer> | null = null;

/**
 * Converts a PlayerAutocomplete search result (PlayerEntity, from the wide
 * SOCCER_MARKET_VALUE_SOURCE pool of 27k+ players) into the WhoAmIPlayer
 * shape scoreGuess() expects.
 *
 * The entity's own meta is deliberately NOT trusted for club/age/value:
 * playerSearch dedupes by highest value, so meta carries the PEAK-year row
 * (Ozil at Arsenal, a 20-something Messi, see CURRENT-ROW ATTRIBUTES in the
 * file header). Instead the guess is resolved against the current-row map:
 *   - current row found  -> use it verbatim (canonical DB name spelling too,
 *     which keeps scoreGuess's exact-name check aligned with pool secrets).
 *   - no 2025+ row       -> the player is retired: keep the permanent facts
 *     (nationality, position) so those chips stay meaningful, but show club
 *     "Retired" and no age/value rather than stale peak-year numbers. The
 *     zeros score 0 age/value points and "Retired" never club-matches
 *     (clubKey() maps it to ''), so a retired punt reads as far-off, which
 *     it is.
 * The legacy meta mapping only remains as a fallback for the impossible-in-
 * practice case that the cache is missing (it is set before any game starts).
 */
export function whoAmIPlayerFromEntity(entity: PlayerEntity): WhoAmIPlayer {
  const meta = entity.meta;
  const nationality = typeof meta.nationality === 'string' ? meta.nationality : '';
  const position = typeof meta.position === 'string' ? meta.position : '';

  const current = currentRowsCache?.get(normalizeName(entity.name));
  if (current) return current;

  if (currentRowsCache) {
    // No 2025+ row: retired (or out of covered football). Never display the
    // stale peak-year club/age/value that entity.meta carries.
    return {
      name: entity.name,
      nationality,
      position,
      club: 'Retired',
      value: 0,
      age: 0,
      year: 0,
    };
  }

  // Cache unavailable (should not happen in the normal boot flow): legacy
  // meta-based mapping so the function still returns something sane.
  return {
    name: entity.name,
    nationality,
    position,
    club: typeof meta.club === 'string' ? meta.club : '',
    value: Number(meta.value) || 0,
    age: Number(meta.age) || 0,
    year: Number(meta.year) || 0,
  };
}

/**
 * Accent-insensitive suggestions for the guess box. Requires 2+ letters.
 * Full-name prefix matches rank first, then word prefixes, then substrings;
 * the pool is value-sorted so famous names float up within each tier.
 */
export function suggestPlayers(
  pool: WhoAmIPlayer[],
  query: string,
  exclude?: Set<string>,
  limit = 8,
): WhoAmIPlayer[] {
  const q = normalizeName(query);
  if (q.length < 2) return [];
  const starts: WhoAmIPlayer[] = [];
  const wordStarts: WhoAmIPlayer[] = [];
  const contains: WhoAmIPlayer[] = [];
  for (const p of pool) {
    if (exclude && exclude.has(p.name)) continue;
    const n = normalizeName(p.name);
    if (!n.includes(q)) continue;
    if (n.startsWith(q)) starts.push(p);
    else if (n.split(' ').some(w => w.startsWith(q))) wordStarts.push(p);
    else contains.push(p);
    if (starts.length >= limit) break;
  }
  return [...starts, ...wordStarts, ...contains].slice(0, limit);
}

interface PoolRow {
  player_name: string | null;
  nationality: string | null;
  position: string | null;
  club: string | null;
  market_value_usd: number | null;
  age: number | null;
  year: number | null;
}

/**
 * Career club sets for every pool player, from ALL years in the table.
 * Names are chunked into .in() filters and each chunk is paged in blocks of
 * 1000 rows (ordered by id) to respect the PostgREST row cap.
 */
async function fetchClubHistory(names: string[]): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  const chunks: string[][] = [];
  for (let i = 0; i < names.length; i += HISTORY_CHUNK) {
    chunks.push(names.slice(i, i + HISTORY_CHUNK));
  }
  await Promise.all(
    chunks.map(async chunk => {
      let from = 0;
      for (let page = 0; page < HISTORY_MAX_PAGES; page++) {
        const { data, error } = await supabase
          .from('player_market_values')
          .select('player_name, club')
          .in('player_name', chunk)
          .order('id', { ascending: true })
          .range(from, from + HISTORY_PAGE - 1);
        if (error) throw error;
        for (const r of data ?? []) {
          const name = (r.player_name ?? '').trim();
          const key = clubKey(r.club ?? '');
          if (!name || !key) continue;
          let set = map.get(name);
          if (!set) {
            set = new Set<string>();
            map.set(name, set);
          }
          set.add(key);
        }
        if (!data || data.length < HISTORY_PAGE) break;
        from += HISTORY_PAGE;
      }
    }),
  );
  return map;
}

/**
 * Boot fetch: ALL current rows (year >= 2025, paged via fetchAllRows since
 * both years together are ~13.8k rows, far past PostgREST's 1000-row cap),
 * deduped by player keeping the LATEST year (2026 preferred, else 2025;
 * value breaks same-year ties), THEN trimmed to the top POOL_SIZE by that
 * current value. This ordering matters: dedupe-then-rank guarantees a faded
 * legend's peak-year row can never sneak into the pool, and anyone with no
 * current row at all (retired) never enters it. The full deduped map is also
 * cached module-level for whoAmIPlayerFromEntity. Career club-history sets
 * are fetched for pool members as before. Returns null on any failure so the
 * page can show an error state with retry.
 */
export async function fetchWhoAmIPool(): Promise<WhoAmIData | null> {
  try {
    const results = await Promise.all(
      CURRENT_YEARS.map(year =>
        fetchAllRows<PoolRow>(
          (from, to) =>
            supabase
              .from('player_market_values')
              .select('player_name, nationality, position, club, market_value_usd, age, year')
              .eq('year', year)
              .gt('market_value_usd', 0)
              .not('age', 'is', null)
              .order('id', { ascending: true })
              .range(from, to),
          CURRENT_ROWS_MAX,
        ),
      ),
    );
    // A partial current-row map would misclassify active players as retired,
    // so any failed page fails the whole boot (the page offers retry).
    if (results.some(r => r.error)) return null;

    const byKey = new Map<string, WhoAmIPlayer>();
    for (const result of results) {
      for (const r of result.data) {
        const name = (r.player_name ?? '').trim();
        const value = Number(r.market_value_usd) || 0;
        const age = Number(r.age) || 0;
        const year = Number(r.year) || 0;
        if (!name || value <= 0 || age <= 0) continue;
        const candidate: WhoAmIPlayer = {
          name,
          nationality: (r.nationality ?? '').trim(),
          position: (r.position ?? '').trim(),
          club: (r.club ?? '').trim(),
          value,
          age,
          year,
        };
        const key = normalizeName(name);
        const prev = byKey.get(key);
        if (!prev || year > prev.year || (year === prev.year && value > prev.value)) {
          byKey.set(key, candidate);
        }
      }
    }

    const pool = [...byKey.values()]
      // name breaks value ties so every client ranks the pool identically
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
      .slice(0, POOL_SIZE);
    if (pool.length < 50) return null;

    currentRowsCache = byKey;

    const clubHistory = await fetchClubHistory(pool.map(p => p.name));
    // Every player at least carries their current club, even if a history page failed short.
    for (const p of pool) {
      const key = clubKey(p.club);
      if (!key) continue;
      let set = clubHistory.get(p.name);
      if (!set) {
        set = new Set<string>();
        clubHistory.set(p.name, set);
      }
      set.add(key);
    }

    return { pool, clubHistory };
  } catch {
    return null;
  }
}
