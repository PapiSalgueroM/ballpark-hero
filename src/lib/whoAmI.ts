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
 * Fix: the pool is built from CURRENT rows only, each player kept on his
 * latest one (2026 preferred, else 2025; value breaks ties), and only THEN
 * ranked, so a faded legend's peak-year row can never sneak in.
 * whoAmIPlayerFromEntity resolves every guess to that player's own current
 * row (Messi -> Inter Miami CF, age 39, $12.8M). A guessed player with NO
 * 2025+ row is retired: they are impossible as secrets (not in the pool) and
 * are never displayed with stale peak-year attributes, the guess is still
 * accepted, but it renders as club "Retired" with no age/value, and scores
 * accordingly low. Attribute comparisons therefore always run on current
 * rows only. Round 443 moved the resolution off the boot and onto the guess
 * itself, see the BOOT WEIGHT note above fetchWhoAmIPool.
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

// Round 463, his 2026-08-28 note: "more puzzles". The pool grows 500 -> 600
// and the secret pool 300 -> 400, so a hundred more current players can be
// the answer (and can be drawn by Clue Auction, which uses the same
// pickSecret). Measured against the live 2026 rows on 2026-09-05 before the
// change: the 300th seat by current value was $32M, the 400th $27M, the 500th
// $24M and the 600th $22M, so every new secret is a first team player at a
// top flight club, and the new seats still sit under the $45M floor of Clue
// Auction's lowest value band, which absorbs them the way it absorbed the
// 2026-08-05 growth. The boot cost of the wider pool is held by
// scripts/simNoZeroFacts.mjs section 4 (14 requests, 800 KiB) and its rank
// order by the exhaustive sweep in the same section.
export const POOL_SIZE = 600; // notable current-ish players kept in the guessable pool
// Owner task 60 (2026-08-05): "lots more puzzles". The secret pool grew
// 200 -> 300 then, which added a hundred fresh, less-obvious secrets to Who
// Am I AND Clue Auction (it draws from the same pickSecret pool). Value bands
// in clueAuction were checked against the wider spread: the sub-$45M band
// just absorbs the new tail.
export const SECRET_POOL_SIZE = 400; // the secret is always drawn from the top of the pool

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
const CURRENT_YEARS_LIST: number[] = [...CURRENT_YEARS];
/* PostgREST answers at most 1,000 rows per request, and the pool is the top
   POOL_SIZE by current value, so one request is all the newest season takes.
   Round 443 measured what the old boot cost to find that out: it paged every
   current row on the planet, 11,910 of them, 2,054 KiB over 20 requests and
   1,947 ms, to keep 500. See the BOOT WEIGHT note above fetchWhoAmIPool. */
const POOL_FETCH_ROWS = 1000;
/* The carry-over leg is already narrowed by the value cut, so its ceiling is a
   safety valve rather than a budget: measured 561 rows on 2026-09-04, and this
   leg costs exactly one request for anything up to 1,000 whatever the ceiling
   says, because fetchAllRows stops on the first short page. It is set well
   above the measurement on purpose. Truncating this leg would NOT show up as a
   slow load, it would silently drop a player whose last listed season is the
   previous one out of the pool, so the cheap number is the wrong one here. */
const CARRIED_FETCH_MAX = 5000;
const POOL_COLUMNS = 'player_name, nationality, position, club, market_value_usd, age, year';
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
 * One guessed player's current row, remembered for the session so a repeat
 * guess costs nothing. Keyed by the exact stored spelling, see below.
 */
const resolvedCurrentRows = new Map<string, WhoAmIPlayer | null>();

/**
 * Converts a PlayerAutocomplete search result (PlayerEntity, from the wide
 * SOCCER_MARKET_VALUE_SOURCE pool of 27k+ players) into the WhoAmIPlayer
 * shape scoreGuess() expects.
 *
 * The entity's own meta is deliberately NOT trusted for club/age/value:
 * playerSearch dedupes by highest value, so meta carries the PEAK-year row
 * (Ozil at Arsenal, a 20-something Messi, see CURRENT-ROW ATTRIBUTES in the
 * file header). The guess is resolved against the table instead:
 *   - current row found  -> use it verbatim (canonical DB name spelling too,
 *     which keeps scoreGuess's exact-name check aligned with pool secrets).
 *   - no 2025+ row       -> the player is retired: keep the permanent facts
 *     (nationality, position) so those chips stay meaningful, but show club
 *     "Retired" and no age/value rather than stale peak-year numbers. The
 *     zeros score 0 age/value points and "Retired" never club-matches
 *     (clubKey() maps it to ''), so a retired punt reads as far-off, which
 *     it is. WhoAmI.tsx renders those two as "No current age" and "No listed
 *     value", never as the numbers.
 *   - the lookup fails   -> null, and the page refuses the guess rather than
 *     scoring it. Reporting an active player as unlisted because the network
 *     hiccuped is exactly the lie this function exists to avoid.
 *
 * ROUND 443, two things this used to get wrong, both measured against live
 * rows on 2026-09-04:
 *   1. It read a map the boot had downloaded, and that map was built by
 *      skipping any row whose age column was empty. Carlos Bello (Monagas SC,
 *      2025, $1M, no age on file) therefore came back as club "Retired" with
 *      no age and no value: an active player reported as having no current
 *      listing at all, and scored as if he were worth a dollar. One empty
 *      column now costs that column and nothing else. This is the shape of
 *      the owner's report, which was Rodri while he had no 2025 or 2026 row.
 *   2. It keyed on the accent-folded name, so "Ederson" (Fenerbahce, 32) and
 *      "Éderson" (Atalanta, 26) were one entry and whoever was worth more won.
 *      Two different footballers. The lookup is on the exact stored spelling
 *      the search handed over, so each man resolves to his own row.
 */
export async function whoAmIPlayerFromEntity(entity: PlayerEntity): Promise<WhoAmIPlayer | null> {
  const meta = entity.meta;
  const nationality = typeof meta.nationality === 'string' ? meta.nationality : '';
  const position = typeof meta.position === 'string' ? meta.position : '';
  const spelling = (entity.rawName || entity.name || '').trim();
  if (!spelling) return null;

  if (!resolvedCurrentRows.has(spelling)) {
    const { data, error } = await supabase
      .from('player_market_values')
      .select(POOL_COLUMNS)
      .eq('player_name', spelling)
      .in('year', CURRENT_YEARS_LIST)
      .order('year', { ascending: false })
      .order('market_value_usd', { ascending: false })
      .limit(1);
    if (error) return null;
    const row = (data ?? [])[0] as PoolRow | undefined;
    resolvedCurrentRows.set(spelling, row ? currentRowFrom(row) : null);
  }

  const current = resolvedCurrentRows.get(spelling) ?? null;
  if (current) return current;

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

export interface PoolRow {
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

/* currentRowFrom, keepLatest and byCurrentValue are the pool's ranking rule
   and are exported so scripts/simNoZeroFacts.mjs can run the SAME rule over an
   exhaustive sweep of every current row and compare the result against the
   pool the narrowed boot below actually returns. The harness supplies the
   rows, the rule stays here, so nothing about the ranking is restated in a
   test that would then only be testing itself. */

/** Row -> player, with no filtering. Empty columns stay empty, never zero-as-a-fact. */
export function currentRowFrom(r: PoolRow): WhoAmIPlayer {
  return {
    name: (r.player_name ?? '').trim(),
    nationality: (r.nationality ?? '').trim(),
    position: (r.position ?? '').trim(),
    club: (r.club ?? '').trim(),
    value: Number(r.market_value_usd) || 0,
    age: Number(r.age) || 0,
    year: Number(r.year) || 0,
  };
}

/** Latest year wins, value breaks a same-year tie. The pool's ranking rule. */
export function keepLatest(into: Map<string, WhoAmIPlayer>, p: WhoAmIPlayer): void {
  if (!p.name) return;
  const key = normalizeName(p.name);
  const prev = into.get(key);
  if (!prev || p.year > prev.year || (p.year === prev.year && p.value > prev.value)) into.set(key, p);
}

/** Value first, name breaks ties so every client ranks the pool identically. */
export const byCurrentValue = (a: WhoAmIPlayer, b: WhoAmIPlayer) => b.value - a.value || a.name.localeCompare(b.name);

/**
 * Which of these names are listed in `year` at all. Names only, so the answer
 * is a few KiB whatever the list holds. Null means the question could not be
 * asked, which fails the boot rather than guessing at it.
 */
async function namesListedIn(year: number, names: string[]): Promise<Set<string> | null> {
  const listed = new Set<string>();
  for (let i = 0; i < names.length; i += HISTORY_CHUNK) {
    const { data, error } = await supabase
      .from('player_market_values')
      .select('player_name')
      .eq('year', year)
      .in('player_name', names.slice(i, i + HISTORY_CHUNK))
      .limit(POOL_FETCH_ROWS);
    if (error) return null;
    for (const r of data ?? []) listed.add(normalizeName((r.player_name ?? '').trim()));
  }
  return listed;
}

/**
 * Boot fetch. The pool is the top POOL_SIZE players by CURRENT market value,
 * so it is built from the top of the value order rather than from every row
 * in the current seasons.
 *
 * BOOT WEIGHT (Round 443, the owner: "The who am i game took a bit long to
 * load and these things should be quick because in a couple seconds the user
 * may want to leave"). The old boot paged EVERY 2025 and 2026 row, 11,910 of
 * them, and kept 500. It did that because one fetch was doing two jobs:
 * building the pool AND building a name -> current row map so a guess could
 * be resolved without a round trip. The second job now belongs to
 * whoAmIPlayerFromEntity, which asks for the one row it needs when a guess is
 * actually made, so the boot only has to find the pool. Measured on
 * 2026-09-04, median of three real boots against the live database:
 *   before  20 requests, 2,054 KiB, 1,947 ms
 *   after   10 requests,   446 KiB,   978 ms
 * scripts/simNoZeroFacts.mjs section 4 holds the budget, and section 3 proves
 * the on-demand lookup answers with the same row the old map held.
 *
 * How the pool is found in three requests, and why it is exactly the same
 * pool the old sweep produced (the harness compares them):
 *   1. The newest season's top POOL_FETCH_ROWS rows by value. Every one of
 *      them is current by definition, so nothing here can be stale.
 *   2. The POOL_SIZE-th of those sets the cut. Anyone whose last listed
 *      season is the previous one can still make the pool, but only above
 *      that cut, so only rows at or above it are asked for.
 *   3. A previous-season row is only current if the player has NO row in the
 *      newest season, so those few names are checked. A player who does have
 *      one that did not make step 1's cut is worth less than the cut by
 *      definition and cannot be in the pool, which is why his row is never
 *      fetched. This is the step that keeps the Round 315 bug buried: a faded
 *      legend's peak-year row can never enter the pool, and nobody is ranked
 *      on a season he has already left.
 *
 * A row whose age column is empty is kept OUT of the pool (an age clue and
 * the difficulty tiers both need a real number) but is NOT thrown away: the
 * guess resolver reads the table directly, so that player still answers with
 * his real club and value. Returns null on any failure so the page can show
 * an error state with retry.
 */
export async function fetchWhoAmIPool(): Promise<WhoAmIData | null> {
  try {
    const latest = await fetchAllRows<PoolRow>(
      (from, to) =>
        supabase
          .from('player_market_values')
          .select(POOL_COLUMNS)
          .eq('year', CURRENT_YEARS[0])
          .gt('market_value_usd', 0)
          .gt('age', 0)
          .order('market_value_usd', { ascending: false })
          .order('player_name', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      POOL_FETCH_ROWS,
    );
    if (latest.error) return null;

    const byKey = new Map<string, WhoAmIPlayer>();
    for (const r of latest.data) keepLatest(byKey, currentRowFrom(r));

    const ranked = [...byKey.values()].sort(byCurrentValue);
    const cut = ranked.length >= POOL_SIZE ? ranked[POOL_SIZE - 1].value : 0;

    const carried = await fetchAllRows<PoolRow>(
      (from, to) =>
        supabase
          .from('player_market_values')
          .select(POOL_COLUMNS)
          .eq('year', CURRENT_YEARS[1])
          .gte('market_value_usd', cut)
          .gt('age', 0)
          .order('market_value_usd', { ascending: false })
          .order('player_name', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      CARRIED_FETCH_MAX,
    );
    if (carried.error) return null;

    const candidates = new Map<string, WhoAmIPlayer>();
    for (const r of carried.data) {
      const p = currentRowFrom(r);
      if (!p.name || p.value <= 0 || byKey.has(normalizeName(p.name))) continue;
      keepLatest(candidates, p);
    }
    if (candidates.size > 0) {
      const stillListed = await namesListedIn(CURRENT_YEARS[0], [...candidates.values()].map(p => p.name));
      if (!stillListed) return null;
      for (const p of candidates.values()) {
        if (!stillListed.has(normalizeName(p.name))) byKey.set(normalizeName(p.name), p);
      }
    }

    const pool = [...byKey.values()].sort(byCurrentValue).slice(0, POOL_SIZE);
    if (pool.length < 50) return null;

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
