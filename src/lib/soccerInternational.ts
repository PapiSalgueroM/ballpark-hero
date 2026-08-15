/* ─── Round 124: a real international career ───────────────────────────────

   WHAT WAS HERE BEFORE

   Soccer Career already had a World Cup, but it was a tournament that only
   existed while the player was still in it. simulateWorldCup built a 32 team
   field, played the group stage, and then returned the moment the player's
   nation went out. Nobody lifted the trophy in the seasons you failed to
   reach the final, the other 31 nations' results were thrown away, and the
   whole thing only ran at all if you already had an international career.
   The continental championship was worse: one line of Math.random inside
   generateIntSeasonStats decided whether you had won "Continental
   Championship", with no opponents, no bracket, and the same generic name
   whether you played for Brazil or Japan. Qualifying was a single coin flip.
   There was no squad announcement, so once you were called up at 18 you were
   never dropped again.

   WHAT THIS FILE DOES

   The same job uclBracket does for the Champions League in clubManager.ts and
   buildCupBracket does for the domestic cup: a competition that crowns a
   winner every single time it is played, whether or not the player is
   anywhere near it. Every four years there is a World Cup, and two years
   later your nation's continental championship. You have to qualify, you have
   to be picked, and both of those can go against you.

   REAL WORLD FACTS USED HERE ARE ALL WEB VERIFIED. Sources are named on each
   table below. Nothing in this file is written from memory.
*/

/* ─── Confederations ─────────────────────────────────────────────────────── */

export type Confederation = 'UEFA' | 'CONMEBOL' | 'CAF' | 'AFC' | 'CONCACAF' | 'OFC';

/* Member counts per confederation, used to work out how hard it is to
   qualify out of each one. Source: the confederation pages on Wikipedia
   (en.wikipedia.org/wiki/UEFA, /CONMEBOL, /Confederation_of_African_Football,
   /Asian_Football_Confederation, /CONCACAF, /Oceania_Football_Confederation),
   read August 2026. */
export const CONFED_MEMBERS: Record<Confederation, number> = {
  UEFA: 55, CONMEBOL: 10, CAF: 54, AFC: 47, CONCACAF: 41, OFC: 11,
};

/* Which confederation each nation plays in. The nation names are exactly the
   ones the Soccer Career player picker offers (NATIONALITIES in
   src/pages/SoccerCareer.tsx), so this table and that list stay in step.

   The moves that people get wrong are all checked:
   Australia left the OFC for the AFC in 2006, Israel has been in UEFA since
   1974, and Kazakhstan moved from the AFC to UEFA in 2002. All three
   confirmed on en.wikipedia.org/wiki/Asian_Football_Confederation (member
   associations table), read August 2026. */
export const NATION_CONFED: Record<string, Confederation> = {
  // UEFA
  Albania: 'UEFA', Armenia: 'UEFA', Austria: 'UEFA', Azerbaijan: 'UEFA',
  Belarus: 'UEFA', Belgium: 'UEFA', 'Bosnia & Herzegovina': 'UEFA', Bulgaria: 'UEFA',
  Croatia: 'UEFA', Cyprus: 'UEFA', 'Czech Republic': 'UEFA', Denmark: 'UEFA',
  England: 'UEFA', Estonia: 'UEFA', 'Faroe Islands': 'UEFA', Finland: 'UEFA',
  France: 'UEFA', Georgia: 'UEFA', Germany: 'UEFA', Greece: 'UEFA',
  Hungary: 'UEFA', Iceland: 'UEFA', Ireland: 'UEFA', Israel: 'UEFA',
  Italy: 'UEFA', Kazakhstan: 'UEFA', Kosovo: 'UEFA', Latvia: 'UEFA',
  Liechtenstein: 'UEFA', Lithuania: 'UEFA', Luxembourg: 'UEFA', Malta: 'UEFA',
  Moldova: 'UEFA', Montenegro: 'UEFA', Netherlands: 'UEFA', 'North Macedonia': 'UEFA',
  'Northern Ireland': 'UEFA', Norway: 'UEFA', Poland: 'UEFA', Portugal: 'UEFA',
  Romania: 'UEFA', Russia: 'UEFA', Scotland: 'UEFA', Serbia: 'UEFA',
  Slovakia: 'UEFA', Slovenia: 'UEFA', Spain: 'UEFA', Sweden: 'UEFA',
  Switzerland: 'UEFA', Turkey: 'UEFA', Ukraine: 'UEFA', Wales: 'UEFA',
  // CONMEBOL
  Argentina: 'CONMEBOL', Bolivia: 'CONMEBOL', Brazil: 'CONMEBOL', Chile: 'CONMEBOL',
  Colombia: 'CONMEBOL', Ecuador: 'CONMEBOL', Paraguay: 'CONMEBOL', Peru: 'CONMEBOL',
  Uruguay: 'CONMEBOL', Venezuela: 'CONMEBOL',
  // CAF
  Algeria: 'CAF', Angola: 'CAF', Benin: 'CAF', 'Burkina Faso': 'CAF',
  Cameroon: 'CAF', 'Cape Verde': 'CAF', Comoros: 'CAF', Congo: 'CAF',
  'DR Congo': 'CAF', Egypt: 'CAF', Ethiopia: 'CAF', Gabon: 'CAF',
  Ghana: 'CAF', Guinea: 'CAF', 'Guinea-Bissau': 'CAF', 'Ivory Coast': 'CAF',
  Kenya: 'CAF', Liberia: 'CAF', Libya: 'CAF', Madagascar: 'CAF',
  Mali: 'CAF', Morocco: 'CAF', Mozambique: 'CAF', Nigeria: 'CAF',
  Senegal: 'CAF', 'Sierra Leone': 'CAF', 'South Africa': 'CAF', Tanzania: 'CAF',
  'The Gambia': 'CAF', Togo: 'CAF', Tunisia: 'CAF', Uganda: 'CAF',
  Zambia: 'CAF', Zimbabwe: 'CAF',
  // AFC
  Australia: 'AFC', Bahrain: 'AFC', China: 'AFC', India: 'AFC',
  Indonesia: 'AFC', Iran: 'AFC', Iraq: 'AFC', Japan: 'AFC',
  Jordan: 'AFC', Kuwait: 'AFC', Lebanon: 'AFC', 'North Korea': 'AFC',
  Oman: 'AFC', Philippines: 'AFC', Qatar: 'AFC', 'Saudi Arabia': 'AFC',
  'South Korea': 'AFC', Tajikistan: 'AFC', Thailand: 'AFC',
  'United Arab Emirates': 'AFC', Uzbekistan: 'AFC', Vietnam: 'AFC',
  // Both play Asian Cup and AFC World Cup qualifying, both are inside the
  // published world top 100, so both are here as opponents.
  Syria: 'AFC', Palestine: 'AFC',
  // CONCACAF
  Canada: 'CONCACAF', 'Costa Rica': 'CONCACAF', Cuba: 'CONCACAF', 'Curaçao': 'CONCACAF',
  'Dominican Republic': 'CONCACAF', 'El Salvador': 'CONCACAF', Guatemala: 'CONCACAF',
  Haiti: 'CONCACAF', Honduras: 'CONCACAF', Jamaica: 'CONCACAF', Mexico: 'CONCACAF',
  Panama: 'CONCACAF', Suriname: 'CONCACAF', 'Trinidad and Tobago': 'CONCACAF', USA: 'CONCACAF',
  /* OFC. New Zealand is the only Oceanian side the player picker offers, but
     a confederation of one cannot run a qualifying group, so the other ten
     full members are here as opponents. List and count from
     en.wikipedia.org/wiki/Oceania_Football_Confederation (11 full members),
     read August 2026. */
  'New Zealand': 'OFC', 'New Caledonia': 'OFC', Tahiti: 'OFC', Fiji: 'OFC',
  'Solomon Islands': 'OFC', 'Papua New Guinea': 'OFC', Vanuatu: 'OFC',
  Samoa: 'OFC', 'American Samoa': 'OFC', 'Cook Islands': 'OFC', Tonga: 'OFC',
};

/** Anyone we have no confederation for plays their football in Europe, which
    is where the club data is deepest. Only reached by nations outside the
    player picker. */
export function confederationOf(nation: string): Confederation {
  return NATION_CONFED[nation] ?? 'UEFA';
}

/** Every nation we know, grouped by confederation. Built once. */
const CONFED_POOL: Record<Confederation, string[]> = {
  UEFA: [], CONMEBOL: [], CAF: [], AFC: [], CONCACAF: [], OFC: [],
};
for (const [nation, conf] of Object.entries(NATION_CONFED)) CONFED_POOL[conf].push(nation);

export function nationsIn(conf: Confederation): string[] {
  return CONFED_POOL[conf];
}

/* ─── Nation strength, from the actual FIFA ranking ──────────────────────── */

/* THESE ARE REAL PUBLISHED RATING POINTS, NOT INVENTED ONES.

   The full top 100 of the FIFA/Coca-Cola Men's World Ranking, taken from ONE
   release rather than blended from several, because mixing dates puts nations
   in the wrong order. Read from football-ranking.com/fifa-world-rankings
   (7 October 2026 snapshot, positions 1 to 100 with points).

   Cross checked two ways so this is the published table and not one site's
   typo: givemesport.com/fifa-world-rankings (9 August 2026) matches to the
   decimal for positions 41 to 50 and for the top of the table, and
   visualcapitalist.com/ranked-fifa-world-rankings-after-2026-world-cup
   (the 20 July 2026 release) matches for all 35 nations it lists.

   POINTS MATTER MORE THAN POSITION. FIFA's ranking has been an Elo system
   since August 2018 (en.wikipedia.org/wiki/FIFA_Men's_World_Ranking), so the
   points ARE a strength rating. Spain and England are 73 points apart while
   Spain and Peru are 538 apart. Ranking position alone would have said 1st
   against 4th and 1st against 50th, which made the sim treat England like a
   mid table side.

   Nation names are the game's spellings, which is what the player picker in
   src/pages/SoccerCareer.tsx uses. Where the ranking spells one differently
   the source name is on the line. */
const FIFA_POINTS: Record<string, number> = {
  Spain: 1995.88, Argentina: 1970.37, France: 1948.97, England: 1922.83, Brazil: 1804.92,
  Morocco: 1803.99, Portugal: 1787.85, Belgium: 1778.36, Netherlands: 1775.54, Mexico: 1754.30,
  Colombia: 1739.89, Germany: 1726.22, Croatia: 1723.05, Switzerland: 1710.88, Italy: 1704.73,
  USA: 1690.33, Japan: 1673.68, Senegal: 1653.43, Norway: 1651.29, Uruguay: 1634.70,
  Denmark: 1619.47, Iran: 1609.85, Austria: 1598.82, Egypt: 1597.04, Ecuador: 1592.59,
  Nigeria: 1585.02, Turkey: 1582.54, Australia: 1581.51, Algeria: 1576.80, Canada: 1571.34,
  'Ivory Coast': 1565.47, 'South Korea': 1558.72, Ukraine: 1549.29, Paraguay: 1542.48, Russia: 1529.60,
  Poland: 1526.18, Sweden: 1525.58, Wales: 1516.95, Hungary: 1506.39, Serbia: 1502.13,
  'DR Congo': 1495.48, Scotland: 1491.22, Cameroon: 1481.24, Panama: 1478.41, Slovakia: 1473.66,
  Greece: 1473.19, Venezuela: 1469.18, 'Czech Republic': 1467.26, Chile: 1458.20, Peru: 1457.69,
  'Costa Rica': 1456.03, Romania: 1455.89, Mali: 1455.59, 'South Africa': 1451.24,
  Ireland: 1441.10,            // listed as Republic of Ireland
  Slovenia: 1441.09, Tunisia: 1426.58, 'Saudi Arabia': 1425.52, Qatar: 1411.06, Uzbekistan: 1409.73,
  'Bosnia & Herzegovina': 1408.93, 'Burkina Faso': 1406.99, Iraq: 1404.17,
  'Cape Verde': 1402.97,       // listed as Cabo Verde
  Ghana: 1387.00, Honduras: 1378.97, Albania: 1376.03, 'United Arab Emirates': 1370.47,
  'North Macedonia': 1369.16, 'Northern Ireland': 1365.30, Jamaica: 1357.84, Georgia: 1355.26,
  Jordan: 1350.41, Iceland: 1342.77, Finland: 1341.92, Israel: 1333.90, Bolivia: 1326.00,
  Kosovo: 1319.12, Oman: 1306.90, Montenegro: 1301.98, Guinea: 1295.60, 'Curaçao': 1285.64,
  Syria: 1283.05, Gabon: 1272.51, Bulgaria: 1271.68, 'New Zealand': 1269.80, Angola: 1265.58,
  Haiti: 1264.58, Uganda: 1264.09, Thailand: 1256.73, Zambia: 1255.82,
  China: 1254.81,              // listed as China PR
  Bahrain: 1254.41, Benin: 1252.17, Palestine: 1243.71, Belarus: 1242.88, Guatemala: 1238.74,
  Luxembourg: 1232.82, Vietnam: 1230.67, 'El Salvador': 1225.34,
};

/* A nation outside the published top 100 gets this. It is NOT a FIFA figure
   and is not presented as one: it is a deliberate floor a little below 100th
   place, so a nation we have no real number for is never accidentally treated
   as a good side. */
const UNLISTED_POINTS = 1180;

export function fifaPointsOf(nation: string): number {
  return FIFA_POINTS[nation] ?? UNLISTED_POINTS;
}

/** True when the number above is a real published figure rather than the floor. */
export function hasPublishedRank(nation: string): boolean {
  return FIFA_POINTS[nation] !== undefined;
}

/** World ranking position, worked out from the points table itself so it can
    never drift out of step with it. Anything unlisted reports as 101st. */
const RANK_ORDER = Object.entries(FIFA_POINTS).sort((a, b) => b[1] - a[1]).map(e => e[0]);
export function fifaRankOf(nation: string): number {
  const i = RANK_ORDER.indexOf(nation);
  return i < 0 ? RANK_ORDER.length + 1 : i + 1;
}

/* Rating points onto the 0 to 99 scale the rest of the game speaks. The
   published table runs from about 1996 down to 1225 at 100th place, and that
   whole span maps onto roughly 58 to 92, so Spain is a 92 and a nation nobody
   has heard of is a 58. Stable for a given nation, unlike the old
   getNationStrength, which rolled a fresh random number every time it was
   called, so the same nation could be strong in the group stage and weak in
   the final of the very same tournament. */
export function nationStrength(nation: string): number {
  const pts = fifaPointsOf(nation);
  return Math.round(clamp(60 + ((pts - 1300) / 700) * 32, 55, 95) * 10) / 10;
}

/* ─── The tournament calendar ────────────────────────────────────────────── */

export type TournamentKind = 'World Cup' | 'Continental';

export interface TournamentFormat {
  /** Player facing name, for example "World Cup" or "Africa Cup of Nations". */
  name: string;
  /** Short label for tiles and timeline rows. */
  short: string;
  kind: TournamentKind;
  confederation: Confederation | null;
  /** Nations in the finals. */
  teams: number;
  /** Groups of four. */
  groups: number;
  /** Third placed sides that also go through. */
  thirdsThrough: number;
  /** How many of the confederation's members reach the finals, for qualifying. */
  finalists: number;
}

/* WORLD CUP, 48 teams from 2026 on.
   Source: en.wikipedia.org/wiki/2026_FIFA_World_Cup, read August 2026:
   48 teams, 12 groups of 4, "top 2 teams in each group and the 8 best
   third-place teams progressing to a new round of 32", 104 matches. This is
   NOT the old 32 team format, which is what the game used to run. */
const WORLD_CUP: TournamentFormat = {
  name: 'World Cup', short: 'World Cup', kind: 'World Cup', confederation: null,
  teams: 48, groups: 12, thirdsThrough: 8, finalists: 48,
};

/* CONTINENTAL CHAMPIONSHIPS. Every format below is web verified.

   UEFA European Championship: 24 teams, six groups of four, group winners,
   runners up and the four best third placed sides go to a round of 16.
   Source: en.wikipedia.org/wiki/UEFA_European_Championship.

   Copa América: 16 teams in the 2016 and 2024 editions, ten from CONMEBOL
   plus six CONCACAF guests, four groups of four, top two to the quarter
   finals with no third placed qualifiers.
   Source: en.wikipedia.org/wiki/2024_Copa_América.

   Africa Cup of Nations: 24 teams, six groups of four, top two plus the four
   best thirds to a round of 16. CAF confirmed in December 2025 that AFCON
   becomes a four yearly tournament from 2028 in even numbered years, with
   2027 the last odd year edition.
   Sources: en.wikipedia.org/wiki/Africa_Cup_of_Nations and
   en.wikipedia.org/wiki/2027_Africa_Cup_of_Nations.

   AFC Asian Cup: 24 teams since 2019, six groups of four, top two plus four
   best thirds to a round of 16. Held in 2019, 2023 and next in 2027.
   Source: en.wikipedia.org/wiki/AFC_Asian_Cup.

   CONCACAF Gold Cup: 16 teams since 2019, four groups of four, group winners
   and runners up to an eight team knockout. Held every two years, 2023, 2025,
   2027. Source: en.wikipedia.org/wiki/CONCACAF_Gold_Cup.

   OFC Nations Cup: eight nations in the 2024 edition. Its schedule has been
   irregular (the 2020 edition was cancelled), so the game runs it on the same
   mid cycle summer as the other continental tournaments rather than pretending
   to a fixed real calendar it does not have.
   Source: en.wikipedia.org/wiki/OFC_Nations_Cup. */
const CONTINENTAL: Record<Confederation, TournamentFormat> = {
  UEFA: {
    name: 'European Championship', short: 'Euros', kind: 'Continental', confederation: 'UEFA',
    teams: 24, groups: 6, thirdsThrough: 4, finalists: 24,
  },
  CONMEBOL: {
    name: 'Copa América', short: 'Copa América', kind: 'Continental', confederation: 'CONMEBOL',
    teams: 16, groups: 4, thirdsThrough: 0, finalists: 10,
  },
  CAF: {
    name: 'Africa Cup of Nations', short: 'AFCON', kind: 'Continental', confederation: 'CAF',
    teams: 24, groups: 6, thirdsThrough: 4, finalists: 24,
  },
  AFC: {
    name: 'Asian Cup', short: 'Asian Cup', kind: 'Continental', confederation: 'AFC',
    teams: 24, groups: 6, thirdsThrough: 4, finalists: 24,
  },
  CONCACAF: {
    name: 'Gold Cup', short: 'Gold Cup', kind: 'Continental', confederation: 'CONCACAF',
    teams: 16, groups: 4, thirdsThrough: 0, finalists: 16,
  },
  OFC: {
    name: 'OFC Nations Cup', short: 'Nations Cup', kind: 'Continental', confederation: 'OFC',
    teams: 8, groups: 2, thirdsThrough: 0, finalists: 8,
  },
};

/* World Cups land on 2026, 2030, 2034, so year % 4 === 2. The continental
   summer is two years later, year % 4 === 0, which is exactly right for the
   Euros (2024, 2028), Copa América (2024, 2028) and AFCON from 2028 on. The
   Asian Cup really runs in 2027 and 2031, and the Gold Cup every odd year, so
   for AFC and CONCACAF nations the game moves them onto the same mid cycle
   summer as everyone else. That is a deliberate simplification for a game
   that plays one season a year, and it is called out here rather than passed
   off as the real calendar. */
export function isWorldCupYear(year: number): boolean {
  return year % 4 === 2;
}
export function isContinentalYear(year: number): boolean {
  return year % 4 === 0;
}

/** The tournament a given nation plays this year, or null for an off year. */
export function tournamentForYear(nation: string, year: number): TournamentFormat | null {
  if (isWorldCupYear(year)) return WORLD_CUP;
  if (isContinentalYear(year)) return CONTINENTAL[confederationOf(nation)];
  return null;
}

/* World Cup places by confederation for a 48 team finals. Source: the slot
   allocation table on en.wikipedia.org/wiki/2026_FIFA_World_Cup_qualification,
   from the FIFA Council decision of 9 May 2017: AFC 8, CAF 9, CONCACAF 3 plus
   3 host places, CONMEBOL 6, OFC 1, UEFA 16, and two more decided by an inter
   confederation play off. The three host places were a one off for 2026, but
   with CONCACAF's two play off entries the confederation lands on six either
   way, which is what is used here. Adds up to 46 plus the 2 play off places. */
export const WC_SLOTS: Record<Confederation, number> = {
  UEFA: 16, CAF: 9, AFC: 8, CONMEBOL: 6, CONCACAF: 6, OFC: 1,
};
const WC_PLAYOFF_SLOTS = 2;

/* ─── Small helpers ──────────────────────────────────────────────────────── */

const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Knuth's Poisson. Football scores are Poisson shaped, and rolling one gives
    0-0 and 4-1 at roughly the rates real football produces them. */
function poisson(mean: number): number {
  const l = Math.exp(-Math.max(0.05, mean));
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > l && k < 12);
  return k - 1;
}

/* ─── Types the rest of the game sees ────────────────────────────────────── */

export type IntlRound = 'R32' | 'R16' | 'QF' | 'SF' | 'F';

export interface IntlTie {
  round: IntlRound;
  slot: number;
  home: string;
  away: string;
  homeGoals: number | null;
  awayGoals: number | null;
  pens?: boolean;
  winner: string | null;
  /** True when this is my nation's tie, settled by my own match. */
  mine: boolean;
}

export interface IntlTableRow {
  nation: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
}

export interface IntlMatch {
  round: string;
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
  pens: boolean;
  playerGoals: number;
  playerAssists: number;
  playerRating: number;
}

export interface QualifyingCampaign {
  confederation: Confederation;
  /** Nations in my qualifying group, results included. */
  table: IntlTableRow[];
  myPosition: number;
  /** How many of the group go through, derived from the real slot counts. */
  through: number;
  qualified: boolean;
  /** Set when the nation is in a confederation whose members all go straight
      to the finals, like CONMEBOL at the Copa América. */
  automatic: boolean;
}

export interface SquadCall {
  called: boolean;
  role: 'Captain' | 'Starter' | 'Squad player' | 'Fringe' | null;
  /** Plain English line for the announcement screen. */
  reason: string;
  /** Where I ranked among my nation's players in my position group. */
  myRank: number;
  poolSize: number;
  /** Places going in my position group. */
  places: number;
  /** My score and the score of the player who took the last place. */
  myScore: number;
  cutScore: number;
}

export interface IntlTournament {
  year: number;
  name: string;
  short: string;
  kind: TournamentKind;
  confederation: Confederation | null;
  nation: string;
  teams: number;
  qualifying: QualifyingCampaign;
  qualified: boolean;
  squad: SquadCall | null;
  /** My nation's group table, empty when they are not there. */
  groupTable: IntlTableRow[];
  bracket: IntlTie[];
  champion: string;
  runnerUp: string;
  /** "Did Not Qualify" | "Not Selected" | "Group Stage" | "Round of 32" |
      "Round of 16" | "Quarter-final" | "Semi-final" | "Runner-up" | "Winner" */
  myResult: string;
  matches: IntlMatch[];
  playerApps: number;
  playerGoals: number;
  playerAssists: number;
  playerAvgRating: number;
  goldenBoot: boolean;
  bestPlayer: boolean;
}

/** The compact row kept forever. Full brackets are only held for the most
    recent tournament, so a twenty year career does not bloat the save. */
export interface IntlHistoryEntry {
  year: number;
  short: string;
  nation: string;
  champion: string;
  myResult: string;
  apps: number;
  goals: number;
}

/** `eligible` is false for a player with no international career at all. His
    history still records who won, but the result column stays blank rather
    than saying "Not Selected", because he was never in the conversation. */
export function toHistoryEntry(t: IntlTournament, eligible = true): IntlHistoryEntry {
  return {
    year: t.year, short: t.short, nation: t.nation, champion: t.champion,
    myResult: eligible ? t.myResult : '', apps: t.playerApps, goals: t.playerGoals,
  };
}

/* ─── One match ──────────────────────────────────────────────────────────── */

/** A neutral tournament match between two nations. `bonus` is my own effect on
    my nation's expected goals, and is zero for every match I am not in. */
function simMatch(
  strA: number, strB: number, knockout: boolean, bonusA = 0, bonusB = 0,
): { a: number; b: number; pens: boolean; aWins: boolean } {
  // Expected goals scale MULTIPLICATIVELY with the gap, not additively. An
  // even game is 1.35 each; ten points of ranking strength turns that into
  // about 1.8 against 1.0, and twenty five points into 2.6 against 0.7, which
  // is what a top nation actually does to a minnow. An additive model made
  // every game a coin flip and left Japan missing World Cups.
  const d = (strA - strB) / 10;
  const a = poisson(Math.max(0.2, 1.35 * Math.exp(0.26 * d) + bonusA));
  const b = poisson(Math.max(0.2, 1.35 * Math.exp(-0.26 * d) + bonusB));
  if (knockout && a === b) {
    /* Knockout football always produces a winner, and level means penalties.
       The stronger side is only slightly favoured, the way a shootout is.

       The SCORE STAYS LEVEL. An earlier version of this bumped the winner's
       goal tally by one, which meant a shootout was stored as a 2-1 and the
       bracket read as if somebody had won it in normal time. The Round 124
       harness caught that on its first run. */
    const diff = (strA - strB) / 100;
    return { a, b, pens: true, aWins: Math.random() < 0.5 + clamp(diff, -0.25, 0.25) * 0.4 };
  }
  return { a, b, pens: false, aWins: a > b };
}

/* ─── The player's own game ──────────────────────────────────────────────── */

export interface PlayerForm {
  overall: number;
  position: string;
  /** Last club season's average rating, used as form. */
  lastRating: number;
  /** Last club season's goals, used as form. */
  lastGoals: number;
  age: number;
  isCaptain: boolean;
}

const ATTACKERS = ['ST', 'CAM', 'LW', 'RW'];
const MIDFIELDERS = ['CM', 'CDM'];

function positionGroup(pos: string): 'GK' | 'DEF' | 'MID' | 'ATT' {
  if (pos === 'GK') return 'GK';
  if (ATTACKERS.includes(pos)) return 'ATT';
  if (MIDFIELDERS.includes(pos)) return 'MID';
  return 'DEF';
}

/* A 26 player squad, which is what the last two World Cups have used, split
   the way a manager actually splits one: three keepers, then defenders,
   midfielders and forwards. */
const SQUAD_PLACES: Record<'GK' | 'DEF' | 'MID' | 'ATT', number> = {
  GK: 3, DEF: 9, MID: 8, ATT: 6,
};

/** What the player does in one international match. */
function playerMatchStats(form: PlayerForm, teamGoals: number): { goals: number; assists: number; rating: number } {
  const grp = positionGroup(form.position);
  const quality = clamp((form.overall - 68) / 28, 0, 1.2);
  // A striker cannot score goals his team did not score.
  const share = grp === 'ATT' ? 0.55 : grp === 'MID' ? 0.25 : grp === 'DEF' ? 0.12 : 0;
  let goals = 0;
  for (let i = 0; i < teamGoals; i++) if (Math.random() < share * (0.6 + quality * 0.6)) goals++;
  let assists = 0;
  const aShare = grp === 'ATT' ? 0.2 : grp === 'MID' ? 0.3 : grp === 'DEF' ? 0.12 : 0.02;
  for (let i = 0; i < teamGoals - goals; i++) if (Math.random() < aShare * (0.6 + quality * 0.6)) assists++;
  const rating = clamp(
    6.2 + quality * 0.9 + goals * 0.55 + assists * 0.3 + (Math.random() - 0.45) * 1.1,
    4.0, 10.0,
  );
  return { goals, assists, rating: Math.round(rating * 10) / 10 };
}

/** How much a player lifts his own nation's expected goals in a match. A
    generational forward is worth most of a goal a game, an honest squad
    defender almost nothing. */
function playerLift(form: PlayerForm | null): number {
  if (!form) return 0;
  const grp = positionGroup(form.position);
  const weight = grp === 'ATT' ? 1 : grp === 'MID' ? 0.7 : grp === 'DEF' ? 0.35 : 0.3;
  return clamp((form.overall - 74) / 24, 0, 1) * 0.65 * weight;
}

/* ─── Qualifying ─────────────────────────────────────────────────────────── */

/** How many of a six nation qualifying group go through, scaled from the real
    number of finals places that confederation gets against how many members
    it has. UEFA sends 16 of 55 to a World Cup so roughly two of any six go
    through; CONMEBOL sends 6 of 10 so most of a group does; CONCACAF sends
    far fewer than its size suggests, so its groups are brutal. */
function throughPerGroup(conf: Confederation, finalists: number): number {
  const members = CONFED_MEMBERS[conf];
  const share = Math.min(1, finalists / members);
  return clamp(Math.round(6 * share), 1, 5);
}

/** How many of a confederation's members reach the finals of a tournament. */
function finalistsFor(fmt: TournamentFormat, conf: Confederation): number {
  if (fmt.kind === 'World Cup') return WC_SLOTS[conf] + WC_PLAYOFF_SLOTS / 6;
  return fmt.finalists;
}

/** A seeded six nation group, drawn the way real qualifying draws are: sort
    the confederation by strength, cut it into six pots, take one from each.
    My nation goes in and displaces whoever came out of its own pot, so a top
    seed always faces weaker pots and a minnow always faces a giant. */
function drawQualifyingGroup(nation: string, conf: Confederation): string[] {
  const pool = nationsIn(conf).filter(n => n !== nation);
  const ranked = [...pool].sort((a, b) => fifaRankOf(a) - fifaRankOf(b));
  const potSize = Math.max(1, Math.ceil(ranked.length / 6));
  const group: string[] = [nation];
  // Which pot my own nation would sit in.
  const allRanked = [...nationsIn(conf)].sort((a, b) => fifaRankOf(a) - fifaRankOf(b));
  const myPot = Math.min(5, Math.floor(allRanked.indexOf(nation) / Math.max(1, Math.ceil(allRanked.length / 6))));
  for (let pot = 0; pot < 6; pot++) {
    if (pot === myPot) continue;
    const slice = ranked.slice(pot * potSize, (pot + 1) * potSize).filter(n => !group.includes(n));
    if (!slice.length) continue;
    group.push(slice[Math.floor(Math.random() * slice.length)]);
  }
  // Thin confederations (CONMEBOL has ten members, OFC eleven) can come up
  // short. Fill from whoever is left rather than hand back a small group.
  const rest = shuffle(pool.filter(n => !group.includes(n)));
  while (group.length < 6 && rest.length) group.push(rest.pop() as string);
  return group;
}

function blankTable(nations: string[]): IntlTableRow[] {
  return nations.map(n => ({ nation: n, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 }));
}

function applyResult(table: IntlTableRow[], home: string, away: string, hg: number, ag: number): void {
  const h = table.find(r => r.nation === home);
  const a = table.find(r => r.nation === away);
  if (!h || !a) return;
  h.played++; a.played++;
  h.gf += hg; h.ga += ag; a.gf += ag; a.ga += hg;
  if (hg > ag) { h.won++; a.lost++; h.points += 3; }
  else if (hg < ag) { a.won++; h.lost++; a.points += 3; }
  else { h.drawn++; a.drawn++; h.points++; a.points++; }
}

function sortTable(table: IntlTableRow[]): IntlTableRow[] {
  return [...table].sort((x, y) =>
    y.points - x.points ||
    (y.gf - y.ga) - (x.gf - x.ga) ||
    y.gf - x.gf ||
    fifaRankOf(x.nation) - fifaRankOf(y.nation));
}

/**
 * A qualifying campaign your nation can actually fail. Six nations, home and
 * away, real table, and the top few go to the finals.
 */
export function runQualifying(
  nation: string, fmt: TournamentFormat, form: PlayerForm | null,
): QualifyingCampaign {
  const conf = confederationOf(nation);
  // Every CONMEBOL side plays the Copa América, so there is nothing to
  // qualify for. Same idea for the OFC's eight nation Nations Cup.
  const automatic = fmt.kind === 'Continental' && fmt.finalists >= CONFED_MEMBERS[conf];
  const group = drawQualifyingGroup(nation, conf);
  const table = blankTable(group);
  const lift = playerLift(form);
  for (let i = 0; i < group.length; i++) {
    for (let j = 0; j < group.length; j++) {
      if (i === j) continue;
      const home = group[i], away = group[j];
      // Home advantage is worth about a third of a goal, and my own lift only
      // applies to my nation.
      const r = simMatch(
        nationStrength(home) + 3, nationStrength(away), false,
        home === nation ? lift : 0, away === nation ? lift : 0,
      );
      applyResult(table, home, away, r.a, r.b);
    }
  }
  const sorted = sortTable(table);
  const myPosition = sorted.findIndex(r => r.nation === nation) + 1;
  const through = automatic ? 6 : throughPerGroup(conf, finalistsFor(fmt, conf));
  return {
    confederation: conf, table: sorted, myPosition, through,
    qualified: automatic || myPosition <= through, automatic,
  };
}

/* ─── The squad announcement ─────────────────────────────────────────────── */

/**
 * Being left out of a squad is one of the most real things in football, so it
 * is decided the way a manager decides it: your rating and your form against
 * the other players your nation has in your position. No coin flip. A weak
 * nation will take a 72 rated forward without blinking; Spain will not.
 */
export function pickSquad(nation: string, form: PlayerForm | null): SquadCall {
  const grp = form ? positionGroup(form.position) : 'ATT';
  const places = SQUAD_PLACES[grp];
  const str = nationStrength(nation);
  /* The nation's other options in this position, best first. A nation's team
     rating and an individual player's overall are NOT the same scale: Spain
     is a 92 as a team but their best forward is an 88, and a 60 rated nation
     still has a 70 rated best player. This maps one onto the other, so a
     nation's first choice runs from about 88 at the top of the world down to
     about 70 at the bottom, and each name after that is a step weaker. */
  const poolTop = 0.65 * str + 28.6;
  const poolSize = places * 2 + 2;
  const rivals: number[] = [];
  for (let i = 0; i < poolSize - 1; i++) {
    rivals.push(poolTop - i * 1.4 + (Math.random() * 4 - 2));
  }
  if (!form) {
    return {
      called: false, role: null, myRank: poolSize, poolSize, places,
      myScore: 0, cutScore: Math.round(rivals[places - 1] ?? str),
      reason: `You are not in the ${nation} setup.`,
    };
  }
  // Form is the last club season: a rating above 7.0 and goals both help, and
  // a bad year genuinely costs you your place.
  const formBonus = clamp((form.lastRating - 6.9) * 4, -6, 6)
    + clamp(form.lastGoals * 0.12, 0, 4);
  // Managers are loyal to a captain and wary of a body that is going.
  const agePenalty = form.age >= 36 ? 5 : form.age >= 34 ? 2.5 : 0;
  const captainBonus = form.isCaptain ? 3 : 0;
  const myScore = form.overall + formBonus + captainBonus - agePenalty;
  const better = rivals.filter(r => r > myScore).length;
  const myRank = better + 1;
  const cut = [...rivals].sort((a, b) => b - a)[places - 1] ?? 0;
  const called = myRank <= places;
  let role: SquadCall['role'] = null;
  if (called) {
    if (form.isCaptain) role = 'Captain';
    else if (myRank === 1) role = 'Starter';
    else if (myRank <= Math.max(1, Math.ceil(places / 2))) role = 'Starter';
    else role = 'Squad player';
  }
  const reason = called
    ? myRank === 1
      ? `You are ${nation}'s first choice in your position.`
      : `You made it as number ${myRank} of ${places} in your position.`
    : `You came ${myRank}th in your position and ${nation} named ${places}. Not this time.`;
  return {
    called, role, reason, myRank, poolSize, places,
    myScore: Math.round(myScore), cutScore: Math.round(cut),
  };
}

/* ─── Building the finals field ──────────────────────────────────────────── */

/** Pick n nations from a pool, strongly favouring the better ranked ones but
    leaving room for a surprise qualifier, and always keeping `forced` in. */
function pickField(pool: string[], n: number, forced: string | null): string[] {
  const out: string[] = [];
  if (forced && pool.includes(forced)) out.push(forced);
  const rest = pool.filter(p => !out.includes(p));
  // Weight is 1/rank, so the top nations nearly always come through and the
  // bottom of the confederation occasionally does.
  const weighted = rest
    .map(nation => ({ nation, w: (1 / Math.sqrt(fifaRankOf(nation))) * (0.55 + Math.random()) }))
    .sort((a, b) => b.w - a.w);
  for (const w of weighted) {
    if (out.length >= n) break;
    out.push(w.nation);
  }
  return out.slice(0, n);
}

/** The finals field. The World Cup fills from every confederation using the
    real slot counts; a continental fills from its own confederation, with the
    Copa América's six CONCACAF guests modelled because that is the real
    format. */
function buildField(fmt: TournamentFormat, nation: string, qualified: boolean): string[] {
  const forced = qualified ? nation : null;
  if (fmt.kind === 'World Cup') {
    const field: string[] = [];
    const myConf = confederationOf(nation);
    for (const conf of Object.keys(WC_SLOTS) as Confederation[]) {
      const slots = WC_SLOTS[conf];
      const picked = pickField(nationsIn(conf), slots, conf === myConf ? forced : null);
      field.push(...picked);
    }
    // The two inter confederation play off places go to whoever is left.
    const leftovers = Object.keys(WC_SLOTS)
      .flatMap(c => nationsIn(c as Confederation))
      .filter(n => !field.includes(n));
    field.push(...pickField(leftovers, WC_PLAYOFF_SLOTS, null));
    // Our nation list is smaller than FIFA's 211, so top the field up rather
    // than run a short World Cup.
    let filler = 1;
    while (field.length < fmt.teams) field.push(`Invitational XI ${filler++}`);
    return field.slice(0, fmt.teams);
  }
  const conf = fmt.confederation ?? confederationOf(nation);
  if (conf === 'CONMEBOL') {
    // 2024 format: ten CONMEBOL sides plus six CONCACAF guests.
    const home = pickField(nationsIn('CONMEBOL'), Math.min(10, fmt.teams), forced);
    const guests = pickField(nationsIn('CONCACAF'), fmt.teams - home.length, null);
    return [...home, ...guests];
  }
  const field = pickField(nationsIn(conf), fmt.teams, forced);
  let filler = 1;
  while (field.length < fmt.teams) field.push(`Invitational XI ${filler++}`);
  return field;
}

/* ─── The tournament ─────────────────────────────────────────────────────── */

const KO_ORDER: IntlRound[] = ['R32', 'R16', 'QF', 'SF', 'F'];

const EXIT_LABEL: Record<IntlRound, string> = {
  R32: 'Round of 32', R16: 'Round of 16', QF: 'Quarter-final', SF: 'Semi-final', F: 'Runner-up',
};

/** The knockout round a field of n teams starts in. */
function firstRoundFor(n: number): IntlRound {
  if (n >= 32) return 'R32';
  if (n >= 16) return 'R16';
  if (n >= 8) return 'QF';
  return 'SF';
}

/**
 * Play a whole international tournament and crown a champion, every time,
 * whether or not the player is in it. Same shape as advanceCupBracket in
 * clubManager.ts: everybody else's ties are settled by the sim, my nation's
 * are settled by my match.
 */
export function simulateTournament(
  nation: string, fmt: TournamentFormat, year: number,
  qualifying: QualifyingCampaign, squad: SquadCall | null, form: PlayerForm | null,
): IntlTournament {
  const qualified = qualifying.qualified;
  const inSquad = qualified && !!squad?.called;
  const myForm = inSquad ? form : null;
  const field = buildField(fmt, nation, qualified);
  const strength: Record<string, number> = {};
  for (const t of field) strength[t] = nationStrength(t);
  // A great player genuinely lifts his nation. This is on top of the per match
  // lift so the effect shows up in the group table too.
  if (inSquad && form) strength[nation] = Math.min(93, strength[nation] + playerLift(form) * 4);

  const matches: IntlMatch[] = [];
  const lift = playerLift(myForm);

  /* Group stage. Seeded pots so the groups are balanced, like a real draw. */
  const seeded = [...field].sort((a, b) => strength[b] - strength[a]);
  const pots: string[][] = [];
  for (let p = 0; p < 4; p++) pots.push(shuffle(seeded.slice(p * fmt.groups, (p + 1) * fmt.groups)));
  const groups: string[][] = [];
  for (let g = 0; g < fmt.groups; g++) groups.push(pots.map(pot => pot[g]).filter(Boolean));

  const tables: IntlTableRow[][] = [];
  for (let g = 0; g < groups.length; g++) {
    const grp = groups[g];
    const table = blankTable(grp);
    const label = `Group ${String.fromCharCode(65 + g)}`;
    for (let i = 0; i < grp.length; i++) {
      for (let j = i + 1; j < grp.length; j++) {
        const home = grp[i], away = grp[j];
        const r = simMatch(
          strength[home], strength[away], false,
          home === nation ? lift : 0, away === nation ? lift : 0,
        );
        applyResult(table, home, away, r.a, r.b);
        if (inSquad && (home === nation || away === nation) && myForm) {
          const mine = home === nation ? r.a : r.b;
          const ps = playerMatchStats(myForm, mine);
          matches.push({
            round: label, home, away, homeGoals: r.a, awayGoals: r.b, pens: false,
            playerGoals: ps.goals, playerAssists: ps.assists, playerRating: ps.rating,
          });
        }
      }
    }
    tables.push(sortTable(table));
  }

  const myGroupIdx = groups.findIndex(g => g.includes(nation));
  const groupTable = myGroupIdx >= 0 ? tables[myGroupIdx] : [];

  /* Who goes through: top two from every group, plus the best third placed
     sides when the format has them. */
  const through: string[] = [];
  for (const t of tables) through.push(...t.slice(0, 2).map(r => r.nation));
  if (fmt.thirdsThrough > 0) {
    const thirds = tables.map(t => t[2]).filter(Boolean);
    const best = [...thirds].sort((x, y) =>
      y.points - x.points || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf);
    through.push(...best.slice(0, fmt.thirdsThrough).map(r => r.nation));
  }

  /* Knockout bracket. Seeded so group winners meet runners up, then played
     round by round until one nation is left standing. */
  const koField = shuffle(through);
  const bracket: IntlTie[] = [];
  const first = firstRoundFor(koField.length);
  let roundIdx = KO_ORDER.indexOf(first);
  let current = koField.slice(0, 2 ** (KO_ORDER.length - roundIdx));

  while (current.length >= 2 && roundIdx < KO_ORDER.length) {
    const round = KO_ORDER[roundIdx];
    const next: string[] = [];
    for (let i = 0; i * 2 + 1 < current.length; i++) {
      const home = current[i * 2], away = current[i * 2 + 1];
      const mine = home === nation || away === nation;
      const r = simMatch(
        strength[home] ?? 70, strength[away] ?? 70, true,
        home === nation ? lift : 0, away === nation ? lift : 0,
      );
      const winner = r.aWins ? home : away;
      bracket.push({
        round, slot: i, home, away,
        homeGoals: r.a, awayGoals: r.b, pens: r.pens, winner, mine,
      });
      if (mine && inSquad && myForm) {
        const myGoals = home === nation ? r.a : r.b;
        const ps = playerMatchStats(myForm, myGoals);
        matches.push({
          round, home, away, homeGoals: r.a, awayGoals: r.b, pens: r.pens,
          playerGoals: ps.goals, playerAssists: ps.assists, playerRating: ps.rating,
        });
      }
      next.push(winner);
    }
    current = next;
    roundIdx++;
    if (current.length === 1) break;
  }

  const finalTie = bracket.find(t => t.round === 'F');
  const champion = finalTie?.winner ?? current[0] ?? field[0];
  const runnerUp = finalTie
    ? (finalTie.winner === finalTie.home ? finalTie.away : finalTie.home)
    : '';

  /* Where I finished. */
  let myResult: string;
  if (!qualified) myResult = 'Did Not Qualify';
  else if (!inSquad) myResult = 'Not Selected';
  else if (champion === nation) myResult = 'Winner';
  else {
    const myTies = bracket.filter(t => t.mine);
    if (!myTies.length) myResult = 'Group Stage';
    else {
      const last = myTies[myTies.length - 1];
      myResult = last.winner === nation ? 'Runner-up' : EXIT_LABEL[last.round];
    }
  }

  const playerApps = matches.length;
  const playerGoals = matches.reduce((s, m) => s + m.playerGoals, 0);
  const playerAssists = matches.reduce((s, m) => s + m.playerAssists, 0);
  const playerAvgRating = playerApps
    ? Math.round((matches.reduce((s, m) => s + m.playerRating, 0) / playerApps) * 10) / 10
    : 0;
  // A tournament golden boot is a real haul, not three goals in the group.
  const goldenBoot = playerGoals >= (fmt.kind === 'World Cup' ? 6 : 5);
  const bestPlayer = playerApps >= 4 && playerAvgRating >= 7.6
    && (myResult === 'Winner' || myResult === 'Runner-up' || myResult === 'Semi-final');

  return {
    year, name: fmt.name, short: fmt.short, kind: fmt.kind,
    confederation: fmt.confederation, nation, teams: fmt.teams,
    qualifying, qualified, squad, groupTable, bracket, champion, runnerUp,
    myResult, matches, playerApps, playerGoals, playerAssists, playerAvgRating,
    goldenBoot, bestPlayer,
  };
}

/**
 * The whole cycle for one summer: qualify, get picked or not, play or watch.
 * Returns null in the two years out of four with no tournament.
 */
export function runInternationalSummer(
  nation: string, year: number, form: PlayerForm | null,
): IntlTournament | null {
  const fmt = tournamentForYear(nation, year);
  if (!fmt) return null;
  const qualifying = runQualifying(nation, fmt, form);
  const squad = qualifying.qualified ? pickSquad(nation, form) : null;
  return simulateTournament(nation, fmt, year, qualifying, squad, form);
}

/** Friendlies and qualifiers in an off year: caps without a tournament. */
export function offYearCaps(form: PlayerForm | null): number {
  if (!form) return 0;
  return rnd(5, 9);
}
