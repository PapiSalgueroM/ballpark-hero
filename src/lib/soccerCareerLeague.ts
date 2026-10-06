/* Round 929: where your club finished in the league, every season.

   A playing season used to record only leagueTitle, a coin drawn by tier, so
   a player finished a season and never learned where his club ended up. This
   module gives each season a league finish and, where the size of that league
   in that season is verified, the league size, and prints nothing it cannot
   stand behind:

   - a title season is 1st, always, and a 1st is always a title season;
   - any other season draws a finish from a band set by the club's tier (the
     era aware elite rule below counts as the top band), nudged by the
     player's season rating, and only in a league whose size is known, so the
     finish can never sit below the bottom of a real table;
   - the draw comes from its own generator seeded from the season itself, so
     the game's main Math.random stream does not move by one call.

   Pure: no state, no clock, no Math.random. */
import { adjustClubsForYear } from "./careerEras";
import { SC_CLUB_CANON } from "../data/clubRivalries";
import type { ClubData } from "./soccerCareerEngine";

/* ─── League sizes, verified ───
   Clubs in the top flight by season, keyed by the season's START year (the
   game prints season Y as Y/Y+1). A league or a year not listed has no
   verified size and gets no "of N". Each window was read on 2026-10-02 from
   two sources, the per season tables at rsssf.org and the per season pages at
   statscrew.com ("N teams competed in the league that year"), checked at both
   ends of every window and at the latest season either covers:

   Premier League: 22 for 1992/93 to 1994/95, 20 from 1995/96.
     statscrew.com/worldfootball/l-ENGPRE/y-1992, y-1994, y-1995, y-2023;
     rsssf.org/engpaul/FLA/1992-93.html, 1994-95.html, 1995-96.html; the
     league's own 1994/95 review (premierleague.com/en/news/693434) says it
     "was trimmed down to 20 clubs ahead of the 1995/96 season". Before 1992
     the top flight was the First Division, so no size is claimed there.
   La Liga: 20 to 1994/95, 22 in 1995/96 and 1996/97, 20 from 1997/98.
     rsssf.org/tabless/spanhist8999.html (every season 1989/90 to 1998/99);
     statscrew.com/worldfootball/l-SPAPRI/y-1990, 1991, 1994, 1995, 1996, 1997,
     2019, 2023.
   Bundesliga: 18 in 1990/91, 20 in 1991/92, 18 from 1992/93.
     rsssf.org/tablesd/duit91.html, duit92.html, duit93.html, duit2024.html;
     statscrew.com/worldfootball/l-GERBUN/y-1990, 1991, 1992, 2023.
   Serie A: 18 to 2003/04, 20 from 2004/05.
     rsssf.org/tablesi/ital91.html, ital04.html, ital05.html, ital2024.html;
     statscrew.com/worldfootball/l-ITASEA/y-1990, 2003, 2004, 2023.
   Ligue 1: 20 to 1996/97, 18 from 1997/98 to 2001/02, 20 from 2002/03 to
     2022/23, 18 from 2023/24.
     rsssf.org/tablesf/fran94.html, fran97.html, fran98.html, fran02.html,
     fran03.html, fran2023.html, fran2024.html;
     statscrew.com/worldfootball/l-FRALG1/y-1990, 1991, 1996, 1997, 2001, 2002,
     2022, 2023.
   Seasons after the latest one read keep the latest size: the game's future
   is its own, and the format it plays is the one in force today. */
interface SizeWindow { from: number; to?: number; size: number }
const LEAGUE_SIZES: Record<string, SizeWindow[]> = {
  "Premier League": [{ from: 1992, to: 1994, size: 22 }, { from: 1995, size: 20 }],
  "La Liga": [{ from: 1990, to: 1994, size: 20 }, { from: 1995, to: 1996, size: 22 }, { from: 1997, size: 20 }],
  "Bundesliga": [{ from: 1990, to: 1990, size: 18 }, { from: 1991, to: 1991, size: 20 }, { from: 1992, size: 18 }],
  "Serie A": [{ from: 1990, to: 2003, size: 18 }, { from: 2004, size: 20 }],
  "Ligue 1": [{ from: 1990, to: 1996, size: 20 }, { from: 1997, to: 2001, size: 18 }, { from: 2002, to: 2022, size: 20 }, { from: 2023, size: 18 }],
};

/** Clubs in that league's top flight in the season starting in `year`, or
 *  null when the size is not verified for that league and season. */
export function leagueSizeFor(league: string, year: number): number | null {
  const windows = LEAGUE_SIZES[league];
  if (!windows) return null;
  for (const w of windows) {
    if (year >= w.from && (w.to === undefined || year <= w.to)) return w.size;
  }
  return null;
}

/* ─── The elite title boost, era aware ───
   The engine keeps one list of elite clubs, and before this round it gave
   them the elite title chance in every era, so Man City won the league in
   about two seasons of three in a 1990s career. A club on the list now counts
   as elite only in a season where the game's own era tier rules
   (ERA_TIER_RULES in careerEras.ts, read through adjustClubsForYear) leave it
   at tier 1. No new real world claim: Man City (tier 4 to 2008, tier 2 to
   2010), PSG (tier 2 to 2011) and Liverpool (tier 2 to 2000) step down there
   already; Bayern Munich, Real Madrid and Barcelona have no rule and stay. */
export function eliteInYear(elite: readonly string[], club: string, year: number): boolean {
  if (!elite.includes(club)) return false;
  const [c] = adjustClubsForYear([{ id: club, name: club, country: "", tier: 1, color: "", league: "" }], year);
  return !!c && c.tier === 1;
}

/* ─── The forked generator ───
   FNV-1a over a key built from the season, then mulberry32. The same season
   always draws the same finish, and nothing here touches Math.random. */
function hashKey(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
function forkRng(key: string): () => number {
  let a = hashKey(key) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ─── Where a club that did not win it finishes ───
   Bands as shares of the table, so a 22 club season and an 18 club one read
   the same way: the elite chase the title from 2nd to 4th, a tier 1 club sits
   in the top two fifths, tier 2 around mid table, tier 3 in the bottom half,
   tier 4 and below in the bottom third. A big season from the player
   (7.5 or better) lifts the band a tenth of the table, a poor one (under 6.3)
   drops it a tenth. 2nd is the ceiling, because 1st is the title. */
export function finishBand(tier: number, elite: boolean, size: number, rating: number): [number, number] {
  const at = (share: number) => Math.round(share * size);
  let lo: number, hi: number;
  if (elite) { lo = 2; hi = Math.max(3, at(0.2)); }
  else if (tier <= 1) { lo = 2; hi = at(0.4); }
  else if (tier === 2) { lo = at(0.25); hi = at(0.65); }
  else if (tier === 3) { lo = at(0.45); hi = size; }
  else { lo = at(0.65); hi = size; }
  const nudge = rating >= 7.5 ? -at(0.1) : rating < 6.3 ? at(0.1) : 0;
  lo = Math.min(size, Math.max(2, lo + nudge));
  hi = Math.min(size, Math.max(lo, hi + nudge));
  return [lo, hi];
}

export interface LeagueFinishInput {
  league: string;
  /** The season's start year, the way SeasonRecord.year holds it. */
  year: number;
  tier: number;
  elite: boolean;
  rating: number;
  leagueTitle: boolean;
  /** Anything that pins this season down; it seeds the forked generator. */
  seedKey: string;
}
export interface LeagueFinish { leagueFinish?: number; leagueSize?: number }

/** The season's league finish. A title is 1st with or without a known size;
 *  any other season gets a finish only where the league's size is verified. */
export function drawLeagueFinish(input: LeagueFinishInput): LeagueFinish {
  const size = leagueSizeFor(input.league, input.year);
  if (input.leagueTitle) return { leagueFinish: 1, ...(size ? { leagueSize: size } : {}) };
  if (!size) return {};
  const [lo, hi] = finishBand(input.tier, input.elite, size, input.rating);
  const rng = forkRng(input.seedKey);
  const finish = lo + Math.floor(rng() * (hi - lo + 1));
  return { leagueFinish: Math.min(size, Math.max(2, finish)), leagueSize: size };
}

/** The finish as a saved season holds it, checked before anything prints it.
 *  Saves are the player's own storage, so a hand edited or half written row
 *  is possible: a finish that is not a whole number, sits outside its table,
 *  or disagrees with the title flag reads as no finish at all, and a bad size
 *  alone drops just the size. The rest of the season is untouched. */
export function readLeagueFinish(r: { leagueFinish?: unknown; leagueSize?: unknown; leagueTitle?: unknown }): { finish: number; size: number | null } | null {
  const f = r.leagueFinish;
  if (typeof f !== "number" || !Number.isInteger(f) || f < 1 || f > 40) return null;
  if ((f === 1) !== (r.leagueTitle === true)) return null;
  const z = r.leagueSize;
  const size = typeof z === "number" && Number.isInteger(z) && z >= 2 && z <= 40 ? z : null;
  if (size !== null && f > size) return null;
  return { finish: f, size };
}

/** "La Liga", "Serie A", "MLS", but "the Premier League", "the Bundesliga":
 *  the phone feed's rule, plus MLS, which takes no article. */
export function leagueWithArticle(name: string): string {
  return /^(la |serie |ligue |eredivisie|primeira|liga |mls$)/i.test(name) ? name : `the ${name}`;
}

/** "1st", "2nd", "3rd", "11th", "22nd". */
export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  const unit = n % 10;
  return `${n}${unit === 1 ? "st" : unit === 2 ? "nd" : unit === 3 ? "rd" : "th"}`;
}

/* ─── Round 1029: the manager's league ───
   The dugout season used to build its table from every club in the world at
   the manager's tier, so an Arsenal manager read a final table with Boca and
   Flamengo in it. The field is his club's own league now, in the game's own
   world (the same rule the derbies use: every club stays in the league its
   row names, and a league is matched by its name, so Monaco sits in Ligue 1
   and Swansea in the Championship):

   - his club is found in the career's club list by its name, or by the
     spelling the shared rivalry table holds for it (a job offer names
     Manchester City, the career's list says Man City), accents folded;
   - a club the list does not carry (a job from the wider market) keeps the
     league its offer named, and any club whose name shares a word with his
     is left out of the names, so the same club under another spelling (RB
     Salzburg, Red Bull Salzburg) can never sit in his table twice;
   - the table has the league's verified size where soccerCareerLeague knows
     it, and otherwise the field the dugout always played (20), or more when
     the game knows more clubs than that. Only a verified size is ever
     printed;
   - every position is counted, but only clubs the game knows in that league
     are named. When the game knows more of them than the table has room for,
     the season draws which ones played that year. */
export const MANAGER_FIELD = 20;

const foldName = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const clubKey = (name: string) => foldName(SC_CLUB_CANON[name] ?? name);
const PLAIN_WORDS = new Set(["city", "united", "club", "real", "sporting", "athletic", "atletico", "town", "county", "rovers", "football"]);
const nameWords = (name: string) => foldName(name).split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !PLAIN_WORDS.has(w));

export interface ManagerLeagueInput {
  clubs: readonly ClubData[];
  /** The club he manages, as the save holds it. */
  club: string;
  /** The league the job came with, for a club the list does not carry. */
  league?: string;
  /** The season's start year. */
  year: number;
}
export interface ManagerLeagueField {
  /** The league the season is played in, or null when nothing names it. */
  league: string | null;
  /** Positions in the table, his own included. */
  size: number;
  /** True only when `size` is the league's verified size that season. */
  sizeVerified: boolean;
  /** The rivals named in this season's table, at most size - 1. */
  named: string[];
}

/** The manager's league for one season. `rng` only draws which known clubs
 *  fill the table when the game knows more than it has room for. */
export function managerLeagueField(input: ManagerLeagueInput, rng: () => number): ManagerLeagueField {
  const world = adjustClubsForYear([...input.clubs], input.year);
  const mine = clubKey(input.club);
  const home = world.find(c => clubKey(c.name) === mine);
  let league: string | null = null;
  let rivals: ClubData[] = [];
  if (home) {
    league = home.league;
    rivals = world.filter(c => c.league === league && clubKey(c.name) !== mine);
  } else if (input.league) {
    const label = world.find(c => foldName(c.league) === foldName(input.league!))?.league;
    league = label ?? input.league;
    const myWords = nameWords(input.club);
    rivals = label ? world.filter(c => c.league === label && clubKey(c.name) !== mine && !nameWords(c.name).some(w => myWords.includes(w))) : [];
  }
  const names: string[] = [];
  const seen = new Set<string>();
  for (const c of rivals) {
    const k = clubKey(c.name);
    if (!seen.has(k)) { seen.add(k); names.push(c.name); }
  }
  const verified = league ? leagueSizeFor(league, input.year) : null;
  const size = verified ?? Math.max(MANAGER_FIELD, names.length + 1);
  if (names.length > size - 1) {
    for (let i = names.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [names[i], names[j]] = [names[j], names[i]];
    }
  }
  return { league, size, sizeVerified: verified !== null, named: names.slice(0, size - 1) };
}
