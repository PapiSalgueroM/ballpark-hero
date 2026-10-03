/**
 * Round 972: Soccer Career's continental club cup, the way each season really
 * ran it, and the right cup for the club you play for.
 *
 * TWO DEFECTS THIS FIXES.
 *  1. A qualified club went straight into the round of 16 (or a quarter final
 *     before 2003). No group stage and no league phase was ever played, though
 *     src/lib/uclFormatHistory.ts already records the first stage of every
 *     period and UCLResult.result always listed a "Group Stage" nothing made.
 *  2. simulateUCL gated on the club's tier alone, so a player at Boca Juniors,
 *     Flamengo, Monterrey, LA Galaxy or Al Hilal played the UEFA Champions
 *     League against European clubs and could win it. Now the club's country
 *     picks its confederation (confederationOf, the table International Duty
 *     already uses) and the confederation picks the cup.
 *
 * WHAT IS PURE HERE. This module never imports the engine (the engine imports
 * it), never reads the clock and never touches Math.random itself: every draw
 * comes through the `rng` a caller hands in, so the engine passes Math.random
 * and the calibration passes a seeded stream.
 *
 * THE BALANCE RULE, written once. The engine's old qualification coin (85
 * percent at a tier 1 club, 35 at tier 2) always meant "you are in the
 * knockout rounds", because nothing came before them. That rate is kept as
 * the rate of reaching the knockouts. A first stage is now played in front of
 * them with a pass rate solved from the same strength formula the knockout
 * ties use (firstStageTarget), and the chance of being in the competition at
 * all is that old rate divided by the pass rate. So the same player at the
 * same club still reaches the knockouts, and wins the cup, as often as he did
 * on main, the knockout rounds are untouched, and what is new is the group
 * nights before them, including going out in them. scripts/simSoccerCareerUcl.mjs
 * section 8 holds the title rate per tier against main's measured band.
 */
import { confederationOf, type Confederation } from './soccerInternational';
import { adjustClubsForYear } from './careerEras';
import type { ClubData } from './soccerCareerEngine';
import { periodFor } from './uclFormatHistory';
import { sortedUclGroupTable, uclGroupFootnote, type UclGroupRule } from './clubManagerUclGroups';
import type { TableRow } from './clubManager';

/* ─── Which confederation a club plays its continental football in ─── */

/** Club countries the FALLBACK_CLUBS list spells differently from the
 *  International Duty nation table, or does not carry there at all. UAE is
 *  that table's 'United Arab Emirates'. Malaysia and the UAE are both in the
 *  AFC member table soccerInternational.ts already cites (Wikipedia, "Asian
 *  Football Confederation", read again 2026-10-03; the AFC's own member page
 *  does not render without a browser). Both clubs are tier 4 here, so they
 *  only ever appear as opponents. Monaco's club plays in the French league
 *  and in UEFA's cups, which is the default anyway and is written down so
 *  nobody wonders. */
const CLUB_COUNTRY_CONFED: Record<string, Confederation> = {
  UAE: 'AFC',
  Malaysia: 'AFC',
  Monaco: 'UEFA',
};

export function clubConfederation(country: string): Confederation {
  return CLUB_COUNTRY_CONFED[country] ?? confederationOf(country);
}

/* ─── The cup each confederation plays, outside UEFA ───
 *
 * WHICH SEASON IS WHICH EDITION. A career season runs August to May. These
 * cups do not: the Libertadores and (until 2017) the African and Asian cups
 * ran through a calendar year, and the CONCACAF cup finishes in the spring.
 * A season here plays the edition whose FINAL falls inside it, so season
 * 2019-20 (from 2019) is the 2019 Libertadores, final in November 2019, and
 * season 2023-24 is the 2024 CONCACAF Champions Cup, final in June 2024.
 *
 * WHAT IS PLAYED, AND WHAT IS NOT. Every cup below is played here as a
 * straight knockout from the quarter-finals, two legs a tie, extra time and
 * then penalties when a tie is level, and no away goals. None of these cups
 * really runs like that from start to finish: they have group or league
 * stages, preliminary rounds, and away goals rules that came and went, and
 * the formats changed often enough (RSSSF lists one match finals, two legged
 * finals and final tournaments inside a single decade of the CONCACAF cup)
 * that a season by season table of every round could not be two source
 * verified tonight. So the rounds before the final are one simplification,
 * the same for all of them, and the card says so in the words of
 * `simplified`. The FINAL is per season, one match or two legs as RSSSF
 * records it (the note above CONTINENTAL_PERIODS), and so is the NAME,
 * because the name is the honour a player keeps.
 *
 * THE MARKER. A row whose name or final rests on fewer than two publishers
 * outside Wikipedia is listed in SC_CONTINENTAL_PARTIAL, the same shape
 * Club Manager's CM_PARTIAL takes for thin data. Wikipedia was read as a spot
 * check on every row and is never counted as one of the two.
 */
export type ClubCupId = 'ucl' | 'libertadores' | 'concacaf' | 'afc' | 'caf';

export interface ClubCupPeriod {
  id: string;
  cup: Exclude<ClubCupId, 'ucl'>;
  confederation: Confederation;
  /** First season (its starting year) the row covers, inclusive. */
  from: number;
  /** Last season covered, inclusive; null while current. */
  to: number | null;
  name: string;
  /** Legs of the final as this game plays it. */
  finalLegs: 1 | 2;
  /** Publisher, title, address and read date for the row. */
  sources: string[];
}

export const CONTINENTAL_SIMPLIFIED =
  'Played here as a straight knockout from the quarter-finals: two legs a tie and a final of one match or two legs by season, extra time and penalties when level, no group stage and no away goals.';

const RSSSF_LIB = 'RSSSF, "Copa Libertadores de America", https://www.rsssf.org/sacups/copalib.html, read 2026-10-03: every final two legs to 2018, then one match (Flamengo 2-1 River Plate in Lima, 2019)';
const RSSSF_CONCACAF = 'RSSSF, "CONCACAF Cup/Champions League", https://www.rsssf.org/tablesc/ca1.html, read 2026-10-03: finals of two legs in 1990 and 1991, one match or a final round from 1992 to 2000, 2001 "tournament abandoned", one match in 2002 (Pachuca 1-0 Morelia, final 18 September, https://www.rsssf.org/tablesc/cacups02.html), two legs from 2002/03 to 2019, one match in 2020 (Tigres 2-1 Los Angeles FC) and 2021 (Monterrey 1-0 America), two legs in 2022 and 2023, one match from 2024';
const CONCACAF_SITE = 'CONCACAF, "Champions Cup", https://www.concacaf.com/champions-cup/, read 2026-10-03: the 2026 edition under the Champions Cup name';
const RSSSF_ASIA = 'RSSSF, "Asian Champions\' Cup", https://www.rsssf.org/tablesa/as1.html, read 2026-10-03: merged into a Champions League from 2002-03; one match finals from 1991 to 2002, two legs 2003 to 2008 (Al-Ain v BEC Tero Sasana, 11 October 2003, the second leg), one match 2009 to 2012, two legs 2013 to 2019 (Urawa v Al-Hilal, 24 November 2019, the second leg), one match 2020 and 2021, two legs in the 2022 edition (6 May 2023, the second leg) and 2023-24 (25 May 2024), one match from 2024-25 (Al-Ahli v Kawasaki Frontale, 3 May 2025)';
const AFC_SITE = 'AFC, "AFC Champions League Elite", https://www.the-afc.com/en/club/afc_champions_league_elite.html, read 2026-10-03: the 2026/27 edition and its league stage under that name';
const RSSSF_AFRICA = 'RSSSF, "African Champions\' Cup", https://www.rsssf.org/tablesa/af1.html, read 2026-10-03: a Champions League format from 1997, two legged finals every year except the three listed as one match, 2020 (Al-Ahly 2-1 Zamalek), 2021 (Al-Ahly 3-0 Kaizer Chiefs) and 2022 (Wydad 2-0 Al-Ahly)';

/* THE FINAL, SEASON BY SEASON. Each row's finalLegs is RSSSF's record of the
 * finals in its seasons (the source strings above say which), one publisher,
 * so every row stays in SC_CONTINENTAL_PARTIAL. Three things about the years:
 *   The pandemic pushed three finals out of their seasons (CONCACAF's 2020
 *   final to December 2020, CAF's 2019-20 final to November 2020 and its
 *   2020-21 final to July 2021). Those editions stay on the season they
 *   started in, so CONCACAF's one match finals are seasons 2019 and 2020
 *   and CAF's are 2019 to 2021.
 *   The CONCACAF cup of 2001 was abandoned and the next one ran February to
 *   September 2002, so season 2001 has no CONCACAF cup at all.
 *   CONCACAF's final rounds of 1993, 1995 and 1996 were a group of four, not
 *   a final; they are played here as one match. */
export const CONTINENTAL_PERIODS: ClubCupPeriod[] = [
  { id: 'lib-two-leg-final', cup: 'libertadores', confederation: 'CONMEBOL', from: 1900, to: 2018, name: 'Copa Libertadores', finalLegs: 2, sources: [RSSSF_LIB] },
  { id: 'lib-one-final', cup: 'libertadores', confederation: 'CONMEBOL', from: 2019, to: null, name: 'Copa Libertadores', finalLegs: 1, sources: [RSSSF_LIB] },
  { id: 'concacaf-champions-cup-to-1991', cup: 'concacaf', confederation: 'CONCACAF', from: 1900, to: 1991, name: "CONCACAF Champions' Cup", finalLegs: 2, sources: [RSSSF_CONCACAF] },
  { id: 'concacaf-champions-cup-1992-2000', cup: 'concacaf', confederation: 'CONCACAF', from: 1992, to: 2000, name: "CONCACAF Champions' Cup", finalLegs: 1, sources: [RSSSF_CONCACAF] },
  { id: 'concacaf-champions-cup-2002', cup: 'concacaf', confederation: 'CONCACAF', from: 2002, to: 2002, name: "CONCACAF Champions' Cup", finalLegs: 1, sources: [RSSSF_CONCACAF] },
  { id: 'concacaf-champions-cup-2003-2007', cup: 'concacaf', confederation: 'CONCACAF', from: 2003, to: 2007, name: "CONCACAF Champions' Cup", finalLegs: 2, sources: [RSSSF_CONCACAF] },
  { id: 'concacaf-champions-league', cup: 'concacaf', confederation: 'CONCACAF', from: 2008, to: 2018, name: 'CONCACAF Champions League', finalLegs: 2, sources: [RSSSF_CONCACAF] },
  { id: 'concacaf-champions-league-2019-2020', cup: 'concacaf', confederation: 'CONCACAF', from: 2019, to: 2020, name: 'CONCACAF Champions League', finalLegs: 1, sources: [RSSSF_CONCACAF] },
  { id: 'concacaf-champions-league-2021-2022', cup: 'concacaf', confederation: 'CONCACAF', from: 2021, to: 2022, name: 'CONCACAF Champions League', finalLegs: 2, sources: [RSSSF_CONCACAF] },
  { id: 'concacaf-champions-cup', cup: 'concacaf', confederation: 'CONCACAF', from: 2023, to: null, name: 'CONCACAF Champions Cup', finalLegs: 1, sources: [RSSSF_CONCACAF, CONCACAF_SITE] },
  { id: 'asian-club-championship', cup: 'afc', confederation: 'AFC', from: 1900, to: 2001, name: 'Asian Club Championship', finalLegs: 1, sources: [RSSSF_ASIA] },
  { id: 'afc-champions-league-2002-2008', cup: 'afc', confederation: 'AFC', from: 2002, to: 2008, name: 'AFC Champions League', finalLegs: 2, sources: [RSSSF_ASIA] },
  { id: 'afc-champions-league-2009-2012', cup: 'afc', confederation: 'AFC', from: 2009, to: 2012, name: 'AFC Champions League', finalLegs: 1, sources: [RSSSF_ASIA] },
  { id: 'afc-champions-league-2013-2019', cup: 'afc', confederation: 'AFC', from: 2013, to: 2019, name: 'AFC Champions League', finalLegs: 2, sources: [RSSSF_ASIA] },
  { id: 'afc-champions-league-2020-2021', cup: 'afc', confederation: 'AFC', from: 2020, to: 2021, name: 'AFC Champions League', finalLegs: 1, sources: [RSSSF_ASIA] },
  { id: 'afc-champions-league-2022-2023', cup: 'afc', confederation: 'AFC', from: 2022, to: 2023, name: 'AFC Champions League', finalLegs: 2, sources: [RSSSF_ASIA] },
  { id: 'afc-champions-league-elite', cup: 'afc', confederation: 'AFC', from: 2024, to: null, name: 'AFC Champions League Elite', finalLegs: 1, sources: [RSSSF_ASIA, AFC_SITE] },
  { id: 'african-cup-of-champions', cup: 'caf', confederation: 'CAF', from: 1900, to: 1996, name: 'African Cup of Champions Clubs', finalLegs: 2, sources: [RSSSF_AFRICA] },
  { id: 'caf-champions-league', cup: 'caf', confederation: 'CAF', from: 1997, to: 2018, name: 'CAF Champions League', finalLegs: 2, sources: [RSSSF_AFRICA] },
  { id: 'caf-champions-league-2019-2021', cup: 'caf', confederation: 'CAF', from: 2019, to: 2021, name: 'CAF Champions League', finalLegs: 1, sources: [RSSSF_AFRICA] },
  { id: 'caf-champions-league-from-2022', cup: 'caf', confederation: 'CAF', from: 2022, to: null, name: 'CAF Champions League', finalLegs: 2, sources: [RSSSF_AFRICA] },
];

/** Seasons a confederation had no cup at all. clubCupFor returns null for
 *  them, so the club plays no continental cup that season. */
export const CONTINENTAL_GAPS: { confederation: Confederation; year: number; why: string }[] = [
  { confederation: 'CONCACAF', year: 2001, why: 'the 2001 tournament was abandoned (RSSSF ca1, read 2026-10-03)' },
];

/** Rows where a fact (the name, its first season, or the final's legs) rests
 *  on ONE publisher outside Wikipedia. That is every row tonight: the history
 *  pages of CONMEBOL, CONCACAF, the AFC and CAF render only in a browser, so
 *  the official sites confirmed the current names of two cups and nothing
 *  older (not the season either name began), and RSSSF names the CONCACAF cup
 *  generically and does not name the AFC Champions League Elite. Wikipedia
 *  agreed with every name and first season as a spot check (its pages on the
 *  CONCACAF Champions Cup and the AFC Champions League Elite, read
 *  2026-10-03), and is never counted as one of the two. A row leaves this
 *  list only with a second publisher written into its sources. */
export const SC_CONTINENTAL_PARTIAL: string[] = CONTINENTAL_PERIODS.map(p => p.id);

/** The continental cup a club plays in a season, or null when there is none
 *  this game models (UEFA plays the Champions League, which the engine reads
 *  from uclFormatHistory, and no Oceanian club is above tier 4). */
export function clubCupFor(country: string, year: number): { cup: ClubCupId; confederation: Confederation; period: ClubCupPeriod | null } | null {
  const confederation = clubConfederation(country);
  if (confederation === 'UEFA') return { cup: 'ucl', confederation, period: null };
  const period = CONTINENTAL_PERIODS.find(p => p.confederation === confederation && year >= p.from && (p.to === null || year <= p.to));
  return period ? { cup: period.cup, confederation, period } : null;
}

/** The knockout ladder every non UEFA cup is played with here. */
export const CONTINENTAL_LADDER = ['QF', 'SF', 'Final'] as const;

/** The clubs of one confederation that existed that season, as opponents:
 *  FALLBACK_CLUBS run through the same era filter the transfer market uses,
 *  so Inter Miami never turns up in 2005. Australia moved from the OFC to
 *  the AFC in 2006 (the member table cited above), and its clubs first
 *  played the AFC's cup in its 2007 edition: RSSSF's 2007 page has Adelaide
 *  United and Sydney FC in Group G with the note that Australia, as new AFC
 *  members, were granted two entries compared to 2006, and its 2006 page
 *  names no Australian club (https://www.rsssf.org/tablesa/ascup07.html and
 *  ascup06.html, read 2026-10-03). Season 2006 here is the 2006 edition
 *  (final November 2006), so they are left out before season 2007. */
export function continentalOpponents(clubs: ClubData[], confederation: Confederation, year: number, exclude: string): string[] {
  return adjustClubsForYear(clubs, year)
    .filter(c => c.name !== exclude && clubConfederation(c.country) === confederation)
    .filter(c => !(c.country === 'Australia' && year < 2007))
    .map(c => c.name);
}

/* ─── The Champions League's first stage, read off the format table ───
 *
 * Nothing here is retyped. uclFormatHistory.ts carries, per period, the stage
 * the competition opened with, the number of groups, whether a second group
 * stage followed, and whether a round of 16 came after; every one of those
 * two source verified on 2026-09-10. The knockout ladder after the first
 * stage is DERIVED from how many clubs came through it:
 *   two groups, winners only (1991-92, 1992-93)   2 clubs, the final
 *   two groups, top two (1993-94)                 4 clubs, semi-finals
 *   four groups, top two (1994-95 to 1996-97)     8 clubs, quarter-finals
 *   six groups (1997-98, 1998-99)                 8: six winners and the two best runners-up
 *   eight groups then four (1999-2000 to 2002-03) 8 clubs, quarter-finals
 *   eight groups, top two (2003-04 to 2023-24)    16 clubs, round of 16
 *   the league phase (2024-25 on)                 the top 8, and 8 more through the play-off
 * which is the same ladder the engine played before this round in every
 * period but one: 1993-94, which went from the groups to one off semi-finals
 * and was being played with a quarter final that never existed.
 *
 * POINTS. Two for a win before 1995-96 and three from then: RSSSF's tables
 * for 1994-95 (IFK Gothenburg, 6 4 1 1 10-7, 9 points) and 1995-96 (Ajax,
 * 6 5 1 0 15-1, 16 points), https://www.rsssf.org/ec/ec199495.html and
 * ec199596.html, read 2026-10-03, with Wikipedia's 1995-96 season page as a
 * spot check ("the first tournament in which three points were awarded for a
 * win"). One publisher, so it is marked: 'ucl-points-before-1995'.
 *
 * LEVEL ON POINTS. The order of a level group is the shared one in
 * clubManagerUclGroups.ts, in the seasons that file verified (2005-06 to
 * 2010-11, 2015-16 to 2020-21, and the league phase). Every other season is
 * ordered by goal difference then goals scored, which is this game's choice
 * and not a claim about the season, and the card's footnote says exactly the
 * rule that was applied: 'ucl-tiebreak-other-seasons'.
 */
export type FirstStageKind = 'none' | 'groups' | 'leaguePhase';
export type AdvanceRule = 'winner' | 'top2' | 'winnerOrBestRunnerUp' | 'leaguePhase';
export type CurveId = 'winner2' | 'top2_2' | 'top2_3' | 'best6_3' | 'twice_3' | 'league';

export interface FirstStageShape {
  kind: FirstStageKind;
  /** Group stages played one after the other; 2 only in 1999-2000 to 2002-03. */
  stages: number;
  /** Matches a club plays in one stage: six in a group of four, eight in the league phase. */
  games: number;
  /** Groups in the first group stage, from the format table. */
  groups: number;
  advance: AdvanceRule;
  /** The knockout rounds after the first stage. */
  ladder: string[];
  pointsForWin: 2 | 3;
  tiebreak: UclGroupRule;
  /** Which measured pass curve the stage is solved against. */
  curve: CurveId | null;
}

/** The league phase, from uclFormatHistory's 'league-phase' row (its path:
 *  36 clubs, eight different opponents each, four at home and four away; the
 *  top eight into the round of 16, ninth to 24th into a two legged play-off,
 *  25th and below out). */
export const LEAGUE_PHASE = { clubs: 36, games: 8, direct: 8, playoffTo: 24 } as const;

/** The year three points for a win arrived in the group stage. */
export const UCL_THREE_POINTS_FROM = 1995;

export const SC_STAGE_RULES_PARTIAL: string[] = ['ucl-points-before-1995', 'ucl-tiebreak-other-seasons'];

function ladderFor(entrants: number): string[] {
  if (entrants >= 16) return ['R16', 'QF', 'SF', 'Final'];
  if (entrants >= 8) return ['QF', 'SF', 'Final'];
  if (entrants >= 4) return ['SF', 'Final'];
  return ['Final'];
}

function tiebreakFor(year: number): UclGroupRule {
  if (year >= 2024) return 'leaguePhase';
  if (year >= 2015 && year <= 2020) return 'h2hFull';
  if (year >= 2005 && year <= 2010) return 'h2hAway';
  return 'leaguePhase';
}

/** The first stage a season's Champions League really opened with, and the
 *  knockout ladder that came after it. */
export function firstStageShape(year: number): FirstStageShape {
  const period = periodFor(year);
  const pointsForWin: 2 | 3 = year >= UCL_THREE_POINTS_FROM ? 3 : 2;
  const tiebreak = tiebreakFor(year);
  if (period.stage === 'leaguePhase') {
    return {
      kind: 'leaguePhase', stages: 1, games: LEAGUE_PHASE.games, groups: 0, advance: 'leaguePhase',
      ladder: ladderFor(16), pointsForWin, tiebreak, curve: 'league',
    };
  }
  if (period.stage === 'groups' && period.groups > 0) {
    if (period.koLegs === null) {
      /* The group winners met in the final, with no semi-finals. */
      return {
        kind: 'groups', stages: 1, games: 6, groups: period.groups, advance: 'winner',
        ladder: ladderFor(period.groups), pointsForWin, tiebreak, curve: 'winner2',
      };
    }
    if (period.secondGroupStage) {
      /* Top two of eight groups into four groups of four, top two of those on. */
      return {
        kind: 'groups', stages: 2, games: 6, groups: period.groups, advance: 'top2',
        ladder: ladderFor((period.groups / 2) * 2), pointsForWin, tiebreak, curve: 'twice_3',
      };
    }
    const both = period.groups * 2;
    const entrants = 2 ** Math.floor(Math.log2(both));
    if (entrants < both) {
      /* More runners-up than places: the winners and the best runners-up. */
      return {
        kind: 'groups', stages: 1, games: 6, groups: period.groups, advance: 'winnerOrBestRunnerUp',
        ladder: ladderFor(entrants), pointsForWin, tiebreak, curve: 'best6_3',
      };
    }
    return {
      kind: 'groups', stages: 1, games: 6, groups: period.groups, advance: 'top2',
      ladder: ladderFor(entrants), pointsForWin, tiebreak, curve: pointsForWin === 2 ? 'top2_2' : 'top2_3',
    };
  }
  /* A straight knockout season (to 1990-91): the earlier rounds were knockout
     ties too, played as the qualification this game rolls, so the ladder
     starts where the engine always started it. */
  return {
    kind: 'none', stages: 0, games: 0, groups: 0, advance: 'top2',
    ladder: period.roundOf16 ? ladderFor(16) : ladderFor(8), pointsForWin, tiebreak, curve: null,
  };
}

/* ─── Playing a first stage ─── */

export type Rng = () => number;

/** Goals a side is expected to score in a level Champions League match, and
 *  what playing at home is worth. Lifted here from the engine (Round 546) so
 *  the group nights, the knockout ties and the calibration read one number. */
export const UCL_BASE_LAMBDA = 1.32;
export const UCL_HOME_EDGE = 0.18;

/** How far apart the other clubs in a group or the league phase are, in the
 *  same strength units as the player's club (a gap of 1 is half a goal of
 *  expectation each way). Chosen so a 36 club table is not bunched: at 0.8
 *  the eighth club averages about 15.6 points and the 24th about 8.9 over
 *  400 league phases (measured 2026-10-03), where 0.5 gave 14.8 and 9.1. */
export const OPPONENT_SPREAD = 0.8;

const clampTo = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** One side's goals from its expectation (Knuth, capped at 11, the engine's
 *  own draw since Round 546). */
export function poissonGoals(lambda: number, rng: Rng): number {
  const L = Math.exp(-Math.max(0.05, lambda));
  let k = 0;
  let p = 1;
  do { k += 1; p *= rng(); } while (p > L && k < 12);
  return k - 1;
}

function gauss(rng: Rng): number {
  const u = 1 - rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function playMatch(sHome: number, sAway: number, rng: Rng): [number, number] {
  const d = (sHome - sAway) / 2;
  const hg = poissonGoals(clampTo(UCL_BASE_LAMBDA + d + UCL_HOME_EDGE, 0.25, 3.4), rng);
  const ag = poissonGoals(clampTo(UCL_BASE_LAMBDA - d - UCL_HOME_EDGE, 0.25, 3.4), rng);
  return [hg, ag];
}

export interface StageGame {
  matchday: number;
  opponent: string;
  home: boolean;
  goalsFor: number;
  goalsAgainst: number;
  playerGoals: number;
}

export type StageRow = TableRow;

export interface FirstStageStage {
  /** "Group stage", "Second group stage" or "League phase". */
  label: string;
  games: StageGame[];
  /** Where my club finished, 1 based. */
  position: number;
  of: number;
  /** The whole group of four, in order. Absent for the league phase. */
  table?: StageRow[];
  myRow: StageRow;
  /** League phase: points of the 8th and the 24th club. */
  cutoffs?: { direct: number; playoff: number };
  /** 1997-98 and 1998-99: second, but not one of the two best runners-up. */
  runnerUpOut?: boolean;
  /** The rule the table was ordered by, in words. */
  footnote: string;
}

export interface FirstStageResult {
  kind: 'groups' | 'leaguePhase';
  stages: FirstStageStage[];
  through: boolean;
  /** League phase, 9th to 24th: a two legged play-off comes next. */
  playoff?: boolean;
}

/** A double round robin of four, club 0 at home on matchdays 1, 3 and 5. */
const GROUP_ROUNDS: [number, number][][] = [
  [[0, 1], [2, 3]], [[3, 0], [1, 2]], [[0, 2], [3, 1]],
  [[1, 0], [3, 2]], [[0, 3], [2, 1]], [[2, 0], [1, 3]],
];

const emptyRow = (club: string): StageRow => ({ club, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 });

function record(rows: StageRow[], h: number, a: number, hg: number, ag: number, win: number): void {
  const H = rows[h];
  const A = rows[a];
  H.gf += hg; H.ga += ag; A.gf += ag; A.ga += hg;
  if (hg > ag) { H.w += 1; A.l += 1; H.pts += win; }
  else if (hg < ag) { A.w += 1; H.l += 1; A.pts += win; }
  else { H.d += 1; A.d += 1; H.pts += 1; A.pts += 1; }
}

/* Round 972 review: the line says what this table does and makes no claim
   about the year three points arrived, which rests on one publisher. */
const POINTS_LINE = 'Two points for a win in this table.';

/* The seasons whose level-on-points order clubManagerUclGroups.ts has not
   verified are ordered by goal difference then goals scored, and the card says
   that is this game's order, not the season's ('ucl-tiebreak-other-seasons'). */
const OWN_TIEBREAK_LINE = "Level on points splits on goal difference, then goals scored. That is this game's order: the real tiebreak for this season isn't in our records yet.";

/** One group of four. Club 0 is mine; strengths are in the same units. */
function playGroup(
  names: string[], strengths: number[], shape: FirstStageShape, rng: Rng,
  playerGoals: () => number, label: string,
): FirstStageStage {
  const rows = names.map(emptyRow);
  const pairs: Record<string, [number, number]> = {};
  const games: StageGame[] = [];
  GROUP_ROUNDS.forEach((round, md) => {
    for (const [h, a] of round) {
      const [hg, ag] = playMatch(strengths[h], strengths[a], rng);
      record(rows, h, a, hg, ag, shape.pointsForWin);
      pairs[`${names[h]}|${names[a]}`] = [hg, ag];
      if (h === 0 || a === 0) {
        const home = h === 0;
        const goalsFor = home ? hg : ag;
        games.push({
          matchday: md + 1, opponent: names[home ? a : h], home, goalsFor,
          goalsAgainst: home ? ag : hg, playerGoals: Math.min(playerGoals(), goalsFor),
        });
      }
    }
  });
  const table = sortedUclGroupTable(rows, shape.tiebreak, pairs);
  const position = table.findIndex(r => r.club === names[0]) + 1;
  /* A group season on the 'leaguePhase' order is one whose real order is not
     verified (tiebreakFor): the league phase itself never reaches playGroup. */
  const ruleLine = shape.tiebreak === 'leaguePhase' ? OWN_TIEBREAK_LINE : uclGroupFootnote(rows, shape.tiebreak, pairs);
  const footnote = ruleLine + (shape.pointsForWin === 2 ? ` ${POINTS_LINE}` : '');
  return { label, games, position, of: 4, table, myRow: table[position - 1], footnote };
}

/** 1997-98 and 1998-99: is my runner-up one of the two best of six? The other
 *  five groups are played out with clubs of the same spread and their
 *  runners-up ranked with mine by points, goal difference and goals scored. */
function bestRunnerUp(mine: StageRow, shape: FirstStageShape, rng: Rng): boolean {
  const others: StageRow[] = [];
  for (let g = 1; g < shape.groups; g++) {
    const names = [0, 1, 2, 3].map(i => `g${g}c${i}`);
    const strengths = names.map(() => gauss(rng) * OPPONENT_SPREAD);
    const stage = playGroup(names, strengths, { ...shape, tiebreak: 'leaguePhase' }, rng, () => 0, '');
    others.push(stage.table![1]);
  }
  const key = (r: StageRow) => [r.pts, r.gf - r.ga, r.gf];
  let better = 0;
  for (const o of others) {
    const a = key(o);
    const b = key(mine);
    let cmp = 0;
    for (let i = 0; i < 3 && cmp === 0; i++) cmp = a[i] - b[i];
    if (cmp > 0 || (cmp === 0 && rng() < 0.5)) better += 1;
  }
  /* Places left for runners-up: the knockout field less the group winners. */
  const places = 2 ** Math.floor(Math.log2(shape.groups * 2)) - shape.groups;
  return better < places;
}

/** The league phase: 36 clubs, each at home to the four after it and away at
 *  the four before it on a shuffled ring, which is eight different opponents,
 *  four at home and four away, for every club at once. */
function playLeaguePhase(
  myName: string, oppNames: string[], myStrength: number, shape: FirstStageShape,
  rng: Rng, playerGoals: () => number,
): FirstStageStage {
  const n = LEAGUE_PHASE.clubs;
  const strengths = [myStrength];
  for (let i = 1; i < n; i++) strengths.push(gauss(rng) * OPPONENT_SPREAD);
  /* ring[p] is the club sitting at position p. */
  const ring = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ring[i], ring[j]] = [ring[j], ring[i]];
  }
  const me = ring.indexOf(0);
  const half = LEAGUE_PHASE.games / 2;
  /* My opponents, named in matchday order: home to +1, away at -1, and so on. */
  const names: string[] = Array.from({ length: n }, (_, i) => `lp${i}`);
  for (let k = 1; k <= half; k++) {
    names[ring[(me + k) % n]] = oppNames[2 * (k - 1)] ?? `lp${ring[(me + k) % n]}`;
    names[ring[(me - k + n) % n]] = oppNames[2 * (k - 1) + 1] ?? `lp${ring[(me - k + n) % n]}`;
  }
  names[0] = myName;
  const rows = names.map(emptyRow);
  const mine = new Map<number, [number, number]>();
  for (let p = 0; p < n; p++) {
    for (let k = 1; k <= half; k++) {
      const h = ring[p];
      const a = ring[(p + k) % n];
      const [hg, ag] = playMatch(strengths[h], strengths[a], rng);
      record(rows, h, a, hg, ag, shape.pointsForWin);
      if (h === 0) mine.set(k, [hg, ag]);
      if (a === 0) mine.set(-k, [hg, ag]);
    }
  }
  const games: StageGame[] = [];
  for (let k = 1; k <= half; k++) {
    for (const side of [k, -k]) {
      const [hg, ag] = mine.get(side)!;
      const home = side > 0;
      const opp = ring[(me + side + n) % n];
      const goalsFor = home ? hg : ag;
      games.push({
        matchday: games.length + 1, opponent: names[opp], home, goalsFor,
        goalsAgainst: home ? ag : hg, playerGoals: Math.min(playerGoals(), goalsFor),
      });
    }
  }
  const table = sortedUclGroupTable(rows, 'leaguePhase');
  const position = table.findIndex(r => r.club === myName) + 1;
  return {
    label: 'League phase', games, position, of: n, myRow: table[position - 1],
    cutoffs: { direct: table[LEAGUE_PHASE.direct - 1].pts, playoff: table[LEAGUE_PHASE.playoffTo - 1].pts },
    footnote: uclGroupFootnote(rows, 'leaguePhase'),
  };
}

/**
 * Play the first stage. `myStrength` is the solved strength (solveStageStrength),
 * `oppNames` the named opponents in the order they are met (three a group,
 * eight in the league phase), and `playerGoals` draws the player's own goals
 * for one of my matches; they are capped at what the team scored.
 */
export function playFirstStage(
  shape: FirstStageShape, myName: string, myStrength: number, oppNames: string[],
  rng: Rng, playerGoals: () => number = () => 0,
): FirstStageResult {
  if (shape.kind === 'leaguePhase') {
    const stage = playLeaguePhase(myName, oppNames, myStrength, shape, rng, playerGoals);
    const through = stage.position <= LEAGUE_PHASE.direct;
    const playoff = !through && stage.position <= LEAGUE_PHASE.playoffTo;
    return { kind: 'leaguePhase', stages: [stage], through, playoff };
  }
  const stages: FirstStageStage[] = [];
  let through = false;
  for (let s = 0; s < Math.max(1, shape.stages); s++) {
    const names = [myName, ...[0, 1, 2].map(i => oppNames[s * 3 + i] ?? `Group club ${s * 3 + i + 1}`)];
    const strengths = [myStrength, ...[0, 1, 2].map(() => gauss(rng) * OPPONENT_SPREAD)];
    const stage = playGroup(names, strengths, shape, rng, playerGoals, s === 0 ? 'Group stage' : 'Second group stage');
    stages.push(stage);
    if (shape.advance === 'winner') through = stage.position === 1;
    else if (shape.advance === 'winnerOrBestRunnerUp') {
      through = stage.position === 1 || (stage.position === 2 && bestRunnerUp(stage.myRow, shape, rng));
      if (stage.position === 2 && !through) stage.runnerUpOut = true;
    } else through = stage.position <= 2;
    if (!through) break;
  }
  return { kind: 'groups', stages, through };
}

/** A table row as the card reads it. */
function isStageRow(x: unknown): x is StageRow {
  if (!x || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  return typeof r.club === 'string' && ['w', 'd', 'l', 'gf', 'ga', 'pts'].every(k => Number.isFinite(r[k]));
}

/** Round 972: a saved first stage is read by the cup card, so one without the
 *  shape the card reads is dropped on load, on its own (repairCareer), and the
 *  rest of the result is kept. */
export function isFirstStageResult(x: unknown): x is FirstStageResult {
  if (!x || typeof x !== 'object') return false;
  const r = x as FirstStageResult;
  if ((r.kind !== 'groups' && r.kind !== 'leaguePhase') || typeof r.through !== 'boolean' || !Array.isArray(r.stages)) return false;
  return r.stages.every(st => !!st && typeof st === 'object'
    && typeof st.label === 'string' && typeof st.footnote === 'string'
    && Number.isFinite(st.position) && Number.isFinite(st.of)
    && isStageRow(st.myRow)
    && (st.table === undefined || (Array.isArray(st.table) && st.table.every(isStageRow)))
    && Array.isArray(st.games)
    && st.games.every(g => !!g && typeof g === 'object' && typeof g.opponent === 'string'
      && Number.isFinite(g.matchday) && Number.isFinite(g.goalsFor) && Number.isFinite(g.goalsAgainst)));
}

/** Opponents a first stage needs named. */
export function firstStageOpponentCount(shape: FirstStageShape): number {
  if (shape.kind === 'leaguePhase') return LEAGUE_PHASE.games;
  return shape.kind === 'groups' ? 3 * shape.stages : 0;
}

/* ─── Solving the pass rate ─── */

/** The inverse normal CDF (Acklam), lifted from the engine's Round 546 knockout
 *  so the first stage and the ties solve against the same function. */
export function uclProbit(p: number): number {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.3577518672690, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  const q = Math.min(Math.max(p, 1e-9), 1 - 1e-9);
  if (q < pl) {
    const x = Math.sqrt(-2 * Math.log(q));
    return (((((c[0] * x + c[1]) * x + c[2]) * x + c[3]) * x + c[4]) * x + c[5]) / ((((d[0] * x + d[1]) * x + d[2]) * x + d[3]) * x + 1);
  }
  if (q > 1 - pl) {
    const x = Math.sqrt(-2 * Math.log(1 - q));
    return -(((((c[0] * x + c[1]) * x + c[2]) * x + c[3]) * x + c[4]) * x + c[5]) / ((((d[0] * x + d[1]) * x + d[2]) * x + d[3]) * x + 1);
  }
  const x = q - 0.5;
  const r = x * x;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * x /
         (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/** The normal CDF (Abramowitz and Stegun 7.1.26, error under 2e-7). */
export function normCdf(x: number): number {
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * z);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
  return x >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

/** A group of four that sends two through is easier than a knockout tie for
 *  the same club, so the first stage target sits one probit unit above the
 *  first tie's: a club that wins half its ties gets through 84 percent of the
 *  time, and one at the 75 percent ceiling 95. */
export const FIRST_STAGE_LIFT = 1;
/** The old qualification rate is now the rate of reaching the knockouts, so
 *  the chance of being in the competition at all is that rate over the pass
 *  rate; the pass rate is floored so that never goes above 98 percent. */
export const MAX_ENTRY = 0.98;

/** The pass rate a first stage is solved to, from the first knockout tie's
 *  target and the old rate of reaching the knockouts. */
export function firstStageTarget(knockoutTarget: number, reachKnockout: number): number {
  return Math.min(0.97, Math.max(normCdf(uclProbit(knockoutTarget) + FIRST_STAGE_LIFT), reachKnockout / MAX_ENTRY));
}

/* THE CALIBRATION. How often a club of strength s gets through each kind of
   first stage, measured over the very code above (playFirstStage with a seeded
   stream, 20,000 stages a point) by scripts/simCareerContinental.mjs, which
   measures it again on every run and fails if the table here has gone stale.
   SC_CONT_PRINT_CALIBRATION=1 prints a fresh table to paste. The pass rate is
   then solved by inverting the curve, not tuned, the same way Round 546 solves
   a knockout tie's goal expectation from its target. Each row is made
   non-decreasing when printed, so the inversion is well posed. */
const GRID_FROM = -1.5;
const GRID_STEP = 0.125;
const GRID_POINTS = 37;
export const PASS_GRID: number[] = Array.from({ length: GRID_POINTS }, (_, i) => GRID_FROM + i * GRID_STEP);

/** For the league phase this row is reaching the top 24 (the play-off or better). */
export const PASS_CURVES: Record<CurveId, number[]> = {
  winner2: [0.0063, 0.0095, 0.0115, 0.0169, 0.0237, 0.034, 0.048, 0.0598, 0.078, 0.1012, 0.1285, 0.1633, 0.1905, 0.2314, 0.2729, 0.3189, 0.3694, 0.4182, 0.4688, 0.5158, 0.5605, 0.6217, 0.6683, 0.7107, 0.7459, 0.7769, 0.8158, 0.844, 0.8742, 0.8918, 0.9103, 0.9274, 0.9402, 0.9524, 0.9604, 0.9701, 0.9715],
  top2_2: [0.0511, 0.0641, 0.0862, 0.1072, 0.1358, 0.1691, 0.2086, 0.2436, 0.2884, 0.3432, 0.3972, 0.4477, 0.501, 0.5538, 0.6129, 0.6583, 0.7084, 0.7528, 0.7946, 0.8327, 0.8647, 0.8902, 0.9182, 0.9331, 0.9496, 0.9637, 0.9721, 0.9826, 0.9849, 0.9894, 0.9929, 0.9951, 0.996, 0.998, 0.9983, 0.9988, 0.9992],
  top2_3: [0.0562, 0.0706, 0.0896, 0.1155, 0.1413, 0.1772, 0.2117, 0.2591, 0.2964, 0.3396, 0.3911, 0.456, 0.4955, 0.5547, 0.6028, 0.6547, 0.7064, 0.745, 0.7873, 0.8331, 0.8542, 0.8809, 0.9105, 0.9275, 0.9473, 0.9619, 0.9683, 0.9773, 0.9841, 0.9885, 0.9917, 0.9939, 0.9954, 0.9974, 0.9977, 0.9987, 0.9993],
  best6_3: [0.0117, 0.0169, 0.0232, 0.0332, 0.0452, 0.0563, 0.0762, 0.0998, 0.1277, 0.158, 0.1983, 0.2412, 0.2841, 0.3325, 0.3876, 0.4434, 0.4899, 0.5508, 0.6095, 0.663, 0.7083, 0.7508, 0.7904, 0.836, 0.8576, 0.8833, 0.9132, 0.9311, 0.9443, 0.9595, 0.968, 0.9742, 0.9815, 0.9861, 0.9891, 0.9909, 0.9945],
  twice_3: [0.0026, 0.0045, 0.007, 0.012, 0.0194, 0.029, 0.0433, 0.0629, 0.0844, 0.1157, 0.1544, 0.2028, 0.2522, 0.3085, 0.3645, 0.433, 0.5017, 0.5685, 0.6313, 0.6899, 0.7431, 0.7884, 0.8369, 0.8718, 0.8968, 0.924, 0.9411, 0.9578, 0.9708, 0.9782, 0.9855, 0.9886, 0.9911, 0.994, 0.9959, 0.9971, 0.9982],
  league: [0.0753, 0.1039, 0.141, 0.1756, 0.2283, 0.2868, 0.3396, 0.4102, 0.4769, 0.5498, 0.6142, 0.6806, 0.7397, 0.7905, 0.8387, 0.8817, 0.9101, 0.9365, 0.9548, 0.97, 0.9806, 0.9871, 0.9909, 0.9947, 0.9976, 0.9985, 0.9993, 0.9995, 0.9995, 0.9999, 0.9999, 1, 1, 1, 1, 1, 1],
};
/** League phase: finishing in the top eight. */
export const LEAGUE_TOP8: number[] = [0.0004, 0.0012, 0.0019, 0.0036, 0.0053, 0.0095, 0.0137, 0.0226, 0.0328, 0.0493, 0.0665, 0.0938, 0.1288, 0.1697, 0.2161, 0.2692, 0.3297, 0.388, 0.4597, 0.522, 0.5988, 0.656, 0.7183, 0.7699, 0.8166, 0.8532, 0.8841, 0.9122, 0.9329, 0.9517, 0.9634, 0.9719, 0.9818, 0.986, 0.9896, 0.991, 0.9928];

/** The season each curve is measured on, one per kind of first stage. */
export const CURVE_YEAR: Record<CurveId, number> = {
  winner2: 1991, top2_2: 1994, top2_3: 2010, best6_3: 1997, twice_3: 2000, league: 2026,
};

function interp(row: number[], s: number): number {
  if (s <= PASS_GRID[0]) return row[0];
  const last = PASS_GRID.length - 1;
  if (s >= PASS_GRID[last]) return row[last];
  const i = Math.min(last - 1, Math.floor((s - GRID_FROM) / GRID_STEP));
  const f = (s - PASS_GRID[i]) / GRID_STEP;
  return row[i] + (row[i + 1] - row[i]) * f;
}

/** How often a club of strength s reaches the knockouts through this kind of
 *  first stage; `playoffWin` is the league phase play-off tie's own target. */
export function stagePassChance(curve: CurveId, s: number, playoffWin: number): number {
  if (curve === 'league') {
    const top8 = interp(LEAGUE_TOP8, s);
    return top8 + (interp(PASS_CURVES.league, s) - top8) * playoffWin;
  }
  return interp(PASS_CURVES[curve], s);
}

/** The strength that gets a club through with probability `target`. */
export function solveStageStrength(curve: CurveId, target: number, playoffWin: number): number {
  let lo = PASS_GRID[0];
  let hi = PASS_GRID[PASS_GRID.length - 1];
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (stagePassChance(curve, mid, playoffWin) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** One calibration point: how often strength s gets through, and for the
 *  league phase how often it finishes in the top eight. Pure over `rng`. */
export function measureStage(curve: CurveId, strength: number, reps: number, rng: Rng): { pass: number; top8: number } {
  const shape = firstStageShape(CURVE_YEAR[curve]);
  const opp = Array.from({ length: 8 }, (_, i) => `Opponent ${i + 1}`);
  let pass = 0;
  let top8 = 0;
  for (let i = 0; i < reps; i++) {
    const r = playFirstStage(shape, 'Mine', strength, opp, rng);
    if (r.through) { pass += 1; top8 += 1; } else if (r.playoff) pass += 1;
  }
  return { pass: pass / reps, top8: top8 / reps };
}
