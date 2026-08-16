import { supabase } from '@/integrations/supabase/client';
import { normalizeName } from '@/lib/whoAmI';

export { normalizeName };

/**
 * Stat Detective (NBA): a real player-season is shown with the name removed,
 * only the era, position and a per-36 stat line. Identify the player within
 * eight guesses, with feedback chips after every miss that tell you how close
 * you were on each attribute.
 *
 * Data source: bref_nba_player_seasons (checked in SQL on 2026-07-02):
 * - One row per player-team-season. Every stat column is a SEASON TOTAL and
 *   `games` is null on all rows, so the case file shows per-36 numbers plus
 *   the raw minutes and says so.
 * - Minutes are null before 1951-52, so the 500 minute floor quietly limits
 *   the game to 1951-52 through today.
 * - stl and blk are null before they were tracked (1973-74). The case file
 *   drops those chips and notes it.
 * - Traded players have one row per team plus a combined '2TM'..'5TM' row.
 *   Combined rows never become the mystery (no single franchise) but they DO
 *   feed career profiles, since a short per-team stint can fall under the
 *   minute floor while the combined row does not.
 *
 * The case file shows the mystery's DECADE up front, not the exact season.
 * The exact season is the final progressive hint (miss 6), and the era
 * feedback arrows compare each guess against the mystery decade, so showing
 * the exact year from the start would make both mechanics dead weight.
 *
 * Pool sizes, verified in SQL with the exact rating formula below
 * (minutes >= 500, non-combined rows, non-null stats and position):
 * - Stars, rating 85+:        2,393 seasons across 541 players
 * - Deep Cuts, rating 60-84: 12,711 seasons across 2,571 players
 * - Guessable names: 2,956 players (19,938 rows incl. combined = 20 pages
 *   today, 25 budgeted below).
 */

export type Difficulty = 'stars' | 'deep';

export const GUESS_LIMIT = 8;
export const STARS_MIN_RATING = 85;
export const DEEP_MIN_RATING = 60;
export const DEEP_MAX_RATING = 84;

const MIN_MINUTES = 500;   // same floor perfectSeasonNba uses for draftable players
const PAGE_SIZE = 1000;    // PostgREST caps rows per request
const PAGES = 25;          // ~19.9k qualifying rows today, headroom for new seasons

const COMBINED_ROWS = new Set(['2TM', '3TM', '4TM', '5TM']);

/**
 * Basketball Reference team codes -> [display name, franchise lineage key].
 * The name column mirrors the private TEAM_NAMES map in perfectSeasonNba.ts
 * (not exported there, keep the two in sync). The franchise key groups codes
 * that belong to one franchise across relocations, so the team feedback chip
 * can answer "did your guess ever play for the mystery player's franchise".
 */
const TEAMS: Record<string, [string, string]> = {
  AND: ['Anderson Packers', 'and-packers'],
  ATL: ['Atlanta Hawks', 'hawks'],
  BAL: ['Baltimore Bullets', 'wizards'],
  BLB: ['Baltimore Bullets', 'blb-bullets'],
  BOS: ['Boston Celtics', 'celtics'],
  BRK: ['Brooklyn Nets', 'nets'],
  BUF: ['Buffalo Braves', 'clippers'],
  CAP: ['Capital Bullets', 'wizards'],
  CHA: ['Charlotte Bobcats', 'hornets'],
  CHH: ['Charlotte Hornets', 'hornets'],
  CHI: ['Chicago Bulls', 'bulls'],
  CHO: ['Charlotte Hornets', 'hornets'],
  CHP: ['Chicago Packers', 'wizards'],
  CHS: ['Chicago Stags', 'stags'],
  CHZ: ['Chicago Zephyrs', 'wizards'],
  CIN: ['Cincinnati Royals', 'kings'],
  CLE: ['Cleveland Cavaliers', 'cavaliers'],
  DAL: ['Dallas Mavericks', 'mavericks'],
  DEN: ['Denver Nuggets', 'nuggets'],
  DET: ['Detroit Pistons', 'pistons'],
  DNN: ['Denver Nuggets', 'dnn-nuggets'],
  FTW: ['Fort Wayne Pistons', 'pistons'],
  GSW: ['Golden State Warriors', 'warriors'],
  HOU: ['Houston Rockets', 'rockets'],
  IND: ['Indiana Pacers', 'pacers'],
  INO: ['Indianapolis Olympians', 'olympians'],
  KCK: ['Kansas City Kings', 'kings'],
  KCO: ['Kansas City-Omaha Kings', 'kings'],
  LAC: ['Los Angeles Clippers', 'clippers'],
  LAL: ['Los Angeles Lakers', 'lakers'],
  MEM: ['Memphis Grizzlies', 'grizzlies'],
  MIA: ['Miami Heat', 'heat'],
  MIL: ['Milwaukee Bucks', 'bucks'],
  MIN: ['Minnesota Timberwolves', 'timberwolves'],
  MLH: ['Milwaukee Hawks', 'hawks'],
  MNL: ['Minneapolis Lakers', 'lakers'],
  NJN: ['New Jersey Nets', 'nets'],
  NOH: ['New Orleans Hornets', 'pelicans'],
  NOJ: ['New Orleans Jazz', 'jazz'],
  NOK: ['New Orleans/Oklahoma City Hornets', 'pelicans'],
  NOP: ['New Orleans Pelicans', 'pelicans'],
  NYK: ['New York Knicks', 'knicks'],
  NYN: ['New York Nets', 'nets'],
  OKC: ['Oklahoma City Thunder', 'thunder'],
  ORL: ['Orlando Magic', 'magic'],
  PHI: ['Philadelphia 76ers', 'sixers'],
  PHO: ['Phoenix Suns', 'suns'],
  PHW: ['Philadelphia Warriors', 'warriors'],
  POR: ['Portland Trail Blazers', 'blazers'],
  ROC: ['Rochester Royals', 'kings'],
  SAC: ['Sacramento Kings', 'kings'],
  SAS: ['San Antonio Spurs', 'spurs'],
  SDC: ['San Diego Clippers', 'clippers'],
  SDR: ['San Diego Rockets', 'rockets'],
  SEA: ['Seattle SuperSonics', 'thunder'],
  SFW: ['San Francisco Warriors', 'warriors'],
  SHE: ['Sheboygan Red Skins', 'redskins'],
  STB: ['St. Louis Bombers', 'bombers'],
  STL: ['St. Louis Hawks', 'hawks'],
  SYR: ['Syracuse Nationals', 'sixers'],
  TOR: ['Toronto Raptors', 'raptors'],
  TRI: ['Tri-Cities Blackhawks', 'hawks'],
  UTA: ['Utah Jazz', 'jazz'],
  VAN: ['Vancouver Grizzlies', 'grizzlies'],
  WAS: ['Washington Wizards', 'wizards'],
  WAT: ['Waterloo Hawks', 'waterloo'],
  WSB: ['Washington Bullets', 'wizards'],
  WSC: ['Washington Capitols', 'capitols'],
};

export function teamNameOf(code: string): string {
  return TEAMS[code]?.[0] ?? code;
}

function franchiseOf(code: string): string {
  if (COMBINED_ROWS.has(code)) return '';
  return TEAMS[code]?.[1] ?? code;
}

/**
 * 40-99 rating from a season stat line. Mirrors the private playerRating in
 * perfectSeasonNba.ts, which is not exported there; keep the two in sync.
 * Anchors re-verified in SQL on 2026-07-02: 1961-62 Wilt 99, 2015-16 Curry
 * 97, 1987-88 Jordan 96. Difficulty tiers cut on this number.
 */
export function playerRating(pts: number, trb: number, ast: number, minutes: number): number {
  if (minutes < 300) return 40;
  const per36 = ((pts + 1.2 * ast + 1.1 * trb) / minutes) * 36;
  const volume = 0.75 + 0.25 * Math.min(1, minutes / 2200);
  const eff = per36 * volume;
  const rating = 40 + 59 / (1 + Math.exp((23.5 - eff) / 7));
  return Math.round(Math.min(99, Math.max(40, rating)));
}

/** Parse a bref position string into codes. 'PG-SG' gives both, bare 'G'
 *  and 'F' split into their two modern codes. Almost every live row is a
 *  single clean PG/SG/SF/PF/C. */
export function positionCodes(raw: unknown): string[] {
  const out: string[] = [];
  const add = (s: string) => {
    if (!out.includes(s)) out.push(s);
  };
  for (const token of String(raw ?? '').toUpperCase().split(/[-/,]/)) {
    const t = token.trim();
    if (t === 'PG' || t === 'SG' || t === 'SF' || t === 'PF' || t === 'C') add(t);
    else if (t === 'G') { add('PG'); add('SG'); }
    else if (t === 'F') { add('SF'); add('PF'); }
  }
  return out;
}

export type PositionGroup = 'G' | 'F' | 'C';

export function positionGroupOf(code: string): PositionGroup {
  if (code === 'PG' || code === 'SG') return 'G';
  if (code === 'SF' || code === 'PF') return 'F';
  return 'C';
}

/** '1987-88' -> 1988. Returns 0 for anything malformed. */
export function endYearOf(season: string): number {
  if (!/^\d{4}-\d{2}$/.test(season)) return 0;
  return Number(season.slice(0, 4)) + 1;
}

export function decadeOf(endYear: number): number {
  return Math.floor(endYear / 10) * 10;
}

export function decadeLabel(decade: number): string {
  return `${decade}s`;
}

export function per36(total: number, minutes: number): number {
  return minutes > 0 ? (total / minutes) * 36 : 0;
}

const NAME_SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v']);

/** First letter of the real surname, skipping Jr./III style suffixes. */
export function surnameInitial(name: string): string {
  const tokens = name.trim().split(/\s+/);
  while (tokens.length > 1 && NAME_SUFFIXES.has(tokens[tokens.length - 1].toLowerCase().replace(/\./g, ''))) {
    tokens.pop();
  }
  const last = tokens[tokens.length - 1] ?? '';
  return last.charAt(0).toUpperCase();
}

export interface MysterySeason {
  key: string;        // stable identity: player|season|team
  player: string;
  season: string;     // '1987-88', revealed only as the miss-6 hint
  endYear: number;    // 1988
  decade: number;     // 1980, shown on the case file
  position: string;   // primary code, shown on the case file
  team: string;       // 'CHI', revealed only as the miss-4 hint
  teamName: string;   // 'Chicago Bulls'
  franchise: string;  // lineage key for the team feedback chip
  minutes: number;
  pts: number;
  trb: number;
  ast: number;
  stl: number | null; // null before 1973-74
  blk: number | null;
  rating: number;
}

export interface PlayerProfile {
  name: string;
  firstYear: number;    // end year of earliest 500+ minute season
  lastYear: number;
  positions: string[];  // distinct codes across the career
  franchises: string[]; // distinct franchise keys (combined rows excluded)
  peak: number;         // best season rating, orders suggestions famous-first
}

export interface StatDetectiveData {
  pools: Record<Difficulty, MysterySeason[]>;
  profiles: PlayerProfile[];          // sorted by peak desc
  byName: Map<string, PlayerProfile>; // normalizeName(name) -> profile
}

/** The guess's career era measured against the mystery decade. */
export type EraVerdict = 'match' | 'earlier' | 'later';
export type PosVerdict = 'exact' | 'group' | 'none';

export interface GuessFeedback {
  name: string;
  isCorrect: boolean;
  era: EraVerdict;
  pos: PosVerdict;
  sharedFranchise: boolean; // guess ever played for the mystery franchise
}

export interface Hint {
  label: string;
  value: string;
}

interface SeasonRow {
  season: string | null;
  player_name: string | null;
  position: string | null;
  team: string | null;
  minutes: number | null;
  pts: number | null;
  trb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
}

/**
 * Boot fetch: every 500+ minute player-season, paged in parallel under the
 * PostgREST 1000-row cap (same pattern as fetchTeamSeasonIndex in
 * perfectSeasonNba.ts, including the id-descending order so a future data
 * refresh overflows the oldest rows first). Builds the two mystery pools and
 * a career profile per player name for suggestions and feedback. Returns
 * null on failure so the page can show an error state with retry.
 */
export async function fetchStatDetectiveData(): Promise<StatDetectiveData | null> {
  try {
    const pages = await Promise.all(
      Array.from({ length: PAGES }, (_, i) =>
        supabase
          .from('bref_nba_player_seasons' as any)
          .select('season, player_name, position, team, minutes, pts, trb, ast, stl, blk')
          .gte('minutes', MIN_MINUTES)
          .order('id', { ascending: false })
          .range(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1)
      )
    );

    const stars: MysterySeason[] = [];
    const deep: MysterySeason[] = [];
    const byName = new Map<string, PlayerProfile>();

    for (const page of pages) {
      if (page.error || !page.data) continue;
      for (const raw of page.data as unknown as SeasonRow[]) {
        const name = String(raw.player_name ?? '').trim();
        const season = typeof raw.season === 'string' ? raw.season : '';
        const teamCode = typeof raw.team === 'string' ? raw.team.trim() : '';
        const minutes = Number(raw.minutes) || 0;
        const year = endYearOf(season);
        if (!name || !year || !teamCode || minutes < MIN_MINUTES) continue;

        const codes = positionCodes(raw.position);
        const combined = COMBINED_ROWS.has(teamCode);
        const franchise = franchiseOf(teamCode);

        // Career profile. Two historical players sharing one bref name merge
        // into a single generous profile, which is acceptable for trivia.
        const nameKey = normalizeName(name);
        let prof = byName.get(nameKey);
        if (!prof) {
          prof = { name, firstYear: year, lastYear: year, positions: [], franchises: [], peak: 40 };
          byName.set(nameKey, prof);
        }
        if (year < prof.firstYear) prof.firstYear = year;
        if (year > prof.lastYear) prof.lastYear = year;
        for (const c of codes) {
          if (!prof.positions.includes(c)) prof.positions.push(c);
        }
        if (franchise && !prof.franchises.includes(franchise)) prof.franchises.push(franchise);

        if (raw.pts == null || raw.trb == null || raw.ast == null) continue;
        const pts = Number(raw.pts) || 0;
        const trb = Number(raw.trb) || 0;
        const ast = Number(raw.ast) || 0;
        const rating = playerRating(pts, trb, ast, minutes);
        if (rating > prof.peak) prof.peak = rating;

        // Mystery pools: real single-team rows with a known position only.
        if (combined || codes.length === 0) continue;
        const entry: MysterySeason = {
          key: `${name}|${season}|${teamCode}`,
          player: name,
          season,
          endYear: year,
          decade: decadeOf(year),
          position: codes[0],
          team: teamCode,
          teamName: teamNameOf(teamCode),
          franchise,
          minutes,
          pts,
          trb,
          ast,
          stl: raw.stl == null ? null : Number(raw.stl),
          blk: raw.blk == null ? null : Number(raw.blk),
          rating,
        };
        if (rating >= STARS_MIN_RATING) stars.push(entry);
        else if (rating >= DEEP_MIN_RATING && rating <= DEEP_MAX_RATING) deep.push(entry);
      }
    }

    // Live table yields ~2.4k stars, ~12.7k deep cuts, ~3k names. Anything
    // far below that means pages went missing and feedback would lie.
    if (stars.length < 500 || deep.length < 2000 || byName.size < 800) return null;

    const profiles = [...byName.values()].sort((a, b) => b.peak - a.peak);
    return { pools: { stars, deep }, profiles, byName };
  } catch {
    return null;
  }
}

/** Random mystery from a difficulty pool, avoiding an immediate repeat. */
export function pickMystery(pool: MysterySeason[], excludeKey?: string): MysterySeason | null {
  if (pool.length === 0) return null;
  const candidates = excludeKey ? pool.filter(m => m.key !== excludeKey) : pool;
  const list = candidates.length > 0 ? candidates : pool;
  return list[Math.floor(Math.random() * list.length)];
}

/** Feedback chips for one wrong guess, all phrased about the guess itself. */
export function evaluateGuess(profile: PlayerProfile, mystery: MysterySeason): GuessFeedback {
  const isCorrect = normalizeName(profile.name) === normalizeName(mystery.player);

  let era: EraVerdict = 'match';
  if (profile.lastYear < mystery.decade) era = 'earlier';
  else if (profile.firstYear > mystery.decade + 9) era = 'later';

  let pos: PosVerdict = 'none';
  if (profile.positions.includes(mystery.position)) {
    pos = 'exact';
  } else {
    const group = positionGroupOf(mystery.position);
    if (profile.positions.some(c => positionGroupOf(c) === group)) pos = 'group';
  }

  const sharedFranchise = profile.franchises.includes(mystery.franchise);

  return { name: profile.name, isCorrect, era, pos, sharedFranchise };
}

/**
 * Accent-insensitive suggestions for the guess box, requires 2+ letters.
 * Same tiering as whoAmI.suggestPlayers: full-name prefixes first, then word
 * prefixes, then substrings. Profiles arrive peak-sorted so famous names
 * float up within each tier.
 */
export function suggestProfiles(
  profiles: PlayerProfile[],
  query: string,
  exclude?: Set<string>,
  limit = 8,
): PlayerProfile[] {
  const q = normalizeName(query);
  if (q.length < 2) return [];
  const starts: PlayerProfile[] = [];
  const wordStarts: PlayerProfile[] = [];
  const contains: PlayerProfile[] = [];
  for (const p of profiles) {
    if (exclude && exclude.has(normalizeName(p.name))) continue;
    const n = normalizeName(p.name);
    if (!n.includes(q)) continue;
    if (n.startsWith(q)) starts.push(p);
    else if (n.split(' ').some(w => w.startsWith(q))) wordStarts.push(p);
    else contains.push(p);
    if (starts.length >= limit) break;
  }
  return [...starts, ...wordStarts, ...contains].slice(0, limit);
}

/** 'Michael Jordan' active 1985-2003 -> '1985-2003' for the dropdown. */
export function careerSpan(profile: PlayerProfile): string {
  return profile.firstYear === profile.lastYear
    ? String(profile.firstYear)
    : `${profile.firstYear}-${profile.lastYear}`;
}

/**
 * Extra clues unlocked by miss count, denser ladder (owner 2026-07-10: the
 * old chips restated the case file; every unlock here is NEW information).
 * 1 miss: career span · 2: surname initial · 3: franchises played for
 * 4: team · 5: first-name initial · 6: exact season.
 */
export function hintsFor(mystery: MysterySeason, misses: number, profile?: PlayerProfile): Hint[] {
  const hints: Hint[] = [];
  if (misses >= 1 && profile) hints.push({ label: 'Career span', value: careerSpan(profile) });
  if (misses >= 2) hints.push({ label: 'Surname starts with', value: surnameInitial(mystery.player) });
  if (misses >= 3 && profile) hints.push({ label: 'Career franchises', value: String(profile.franchises.length) });
  if (misses >= 4) hints.push({ label: 'Team', value: mystery.teamName });
  if (misses >= 5) hints.push({ label: 'First name starts with', value: mystery.player.trim().charAt(0).toUpperCase() });
  if (misses >= 6) hints.push({ label: 'Exact season', value: mystery.season });
  return hints;
}

/** Miss count that unlocks the next clue, or null when all are out. */
export function nextHintAt(misses: number): number | null {
  if (misses < 2) return 2;
  if (misses < 4) return 4;
  if (misses < 6) return 6;
  return null;
}

export interface StatChip {
  label: string;
  value: string;
}

/** Per-36 chips for the case file. STL/BLK only when the era tracked them. */
export function statChips(m: MysterySeason): StatChip[] {
  const chips: StatChip[] = [
    { label: 'PTS', value: per36(m.pts, m.minutes).toFixed(1) },
    { label: 'REB', value: per36(m.trb, m.minutes).toFixed(1) },
    { label: 'AST', value: per36(m.ast, m.minutes).toFixed(1) },
  ];
  if (m.stl != null) chips.push({ label: 'STL', value: per36(m.stl, m.minutes).toFixed(1) });
  if (m.blk != null) chips.push({ label: 'BLK', value: per36(m.blk, m.minutes).toFixed(1) });
  return chips;
}

const ERA_SQUARE: Record<EraVerdict, string> = { match: '🟩', earlier: '⬅️', later: '➡️' };
const POS_SQUARE: Record<PosVerdict, string> = { exact: '🟩', group: '🟨', none: '⬜' };

/** One era/position/team row per guess; the winning guess is all green. */
export function buildShareGrid(guesses: GuessFeedback[]): string {
  return guesses
    .map(g =>
      g.isCorrect
        ? '🟩🟩🟩'
        : `${ERA_SQUARE[g.era]}${POS_SQUARE[g.pos]}${g.sharedFranchise ? '🟩' : '⬜'}`
    )
    .join('\n');
}
