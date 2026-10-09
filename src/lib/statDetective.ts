import { supabase } from '@/integrations/supabase/client';
import { fetchAllRowsParallel } from '@/lib/fetchAllRows';
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
 *
 * Round 1145, the career span. The span used to be built from the rows this
 * page fetches, which are the 500+ minute ones, so a season on the end of the
 * bench did not exist for it. A player reported a man shown as 1990-1996 whose
 * rows run 1989-90 to 2000-01, and he was one of 1,845 (of 2,973 profiles,
 * measured read only on 2026-10-09: 1,432 ended too early, 816 started too
 * late). The span now comes from the view bref_nba_career_spans, the first
 * and last season a name has ANY row for. The 500 minute floor still decides
 * who can be a mystery and who can be guessed; it no longer decides when a
 * career started or ended. There is no fallback to the old span: if the view
 * cannot be read the whole load fails into the retry state.
 *
 * Same round, after review: a span belongs to a MAN, not to a name. The table
 * has no person key, and two men can share a name. Read by name alone, a
 * namesake who played 38 minutes in 1977-78 stretched a famous 1992-2001
 * career back to 1978, which the old 500 minute span never did. So the view
 * hands back one row per name and COHORT (season start year minus listed age,
 * constant for one man) with how many of those rows reach 500 minutes, and
 * careersFromSpanRows below keeps only the men a profile is actually built
 * from: the ones with a 500+ minute season. Two men who both have one are
 * still one generous profile, as they always were. The same rows carry every
 * team a man has a row for, so "Career franchises" and the shared franchise
 * chip count a nine game stint too, where they used to see only the 500
 * minute seasons.
 */

export type Difficulty = 'stars' | 'deep';

export const GUESS_LIMIT = 8;
export const STARS_MIN_RATING = 85;
export const DEEP_MIN_RATING = 60;
export const DEEP_MAX_RATING = 84;

/* Same floor perfectSeasonNba uses for draftable players. The spans view counts
   rows against the same number (rows_500 in its SQL); the spans test reads the
   migration and fails if the two differ. */
export const MIN_MINUTES = 500;
const PAGE_SIZE = 1000;    // PostgREST caps rows per request
const PAGES = 25;          // ~19.9k qualifying rows today, headroom for new seasons
/* The spans view holds one row per name and cohort: 4,774 names on 2026-10-09
   and a little more than that in rows. Six pages are asked for at once and the
   shared reader keeps going if the sixth comes back full, so a table that
   outgrows the guess costs a round trip, never a name. */
const SPAN_FIRST_PAGES = 6;
const SPAN_VIEW = 'bref_nba_career_spans';
/* Two cohorts of one name are the same man when they sit this close. A man's
   cohort is constant in a clean source; the slack is for a season listed a
   year out. Namesakes a generation apart are nowhere near it. */
export const COHORT_GAP = 2;
/* Share of profiles allowed to come back without a span before the spans read
   counts as failed. The view groups the same table the profiles come from, so
   a healthy read leaves none without one. The broken read this catches is one
   that stops early without an error (the reader stops at the first short
   page, so a server that caps pages under 1000 hands back a sixth of the
   names or fewer), and one in twenty sits well clear of both ends. */
const SPAN_MISSING_LIMIT = 0.05;

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
  /* End years of the first and last season he has ANY row for, from the spans
     view (Round 1145). null only when the view has no row for his name: then
     the page says the span is not on file instead of guessing one. */
  firstYear: number | null;
  lastYear: number | null;
  positions: string[];  // distinct codes across his 500+ minute seasons
  /* Distinct franchise keys (combined rows excluded) across every season he
     has a row for, from the spans view. When the view has no row for his name
     only his 500+ minute seasons are known, and the clue says so. */
  franchises: string[];
  peak: number;         // best season rating, orders suggestions famous-first
}

export interface StatDetectiveData {
  pools: Record<Difficulty, MysterySeason[]>;
  profiles: PlayerProfile[];          // sorted by peak desc
  byName: Map<string, PlayerProfile>; // normalizeName(name) -> profile
}

/** The guess's career era measured against the mystery decade. 'unknown' is a
 *  guess whose span is not on file: no direction is claimed for him. */
export type EraVerdict = 'match' | 'earlier' | 'later' | 'unknown';
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

export interface SpanRow {
  player_name: string | null;
  first_season: string | null;
  last_season: string | null;
  cohort: number | null;   // season start year minus listed age; null with no age
  rows_500: number | null; // rows of this name and cohort with 500+ minutes
  teams: string | null;    // every team code he has a row for, comma separated
}

/** What the file holds on the men a profile is built from. */
export interface CareerOnFile {
  first: number;         // end year of the first season with any row
  last: number;          // end year of the last
  franchises: string[];  // distinct franchise keys, combined rows excluded
}

interface Man { lo: number | null; hi: number | null; first: number; last: number; rows500: number; teams: Set<string> }

/**
 * The spans view's rows, turned into one career per normalised name.
 *
 * Rows of one name are sorted by cohort and cut into men wherever two
 * neighbours sit more than COHORT_GAP apart. Rows with no cohort (no age in
 * the source) join the one man the name has when it has exactly one, since
 * nothing then says there is a second; beside two or more men they stand
 * alone, because nobody can say whose they are. The career is the union of
 * the men who have a 500+ minute row, and only those: they are the men the
 * page's profile is made from, and a namesake who never reached the floor is
 * a different person the profile says nothing about. A name with no such man
 * gets no entry, and its profile then reads "not on file" rather than a guess.
 */
export function careersFromSpanRows(rows: SpanRow[]): Map<string, CareerOnFile> {
  const byKey = new Map<string, Man[]>();
  for (const raw of rows) {
    const key = normalizeName(String(raw.player_name ?? '').trim());
    const first = endYearOf(typeof raw.first_season === 'string' ? raw.first_season : '');
    const last = endYearOf(typeof raw.last_season === 'string' ? raw.last_season : '');
    if (!key || !first || !last) continue;
    const cohort = raw.cohort == null || !Number.isFinite(Number(raw.cohort)) ? null : Number(raw.cohort);
    const teams = new Set(String(raw.teams ?? '').split(',').map(t => t.trim()).filter(Boolean));
    const man: Man = { lo: cohort, hi: cohort, first, last, rows500: Number(raw.rows_500) || 0, teams };
    const list = byKey.get(key);
    if (list) list.push(man); else byKey.set(key, [man]);
  }

  const join = (into: Man, from: Man) => {
    if (from.first < into.first) into.first = from.first;
    if (from.last > into.last) into.last = from.last;
    if (from.hi !== null && (into.hi === null || from.hi > into.hi)) into.hi = from.hi;
    if (from.lo !== null && (into.lo === null || from.lo < into.lo)) into.lo = from.lo;
    into.rows500 += from.rows500;
    for (const t of from.teams) into.teams.add(t);
  };

  const careers = new Map<string, CareerOnFile>();
  for (const [key, list] of byKey) {
    const known = list.filter(m => m.lo !== null).sort((a, b) => (a.lo as number) - (b.lo as number));
    const men: Man[] = [];
    for (const m of known) {
      const prev = men[men.length - 1];
      if (prev && (m.lo as number) - (prev.hi as number) <= COHORT_GAP) join(prev, m);
      else men.push(m);
    }
    const ageless = list.filter(m => m.lo === null);
    if (ageless.length > 0) {
      const one = ageless[0];
      for (const m of ageless.slice(1)) join(one, m);
      if (men.length === 1) join(men[0], one);
      else men.push(one);
    }
    const mine = men.filter(m => m.rows500 > 0);
    if (mine.length === 0) continue;
    const whole = mine[0];
    for (const m of mine.slice(1)) join(whole, m);
    const franchises: string[] = [];
    for (const code of whole.teams) {
      const f = franchiseOf(code);
      if (f && !franchises.includes(f)) franchises.push(f);
    }
    careers.set(key, { first: whole.first, last: whole.last, franchises });
  }
  return careers;
}

/**
 * Boot fetch: every 500+ minute player-season, paged in parallel under the
 * PostgREST 1000-row cap (same pattern as fetchTeamSeasonIndex in
 * perfectSeasonNba.ts, including the id-descending order so a future data
 * refresh overflows the oldest rows first), and beside them the career spans
 * view, one row per name and cohort. Builds the two mystery pools and a career profile
 * per player name for suggestions and feedback. Returns null on failure so
 * the page can show an error state with retry.
 */
export async function fetchStatDetectiveData(): Promise<StatDetectiveData | null> {
  try {
    const [pages, spanRead] = await Promise.all([
      Promise.all(
        Array.from({ length: PAGES }, (_, i) =>
          supabase
            .from('bref_nba_player_seasons' as any)
            .select('season, player_name, position, team, minutes, pts, trb, ast, stl, blk')
            .gte('minutes', MIN_MINUTES)
            .order('id', { ascending: false })
            .range(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1)
        )
      ),
      /* The site's shared paged read: the first pages together, a failed page
         asked for again, and on past the guess while pages come back full.
         (player_name, cohort) is the view's key, so the order is total. */
      fetchAllRowsParallel<SpanRow>(
        (from, to) =>
          supabase
            .from(SPAN_VIEW as any)
            .select('player_name, first_season, last_season, cohort, rows_500, teams')
            .order('player_name', { ascending: true })
            .order('cohort', { ascending: true })
            .range(from, to) as unknown as PromiseLike<{ data: SpanRow[] | null; error: unknown }>,
        SPAN_FIRST_PAGES,
      ),
    ]);

    /* The spans are all or nothing. A page that still errors after its
       retries or an empty read fails the load: a span that is merely missing
       would otherwise be filled by nothing, and the old 500 minute span is
       the false claim this read replaces, so there is nothing honest to fall
       back to. */
    if (spanRead.error || spanRead.data.length === 0) return null;
    const careers = careersFromSpanRows(spanRead.data);
    if (careers.size === 0) return null;

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
          // The span is never read off these rows: they are only his 500+
          // minute seasons. It comes from the spans view, or stays null. His
          // franchises start from the view too, every team he has a row for.
          const career = careers.get(nameKey);
          prof = {
            name,
            firstYear: career ? career.first : null,
            lastYear: career ? career.last : null,
            positions: [],
            franchises: career ? [...career.franchises] : [],
            peak: 40,
          };
          byName.set(nameKey, prof);
        }
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

    // One name the view lacks is told so on the page. Many of them is a
    // spans read that did not really come back (see SPAN_MISSING_LIMIT).
    let spanless = 0;
    for (const prof of byName.values()) if (prof.firstYear === null) spanless++;
    if (spanless > byName.size * SPAN_MISSING_LIMIT) return null;

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
  if (profile.firstYear === null || profile.lastYear === null) era = 'unknown';
  else if (profile.lastYear < mystery.decade) era = 'earlier';
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

/** What the page prints where a span would go for a name the view lacks. */
export const SPAN_NOT_ON_FILE = 'not on file';

/** 'Michael Jordan' active 1985-2003 -> '1985-2003' for the dropdown. An
 *  empty string when his span is not on file, so the dropdown prints no years
 *  rather than invented ones. */
export function careerSpan(profile: PlayerProfile): string {
  if (profile.firstYear === null || profile.lastYear === null) return '';
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
  if (misses >= 1 && profile) hints.push({ label: 'Career span', value: careerSpan(profile) || SPAN_NOT_ON_FILE });
  if (misses >= 2) hints.push({ label: 'Surname starts with', value: surnameInitial(mystery.player) });
  /* With no row in the spans view only his 500+ minute seasons are known, and
     a count of those would be passed off as his career: say it is not on file. */
  if (misses >= 3 && profile) {
    hints.push({ label: 'Career franchises', value: profile.firstYear === null ? SPAN_NOT_ON_FILE : String(profile.franchises.length) });
  }
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

const ERA_SQUARE: Record<EraVerdict, string> = { match: '🟩', earlier: '⬅️', later: '➡️', unknown: '⬜' };
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
