import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { dailyIndex, getTodayET } from '@/lib/dateUtils';

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
 * Daily uses this stored roster for all clues and picks. Career points are
 * used for Unlimited difficulty only and arrive with that mode's roster.
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
  /** NHL regular-season career points, or null when no skater record is available. */
  careerPoints: number | null;
}

// Easy uses high-scoring skaters. Hard uses lower-scoring skaters and players
// without skater points, including goalies. Normal uses the full Unlimited roster.
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

export function teamLabel(abbr: string, unlimited = false): string {
  if (unlimited && abbr === 'UTA') return 'Utah Mammoth';
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
  player_id: number | null;
  full_name: string | null;
  position: string | null;
  team: string | null;
  jersey_number: number | null;
  birth_date: string | null;
  birth_country: string | null;
}

/**
 * Fetches nhl_players, dedupes by player_id (see module docstring), and
 * normalizes into the mystery/guess pool shape. Returns null on any failure
 * or if the deduped pool is implausibly small, so the page can show an error
 * state instead of a broken/tiny game.
 */
export async function fetchPuckDetectivePool(): Promise<PuckDetectivePlayer[] | null> {
  try {
    // Fetch every page before picking a date's answer. Changing the number of
    // players changes the whole rotation, even when the first page looks full.
    const { data, error } = await fetchAllRows<RawNhlPlayerRow>((from, to) => supabase
      .from('nhl_players')
      .select('player_id, full_name, position, team, jersey_number, birth_date, birth_country')
      .order('player_id', { ascending: true })
      .range(from, to));
    if (error || !data) return null;

    const asOf = new Date();
    const byId = new Map<number, PuckDetectivePlayer>();

    for (const raw of data) {
      const id = raw.player_id;
      if (id == null || !Number.isFinite(id) || byId.has(id)) continue;

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
        careerPoints: null,
      });
    }

    const pool = [...byId.values()];
    return pool.length >= MIN_POOL_SIZE ? pool : null;
  } catch {
    return null;
  }
}

export const PUCK_UNLIMITED_ROSTER_DATE = 'Nov 13, 2026';

type PuckRosterRow = [number, string, NhlPosition, string, number, string, string, number | null];

export async function fetchUnlimitedPuckPool(): Promise<PuckDetectivePlayer[] | null> {
  try {
    const { default: rows } = await import('@/data/puckNhlRoster20261113.json');
    const asOf = new Date();
    return (rows as PuckRosterRow[]).map(([playerId, name, position, team, jerseyNumber, birthDate, country, careerPoints]) => ({
      playerId, name, position, team, jerseyNumber, country, careerPoints,
      age: computeAge(birthDate, asOf),
      group: POSITION_GROUP[position],
    }));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Mystery selection
// ---------------------------------------------------------------------------

/** Date-seeded daily pick, stable across all users on the same ET date. */
export function pickDailyMystery(pool: PuckDetectivePlayer[], date = getTodayET()): PuckDetectivePlayer {
  const sorted = [...pool].sort((a, b) => a.playerId - b.playerId);
  return sorted[dailyIndex(date, sorted.length)];
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
