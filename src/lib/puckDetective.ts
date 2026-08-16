import { supabase } from '@/integrations/supabase/client';
import { dateSeed, getTodayET } from '@/lib/dateUtils';

/**
 * Data layer + evaluation logic for Puck Detective, a daily guess-the-player
 * game with attribute feedback, built on nhl_players.
 *
 * DATA NOTE (verified live against flawuiqbvjobmkfkauhw on 2026-07-03):
 * nhl_players has 1752 rows but only 876 distinct player_id values. Every
 * row is duplicated exactly once (same player_id, full_name, position, team,
 * jersey_number and birth_date on both copies), confirmed by grouping on all
 * of those columns together and finding every group has count 2. Selecting
 * `distinct on (player_id)` collapses this cleanly to 876 real players with
 * zero blank position / team / birth_date / birth_country across every row
 * (verified via execute_sql). This module always dedupes by player_id before
 * building its pool so the mystery player and the guess pool never contain
 * an accidental phantom duplicate.
 *
 * nhl_players is a current-roster snapshot (birth_date range 1985-03-09 to
 * 2007-09-05, i.e. active-era players only), which is why this game's
 * attributes are team / position / nationality / age / jersey number and NOT
 * career points: nhl_player_stats (the career-totals table) only exact-name
 * matches 1412 of nhl_players' 1752 raw rows, an unreliable join for a
 * pass/fail answer check. Every attribute here comes from nhl_players alone,
 * so there is no cross-table join and no join-miss risk.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NhlPosition = 'C' | 'L' | 'R' | 'D' | 'G';

export interface PuckDetectivePlayer {
  playerId: number;
  name: string;
  position: NhlPosition;
  team: string;
  jerseyNumber: number | null;
  age: number;
  country: string;
  /** Broad position group used for the "close" (yellow-ish) position feedback tier. */
  group: 'forward' | 'defense' | 'goalie';
  /** Career points from nhl_player_stats (name-matched), or null if unmatched (see #40 note). */
  careerPoints: number | null;
}

// #40: prominence tiers for unlimited/practice play only. Daily mode always
// draws from the full pool. Verified via read-only SQL against
// nhl_players/nhl_player_stats on 2026-07-03: nhl_player_stats only
// name-matches 706 of the 876 deduped nhl_players (the rest are mostly
// goalies, who have no career "points" stat by definition, plus a handful of
// recent debuts not yet in the career-totals table). Splitting the 706
// matched players into thirds by career points gives 236/235/235. Easy pulls
// the top third (points >= 250, high-profile scorers). Hard pulls the bottom
// third (points < 75) PLUS all 170 unmatched players (405 total) since a
// player with no career-points row is, by construction, not a "big name" for
// a points-based tier. Normal is the untouched full 876-player pool.
export type PuckDifficulty = 'easy' | 'normal' | 'hard';
const DIFFICULTY_STORAGE_KEY = 'puck-detective-difficulty';
const EASY_POINTS_FLOOR = 250;
const HARD_POINTS_CEILING = 75;

export function loadPuckDifficulty(): PuckDifficulty {
  try {
    const raw = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
    if (raw === 'easy' || raw === 'normal' || raw === 'hard') return raw;
  } catch { /* localStorage unavailable, fall back to default */ }
  return 'normal';
}

export function savePuckDifficulty(next: PuckDifficulty): void {
  try { localStorage.setItem(DIFFICULTY_STORAGE_KEY, next); } catch { /* ignore */ }
}

/**
 * Splits the pool by career points tier (see module note above). Falls back
 * to the full pool if there are too few players to split sanely, guarding
 * the brief window before the live pool has loaded.
 */
export function buildPuckPool(
  difficulty: PuckDifficulty,
  pool: PuckDetectivePlayer[],
): PuckDetectivePlayer[] {
  if (difficulty === 'normal' || pool.length < 30) return pool;
  if (difficulty === 'easy') {
    const easy = pool.filter((p) => (p.careerPoints ?? -Infinity) >= EASY_POINTS_FLOOR);
    return easy.length >= 10 ? easy : pool;
  }
  const hard = pool.filter((p) => p.careerPoints == null || p.careerPoints < HARD_POINTS_CEILING);
  return hard.length >= 10 ? hard : pool;
}

export type MatchTier = 'exact' | 'close' | 'none';
export type NumericDirection = 'higher' | 'lower' | 'match';

export interface AttributeFeedback {
  team: MatchTier;
  position: MatchTier;
  country: MatchTier;
  /** Arrow direction the GUESS needs to move to reach the mystery player. */
  ageDirection: NumericDirection;
  jerseyDirection: NumericDirection;
}

export interface PuckGuess {
  player: PuckDetectivePlayer;
  feedback: AttributeFeedback;
  isCorrect: boolean;
}

export const GUESS_LIMIT = 8;
export const MIN_POOL_SIZE = 200;

// ---------------------------------------------------------------------------
// Position grouping (forward / defense / goalie), used for the "close" tier
// ---------------------------------------------------------------------------

const POSITION_GROUP: Record<NhlPosition, PuckDetectivePlayer['group']> = {
  C: 'forward',
  L: 'forward',
  R: 'forward',
  D: 'defense',
  G: 'goalie',
};

const POSITION_LABEL: Record<NhlPosition, string> = {
  C: 'Center',
  L: 'Left Wing',
  R: 'Right Wing',
  D: 'Defense',
  G: 'Goalie',
};

export function positionLabel(pos: string): string {
  return POSITION_LABEL[pos as NhlPosition] ?? pos;
}

const COUNTRY_LABEL: Record<string, string> = {
  CAN: 'Canada', USA: 'United States', SWE: 'Sweden', RUS: 'Russia', FIN: 'Finland',
  CZE: 'Czechia', CHE: 'Switzerland', SVK: 'Slovakia', DEU: 'Germany', BLR: 'Belarus',
  LVA: 'Latvia', DNK: 'Denmark', AUT: 'Austria', NOR: 'Norway', FRA: 'France',
  UZB: 'Uzbekistan', AUS: 'Australia', POL: 'Poland', GBR: 'Great Britain', SVN: 'Slovenia',
  ITA: 'Italy',
};

const COUNTRY_FLAG: Record<string, string> = {
  CAN: '🇨🇦', USA: '🇺🇸', SWE: '🇸🇪', RUS: '🇷🇺', FIN: '🇫🇮',
  CZE: '🇨🇿', CHE: '🇨🇭', SVK: '🇸🇰', DEU: '🇩🇪', BLR: '🇧🇾',
  LVA: '🇱🇻', DNK: '🇩🇰', AUT: '🇦🇹', NOR: '🇳🇴', FRA: '🇫🇷',
  UZB: '🇺🇿', AUS: '🇦🇺', POL: '🇵🇱', GBR: '🇬🇧', SVN: '🇸🇮',
  ITA: '🇮🇹',
};

export function countryLabel(code: string): string {
  return COUNTRY_LABEL[code] ?? code;
}

export function countryFlag(code: string): string {
  return COUNTRY_FLAG[code] ?? '🌍';
}

const TEAM_NAME: Record<string, string> = {
  ANA: 'Anaheim Ducks', ARI: 'Arizona Coyotes', BOS: 'Boston Bruins', BUF: 'Buffalo Sabres',
  CGY: 'Calgary Flames', CAR: 'Carolina Hurricanes', CHI: 'Chicago Blackhawks', COL: 'Colorado Avalanche',
  CBJ: 'Columbus Blue Jackets', DAL: 'Dallas Stars', DET: 'Detroit Red Wings', EDM: 'Edmonton Oilers',
  FLA: 'Florida Panthers', LAK: 'Los Angeles Kings', MIN: 'Minnesota Wild', MTL: 'Montreal Canadiens',
  NSH: 'Nashville Predators', NJD: 'New Jersey Devils', NYI: 'New York Islanders', NYR: 'New York Rangers',
  OTT: 'Ottawa Senators', PHI: 'Philadelphia Flyers', PIT: 'Pittsburgh Penguins', SJS: 'San Jose Sharks',
  SEA: 'Seattle Kraken', STL: 'St. Louis Blues', TBL: 'Tampa Bay Lightning', TOR: 'Toronto Maple Leafs',
  UTA: 'Utah Hockey Club', VAN: 'Vancouver Canucks', VGK: 'Vegas Golden Knights', WSH: 'Washington Capitals',
  WPG: 'Winnipeg Jets',
};

export function teamLabel(abbr: string): string {
  return TEAM_NAME[abbr] ?? abbr;
}

// ---------------------------------------------------------------------------
// Age math
// ---------------------------------------------------------------------------

/** Age in whole years as of "today" (client clock), from a YYYY-MM-DD birth date. */
function computeAge(birthDate: string, asOf: Date): number {
  const [y, m, d] = birthDate.split('-').map(Number);
  let age = asOf.getFullYear() - y;
  const hasHadBirthdayThisYear =
    asOf.getMonth() + 1 > m || (asOf.getMonth() + 1 === m && asOf.getDate() >= d);
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

// ---------------------------------------------------------------------------
// Fetch + normalize pool
// ---------------------------------------------------------------------------

interface RawNhlPlayerRow {
  player_id: number;
  full_name: string | null;
  position: string | null;
  team: string | null;
  jersey_number: number | null;
  birth_date: string | null;
  birth_country: string | null;
}

interface RawStatsPointsRow {
  player_name: string | null;
  points: number | null;
}

/**
 * Fetches career points from nhl_player_stats, keyed by exact player_name,
 * for use as the #40 difficulty-tier signal. Pages with .range() (ordered by
 * player_name) since PostgREST caps every response at 1000 rows regardless
 * of .limit() (6353 total rows here). Returns an empty map on any failure so
 * a tiering lookup miss just falls back to "unmatched" (Hard tier) rather
 * than breaking pool fetch entirely.
 */
async function fetchCareerPointsByName(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const PAGE_SIZE = 1000;
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('nhl_player_stats' as any)
        .select('player_name, points')
        .order('player_name', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error || !data) break;
      for (const row of data as unknown as RawStatsPointsRow[]) {
        const name = String(row.player_name ?? '').trim();
        if (!name) continue;
        const pts = Number(row.points);
        if (Number.isFinite(pts)) map.set(name, pts);
      }
      if (data.length < PAGE_SIZE) break;
    }
  } catch { /* leave map as-is; tiering treats misses as unmatched */ }
  return map;
}

/**
 * Fetches nhl_players, dedupes by player_id (see module docstring), and
 * normalizes into the mystery/guess pool shape. Returns null on any failure
 * or if the deduped pool is implausibly small, so the page can show an error
 * state instead of a broken/tiny game.
 */
export async function fetchPuckDetectivePool(): Promise<PuckDetectivePlayer[] | null> {
  try {
    const [{ data, error }, pointsByName] = await Promise.all([
      supabase
        .from('nhl_players' as any)
        .select('player_id, full_name, position, team, jersey_number, birth_date, birth_country')
        .limit(4000),
      fetchCareerPointsByName(),
    ]);
    if (error || !data) return null;

    const asOf = new Date();
    const byId = new Map<number, PuckDetectivePlayer>();

    for (const raw of data as unknown as RawNhlPlayerRow[]) {
      const id = Number(raw.player_id);
      if (!Number.isFinite(id) || byId.has(id)) continue;

      const name = String(raw.full_name ?? '').trim();
      const pos = String(raw.position ?? '').trim().toUpperCase() as NhlPosition;
      const team = String(raw.team ?? '').trim().toUpperCase();
      const country = String(raw.birth_country ?? '').trim().toUpperCase();
      const birthDate = String(raw.birth_date ?? '').trim();

      if (!name || !team || !country || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) continue;
      if (!POSITION_GROUP[pos]) continue;

      byId.set(id, {
        playerId: id,
        name,
        position: pos,
        team,
        jerseyNumber: raw.jersey_number == null ? null : Number(raw.jersey_number),
        age: computeAge(birthDate, asOf),
        country,
        group: POSITION_GROUP[pos],
        careerPoints: pointsByName.has(name) ? pointsByName.get(name)! : null,
      });
    }

    const pool = [...byId.values()];
    return pool.length >= MIN_POOL_SIZE ? pool : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Mystery selection
// ---------------------------------------------------------------------------

/** Date-seeded daily pick, stable across all users on the same ET date. */
export function pickDailyMystery(pool: PuckDetectivePlayer[]): PuckDetectivePlayer {
  const sorted = [...pool].sort((a, b) => a.playerId - b.playerId);
  const seed = dateSeed(getTodayET());
  return sorted[seed % sorted.length];
}

/** Random pick for unlimited mode, optionally avoiding the immediately-previous mystery. */
export function pickRandomMystery(
  pool: PuckDetectivePlayer[],
  avoidId?: number,
): PuckDetectivePlayer {
  if (pool.length <= 1) return pool[0];
  let pick = pool[Math.floor(Math.random() * pool.length)];
  let guard = 0;
  while (pick.playerId === avoidId && guard < 20) {
    pick = pool[Math.floor(Math.random() * pool.length)];
    guard += 1;
  }
  return pick;
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

function directionFor(guessValue: number, mysteryValue: number): NumericDirection {
  if (guessValue === mysteryValue) return 'match';
  return guessValue < mysteryValue ? 'higher' : 'lower';
}

export function evaluateGuess(
  guess: PuckDetectivePlayer,
  mystery: PuckDetectivePlayer,
): AttributeFeedback {
  const teamTier: MatchTier = guess.team === mystery.team ? 'exact' : 'none';

  const positionTier: MatchTier =
    guess.position === mystery.position
      ? 'exact'
      : guess.group === mystery.group
      ? 'close'
      : 'none';

  const countryTier: MatchTier = guess.country === mystery.country ? 'exact' : 'none';

  const ageDirection = directionFor(guess.age, mystery.age);
  const jerseyDirection =
    guess.jerseyNumber == null || mystery.jerseyNumber == null
      ? 'match'
      : directionFor(guess.jerseyNumber, mystery.jerseyNumber);

  return {
    team: teamTier,
    position: positionTier,
    country: countryTier,
    ageDirection,
    jerseyDirection,
  };
}

export function isCorrectGuess(guess: PuckDetectivePlayer, mystery: PuckDetectivePlayer): boolean {
  return guess.playerId === mystery.playerId;
}

// ---------------------------------------------------------------------------
// Share grid
// ---------------------------------------------------------------------------

function tierEmoji(t: MatchTier): string {
  return t === 'exact' ? '🟩' : t === 'close' ? '🟨' : '🟥';
}

function directionEmoji(d: NumericDirection): string {
  return d === 'match' ? '🟩' : '🟨';
}

/** One row of 5 squares per guess: team, position, country, age, jersey. */
export function buildShareGrid(guesses: PuckGuess[]): string {
  return guesses
    .map((g) =>
      g.isCorrect
        ? '🟩🟩🟩🟩🟩'
        : [
            tierEmoji(g.feedback.team),
            tierEmoji(g.feedback.position),
            tierEmoji(g.feedback.country),
            directionEmoji(g.feedback.ageDirection),
            directionEmoji(g.feedback.jerseyDirection),
          ].join(''),
    )
    .join('\n');
}
