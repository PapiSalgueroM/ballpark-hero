// Career Ladder: guess the mystery footballer from their career, one stint at a time.
// Data lives in Supabase: career_players (identity) + career_seasons (the ladder rows).
import { supabase } from '@/integrations/supabase/client';
import { dateSeed, getTodayET } from '@/lib/dateUtils';

export interface CareerStint {
  season: string;
  club: string;
  goals: number | null;
  assists: number | null;
  appearances: number | null;
  marketValue: number | null;
  sortOrder: number;
}

export interface CareerPlayer {
  id: string;
  name: string;
  nationality: string;
  position: string;
  seasons: CareerStint[];
}

export const MAX_GUESSES = 6;
export const MIN_STINTS = 4;
export const BASE_SCORE = 1000;
export const REVEAL_PENALTY = 150;
export const WRONG_GUESS_PENALTY = 100;
export const SCORE_FLOOR = 100;

/**
 * Daily-mode action log, persisted to localStorage via useDailyPuzzle.
 * Mirrors the CareerAction pattern in useCareerGame.ts (the sibling
 * "Career Path" game): a flat list of actions replayed to derive state,
 * rather than persisting revealed/wrongGuesses/score directly. There is no
 * explicit 'lost' action. CareerLadder.tsx derives the loss phase by
 * counting 'wrong' actions against MAX_GUESSES, the same way useCareerGame.ts
 * derives its own loss condition from a wrong-action count.
 */
export type LadderAction =
  | { t: 'reveal' }
  | { t: 'wrong'; name: string }
  | { t: 'won'; score: number };

/**
 * Deterministically picks today's Career Ladder player: same result for
 * every user on the same ET date, using the site's canonical date-seed
 * utility (src/lib/dateUtils.ts). Eligibility mirrors startRound() in
 * CareerLadder.tsx (>= MIN_STINTS seasons) so the daily pool never differs
 * from what unlimited mode considers playable.
 */
export function pickDailyPlayer(pool: CareerPlayer[], dateStr: string = getTodayET()): CareerPlayer | null {
  const eligible = pool.filter(p => p.seasons.length >= MIN_STINTS);
  if (eligible.length === 0) return null;
  // Sort by id for a stable, reproducible ordering before indexing. Pool
  // arrival order from Supabase is not guaranteed to be stable run to run.
  const sorted = [...eligible].sort((a, b) => a.id.localeCompare(b.id));
  const index = dateSeed(dateStr) % sorted.length;
  return sorted[index];
}

/** Lowercase + strip accents so "Raphaël" matches "raphael". */
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * 1000 base, minus 150 per stint visible beyond the first, minus 100 per
 * wrong guess, never below 100.
 */
export function careerScore(stintsShown: number, wrongGuesses: number): number {
  const raw =
    BASE_SCORE -
    REVEAL_PENALTY * Math.max(0, stintsShown - 1) -
    WRONG_GUESS_PENALTY * Math.max(0, wrongGuesses);
  return Math.max(SCORE_FLOOR, raw);
}

// The nationality column occasionally holds a birth city alongside (or instead
// of) the country, so we only map to a flag when the string contains a known
// country name as a whole word. Most specific entries sit first so compound
// names like "Equatorial Guinea" never fall through to "Guinea".
const COUNTRY_FLAGS: Array<[string, string]> = [
  ['equatorial guinea', '🇬🇶'],
  ['guinea-bissau', '🇬🇼'],
  ['northern ireland', '🇬🇧'],
  ['republic of ireland', '🇮🇪'],
  ['ivory coast', '🇨🇮'],
  ["cote d'ivoire", '🇨🇮'],
  ['south korea', '🇰🇷'],
  ['korea republic', '🇰🇷'],
  ['united states', '🇺🇸'],
  ['usa', '🇺🇸'],
  ['north macedonia', '🇲🇰'],
  ['czech', '🇨🇿'],
  ['bosnia', '🇧🇦'],
  ['england', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['scotland', '🏴󠁧󠁢󠁳󠁣󠁴󠁿'],
  ['wales', '🏴󠁧󠁢󠁷󠁬󠁳󠁿'],
  ['ireland', '🇮🇪'],
  ['argentina', '🇦🇷'],
  ['brazil', '🇧🇷'],
  ['france', '🇫🇷'],
  ['spain', '🇪🇸'],
  ['germany', '🇩🇪'],
  ['portugal', '🇵🇹'],
  ['italy', '🇮🇹'],
  ['belgium', '🇧🇪'],
  ['netherlands', '🇳🇱'],
  ['croatia', '🇭🇷'],
  ['uruguay', '🇺🇾'],
  ['morocco', '🇲🇦'],
  ['sweden', '🇸🇪'],
  ['cameroon', '🇨🇲'],
  ['canada', '🇨🇦'],
  ['chile', '🇨🇱'],
  ['colombia', '🇨🇴'],
  ['denmark', '🇩🇰'],
  ['norway', '🇳🇴'],
  ['senegal', '🇸🇳'],
  ['algeria', '🇩🇿'],
  ['austria', '🇦🇹'],
  ['costa rica', '🇨🇷'],
  ['ecuador', '🇪🇨'],
  ['egypt', '🇪🇬'],
  ['gabon', '🇬🇦'],
  ['georgia', '🇬🇪'],
  ['nigeria', '🇳🇬'],
  ['poland', '🇵🇱'],
  ['serbia', '🇷🇸'],
  ['slovenia', '🇸🇮'],
  ['slovakia', '🇸🇰'],
  ['turkey', '🇹🇷'],
  ['switzerland', '🇨🇭'],
  ['ukraine', '🇺🇦'],
  ['russia', '🇷🇺'],
  ['greece', '🇬🇷'],
  ['hungary', '🇭🇺'],
  ['romania', '🇷🇴'],
  ['finland', '🇫🇮'],
  ['iceland', '🇮🇸'],
  ['ghana', '🇬🇭'],
  ['mali', '🇲🇱'],
  ['guinea', '🇬🇳'],
  ['tunisia', '🇹🇳'],
  ['mexico', '🇲🇽'],
  ['peru', '🇵🇪'],
  ['paraguay', '🇵🇾'],
  ['venezuela', '🇻🇪'],
  ['jamaica', '🇯🇲'],
  ['japan', '🇯🇵'],
  ['australia', '🇦🇺'],
  ['albania', '🇦🇱'],
  ['montenegro', '🇲🇪'],
];

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Flag emoji for a nationality string, or a globe when we cannot map it. */
export function flagForNationality(nationality: string | null | undefined): string {
  if (!nationality) return '🌍';
  const norm = normalizeName(nationality);
  for (const [country, flag] of COUNTRY_FLAGS) {
    if (new RegExp(`\\b${escapeRegExp(country)}\\b`).test(norm)) return flag;
  }
  return '🌍';
}

/** market_value is stored as whole millions of euros. */
export function fmtMarketValue(value: number | null): string {
  if (value == null || value <= 0) return '';
  return `€${value}M`;
}

const SEASON_COLS = 'player_id, season, club, goals, assists, appearances, market_value, sort_order';
const PAGE_SIZE = 1000;

/**
 * Loads the whole pool: one query for players, plus paged queries for the
 * ~1726 season rows (PostgREST caps a single response at 1000 rows, so a lone
 * query would silently drop stints). Seasons are grouped per player on the
 * client and sorted by sort_order, which is chronological (0 = earliest).
 * Returns null when anything fails so the page can show an error state.
 */
export async function fetchCareerPool(): Promise<CareerPlayer[] | null> {
  try {
    const { data: playerRows, error: playersError } = await supabase
      .from('career_players' as any)
      .select('id, player_name, nationality, position');
    if (playersError) throw playersError;

    const seasonRows: any[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('career_seasons' as any)
        .select(SEASON_COLS)
        .order('player_id', { ascending: true })
        .order('sort_order', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      const chunk = (data ?? []) as any[];
      seasonRows.push(...chunk);
      if (chunk.length < PAGE_SIZE) break;
    }

    const stintsByPlayer = new Map<string, CareerStint[]>();
    for (const row of seasonRows) {
      const stint: CareerStint = {
        season: String(row.season ?? ''),
        club: String(row.club ?? ''),
        goals: row.goals ?? null,
        assists: row.assists ?? null,
        appearances: row.appearances ?? null,
        marketValue: row.market_value ?? null,
        sortOrder: Number(row.sort_order ?? 0),
      };
      const key = String(row.player_id);
      const list = stintsByPlayer.get(key);
      if (list) list.push(stint);
      else stintsByPlayer.set(key, [stint]);
    }

    const players: CareerPlayer[] = ((playerRows ?? []) as any[])
      .map(p => ({
        id: String(p.id),
        name: String(p.player_name ?? ''),
        nationality: String(p.nationality ?? ''),
        position: String(p.position ?? ''),
        seasons: (stintsByPlayer.get(String(p.id)) ?? []).sort(
          (a, b) => a.sortOrder - b.sortOrder,
        ),
      }))
      .filter(p => p.name.length > 0);

    return players;
  } catch {
    return null;
  }
}
