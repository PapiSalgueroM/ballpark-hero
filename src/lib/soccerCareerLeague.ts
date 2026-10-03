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
   tier 4 and below in the bottom two fifths. A big season from the player
   (7.5 or better) lifts the band a tenth of the table, a poor one (under 6.3)
   drops it a tenth. 2nd is the ceiling, because 1st is the title. */
export function finishBand(tier: number, elite: boolean, size: number, rating: number): [number, number] {
  const at = (share: number) => Math.round(share * size);
  let lo: number, hi: number;
  if (elite) { lo = 2; hi = Math.max(3, at(0.2)); }
  else if (tier <= 1) { lo = 2; hi = at(0.4); }
  else if (tier === 2) { lo = at(0.25); hi = at(0.65); }
  else if (tier === 3) { lo = at(0.45); hi = size; }
  else { lo = at(0.6); hi = size; }
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
