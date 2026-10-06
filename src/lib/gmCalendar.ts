/**
 * Round 946: the league year calendar for every GM seat.
 *
 * Club Manager has a calendar you tap to sim to a day, and it stops for the
 * things that need the manager (src/lib/clubManagerCalendar.ts, SimHalt).
 * The four front offices (NFL, NBA, MLB, NHL) had rounds with no dates, no
 * trade deadline on any grid and an offseason that is one function call.
 * This module lays out each league's real year as dated phases, maps every
 * engine round (or week) to one date range, and plans a sim to any day so it
 * never runs past a decision. It is pure: no clock, no save, no engine call.
 * The boards bind it in a later round; nothing here edits an engine.
 *
 * THE DATES. Each sport's year is the one its engine opens in (season 2026):
 * the 2026 NFL season, the 2026-27 NBA and NHL seasons, and the 2026 MLB
 * season (baseball's year runs inside one calendar year, so its offseason is
 * the winter of 2025-26). Every date below names its sources. A phase with
 * fewer than two independent sources carries a `thin` note saying what is
 * missing and is listed in GM_CALENDAR_PARTIAL, the same honesty rule as
 * Club Manager's CM_PARTIAL; the panel draws it as "expected", never as fact.
 * Wikipedia never counts toward the two (the owner's rule: Wikipedia is for
 * spot verification only). It stays cited where it was read, as a spot check,
 * but a phase or a season span is two sourced only when two sources other
 * than Wikipedia date it (validateLeagueYear). The fixer pass of 2026-10-05
 * found a press or league page beside every Wikipedia date the panel showed
 * as fact, and lifted the NFL draft and free agency and the MLB lottery and
 * draft out of thin the same way.
 * A phase no source dates at all (a window derived from two other dates, a
 * playoff start the league has not announced) also carries `estimate`, and
 * the panel says "estimate" for it. Nothing is dated by a guess dressed as a
 * fact: the fixer pass of 2026-10-05 replaced seven such guesses with the dates
 * the press reports (three of them had been wrong by days).
 * Sources were read on 2026-10-03, and on 2026-10-05 the named press and
 * league pages (NFL.com, NFL Football Operations, steelers.com, ESPN, Yahoo
 * Sports, raiders.com, FOX Sports, NBC Sports, NBC Sports Boston, NBC Los
 * Angeles, CBS Sports, CBS Philadelphia, MLB.com, Just Baseball, Daily
 * Faceoff, Sports Illustrated, The Hockey News, PuckPedia, The Sportscast)
 * each quoted in the phase it dates:
 *   ESPN    ESPN's public scoreboard feed (site.api.espn.com), the season
 *           calendar and the games on a date. The feed the site already reads.
 *   WIKI    the English Wikipedia season, draft and lottery articles, read as
 *           raw wikitext (spot verification, never a pipeline).
 *   NBA.COM nba.com/news/key-dates (updated 2026-10-02).
 *   NHL.COM nhl.com/news/nhl-home-openers-for-2026-27-season and
 *           nhl.com/news/toronto-maple-leafs-win-2026-nhl-draft-lottery.
 *
 * THE ENGINE PERIODS. The NFL front office plays 17 weeks (REGULAR_WEEKS),
 * the NBA 20 rounds, MLB 27 and the NHL 20 (src/lib/*FrontOffice.ts). Those
 * counts are the game's own scale, not the real schedule, so the regular
 * season's real span is cut into that many back to back date ranges: every
 * period gets exactly one range and every day of the season sits in exactly
 * one period. scripts/simGmCalendar.mjs holds the counts to the engines'.
 */
import { addDays, dateKey, dayOfWeek, daysBetween, daysInMonth, isoDate, parseIsoDate } from '@/lib/calDate';
import type { CalDate } from '@/lib/calDate';

export type GmSport = 'nfl' | 'nba' | 'mlb' | 'nhl';

/** The league year's phases, the brief's list: one id per real step. */
export type GmPhaseId = 'resign' | 'lottery' | 'draft' | 'freeAgency' | 'camp' | 'cutDown' | 'opening' | 'deadline' | 'playoffs';

export interface GmPhaseDef {
  id: GmPhaseId;
  /** What the grid and the step list call it. */
  label: string;
  /** First and last day, ISO, inclusive. A one day phase has start === end. */
  start: string;
  end: string;
  /** Where the dates come from. */
  sources: string[];
  /** Present when the phase is not two sourced: what is missing and how the date was set. */
  thin?: string;
  /**
   * True when no source gives this phase's first day: the day is placed by the
   * rule its thin note states, and the panel says "estimate", never "expected".
   * Every phase with no source must carry it (validateLeagueYear).
   */
  estimate?: boolean;
  /** The sim stops on the first day of this phase, because it needs a decision. */
  halts: boolean;
}

export interface GmLeagueYearDef {
  sport: GmSport;
  /** "2026-27". */
  label: string;
  /** The engine season this year is (every front office opens in 2026). */
  season: number;
  /** First and last day of the regular season, ISO, and their sources. */
  regularStart: string;
  regularEnd: string;
  regularSources: string[];
  /** The engine's regular season periods and what one is called. */
  periods: number;
  periodName: 'Week' | 'Round';
  /** Games each club plays in one period (the grid spreads them over its range). */
  gamesPerPeriod: number;
  /** A one game a week sport draws that game on this weekday when the range has one (football: Sunday). */
  gameDay?: 'sunday';
  /** The phases in the league's real order. */
  phases: GmPhaseDef[];
}

const ESPN = 'ESPN scoreboard feed';
const WIKI = 'Wikipedia (raw wikitext)';
const NBACOM = 'nba.com key dates';
const NHLCOM = 'nhl.com';
const NFLOPS = 'NFL Football Operations';
const NFL_SCHEDULE = `${NFLOPS}, 2026 NFL Schedule Announced (14 May 2026)`;
const STEELERS_KEY_DATES = 'steelers.com, 2026 NFL Key Dates (21 February 2026)';
const CBS_MLB_PLAYOFFS = 'CBS Sports, 2026 MLB playoff schedule (23 September 2026)';
const YAHOO_MLB_OPENING = 'Yahoo Sports, stream MLB Opening Night 2026 (23 March 2026)';

/** True for a Wikipedia citation: a spot check that never counts toward the two sources. */
export const isWikipediaSource = (s: string): boolean => s.startsWith(WIKI);
/** How many of these sources are not Wikipedia. */
export const independentSourceCount = (sources: string[]): number => sources.filter(s => !isWikipediaSource(s)).length;

/* ================================================================== */
/* The four league years                                              */
/* ================================================================== */

const NFL_2026: GmLeagueYearDef = {
  sport: 'nfl', label: '2026-27', season: 2026,
  regularStart: '2026-09-09', regularEnd: '2027-01-10',
  regularSources: [`${NFL_SCHEDULE}: kicks off Wednesday night, September 9, in Seattle; Week 18 on Saturday, January 9, and Sunday, January 10`, `${WIKI}: 2026 NFL season, began September 9 and ends January 10, 2027`, `${ESPN}: New England at Seattle on 9 September (00:20 UTC on the 10th), 16 Week 18 games on 10 January 2027`],
  periods: 17, periodName: 'Week', gamesPerPeriod: 1, gameDay: 'sunday',
  phases: [
    { id: 'resign', label: 'Options and tenders', start: '2026-03-09', end: '2026-03-10', halts: true,
      sources: [`${WIKI}: 2026 NFL season, from March 9 clubs exercise options and tender their restricted and exclusive rights free agents`],
      thin: 'One source (Wikipedia, citing the league calendar). The two days of options and tenders before the new league year.' },
    { id: 'freeAgency', label: 'Free agency opens', start: '2026-03-11', end: '2026-03-11', halts: true,
      sources: [`${NFLOPS}, 2026 NFL Free Agency Questions and Answers (6 March 2026): the league year and the signing period begin at 4 p.m. ET on Wednesday, March 11`, `${STEELERS_KEY_DATES}: March 11, the 2026 League Year and free agency signing period begin at 4 p.m. New York time`, `${WIKI}: 2026 NFL season, the league year and free agency began March 11`] },
    { id: 'draft', label: 'The draft', start: '2026-04-23', end: '2026-04-25', halts: true,
      sources: ['NFL.com, 2026 NFL Draft dates, times, location: Round 1 Thursday, April 23, Rounds 2 and 3 Friday, April 24, Rounds 4 to 7 Saturday, April 25, at Acrisure Stadium', `${STEELERS_KEY_DATES}: April 23 to 25, 2026 NFL Draft, Pittsburgh`, `${WIKI}: 2026 NFL season, the draft was April 23 to 25 in Pittsburgh`] },
    { id: 'camp', label: 'Camp and preseason', start: '2026-08-06', end: '2026-08-29', halts: false,
      sources: [`${WIKI}: 2026 NFL season, Hall of Fame Game on August 6`, `${ESPN}: the preseason calendar opens with Hall of Fame weekend on 6 August`],
      thin: 'The start is the first preseason game (two sources); clubs open camp earlier in July on dates of their own. The end is the eve of cut down day.' },
    { id: 'cutDown', label: 'Cut down day', start: '2026-08-30', end: '2026-08-30', halts: true,
      sources: ['Yahoo Sports, NFL sets 2026 trade deadline, roster cutdown and 2027 free agency dates: rosters down to 53 by 6 p.m. New York time on Aug. 30', 'raiders.com, NFL sets 53-man roster cutdown deadline: active rosters to 53 by 3 p.m. PT on Sunday, Aug. 30'] },
    { id: 'opening', label: 'Opening day', start: '2026-09-09', end: '2026-09-09', halts: false,
      sources: [`${NFL_SCHEDULE}: the defending champion Seahawks host New England at Lumen Field on Wednesday, September 9`, `${ESPN}: New England at Seattle, 9 September`, `${WIKI}: 2026 NFL season, the Kickoff Game on September 9`] },
    { id: 'deadline', label: 'Trade deadline', start: '2026-11-10', end: '2026-11-10', halts: true,
      sources: ['NFL.com, trade grades ahead of the 2026 deadline: the deadline set for Nov. 10', 'ESPN, 2026 trade deadline updates: Nov. 10 at 4 p.m. ET', 'Yahoo Sports, NFL sets 2026 trade deadline: Nov. 10 at 4 p.m. New York time'],
      thin: 'Three sources say 10 November, but the Raiders\' own cut down article (raiders.com) lists the deadline as 3 November, so it stays expected until it passes.' },
    { id: 'playoffs', label: 'Playoffs', start: '2027-01-16', end: '2027-02-14', halts: false,
      sources: [`${NFL_SCHEDULE}: Wild Card weekend from Saturday, January 16, Super Bowl LXI on Sunday, February 14, at SoFi Stadium`, `${ESPN}: Wild Card games on 16 January 2027, the Super Bowl on 14 February 2027`, `${WIKI}: 2026 NFL season, playoffs begin January 16, Super Bowl LXI on February 14 at SoFi Stadium`] },
  ],
};

const NBA_2026: GmLeagueYearDef = {
  sport: 'nba', label: '2026-27', season: 2026,
  regularStart: '2026-10-20', regularEnd: '2027-04-11',
  regularSources: [`${NBACOM}: start of the regular season October 20, regular season ends April 11`, `${WIKI}: 2026-27 NBA season, October 20, 2026 to April 11, 2027`, `${ESPN}: Boston at Detroit on 20 October, the season calendar's last game day 11 April 2027`],
  periods: 20, periodName: 'Round', gamesPerPeriod: 4,
  phases: [
    { id: 'lottery', label: 'Draft lottery', start: '2026-05-10', end: '2026-05-10', halts: false,
      sources: [`${NBACOM}: 2026 Draft Lottery May 10`, 'CBS Sports, 2026 NBA Draft Lottery winners and losers (10 May 2026): Washington won the No. 1 pick in Sunday\'s lottery', `${WIKI}: 2026 NBA draft, the lottery was held on May 10`] },
    { id: 'draft', label: 'The draft', start: '2026-06-23', end: '2026-06-24', halts: true,
      sources: [`${NBACOM}: 2026 NBA Draft June 23 to 24`, 'NBC Sports, 2026 NBA Draft complete list of every pick (24 June 2026): the draft took place at Barclays Center on June 23 to 24', `${WIKI}: 2026 NBA draft, first round June 23, second round June 24, Barclays Center`] },
    { id: 'resign', label: 'Re-sign window', start: '2026-06-25', end: '2026-06-29', halts: true, estimate: true,
      sources: [],
      thin: 'Derived, not a dated league event: the days between the draft and the market opening, when a club can still only deal with its own free agents.' },
    { id: 'freeAgency', label: 'Free agency opens', start: '2026-06-30', end: '2026-06-30', halts: true,
      sources: [`${NBACOM}: June 30, teams may begin negotiating with all other free agents`, 'Yahoo Sports, when does NBA free agency begin in 2026 (22 June 2026): free agency officially begins on Tuesday, June 30, at 6 p.m. ET', `${WIKI}: 2026-27 NBA season, free agency negotiations began June 30 at 6 p.m. ET`] },
    { id: 'camp', label: 'Training camp', start: '2026-09-29', end: '2026-10-18', halts: false,
      sources: [`${NBACOM}: Sept. 29, NBA training camps open; preseason games begin Oct. 3`],
      thin: 'One source for the opening day of camp (nba.com); ESPN agrees the preseason starts 3 October.' },
    { id: 'cutDown', label: 'Rosters set', start: '2026-10-19', end: '2026-10-19', halts: true,
      sources: [`${NBACOM}: Oct. 19, rosters set for opening day (5 p.m. ET)`],
      thin: 'One source (nba.com).' },
    { id: 'opening', label: 'Opening night', start: '2026-10-20', end: '2026-10-20', halts: false,
      sources: [`${NBACOM}: Oct. 20, start of the regular season`, `${WIKI}: 2026-27 NBA season, regular season from October 20, 2026`, `${ESPN}: Boston at Detroit, 20 October`] },
    { id: 'deadline', label: 'Trade deadline', start: '2027-02-11', end: '2027-02-11', halts: true,
      sources: [`${NBACOM}: Feb. 11, NBA trade deadline`],
      thin: 'One source (nba.com); the Wikipedia season article does not carry it yet.' },
    { id: 'playoffs', label: 'Play-in and playoffs', start: '2027-04-13', end: '2027-06-25', halts: false,
      sources: [`${NBACOM}: play-in April 13 to 16, playoffs begin April 17`, `${WIKI}: 2026-27 NBA season, play-in April 13 to 16, Finals in June 2027`],
      thin: 'The start is two sourced. The last day is ESPN\'s season window (it closes 26 June 2027 UTC): the Finals dates are not set.' },
  ],
};

const NHL_2026: GmLeagueYearDef = {
  sport: 'nhl', label: '2026-27', season: 2026,
  regularStart: '2026-09-29', regularEnd: '2027-04-10',
  regularSources: [`${NHLCOM}: the season gets off to a start on Sept. 29, Carolina hosting Florida`, `${WIKI}: 2026-27 NHL season, began September 29, 2026 and will end on April 10, 2027 (84 games now)`, `${ESPN}: Florida at Carolina on 29 September, the season calendar's last game day 10 April 2027`],
  periods: 20, periodName: 'Round', gamesPerPeriod: 4,
  phases: [
    { id: 'lottery', label: 'Draft lottery', start: '2026-05-05', end: '2026-05-05', halts: false,
      sources: [`${NHLCOM}: Toronto won the Draft Lottery on Tuesday (article of 6 May 2026)`, 'NBC Sports Boston, 2026 NHL Draft Lottery live updates (5 May 2026): Toronto won the lottery on Tuesday night with an 8.5 percent chance', `${WIKI}: 2026 NHL entry draft, the two lotteries were held on May 5, 2026`] },
    { id: 'draft', label: 'The draft', start: '2026-06-26', end: '2026-06-27', halts: true,
      sources: [`${NHLCOM}: first round June 26, rounds 2 to 7 June 27, Buffalo`, 'ESPN, 2026 NHL draft order, picks 1 to 224 (24 June 2026): at KeyBank Center in Buffalo on June 26 (Round 1) and June 27 (Rounds 2 to 7)', `${WIKI}: 2026 NHL entry draft, June 26 to 27 at KeyBank Center, Buffalo`] },
    { id: 'resign', label: 'Re-sign window', start: '2026-06-28', end: '2026-06-30', halts: true, estimate: true,
      sources: [],
      thin: 'Derived, not a dated league event: the days between the draft and the market opening.' },
    { id: 'freeAgency', label: 'Free agency opens', start: '2026-07-01', end: '2026-07-01', halts: true,
      sources: ['Yahoo Sports, ranking the top NHL unrestricted free agents: free agency opens at noon ET on Wednesday, July 1', 'The Sportscast, when does 2026 NHL free agency start: Wednesday, July 1, 2026 at 12:00 p.m. ET'] },
    { id: 'camp', label: 'Camp and preseason', start: '2026-09-19', end: '2026-09-27', halts: false,
      sources: [`${ESPN}: the season calendar's first preseason game day is 19 September`],
      thin: 'One source (ESPN) for the first preseason game; camps open a few days earlier on dates of their own.' },
    { id: 'cutDown', label: 'Rosters set', start: '2026-09-28', end: '2026-09-28', halts: true,
      sources: ['The Hockey News, Anaheim Ducks submit their 2026-27 season opening roster: cap compliant rosters were due on Sept. 28 at 2 p.m. PT', 'PuckPedia, every club\'s 2026-27 opening night roster: rosters due by 5 p.m. ET on Sept. 28'] },
    { id: 'opening', label: 'Opening night', start: '2026-09-29', end: '2026-09-29', halts: false,
      sources: [`${NHLCOM}: Sept. 29, Carolina hosts Florida`, `${WIKI}: 2026-27 NHL season, began September 29`, `${ESPN}: Florida at Carolina, 29 September`] },
    { id: 'deadline', label: 'Trade deadline', start: '2027-03-01', end: '2027-03-01', halts: true,
      sources: ['Daily Faceoff, 2026-27 NHL trade deadline set: Monday, March 1, 2027', 'Sports Illustrated (Predators On SI), the 2027 NHL trade deadline date is set: March 1'] },
    { id: 'playoffs', label: 'Stanley Cup playoffs', start: '2027-04-12', end: '2027-06-30', halts: false, estimate: true,
      sources: [`${ESPN}: the 2026-27 season window closes 1 July 2027 UTC`],
      thin: 'No source for the first playoff day: placed two days after the regular season as an estimate. The last day is ESPN\'s season window.' },
  ],
};

const MLB_2026: GmLeagueYearDef = {
  sport: 'mlb', label: '2026', season: 2026,
  regularStart: '2026-03-25', regularEnd: '2026-09-27',
  regularSources: [`${YAHOO_MLB_OPENING}: Yankees at Giants on Wednesday, March 25, the traditional Opening Day on Thursday, March 26`, `${CBS_MLB_PLAYOFFS}: the regular season wraps up on Sunday, Sept. 27`, `${WIKI}: 2026 MLB season, started March 25 with the Giants hosting the Yankees, the full Opening Day slate on March 26, the regular season ending September 27`, `${ESPN}: New York at San Francisco on 25 March (00:05 UTC on the 26th), the last regular season games on 27 September and none on the 28th`],
  periods: 27, periodName: 'Round', gamesPerPeriod: 6,
  phases: [
    { id: 'resign', label: 'Re-sign window', start: '2025-11-02', end: '2025-11-05', halts: true,
      sources: [`${WIKI}: 2025 MLB season, the World Series concluded on November 1`, `${ESPN}: World Series Game 7, Los Angeles at Toronto, 1 November 2025 (00:00 UTC on the 2nd)`],
      thin: 'The World Series end is two sourced; the window is derived from it (the five days a club keeps its own free agents to itself, NBC Sports\' 2025 free agency guide) rather than read as a dated league event.' },
    { id: 'freeAgency', label: 'Free agency opens', start: '2025-11-06', end: '2025-11-06', halts: true,
      sources: ['FOX Sports, when does 2025 MLB free agency start: players cannot sign with a new team until 5 p.m. ET five days after the World Series, Thursday, November 6', 'NBC Sports, 2025 MLB free agency guide: players may not sign with a new team until five days after the World Series concludes (it ended November 1)'] },
    { id: 'lottery', label: 'Draft lottery', start: '2025-12-09', end: '2025-12-09', halts: false,
      sources: ['MLB.com, MLB Draft Lottery results 2026 (9 December 2025): the White Sox won the No. 1 pick on Tuesday night at the Winter Meetings', 'Just Baseball, 2026 MLB Draft Lottery winners and losers (10 December 2025): the lottery held on Tuesday, the White Sox on the clock', `${WIKI}: 2026 MLB draft, the lottery was held on December 9, 2025 in Orlando at the Winter Meetings`] },
    { id: 'camp', label: 'Spring training', start: '2026-02-20', end: '2026-03-23', halts: false,
      sources: [`${ESPN}: the first spring games on 20 February 2026 (none on the 19th)`],
      thin: 'One source (ESPN) for the first spring game; pitchers and catchers report earlier on dates of their own.' },
    { id: 'cutDown', label: 'Opening day rosters', start: '2026-03-24', end: '2026-03-24', halts: true, estimate: true,
      sources: [],
      thin: 'No league wide date read. One club release (Texas) says rosters were due at 10:30 a.m. CT on 25 March, opening day itself, so the stop is placed on the eve to come before the first pitch.' },
    { id: 'opening', label: 'Opening day', start: '2026-03-25', end: '2026-03-25', halts: false,
      sources: [`${YAHOO_MLB_OPENING}: Opening Night is Wednesday, March 25, Yankees at Giants at Oracle Park`, `${ESPN}: New York at San Francisco, 25 March`, `${WIKI}: 2026 MLB season, the regular season started March 25`] },
    { id: 'draft', label: 'The draft', start: '2026-07-11', end: '2026-07-12', halts: true,
      sources: ['MLB.com, what you need to know about the 2026 MLB Draft (11 July 2026): the draft takes place on Saturday and Sunday in Philadelphia', 'CBS Philadelphia, the 2026 All-Star Week schedule (8 July 2026): the draft opens on Saturday, July 11 at 1:30 p.m. at the Pennsylvania Convention Center', `${WIKI}: 2026 MLB draft, July 11 to 12 in Philadelphia`] },
    { id: 'deadline', label: 'Trade deadline', start: '2026-08-03', end: '2026-08-03', halts: true,
      sources: ['FOX Sports, 2026 MLB trade deadline: Monday, Aug. 3, at 6 p.m. ET', 'NBC Los Angeles, MLB trade deadline preview 2026: Monday, Aug. 3, at 6 p.m. ET'] },
    { id: 'playoffs', label: 'Postseason', start: '2026-09-29', end: '2026-10-31', halts: false,
      sources: [`${CBS_MLB_PLAYOFFS}: four Wild Card Series open Sept. 29, the World Series starts Friday, Oct. 23, a potential Game 7 on Saturday, Oct. 31`, `${ESPN}: Philadelphia at Atlanta and Chicago at Houston on 29 September; the schedule lists World Series Game 7, if necessary, on 31 October and nothing after it`, `${WIKI}: 2026 MLB season, the postseason began on September 29, the World Series begins October 23 and ends with Game 7 (if necessary) on October 31`] },
  ],
};

/** Every league year, by sport. */
export const GM_LEAGUE_YEARS: Record<GmSport, GmLeagueYearDef> = { nfl: NFL_2026, nba: NBA_2026, mlb: MLB_2026, nhl: NHL_2026 };

/**
 * Each league's phases in its real order. The NBA and NHL draft before the
 * market opens and play their season over the winter; the NFL opens its
 * market in March and drafts in April; baseball opens its market in November,
 * draws its lottery at the Winter Meetings and drafts in July, mid season.
 * The data above must come in exactly this order (scripts/simGmCalendar.mjs).
 */
export const GM_PHASE_ORDER: Record<GmSport, GmPhaseId[]> = {
  nfl: ['resign', 'freeAgency', 'draft', 'camp', 'cutDown', 'opening', 'deadline', 'playoffs'],
  nba: ['lottery', 'draft', 'resign', 'freeAgency', 'camp', 'cutDown', 'opening', 'deadline', 'playoffs'],
  nhl: ['lottery', 'draft', 'resign', 'freeAgency', 'camp', 'cutDown', 'opening', 'deadline', 'playoffs'],
  mlb: ['resign', 'freeAgency', 'lottery', 'camp', 'cutDown', 'opening', 'draft', 'deadline', 'playoffs'],
};

/** "nfl.deadline": every phase that is not two sourced, the shape of Club Manager's CM_PARTIAL. */
export const GM_CALENDAR_PARTIAL: string[] = (Object.keys(GM_LEAGUE_YEARS) as GmSport[])
  .flatMap(sport => GM_LEAGUE_YEARS[sport].phases.filter(p => p.thin).map(p => `${sport}.${p.id}`));

/** "nhl.playoffs": every phase whose first day no source gives, so the panel says "estimate". */
export const GM_CALENDAR_ESTIMATE: string[] = (Object.keys(GM_LEAGUE_YEARS) as GmSport[])
  .flatMap(sport => GM_LEAGUE_YEARS[sport].phases.filter(p => p.estimate).map(p => `${sport}.${p.id}`));

/* ================================================================== */
/* The year, resolved to days                                         */
/* ================================================================== */

export interface GmPhase extends Omit<GmPhaseDef, 'start' | 'end'> {
  start: CalDate;
  end: CalDate;
}

/** One engine period (a week or a round) and the one date range it covers. */
export interface GmPeriod {
  /** 1 based, as the engines count rounds and weeks. */
  index: number;
  start: CalDate;
  end: CalDate;
  /** The days the grid shows a game on: gamesPerPeriod of them, spread over the range. */
  gameDays: CalDate[];
}

export interface GmLeagueYear {
  def: GmLeagueYearDef;
  phases: GmPhase[];
  regularStart: CalDate;
  regularEnd: CalDate;
  periods: GmPeriod[];
  /** First and last day of the whole year: the first phase to the end of the playoffs. */
  first: CalDate;
  last: CalDate;
}

/**
 * Cut the regular season into `n` back to back ranges. Day d (0 based) of a
 * season of D days sits in period floor(d * n / D), so the ranges never
 * overlap, never leave a gap, and differ in length by one day at most.
 */
export function periodRanges(start: CalDate, end: CalDate, n: number, gamesPerPeriod: number, sundays = false): GmPeriod[] {
  const days = daysBetween(start, end) + 1;
  const out: GmPeriod[] = [];
  for (let i = 0; i < n; i++) {
    const from = Math.ceil((i * days) / n);
    const to = Math.ceil(((i + 1) * days) / n) - 1;
    const len = to - from + 1;
    const gameDays: CalDate[] = [];
    for (let g = 0; g < gamesPerPeriod; g++) gameDays.push(addDays(start, from + Math.floor(((g + 0.5) * len) / gamesPerPeriod)));
    if (sundays) {
      /* Football: one game a week, drawn on the range's Sunday when it has one. */
      for (let k = 0; k < len; k++) {
        const day = addDays(start, from + k);
        if (dayOfWeek(day.y, day.m, day.d) === 0) { gameDays[0] = day; break; }
      }
    }
    out.push({ index: i + 1, start: addDays(start, from), end: addDays(start, to), gameDays });
  }
  return out;
}

/** The year with every date parsed. Throws on a date that is not a real day. */
export function resolveLeagueYear(def: GmLeagueYearDef): GmLeagueYear {
  const phases = def.phases.map(p => ({ ...p, start: parseIsoDate(p.start), end: parseIsoDate(p.end) }));
  const regularStart = parseIsoDate(def.regularStart);
  const regularEnd = parseIsoDate(def.regularEnd);
  const periods = periodRanges(regularStart, regularEnd, def.periods, def.gamesPerPeriod, def.gameDay === 'sunday');
  const keys = phases.flatMap(p => [p.start, p.end]).concat([regularStart, regularEnd]);
  const first = keys.reduce((a, b) => (dateKey(b) < dateKey(a) ? b : a));
  const last = keys.reduce((a, b) => (dateKey(b) > dateKey(a) ? b : a));
  return { def, phases, regularStart, regularEnd, periods, first, last };
}

/** The league year a front office plays. */
export function gmLeagueYear(sport: GmSport): GmLeagueYear {
  return resolveLeagueYear(GM_LEAGUE_YEARS[sport]);
}

/** The phase with this id, or null when the league has none (the NFL has no lottery). */
export function phaseById(year: GmLeagueYear, id: GmPhaseId): GmPhase | null {
  return year.phases.find(p => p.id === id) ?? null;
}

/** Every phase running on a day. */
export function phasesOn(year: GmLeagueYear, date: CalDate): GmPhase[] {
  const k = dateKey(date);
  return year.phases.filter(p => dateKey(p.start) <= k && k <= dateKey(p.end));
}

/** The period whose range holds the day, or null outside the regular season. */
export function periodOn(year: GmLeagueYear, date: CalDate): GmPeriod | null {
  const k = dateKey(date);
  return year.periods.find(p => dateKey(p.start) <= k && k <= dateKey(p.end)) ?? null;
}

/** The date range of an engine period (1 based), or null past the regular season. */
export function dateOfPeriod(year: GmLeagueYear, index: number): GmPeriod | null {
  return year.periods[index - 1] ?? null;
}

/**
 * How many periods are fully played when the sim stops for the deadline: the
 * periods whose last day falls on or before deadline day, exactly the ones
 * planSimToDay plays before that stop (a period ending on deadline day is
 * played first, and trading is still open that day). A front office that
 * honours the deadline allows a trade while its round counter has not passed
 * this. Measured 2026-10-05: nfl 8, nba 13, mlb 19, nhl 15 (baseball's round 19
 * ends on deadline day itself, 3 August, the case this rule exists for).
 */
export function deadlinePeriod(year: GmLeagueYear): number {
  const deadline = phaseById(year, 'deadline');
  if (!deadline) return year.periods.length;
  const k = dateKey(deadline.start);
  return year.periods.filter(p => dateKey(p.end) <= k).length;
}

/* ================================================================== */
/* Halts and the sim to a day                                         */
/* ================================================================== */

/** Why a sim stops short of the day it was asked for: Club Manager's SimHalt, for a GM. */
export type GmHaltKind =
  | 'resign' | 'draft' | 'freeAgency' | 'cutDown' | 'deadline' | 'seasonOver'
  | 'expiringDeal' | 'injury' | 'inboxAsk';

export interface GmHalt {
  kind: GmHaltKind;
  date: CalDate;
  label: string;
}

/**
 * The things only the host knows, each dated by the host: a deal running
 * out, a starter hurt, an ask in the inbox. The calendar does not invent
 * them; it only refuses to sim past them.
 */
export interface GmHostHalt extends GmHalt {
  kind: 'expiringDeal' | 'injury' | 'inboxAsk';
}

const HALT_KIND: Partial<Record<GmPhaseId, GmHaltKind>> = {
  resign: 'resign', draft: 'draft', freeAgency: 'freeAgency', cutDown: 'cutDown', deadline: 'deadline',
};

/** The calendar's own stops, in date order: every phase that needs a decision, on its first day, and the end of the regular season. */
export function calendarHalts(year: GmLeagueYear): GmHalt[] {
  const out: GmHalt[] = [];
  for (const p of year.phases) {
    const kind = HALT_KIND[p.id];
    if (p.halts && kind) out.push({ kind, date: p.start, label: p.label });
  }
  out.push({ kind: 'seasonOver', date: year.regularEnd, label: 'Regular season ends' });
  return out.sort((a, b) => dateKey(a.date) - dateKey(b.date));
}

export interface GmSimPlan {
  /** The day the save sits on after the run: the target, or the first halt on the way. */
  stopAt: CalDate;
  /** Why it stopped short, or null when it reached the target. */
  halt: GmHalt | null;
  /** The engine periods to play, in order: every period whose last day falls after `from` and on or before `stopAt`. */
  periods: number[];
}

/**
 * The sim to a day rule. A calendar halt dated on `from` itself is the one
 * the save is already sitting on (the GM has it in front of him), so the run
 * starts past it; the first halt after `from`, on or before the target, is
 * where it stops. A host stop is different: the host lists only the stops
 * still open and drops one once the GM has dealt with it, so a host stop
 * dated on or before `from` is still waiting and the run does not start
 * (it stops where it is, on the earliest of them). Null when the target is
 * not ahead of `from`.
 *
 * The plan only knows the stops dated before the run. A stop that comes up
 * while the run plays (a starter hurt in round 6 of a sim from round 3 to
 * 12) is the host's to report: runSimPlan plays the plan one period at a
 * time and ends the run on the period that raised it.
 */
export function planSimToDay(year: GmLeagueYear, from: CalDate, target: CalDate, hostHalts: GmHostHalt[] = []): GmSimPlan | null {
  const f = dateKey(from);
  const t = dateKey(target);
  if (t <= f) return null;
  let open: GmHostHalt | null = null;
  for (const h of hostHalts) {
    const k = dateKey(h.date);
    if (k <= f && (!open || k < dateKey(open.date))) open = h;
  }
  if (open) return { stopAt: from, halt: open, periods: [] };
  let halt: GmHalt | null = null;
  for (const h of [...calendarHalts(year), ...hostHalts]) {
    const k = dateKey(h.date);
    if (k > f && k <= t && (!halt || k < dateKey(halt.date))) halt = h;
  }
  const stopAt = halt ? halt.date : target;
  const s = dateKey(stopAt);
  const periods = year.periods.filter(p => dateKey(p.end) > f && dateKey(p.end) <= s).map(p => p.index);
  return { stopAt, halt, periods };
}

/** What the host's engine reports after playing one period: the new state, and a stop that came up while it played. */
export interface GmPeriodResult<S> {
  state: S;
  halt: GmHostHalt | null;
}

export interface GmSimRun<S> {
  state: S;
  /** The day the save sits on: the plan's stop, or the last day of the period that raised a stop. */
  stopAt: CalDate;
  halt: GmHalt | null;
  /** The periods actually played, in order. */
  played: number[];
}

/**
 * The one loop, Club Manager's simToWeek for a GM: plays the plan one engine
 * period at a time through the host's own playPeriod, and ends the run the
 * moment a period reports a stop (an injury, an inbox ask, a deal running
 * out), so a sim never plays past something that came up on the way. With no
 * stop raised it ends where the plan does, on the plan's own halt.
 *
 * When the period that raised a stop ends on the plan's own stop day, the
 * run reports the plan's stop: a calendar stop passed over now would be
 * skipped by the next plan (it would sit on `from`), while the host's stop
 * stays in the host's open list and holds the next run where it is.
 */
export function runSimPlan<S>(year: GmLeagueYear, plan: GmSimPlan, state: S, playPeriod: (state: S, period: GmPeriod) => GmPeriodResult<S>): GmSimRun<S> {
  let current = state;
  const played: number[] = [];
  for (const index of plan.periods) {
    const period = year.periods[index - 1];
    const res = playPeriod(current, period);
    current = res.state;
    played.push(index);
    if (res.halt) {
      const planStopToday = plan.halt && dateKey(plan.halt.date) === dateKey(period.end);
      return { state: current, stopAt: period.end, halt: planStopToday ? plan.halt : res.halt, played };
    }
  }
  return { state: current, stopAt: plan.stopAt, halt: plan.halt, played };
}

/* ================================================================== */
/* The offseason as steps                                             */
/* ================================================================== */

export interface GmStep {
  phase: GmPhase;
  /** Before opening day (the offseason) or inside the season (baseball's draft, every deadline). */
  offseason: boolean;
}

/** Every phase of the year as a step, in date order: what a board walks instead of one offseason call. */
export function yearSteps(year: GmLeagueYear): GmStep[] {
  const open = dateKey(year.regularStart);
  return [...year.phases]
    .sort((a, b) => dateKey(a.start) - dateKey(b.start))
    .map(phase => ({ phase, offseason: dateKey(phase.start) < open }));
}

/** The offseason steps alone, in order. */
export function offseasonSteps(year: GmLeagueYear): GmStep[] {
  return yearSteps(year).filter(s => s.offseason);
}

/** The next step on or after a day, or null when the year has none left. */
export function nextStep(year: GmLeagueYear, today: CalDate): GmStep | null {
  const k = dateKey(today);
  return yearSteps(year).find(s => dateKey(s.phase.end) >= k) ?? null;
}

/* ================================================================== */
/* The month grid                                                     */
/* ================================================================== */

export interface GmDay {
  date: CalDate;
  key: number;
  /** Every phase running on the day, and the ones that start on it (the markers). */
  phases: GmPhaseId[];
  starts: GmPhaseId[];
  /** The engine period whose range holds the day, and whether a game is drawn on it. */
  period: number | null;
  game: boolean;
  /** The first stop on this day, the calendar's or the host's. */
  halt: GmHalt | null;
  /** A phase starting today is not two sourced: the grid says "expected". */
  thin: boolean;
  /** A phase starting today has no source for its day at all: the grid says "estimate". */
  estimate: boolean;
  isToday: boolean;
  past: boolean;
}

/** The months the year spans, first to last. */
export function monthsOf(year: GmLeagueYear): { y: number; m: number }[] {
  const out: { y: number; m: number }[] = [];
  let y = year.first.y, m = year.first.m;
  while (y * 100 + m <= year.last.y * 100 + year.last.m) {
    out.push({ y, m });
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

/** One month: leading blanks for the weekday it starts on, then every day. Seven columns, at most six rows. */
export function gmMonthGrid(year: GmLeagueYear, y: number, m: number, today: CalDate, hostHalts: GmHostHalt[] = []): (GmDay | null)[] {
  const cells: (GmDay | null)[] = [];
  for (let i = 0; i < dayOfWeek(y, m, 1); i++) cells.push(null);
  const todayKey = dateKey(today);
  const halts = [...calendarHalts(year), ...hostHalts];
  for (let d = 1; d <= daysInMonth(y, m); d++) {
    const date = { y, m, d };
    const key = dateKey(date);
    const running = phasesOn(year, date);
    const starting = running.filter(p => dateKey(p.start) === key);
    const period = periodOn(year, date);
    cells.push({
      date, key,
      phases: running.map(p => p.id),
      starts: starting.map(p => p.id),
      period: period ? period.index : null,
      game: !!period && period.gameDays.some(g => dateKey(g) === key),
      halt: halts.find(h => dateKey(h.date) === key) ?? null,
      thin: starting.some(p => !!p.thin),
      estimate: starting.some(p => !!p.estimate),
      isToday: key === todayKey,
      past: key < todayKey,
    });
  }
  return cells;
}

/* ================================================================== */
/* The rules the data must keep                                       */
/* ================================================================== */

/**
 * Everything wrong with a league year, as plain sentences; empty when it is
 * sound. scripts/simGmCalendar.mjs and src/lib/gmCalendar.test.ts hold all
 * four years to it, and its negative controls prove each rule can fail.
 */
export function validateLeagueYear(def: GmLeagueYearDef): string[] {
  const problems: string[] = [];
  const tag = (s: string) => `${def.sport}: ${s}`;
  let year: GmLeagueYear;
  try { year = resolveLeagueYear(def); } catch (e) { return [tag(String((e as Error).message))]; }

  /* Every phase is one range, sourced twice (Wikipedia never counts toward the two) or marked thin; a phase no source dates is an estimate, and says how it was placed. */
  if (independentSourceCount(def.regularSources) < 2) problems.push(tag(`the regular season span has ${independentSourceCount(def.regularSources)} source(s) other than Wikipedia`));
  for (const p of year.phases) {
    if (dateKey(p.end) < dateKey(p.start)) problems.push(tag(`${p.id} ends before it starts`));
    if (p.sources.length < 2 && !(p.thin && p.thin.trim())) problems.push(tag(`${p.id} has ${p.sources.length} source(s) and no thin note`));
    else if (independentSourceCount(p.sources) < 2 && !(p.thin && p.thin.trim())) problems.push(tag(`${p.id} has ${independentSourceCount(p.sources)} source(s) other than Wikipedia and no thin note`));
    if (p.sources.length === 0 && !p.estimate) problems.push(tag(`${p.id} has no source and is not marked estimate`));
    if (p.estimate && !(p.thin && p.thin.trim())) problems.push(tag(`${p.id} is an estimate with no thin note saying how it was placed`));
  }
  /* The phases that need a decision stop the sim, every one of them, and nothing else does (a halts flag on any other phase is dropped by calendarHalts). */
  for (const p of year.phases) {
    if (HALT_KIND[p.id] && !p.halts) problems.push(tag(`${p.id} needs a decision but does not stop the sim`));
    if (!HALT_KIND[p.id] && p.halts) problems.push(tag(`${p.id} is marked to stop the sim but is not a decision`));
  }
  for (const id of ['resign', 'draft', 'freeAgency', 'cutDown', 'deadline'] as GmPhaseId[]) {
    if (!phaseById(year, id)) problems.push(tag(`no ${id} phase, so the sim has no ${id} stop`));
  }
  /* The league's real order, and no two phases on top of each other. */
  const ids = year.phases.map(p => p.id).join(',');
  const want = GM_PHASE_ORDER[def.sport].join(',');
  if (ids !== want) problems.push(tag(`phases come as ${ids}, the league's order is ${want}`));
  for (let i = 1; i < year.phases.length; i++) {
    const a = year.phases[i - 1], b = year.phases[i];
    if (dateKey(a.end) >= dateKey(b.start)) problems.push(tag(`${a.id} (to ${isoDate(a.end)}) runs into ${b.id} (from ${isoDate(b.start)})`));
  }
  /* The season: opens on opening day, the deadline inside it, the playoffs after it. */
  const opening = phaseById(year, 'opening');
  const deadline = phaseById(year, 'deadline');
  const playoffs = phaseById(year, 'playoffs');
  const rs = dateKey(year.regularStart), re = dateKey(year.regularEnd);
  if (re <= rs) problems.push(tag('the regular season ends before it starts'));
  if (!opening || dateKey(opening.start) !== rs) problems.push(tag('opening day is not the first day of the regular season'));
  if (!deadline) problems.push(tag('no trade deadline'));
  else if (!(dateKey(deadline.start) > rs && dateKey(deadline.start) < re)) problems.push(tag(`the deadline ${isoDate(deadline.start)} is not inside the regular season ${def.regularStart} to ${def.regularEnd}`));
  if (!playoffs || dateKey(playoffs.start) <= re) problems.push(tag('the playoffs do not start after the regular season'));
  /* Every engine period maps to exactly one range, back to back across the season. */
  if (year.periods.length !== def.periods) problems.push(tag(`${year.periods.length} periods for ${def.periods}`));
  year.periods.forEach((p, i) => {
    if (dateKey(p.end) < dateKey(p.start)) problems.push(tag(`period ${p.index} is empty`));
    const expectStart = i === 0 ? year.regularStart : addDays(year.periods[i - 1].end, 1);
    if (dateKey(p.start) !== dateKey(expectStart)) problems.push(tag(`period ${p.index} starts ${isoDate(p.start)}, not ${isoDate(expectStart)}`));
    if (p.gameDays.length !== def.gamesPerPeriod) problems.push(tag(`period ${p.index} draws ${p.gameDays.length} games`));
    if (p.gameDays.some(g => dateKey(g) < dateKey(p.start) || dateKey(g) > dateKey(p.end))) problems.push(tag(`period ${p.index} draws a game outside its range`));
  });
  const lastP = year.periods[year.periods.length - 1];
  if (!lastP || dateKey(lastP.end) !== re) problems.push(tag('the last period does not end on the last day of the regular season'));
  return problems;
}
