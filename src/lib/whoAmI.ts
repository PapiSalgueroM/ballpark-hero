import { supabase } from '@/integrations/supabase/client';

/**
 * Who Am I? (Goltexto / Contexto style secret-footballer game)
 *
 * Data source: player_market_values (player_name, nationality, position, club,
 * market_value_usd, age, year). Rows exist for 2004-2026; recent years are used
 * for the pool, all years feed each player's club-history set.
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

export const POOL_SIZE = 400; // notable current-ish players kept in the guessable pool
export const SECRET_POOL_SIZE = 200; // the secret is always drawn from the top of the pool

// #40: prominence tiers for the secret pick, unlimited/practice play only
// (this game has no separate daily mode; Casual/Expert guess budgets are
// untouched by this setting). Verified via read-only SQL against
// player_market_values on 2026-07-03: splitting the 200-player secret pool
// into thirds by peak market value gives 67/67/66. Easy draws the top third
// (most famous, value >= 65M), Hard draws the bottom third (value < 49M),
// Normal is the untouched 200-player secret pool.
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

const POOL_ROW_FETCH = 1000; // top rows by value from recent years, deduped down to POOL_SIZE
const POOL_MIN_YEAR = 2024;
const HISTORY_CHUNK = 80; // names per .in() filter, keeps request URLs comfortably small
const HISTORY_PAGE = 1000; // PostgREST row cap per request
const HISTORY_MAX_PAGES = 6; // safety valve: 80 names x 23 seasons is well under 6000 rows

export type PositionGroup = 'GK' | 'DEF' | 'MID' | 'FWD';

// Combining diacritical marks block (U+0300 to U+036F), built from char codes
// so the range contains no escape sequences that could be mangled on re-encode.
const DIACRITICS = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g');

/** Lowercase, trimmed, accents stripped. Used for names, clubs and matching. */
export function normalizeName(s: string): string {
  return (s || '').normalize('NFD').replace(DIACRITICS, '').toLowerCase().trim();
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
 * Boot fetch: top rows by market value from recent years, deduped by player
 * name keeping the most recent row (value breaks ties), trimmed to POOL_SIZE,
 * plus career club-history sets. Returns null on any failure so the page can
 * show an error state with retry.
 */
export async function fetchWhoAmIPool(): Promise<WhoAmIData | null> {
  try {
    const { data: rows, error } = await supabase
      .from('player_market_values')
      .select('player_name, nationality, position, club, market_value_usd, age, year')
      .gte('year', POOL_MIN_YEAR)
      .gt('market_value_usd', 0)
      .not('age', 'is', null)
      .order('market_value_usd', { ascending: false })
      .limit(POOL_ROW_FETCH);
    if (error || !rows) return null;

    const byName = new Map<string, WhoAmIPlayer>();
    for (const r of rows as PoolRow[]) {
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
      const prev = byName.get(name);
      if (!prev || year > prev.year || (year === prev.year && value > prev.value)) {
        byName.set(name, candidate);
      }
    }

    const pool = [...byName.values()].sort((a, b) => b.value - a.value).slice(0, POOL_SIZE);
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
