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
import { CAREER_LEAGUE_SEASONS } from "../data/careerLeagueSeasons";
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
   Championship (Round 1029 fix, the manager's table only, DUGOUT_SIZES
     below): 24 from 2004/05, the season the second tier took that name, so
     no size is claimed before it.
     statscrew.com/worldfootball/l-ENGCHA/y-2004 ("24 teams competed"),
     y-2023; rsssf.org/engpaul/FLA/2004-05.html and rsssf.org/tablese/
     eng2024.html (24 rows each); espn.com/soccer/standings/_/league/eng.2/
     season/2023 (24 teams). Read 2026-10-06.
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
/* The Championship is the dugout's alone: a playing season's finish is drawn
   from a band set by the club's tier, and every Championship club is tier 4,
   so the playing finish keeps the top flights only. */
const DUGOUT_SIZES: Record<string, SizeWindow[]> = {
  "Championship": [{ from: 2004, size: 24 }],
  /* Round 1040: Club Manager's Serie B is a manager's job now, so a Soccer
     Career dugout can be offered one. Only the 2026-27 season is read (20
     clubs: espn.com/soccer/standings/_/league/ita.2 and Sky Sport Italia's
     "Serie B 2026-27, le squadre del prossimo campionato", 2026-06-07, read
     2026-10-06), so no size is claimed before it. */
  "Serie B": [{ from: 2026, size: 20 }],
  /* The same for Ligue 2: 18 clubs in 2026-27 (espn.com/soccer/standings/
     _/league/fra.2 and Saint-Étienne's own Ligue 2 BKT table, asse.fr, both
     read 2026-10-06). */
  "Ligue 2": [{ from: 2026, size: 18 }],
  /* And the Segunda División: 22 clubs in 2026-27 (espn.com/soccer/standings/
     _/league/esp.2 and laliga.com's LALIGA HYPERMOTION table, both read
     2026-10-06). Club Manager plays 20 of them, but the dugout's table is
     the real league's size, the clubs it does not know unnamed. */
  "Segunda División": [{ from: 2026, size: 22 }],
};

/** Clubs in that league's top flight in the season starting in `year`, or
 *  null when the size is not verified for that league and season. Round
 *  1037: a season the league ledgers hold (1990-91 to 2025-26, the six
 *  leagues of CAREER_LEAGUE_SEASONS) answers from the ledger, which has
 *  both tiers of England from 1990; the windows above agree with it
 *  wherever both speak (simCareerLeagueSeasons checks that). */
export function leagueSizeFor(league: string, year: number, dugout = false): number | null {
  const ledger = year < LIST_SEASON ? CAREER_LEAGUE_SEASONS[league]?.[year] : undefined;
  if (ledger) return ledger.size;
  const windows = LEAGUE_SIZES[league] ?? (dugout ? DUGOUT_SIZES[league] : undefined);
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
  /** The league the club played that season (leagueKeyInYear), or null
   *  when the game cannot say: a title is still 1st, nothing else is drawn. */
  league: string | null;
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
  const size = input.league === null ? null : leagueSizeFor(input.league, input.year);
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
 *  the phone feed's rule, plus MLS, which takes no article, and Round 1037's
 *  "Division 1" (Ligue 1 to 2001-02), which takes none either. */
export function leagueWithArticle(name: string): string {
  return /^(la |serie |ligue |eredivisie|primeira|liga |division \d|mls$)/i.test(name) ? name : `the ${name}`;
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

   - the league he plays in is the one his job came with (the offer card
     showed it, so the table must agree with it), put in the list's own
     spelling ("EFL Championship" is the list's "Championship"); a job
     without one (a save from before this round) finds his club in the list
     by its name, or by the spelling the shared rivalry table holds for it
     (an offer names Manchester City, the list says Man City), accents
     folded. A Nacional job in Portugal therefore plays the Primeira Liga,
     never the Uruguayan Nacional's league;
   - when his club is not in that league in the list, any club whose name
     shares a word with his is left out of the names, so the same club under
     another spelling (RB Salzburg, Red Bull Salzburg) can never sit in his
     table twice;
   - the table has the league's verified size where this module knows it,
     and otherwise the field the dugout always played (20), or more when the
     game knows more clubs than that. Only a verified size is ever printed,
     and in a league without one the season prints no position at all (see
     finishZone);
   - every position is counted, but only clubs the game knows in that league
     are named. When the game knows more of them than the table has room for,
     the season draws which ones played that year;
   - a season before LIST_SEASON names nobody. The list's league labels are
     the 2026-27 season's (src/data/soccerCareerClubPool.ts says so in its
     header), and adjustClubsForYear moves a club's tier, never its league,
     so the game cannot say who was in a league in 2012: Coventry City in
     that year's Premier League would be a fact made up. Every place is
     still played and counted, and the field keeps its size. Nor can it
     say which league his club was in that year, so such a season names no
     league either: not over the table, not under it, not in a move line
     (dugoutTableWords below, and the engine's season line). The league
     is still kept, unprinted, so a promotion in 2015 still decides where
     he plays from 2026-27, and from then on nothing is hidden.
     Round 1037: that rule now holds only where the league ledgers are
     silent (a league outside the six they hold). A past season of one of
     the six is named from the ledgers, its real members and its real size
     (ledgerField below). */
export const MANAGER_FIELD = 20;
/** The season (start year) the career list's league labels describe. */
export const LIST_SEASON = 2026;

const foldName = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const clubKey = (name: string) => foldName(SC_CLUB_CANON[name] ?? name);
const PLAIN_WORDS = new Set(["city", "united", "club", "real", "sporting", "athletic", "atletico", "town", "county", "rovers", "football"]);
const nameWords = (name: string) => foldName(name).split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !PLAIN_WORDS.has(w));

/* The job market names some leagues by Club Manager's labels, which the
   career's list spells its own way (keys folded). */
const LEAGUE_ALIASES: Record<string, string> = {
  "efl championship": "Championship",
  "brasileirao serie a": "Brasileirao",
  "supersport hnl": "HNL",
  "a-league men": "A-League",
  "mls eastern conference": "MLS",
  "mls western conference": "MLS",
};

/** A league label in the career list's own spelling, or null when no club
 *  of the list plays in that league. */
export function listLeague(clubs: readonly ClubData[], label: string): string | null {
  const f = foldName(label);
  const want = LEAGUE_ALIASES[f];
  const hit = clubs.find(c => (want ? c.league === want : foldName(c.league) === f));
  return hit ? hit.league : null;
}

/* ─── Round 1037: which league a club was in, season by season ───
   The career list's labels are the 2026-27 season's, so before this round a
   2015 career printed today's league for a past season. The Round 1036
   ledgers (scripts/data/leagueSeasons/, two independent non-wiki sources a
   season, generated into src/data/careerLeagueSeasons.ts) hold who was in
   six leagues every season from 1990-91 to 2025-26: the Premier League (the
   First Division to 1991-92), the Championship (Second Division to 1991-92,
   First Division to 2003-04), La Liga, Serie A, the Bundesliga and Ligue 1
   (Division 1 to 2001-02). This is the one lookup: every screen line,
   finish, derby and dugout table reads it, none keeps its own year logic.

   - a season before LIST_SEASON: the league the ledgers place the club in,
     under the name it carried that season, or nothing at all when the club
     was in none of the six that season (Ajax in any year, Brighton in
     2008) or the season is not in the ledgers;
   - LIST_SEASON on: today's label, exactly as before this round.

   Clubs are matched by the same key the dugout uses (SC_CLUB_CANON, accents
   folded), so a market job spelled "Manchester City" finds Man City, and
   then by identityKey against the ways the sources spelled the clubs the
   career world does not know, so a Club Manager job at Lazio or Union
   Berlin finds its own league too (never to print a name: those clubs stay
   unnamed). identityKey is scripts/genCareerLeagueSeasons.mjs's, word for
   word; simCareerLeagueSeasons holds the two together. */
const IDENTITY_STOP = new Set(["fc", "sc", "ac", "as", "ss", "us", "sv", "afc", "cf", "cfc", "vfl", "vfb", "tsg", "fsv", "spvgg", "calcio", "sco", "rc", "ogc", "aj", "sd", "ud", "cd", "rcd", "ca", "bsc"]);
export function identityKey(name: string): string {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/ß/g, "ss").replace(/&/g, " and ")
    .split(/[^a-z0-9]+/).filter(w => w && !IDENTITY_STOP.has(w) && !/^\d+$/.test(w)).join(" ");
}
/* The job market's short names whose identity none of the sources printed:
   the spelling of the same club that they did print. */
export const MARKET_SPELLINGS: Readonly<Record<string, string>> = {
  "Gladbach": "Borussia Monchengladbach",
  "Karlsruhe": "Karlsruher SC",
  "Braunschweig": "Eintracht Braunschweig",
};
export interface LedgerSeason {
  /** The league in the career list's own spelling ("Premier League"). */
  key: string;
  /** The name the league carried that season ("First Division" in 1991). */
  name: string;
  /** Clubs in it that season, verified. */
  size: number;
  /** The career's names of the clubs in it the career world knows; the
   *  rest are counted in `size` and never named. */
  clubs: readonly string[];
  /** One entry per unnamed member: its identity keys joined by "|". */
  others: readonly string[];
}

/* year -> a club's key or identity -> its league that season and, when the
   career world knows it, its canon name. Built on first use. */
interface LedgerMember { key: string; canon: string | null }
let ledgerIndex: Map<number, Map<string, LedgerMember>> | null = null;
function ledgerByYear(): Map<number, Map<string, LedgerMember>> {
  if (ledgerIndex) return ledgerIndex;
  const index = new Map<number, Map<string, LedgerMember>>();
  for (const [key, years] of Object.entries(CAREER_LEAGUE_SEASONS)) {
    for (const [y, season] of Object.entries(years)) {
      const year = Number(y);
      const byClub = index.get(year) ?? new Map<string, LedgerMember>();
      for (const name of season.clubs) {
        byClub.set(clubKey(name), { key, canon: name });
        byClub.set(`#${identityKey(name)}`, { key, canon: name });
      }
      for (const ids of season.others) for (const id of ids.split("|")) byClub.set(`#${id}`, { key, canon: null });
      index.set(year, byClub);
    }
  }
  ledgerIndex = index;
  return index;
}
function ledgerMember(club: string, year: number): LedgerMember | null {
  const byClub = ledgerByYear().get(year);
  if (!byClub) return null;
  /* a club the rivalry table spells another way is matched only under that
     spelling: Leipzig is RB Leipzig, never the VfB Leipzig of 1993-94 */
  return byClub.get(clubKey(club))
    ?? byClub.get(`#${identityKey(SC_CLUB_CANON[club] ?? MARKET_SPELLINGS[club] ?? club)}`)
    ?? null;
}

/** The season of a league as the ledgers hold it, or null when they do not
 *  hold that league in that season (or the season is LIST_SEASON or later,
 *  which the ledgers do not describe). */
export function ledgerLeague(key: string, year: number): LedgerSeason | null {
  if (year >= LIST_SEASON) return null;
  const s = CAREER_LEAGUE_SEASONS[key]?.[year];
  return s ? { key, name: s.name, size: s.size, clubs: s.clubs, others: s.others } : null;
}

/** The ledger season the club played in, for a season before LIST_SEASON,
 *  or null when it was in none of the six or the season is unknown.
 *  `canon` is the club's name in `clubs`, or null when it is one of the
 *  unnamed members. */
export function clubLedgerSeason(club: string, year: number): (LedgerSeason & { canon: string | null }) | null {
  if (year >= LIST_SEASON) return null;
  const m = ledgerMember(club, year);
  const s = m ? ledgerLeague(m.key, year) : null;
  return s && m ? { ...s, canon: m.canon } : null;
}

/** The league to print for a club in the season starting in `year`: the
 *  ledgers' answer before LIST_SEASON (null when they place it nowhere),
 *  today's label from LIST_SEASON on. */
export function leagueInYear(club: { name: string; league: string }, year: number): string | null {
  if (year >= LIST_SEASON) return club.league || null;
  return clubLedgerSeason(club.name, year)?.name ?? null;
}

/** The same answer in the career list's spelling, the one the size, derby
 *  and division tables are keyed by ("Premier League" for the 1991-92
 *  First Division). */
export function leagueKeyInYear(club: { name: string; league: string }, year: number): string | null {
  if (year >= LIST_SEASON) return club.league || null;
  return clubLedgerSeason(club.name, year)?.key ?? null;
}

/** Whether a club may be named as part of league `key` in the season
 *  starting in `year`: before LIST_SEASON only when the ledgers put it
 *  there, from then on always (the career's own world). */
export function namedInLeague(club: string, key: string, year: number): boolean {
  return year >= LIST_SEASON || clubLedgerSeason(club, year)?.key === key;
}

/** "2009-10" for the season starting in 2009. */
export function seasonSpan(year: number): string {
  return `${year}-${String((year + 1) % 100).padStart(2, "0")}`;
}

/** The league line on a card for a season to come (an offer, a loan, the
 *  academy, a dugout job): "Premier League, 2009-10" before LIST_SEASON,
 *  nothing when the ledgers place the club in no league that season, and
 *  today's label alone from LIST_SEASON on, exactly as before. */
export function leagueSeasonLine(club: { name: string; league: string }, year: number): string | null {
  const name = leagueInYear(club, year);
  if (name === null || year >= LIST_SEASON) return name;
  return `${name}, ${seasonSpan(year)}`;
}

/** The league a played season's finish is printed in, or null. Before
 *  LIST_SEASON it is the ledgers' league, and only when the saved size
 *  agrees with that season's: a save from before Round 1037 drew its
 *  finish in today's league, and its "of 20" must not be printed beside
 *  a league of 24. The same holds from LIST_SEASON on, where an old save at
 *  one of the seven clubs Round 1037 relabelled still draws in the old
 *  label's league. `key` is what the phone's world is keyed by. */
export function finishLeague(club: { name: string; league: string }, year: number, savedSize: number | null): { key: string; name: string } | null {
  const key = leagueKeyInYear(club, year);
  const name = leagueInYear(club, year);
  if (key === null || name === null) return null;
  if (savedSize !== null && savedSize !== leagueSizeFor(key, year)) return null;
  return { key, name };
}

/* ─── Changing division ───
   The club's tier is its standing, a grade the job market and the board
   read; a division is where it plays. Only where the game knows both sides
   of a move does a season change the league: the Premier League's bottom
   three go down to the Championship and the Championship's top two go up
   automatically (a third club goes up through the play-offs, which the
   dugout does not play). Read 2026-10-06: rsssf.org/engpaul/FLA/2004-05.html
   (Sunderland and Wigan up, 18th to 20th down) and rsssf.org/tablese/
   eng2024.html (Leicester and Ipswich up, Luton, Burnley and Sheffield
   United 18th to 20th down); ESPN's 2023-24 tables (espn.com/soccer/
   standings/_/league/eng.1/season/2023, "Positions 18, 19, 20: Relegation";
   .../eng.2/season/2023, "Positions 1, 2: Promotion"). Only from 2004/05,
   the first season read and the first the second tier was called the
   Championship (the same window as its size above): a 1999 move would name
   a division that did not exist yet. Anywhere else, and before then, the
   club stays in its league, and the season says so in tiers, never in
   divisions. */
const DIVISION_UP: Record<string, string> = { "Championship": "Premier League" };
const DIVISION_DOWN: Record<string, string> = { "Premier League": "Championship" };
const DIVISION_FROM = 2004;

/** The league a finish moves his club to in the season starting in `year`,
 *  or null when it stays put. */
export function divisionMove(league: string | null, pos: number, size: number, year: number): { to: string; up: boolean } | null {
  if (league === null || year < DIVISION_FROM) return null;
  if (DIVISION_UP[league] && pos <= 2) return { to: DIVISION_UP[league], up: true };
  if (DIVISION_DOWN[league] && pos >= size - 2) return { to: DIVISION_DOWN[league], up: false };
  return null;
}

/** Where he finished, in words true of a league of any size, for a league
 *  whose size the game does not know: a position would claim a place that
 *  league may not have (18th of an Allsvenskan of 16). */
export function finishZone(pos: number, size: number): string {
  if (pos === 1) return "top of the table";
  if (pos === 2) return "second";
  if (pos >= size - 2) return "in the bottom three";
  return pos * 2 <= size ? "in the top half" : "in the bottom half";
}

export interface ManagerLeagueInput {
  clubs: readonly ClubData[];
  /** The club he manages, as the save holds it. */
  club: string;
  /** The league he plays in: the one his job came with, or the one a
   *  promotion or relegation took him to. Absent on saves from before 1029. */
  league?: string;
  /** The season's start year. */
  year: number;
  /** Round 1037: the league a promotion or relegation of the game's own
   *  just moved his club out of, so his club takes the place of a club
   *  that made that move for real. */
  from?: string;
  /** Round 1037: false when nothing the game played put his club in this
   *  league this season (the first season of a job, or the one after a
   *  season it could not name). A past season then follows the ledgers: the
   *  league the club was really in, and no league at all when they place it
   *  in none of the six. Absent means the game did put it there. */
  placed?: boolean;
}
export interface ManagerLeagueField {
  /** The league the season is played in, or null when nothing names it. */
  league: string | null;
  /** Round 1037: the name the league carried that season when the league
   *  ledgers hold it ("First Division" for the 1997 Championship). */
  leagueName?: string;
  /** Positions in the table, his own included. */
  size: number;
  /** True only when `size` is the league's verified size that season. */
  sizeVerified: boolean;
  /** The rivals named in this season's table, at most size - 1. */
  named: string[];
  /** True for a season before LIST_SEASON in a league the game holds: it
   *  knows neither who was in that league that season nor whether his club
   *  was, so the season names no rival and no league. */
  lineupUnknown: boolean;
}

/** The manager's league for one season. `rng` only draws which known clubs
 *  fill the table when the game knows more than it has room for. */
export function managerLeagueField(input: ManagerLeagueInput, rng: () => number): ManagerLeagueField {
  const world = adjustClubsForYear([...input.clubs], input.year);
  const mine = clubKey(input.club);
  /* the job's league first: the card showed it, so the table agrees with it */
  let league = input.league
    ? listLeague(input.clubs, input.league) ?? input.league
    : input.clubs.find(c => clubKey(c.name) === mine)?.league ?? null;
  /* Round 1037: a past season the game did not put his club in is played
     where the ledgers put the club; a job's label (today's) never seats a
     club in a past league it was not in. Placed in none of the six while the
     label names one of them, the season names no league and nobody, and no
     table moves the club (the label is kept, unprinted, for 2026-27 on). */
  if (input.placed === false && input.year < LIST_SEASON) {
    const real = clubLedgerSeason(input.club, input.year);
    if (real) league = real.key;
    else if (league !== null && ledgerLeague(league, input.year)) {
      return { league: null, size: MANAGER_FIELD, sizeVerified: false, named: [], lineupUnknown: true };
    }
  }
  /* Round 1037: a past season of a league the ledgers hold is that season's
     real field, never today's */
  const ledger = league !== null ? ledgerLeague(league, input.year) : null;
  if (ledger) return ledgerField(input, ledger);
  const inLeague = league !== null && world.some(c => c.league === league && clubKey(c.name) === mine);
  const myWords = nameWords(input.club);
  const rivals = league === null ? [] : world.filter(c => c.league === league && clubKey(c.name) !== mine
    && (inLeague || !nameWords(c.name).some(w => myWords.includes(w))));
  const names: string[] = [];
  const seen = new Set<string>();
  for (const c of rivals) {
    const k = clubKey(c.name);
    if (!seen.has(k)) { seen.add(k); names.push(c.name); }
  }
  const verified = league ? leagueSizeFor(league, input.year, true) : null;
  const size = verified ?? Math.max(MANAGER_FIELD, names.length + 1);
  if (names.length > size - 1) {
    for (let i = names.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [names[i], names[j]] = [names[j], names[i]];
    }
  }
  const lineupUnknown = input.year < LIST_SEASON && league !== null;
  return { league, size, sizeVerified: verified !== null, named: lineupUnknown ? [] : names.slice(0, size - 1), lineupUnknown };
}

/* Round 1037: the manager's table in a past season of a league the ledgers
   hold. Every place is one of that season's real clubs, named when the
   career world knows it and counted otherwise, at the season's verified
   size. His club sits where the simulation put it: in its own seat when it
   really was in the league that year, and otherwise in the seat of one of
   the real members, so no club is ever named in a league it was not in that
   season. The seat is a club that really made the move the game's own
   promotion or relegation just made for his (it arrived in this league that
   season from the league he came from), and when no such club exists, one
   drawn from the season's own seed. */
function ledgerField(input: ManagerLeagueInput, s: LedgerSeason): ManagerLeagueField {
  const me = clubLedgerSeason(input.club, input.year);
  const member = me !== null && me.key === s.key;
  /* the unnamed places are what is left: size - 1 - named */
  let named = s.clubs.filter(n => !(member && me.canon === n));
  if (!member) {
    const prev = ledgerByYear().get(input.year - 1);
    const seats = [
      ...s.clubs.map(n => ({ name: n as string | null, ids: [clubKey(n), `#${identityKey(n)}`] })),
      ...s.others.map(o => ({ name: null as string | null, ids: o.split("|").map(id => `#${id}`) })),
    ];
    const cameFrom = (ids: string[], key: string) => ids.some(id => prev?.get(id)?.key === key);
    const moved = input.from && input.from !== s.key
      ? seats.filter(seat => !cameFrom(seat.ids, s.key) && cameFrom(seat.ids, input.from as string))
      : [];
    const pool = moved.length ? moved : seats;
    const seat = pool[Math.floor(forkRng(`${input.club}|${input.year}|${s.key}|seat`)() * pool.length)];
    if (seat.name !== null) named = named.filter(n => n !== seat.name);
    /* the same club under a spelling no key caught never sits beside his
       own row: it keeps its place, unnamed */
    const myWords = nameWords(input.club);
    named = named.filter(n => !nameWords(n).some(w => myWords.includes(w)));
  }
  return { league: s.key, leagueName: s.name, size: s.size, sizeVerified: true, named, lineupUnknown: false };
}

/** One dugout season as the save holds it, old saves included. */
export interface DugoutTableRow {
  league?: unknown;
  leagueName?: unknown;
  sizeVerified?: unknown;
  leagueSize?: number;
  knownRivals?: unknown;
  lineupUnknown?: unknown;
  table?: { club: string; pts: number; pos: number; you?: boolean; unnamed?: boolean }[];
}
export interface DugoutTableWords {
  /** The heading over the table. */
  header: string;
  /** Whether any rival in the whole table carries a name. */
  named: boolean;
  /** A league whose size the game does not know: the order only, no
   *  position, points or record. */
  sizeUnknown: boolean;
  /** The line in place of the rows when nobody is named, or null. */
  note: string | null;
  /** The line over a named table of unknown size, or null. */
  orderNote: string | null;
}

/** The words around the dugout's final table, here rather than in the page
 *  so the harness reads exactly what the page prints. A season flagged
 *  lineupUnknown names no league in any of them. */
export function dugoutTableWords(last: DugoutTableRow): DugoutTableWords {
  /* Round 1037: a season the league ledgers hold prints the name the league
     carried that season */
  const held = typeof last.leagueName === "string" && last.leagueName ? last.leagueName
    : typeof last.league === "string" && last.league ? last.league : null;
  const league = last.lineupUnknown === true ? null : held;
  const table = last.table ?? [];
  const me = table.find(r => r.you);
  /* the whole table, not just the five rows kept (an older row only has
     those five to go on) */
  const named = typeof last.knownRivals === "number"
    ? last.knownRivals > 0
    : table.some(r => !r.you && !r.unnamed && r.club);
  const sizeUnknown = held !== null && last.sizeVerified !== true;
  const size = last.leagueSize ?? table.length;
  const why = last.lineupUnknown === true
    ? "We don't know who was in the league that year, so the rest of the field is counted, not named."
    : `We don't know enough ${league ? `${league} clubs` : "clubs in this league"} by name to draw the table.`;
  const where = !me ? "" : sizeUnknown ? `${finishZone(me.pos, size)}.`
    : `${ordinal(me.pos)}${last.sizeVerified === true && last.leagueSize ? ` of ${last.leagueSize}` : ""} on ${me.pts} points.`;
  return {
    header: `Final table${league ? ` · ${league}` : ""}`,
    named,
    sizeUnknown,
    note: !named && me ? `${why} You finished ${where}` : null,
    orderNote: named && sizeUnknown ? `The order only: we don't know how many clubs the ${league ?? "league"} has.` : null,
  };
}
