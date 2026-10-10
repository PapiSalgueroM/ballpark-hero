/* Round 1211: the real shape of the MLB season, 2004 to 2026, as a sourced
   ledger. It is the data step for "MLB My Career, week by week": the binding
   round folds these rows into src/data/usSeasonLengths.ts and
   src/data/usLeagueShape.ts. NOTHING IMPORTS THIS FILE YET, and it imports
   nothing.

   THE RULE. Every fact here was read on 2026-10-10 in two independent
   sources, neither of them a wiki. A fact that only one source gave is not
   filled: its value is null and it is named in MLB_THIN with what was tried.
   Where two sources print different things, both are written down in the
   season's `disputed` line and in docs/audits/ROUND-1211-NOTES.md.
   The receipts (the address, the date read and what each source literally
   says, season by season) are in scripts/data/usSeasonSources1211.json, keyed
   by the names in each `src` list below. scripts/simUsSeasonLedger.mjs holds
   this file to them and to the game's own team lists.

   THE SOURCES, by the key used in `src`:
   retro     Retrosheet, "The <year> Season": final standings with games,
             wins, losses and ties for every club. 2004 to 2025.
   espn      ESPN, "MLB Standings <year>": wins and losses for every club.
             2004 to 2026. It prints no ties.
   bref      Baseball Reference, "<year> Major League Baseball Team
             Statistics", the games column of Team Standard Batting, for the
             eleven seasons it was read for.
   bref-league  Baseball Reference, "Major League Baseball Batting
             Year-by-Year Averages": team games and runs a game for the whole
             league, all 23 seasons. Baseball Reference builds on Retrosheet's
             game files, so retro, bref and bref-league count as ONE source
             here, never as two.
   bref-schedule  Baseball Reference, "<year> <club> Schedule": every game of
             a club's season, home or away, by opponent. Read for seven club
             seasons, 2023 to 2026 (the same ONE source as retro and bref).
   espn-runs ESPN's 2004 and 2026 standings again, for the runs columns.
   almanac-  Baseball Almanac, "Year In Review" for a league and year (wins,
             losses, ties) and "MLB Postseason Playoffs 1969 - 2026".
   The rest are single articles and are named where they are used.

   WHAT `games` MEANS. Games played. A tie is a game played (2005, 2016), so
   a club on 103 wins, 58 losses and a tie played 162, not 161.

   WHAT `ids` MEANS (the same club, the same name). An id is listed only when
   one of the game's own team lists that can reach that year holds that club
   under the name it really carried that season: MLB_TEAMS_2004 from 2004 on,
   and today's list (src/data/conquestDataMlb.ts) from 2026 on, the first
   year a present day career can play. The real 2008 Washington Nationals are
   in `clubs` and have no id: the only list that reaches 2008 holds the
   Montreal Expos, who did not play in 2008. MLB_NAME_SPANS says which years
   each id of the 2004 list is a real club at all.

   FAIL CLOSED. Both sources were read for all 30 clubs in every one of the
   23 seasons, so no season is "not read". A season this file does not hold
   is not open. */

export const MLB_LEDGER_READ_ON = '2026-10-10';
/** The last season both sources were read for (a finished season). */
export const MLB_LENGTHS_VERIFIED_TO = 2026;

/** Clubs that did not play the season's `games`, or played a tie inside them. */
export interface MlbClubGroup {
  /** Games each of these clubs played that season (a tie is a game played). */
  games: number;
  /** Tie games inside `games`. Absent: none. */
  ties?: number;
  /** Completes "in the real 2008 season your club ...". Only what the sources say. */
  why: string;
  /** Every real club of the group, by the name it carried that season. */
  clubs: readonly string[];
  /** The game's own ids for the clubs a team list reaching that year holds under that name. */
  ids: readonly string[];
}

export interface MlbSeasonRow {
  year: number;
  /** The schedule's length that season. */
  games: number;
  /** Team games in the whole league (bref's league total): 30 clubs' games added up. */
  teamGames: number;
  /** Empty: every club played `games`, with no tie. */
  clubs: readonly MlbClubGroup[];
  /** Receipt keys: two independent sources at least. */
  src: readonly string[];
  /** Where a source prints something else: what each one says. The row follows the two that agree. */
  disputed?: string;
}

const SHORT1 = 'finished on 161 games, one short of the 162 on the schedule';
const EXTRA1 = 'played a 163rd game';

export const MLB_SEASONS: readonly MlbSeasonRow[] = [
  {
    year: 2004, games: 162, teamGames: 4856, src: ['retro', 'espn', 'bref', 'bref-league', 'almanac-2004-al'],
    clubs: [{ games: 161, why: SHORT1, clubs: ['Pittsburgh Pirates', 'Milwaukee Brewers', 'Tampa Bay Devil Rays', 'Toronto Blue Jays'], ids: ['PIT', 'MIL', 'TBD', 'TOR'] }],
    disputed: 'ESPN prints Cleveland 80-81 (161 games; read twice, and its own table then holds 2,428 wins against 2,427 losses). Retrosheet (80-82, 162 games), Baseball Almanac (80-82) and Baseball Reference (162 games) agree on 162.',
  },
  {
    year: 2005, games: 162, teamGames: 4862, src: ['retro', 'espn', 'bref', 'bref-league', 'ap-2016-tie', 'nbc-2016-tie'],
    clubs: [{ games: 163, ties: 1, why: 'played 163 games, one of them a tie', clubs: ['Cincinnati Reds', 'Houston Astros'], ids: ['CIN', 'HOU'] }],
  },
  {
    year: 2006, games: 162, teamGames: 4858, src: ['retro', 'espn', 'bref', 'bref-league'],
    clubs: [{ games: 161, why: SHORT1, clubs: ['St. Louis Cardinals', 'San Francisco Giants'], ids: ['STL', 'SFG'] }],
  },
  {
    year: 2007, games: 162, teamGames: 4862, src: ['retro', 'espn', 'bref', 'bref-league'],
    clubs: [{ games: 163, why: EXTRA1, clubs: ['Colorado Rockies', 'San Diego Padres'], ids: ['COL', 'SDP'] }],
  },
  {
    year: 2008, games: 162, teamGames: 4856, src: ['retro', 'espn', 'bref', 'bref-league'],
    clubs: [
      { games: 161, why: SHORT1, clubs: ['Washington Nationals', 'Florida Marlins', 'Chicago Cubs', 'Houston Astros', 'Baltimore Orioles', 'Oakland Athletics'], ids: ['FLA', 'CHC', 'HOU', 'BAL', 'OAK'] },
      { games: 163, why: EXTRA1, clubs: ['Chicago White Sox', 'Minnesota Twins'], ids: ['CHW', 'MIN'] },
    ],
  },
  {
    year: 2009, games: 162, teamGames: 4860, src: ['retro', 'espn', 'bref-league'],
    clubs: [
      { games: 161, why: SHORT1, clubs: ['Chicago Cubs', 'Pittsburgh Pirates'], ids: ['CHC', 'PIT'] },
      { games: 163, why: EXTRA1, clubs: ['Minnesota Twins', 'Detroit Tigers'], ids: ['MIN', 'DET'] },
    ],
  },
  { year: 2010, games: 162, teamGames: 4860, src: ['retro', 'espn', 'bref-league'], clubs: [] },
  {
    year: 2011, games: 162, teamGames: 4858, src: ['retro', 'espn', 'bref-league'],
    clubs: [{ games: 161, why: SHORT1, clubs: ['Washington Nationals', 'Los Angeles Dodgers'], ids: ['LAD'] }],
  },
  { year: 2012, games: 162, teamGames: 4860, src: ['retro', 'espn', 'bref-league'], clubs: [] },
  {
    year: 2013, games: 162, teamGames: 4862, src: ['retro', 'espn', 'bref-league'],
    clubs: [{ games: 163, why: EXTRA1, clubs: ['Tampa Bay Rays', 'Texas Rangers'], ids: ['TEX'] }],
  },
  { year: 2014, games: 162, teamGames: 4860, src: ['retro', 'espn', 'bref-league'], clubs: [] },
  {
    year: 2015, games: 162, teamGames: 4858, src: ['retro', 'espn', 'bref-league'],
    clubs: [{ games: 161, why: SHORT1, clubs: ['Cleveland Indians', 'Detroit Tigers'], ids: ['CLV', 'DET'] }],
  },
  {
    year: 2016, games: 162, teamGames: 4856, src: ['retro', 'espn', 'bref', 'bref-league', 'ap-2016-tie', 'nbc-2016-tie'],
    clubs: [
      { games: 161, why: SHORT1, clubs: ['Miami Marlins', 'Atlanta Braves', 'Cleveland Indians', 'Detroit Tigers'], ids: ['ATL', 'CLV', 'DET'] },
      { games: 162, ties: 1, why: 'played all 162 games, one of them a tie that was never finished', clubs: ['Chicago Cubs', 'Pittsburgh Pirates'], ids: ['CHC', 'PIT'] },
    ],
  },
  { year: 2017, games: 162, teamGames: 4860, src: ['retro', 'espn', 'bref-league'], clubs: [] },
  {
    year: 2018, games: 162, teamGames: 4862, src: ['retro', 'espn', 'bref', 'bref-league', 'almanac-2018-nl'],
    clubs: [
      { games: 161, why: SHORT1, clubs: ['Miami Marlins', 'Pittsburgh Pirates'], ids: ['PIT'] },
      { games: 163, why: EXTRA1, clubs: ['Milwaukee Brewers', 'Chicago Cubs', 'Los Angeles Dodgers', 'Colorado Rockies'], ids: ['MIL', 'CHC', 'LAD', 'COL'] },
    ],
    disputed: 'ESPN prints Pittsburgh 83-79 (162 games) and Arizona 82-81 (163 games), read twice. Retrosheet, Baseball Almanac and Baseball Reference agree on Pittsburgh 82-79 (161 games) and Arizona 82-80 (162 games).',
  },
  {
    year: 2019, games: 162, teamGames: 4858, src: ['retro', 'espn', 'bref-league'],
    clubs: [{ games: 161, why: SHORT1, clubs: ['Chicago White Sox', 'Detroit Tigers'], ids: ['CHW', 'DET'] }],
  },
  {
    /* The short season: 60 games on the schedule, and two clubs did not reach it. */
    year: 2020, games: 60, teamGames: 1796, src: ['retro', 'espn', 'bref', 'bref-league'],
    clubs: [{ games: 58, why: 'finished on 58 games, two short of the 60 on the schedule that year', clubs: ['St. Louis Cardinals', 'Detroit Tigers'], ids: ['STL', 'DET'] }],
  },
  {
    year: 2021, games: 162, teamGames: 4858, src: ['retro', 'espn', 'bref', 'bref-league'],
    clubs: [{ games: 161, why: SHORT1, clubs: ['Atlanta Braves', 'Colorado Rockies'], ids: ['ATL', 'COL'] }],
  },
  { year: 2022, games: 162, teamGames: 4860, src: ['retro', 'espn', 'bref', 'bref-league'], clubs: [] },
  { year: 2023, games: 162, teamGames: 4860, src: ['retro', 'espn', 'bref-league'], clubs: [] },
  {
    year: 2024, games: 162, teamGames: 4858, src: ['retro', 'espn', 'bref-league'],
    clubs: [{ games: 161, why: SHORT1, clubs: ['Cleveland Guardians', 'Houston Astros'], ids: ['HOU'] }],
  },
  { year: 2025, games: 162, teamGames: 4860, src: ['retro', 'espn', 'bref-league'], clubs: [] },
  {
    /* Retrosheet has no 2026 page yet; the other independent sources are
       three reports of the game that was never played. The Associated Press
       says "because of sustained rain"; Bleacher Report ("sustained inclement
       weather", "it won't be rescheduled") and Field Level Media ("continued
       inclement weather") name the weather and not rain, so the `why` says
       the weather. */
    year: 2026, games: 162, teamGames: 4858, src: ['espn', 'bref', 'bref-league', 'ap-2026-finale', 'br-2026-finale', 'flm-2026-finale'],
    clubs: [{
      games: 161, why: 'had its last game called off for the weather and never made up, so it finished on 161 games',
      clubs: ['Baltimore Orioles', 'New York Yankees'], ids: ['BAL', 'NYY'],
    }],
  },
];

/** The ids of the 2004 list that are a real club only for some years: the
 *  last season the club carried that name, and what it was called next.
 *  Every other id of that list kept its name from 2004 to 2026 (retro and
 *  bref print the same 24 names in every season read). A row of a career
 *  whose club is outside its span is a club that did not play that year. */
export const MLB_NAME_SPANS: readonly { id: string; club: string; from: number; to: number; next: string; src: readonly string[] }[] = [
  { id: 'MON', club: 'Montreal Expos', from: 2004, to: 2004, next: 'Washington Nationals', src: ['retro', 'espn', 'bref'] },
  { id: 'ANA', club: 'Anaheim Angels', from: 2004, to: 2004, next: 'Los Angeles Angels of Anaheim', src: ['bref', 'espn'] },
  { id: 'TBD', club: 'Tampa Bay Devil Rays', from: 2004, to: 2007, next: 'Tampa Bay Rays', src: ['retro', 'bref', 'almanac-names'] },
  { id: 'FLA', club: 'Florida Marlins', from: 2004, to: 2011, next: 'Miami Marlins', src: ['retro', 'espn'] },
  { id: 'CLV', club: 'Cleveland Indians', from: 2004, to: 2021, next: 'Cleveland Guardians', src: ['retro', 'bref', 'almanac-names'] },
  { id: 'OAK', club: 'Oakland Athletics', from: 2004, to: 2024, next: 'Athletics', src: ['retro', 'espn', 'bref'] },
];

/* THE LEAGUE'S SHAPE IN 2026: two leagues, six divisions of five, by today's
   ids. ESPN, "MLB Standings 2026" grouped by division, and Baseball
   Reference, "2026 MLB Standings", agree on all 30 places. `conf` holds the
   league, as the NBA's and NFL's rows hold the conference. */
export interface MlbDivision { conf: 'AL' | 'NL'; name: string; teams: readonly string[] }
export const MLB_DIVISIONS_2026: readonly MlbDivision[] = [
  { conf: 'AL', name: 'AL East', teams: ['NYY', 'BOS', 'TOR', 'TBR', 'BAL'] },
  { conf: 'AL', name: 'AL Central', teams: ['CLE', 'DET', 'KCR', 'MIN', 'CHW'] },
  { conf: 'AL', name: 'AL West', teams: ['HOU', 'SEA', 'TEX', 'LAA', 'ATH'] },
  { conf: 'NL', name: 'NL East', teams: ['ATL', 'PHI', 'NYM', 'MIA', 'WSN'] },
  { conf: 'NL', name: 'NL Central', teams: ['MIL', 'CHC', 'STL', 'CIN', 'PIT'] },
  { conf: 'NL', name: 'NL West', teams: ['LAD', 'SDP', 'SFG', 'ARI', 'COL'] },
];
export const MLB_DIVISIONS_SRC: readonly string[] = ['espn-divisions-2026', 'bref-divisions-2026'];

/* THE SCHEDULE FORMULA. What is real: how many games a club plays against each
   kind of opponent. What is claimed nowhere: who met whom on which day.

   2025 and 2026 (162 = 52 + 62 + 48):
   - 13 games against each of the 4 division rivals: USA TODAY, "2025 MLB
     regular season schedule" (18 July 2024), and Ticketmaster, "A Look at
     the 2026 MLB Schedule and New Rules" (19 May 2026).
   - 62 against the other 10 clubs of the league, six or seven each: both of
     the above. Six against 8 of them and seven against 2 is Ticketmaster's
     own sentence, and the only way 10 clubs at six or seven make 62.
   - 48 against the other league: one three game series against 14 of its
     clubs (both of the above) and six against the interleague rival, a
     three game series in each park: Major League Baseball's own releases,
     "MLB announces 2025 regular-season schedule" ("from four to six", "each
     of the 30 Clubs will play two fewer games against non-division league
     opponents") and "MLB announces 2026 regular-season schedule" ("again"),
     and Ticketmaster. Both releases were read where The Highland County
     Press printed them, on pages dated 22 July 2024 and 1 September 2025:
     those are the newspaper's days, not the league's.
   2023 and 2024 (162 = 52 + 64 + 46): ESPN, "All 30 Major League Baseball
   teams to play one another in a season for first time in 2023" (24 August
   2022), and the Associated Press, "MLB teams to play all 29 opponents under
   2023 balanced schedule" (25 August 2022). The rival series was four games
   then, two in each park. Explainers that still print 64 and 46 describe
   these two seasons, not today's.

   HOME AND AWAY (`homeSrc`): each row's home and away numbers have their own
   two sources, each of them speaking of a season of THAT row. An article
   about one format is no source for the other.
   - 2025 and 2026: Ticketmaster of 2026 (seven and six against a division
     rival, 26 of the 52 at home, seven of the 14 interleague series at
     home) and the games actually played, on Baseball Reference's schedule
     pages: Detroit 2025, and Detroit, Toronto, Texas and Houston 2026.
   - 2023 and 2024: ESPN's report of the 2023 format ("six or seven
     home/road games against divisional opponents", 32 at home of the 64,
     "seven series (21 games) at home") and Baseball Reference's schedule
     pages: Detroit 2023 and Texas 2024.
   So within a row one season has the article and the played games and the
   other has the played games alone (2025, 2024). The lead may hold that
   stricter than this file does: it is said in the round's notes.

   A `null` below is a number only one source gave (MLB_THIN says which). */
export const MLB_FORMULAS = [
  {
    from: 2025, to: 2026, games: 162,
    division: { opponents: 4, games: 13, total: 52, homeOrAway: [7, 6], series: null, homeTotal: 26 },
    league: { sixGames: 8, sevenGames: 2, total: 62, homeTotal: null },
    rival: { games: 6, series: 2, home: 3 },
    interleague: { opponents: 14, games: 3, total: 42, homeSeries: 7 },
    homeGames: null,
    src: ['usatoday-2025-schedule', 'ticketmaster-2026', 'mlb-release-2025', 'mlb-release-2026', 'bref-schedule'],
    /* For homeOrAway, division.homeTotal, rival.home and homeSeries. */
    homeSrc: ['ticketmaster-2026', 'bref-schedule'],
  },
  {
    from: 2023, to: 2024, games: 162,
    division: { opponents: 4, games: 13, total: 52, homeOrAway: [7, 6], series: null, homeTotal: null },
    league: { sixGames: 6, sevenGames: 4, total: 64, homeTotal: 32 },
    rival: { games: 4, series: 2, home: 2 },
    interleague: { opponents: 14, games: 3, total: 42, homeSeries: 7 },
    homeGames: null,
    src: ['espn-2023-format', 'ap-2023-format', 'bref-schedule'],
    /* For homeOrAway, league.homeTotal, rival.home and homeSeries. */
    homeSrc: ['espn-2023-format', 'bref-schedule'],
  },
] as const;

/* THE FIFTEEN INTERLEAGUE RIVAL PAIRS the formula's six games go to, as
   [American League id, National League id] by today's ids. Three sources
   print the same fifteen: ESPN and the Associated Press in August 2022 (for
   the 2023 schedule) and Ticketmaster's 2026 guide. Nine are neighbours and
   six were paired by the league (Associated Press: Red Sox and Braves,
   Pirates and Tigers, Phillies and Blue Jays, Rangers and Diamondbacks,
   Astros and Rockies, Padres and Mariners).
   For 2026 itself: CBS Sports, "Ranking all 15 matchups for MLB Rivalry
   Weekend" (15 May 2026), lists eleven of the fifteen pairs as that
   weekend's series; the other four series that weekend (Phillies and
   Pirates, Diamondbacks and Rockies, Blue Jays and Tigers, Rangers and
   Astros) are what the league's releases call "four other regional
   matchups", and they are made of exactly the eight clubs of the four pairs
   left over (Pirates and Tigers, Phillies and Blue Jays, Rangers and
   Diamondbacks, Astros and Rockies). For those four pairs the 2026 fixture
   source is the games actually played: Baseball Reference's 2026 schedule
   pages of Detroit, Toronto, Texas and Houston each show exactly one
   National League club met six times, three in each park, and it is the
   Pirates, the Phillies, the Diamondbacks and the Rockies. The league's
   own schedule pages could not be opened. */
export const MLB_RIVALS: readonly (readonly [string, string])[] = [
  ['NYY', 'NYM'], ['CHW', 'CHC'], ['LAA', 'LAD'], ['ATH', 'SFG'], ['CLE', 'CIN'],
  ['TBR', 'MIA'], ['BAL', 'WSN'], ['KCR', 'STL'], ['MIN', 'MIL'], ['BOS', 'ATL'],
  ['DET', 'PIT'], ['TOR', 'PHI'], ['TEX', 'ARI'], ['HOU', 'COL'], ['SEA', 'SDP'],
];
export const MLB_RIVALS_SRC: readonly string[] = ['ticketmaster-2026', 'espn-2023-format', 'ap-2023-format', 'cbs-2026-rivalry', 'bref-schedule'];
/** The receipts that speak of the 2026 season itself: all fifteen pairs in
 *  Ticketmaster, eleven in CBS Sports, the other four in the games played. */
export const MLB_RIVALS_2026_SRC: readonly string[] = ['ticketmaster-2026', 'cbs-2026-rivalry', 'bref-schedule'];

/* THE POSTSEASON. From 2022: twelve clubs, six a league; the two division
   winners with the best records in each league skip the first round; the
   Wild Card Series is a best of three, the Division Series a best of five,
   the League Championship Series and the World Series a best of seven.
   CBS Sports, "What to know about 2025 MLB playoffs: Format, tiebreakers,
   rules, seeds, pitch clock, automatic runners, more" (30 September 2025),
   and the Associated Press, "MLB playoff primer: Things to know as
   postseason nears" (2022). `series` is [wins needed, most games]. */
export const MLB_PLAYOFF_FORMAT = {
  from: 2022,
  clubs: 12,
  rounds: ['Wild Card Series', 'Division Series', 'Championship Series', 'World Series'],
  series: [[2, 3], [3, 5], [4, 7], [4, 7]],
  /** How many clubs of each league skip the first round. NOT MODELLED by the career's engine. */
  byesPerLeague: 2,
  src: ['cbs-2025-playoffs', 'ap-2022-playoffs', 'cbs-2022-playoffs', 'espn-wildcard'],
} as const;

/* What the first round was, season by season since 2004. ESPN, "How does MLB
   wild card work? Format, history, stats" (25 September 2025), and Baseball
   Almanac, "MLB Postseason Playoffs 1969 - 2026" (its eras: one wild card
   club to 2011, a wild card game 2012 to 2021, a wild card series from 2022,
   and a wild card series in 2020). `series: null` is a length only one
   source gave. */
export const MLB_FIRST_ROUND: readonly { from: number; to: number | null; round: string | null; clubs: number; series: readonly [number, number] | null }[] = [
  { from: 2004, to: 2011, round: null, clubs: 8, series: null },
  { from: 2012, to: 2019, round: 'Wild Card Game', clubs: 10, series: [1, 1] },
  { from: 2020, to: 2020, round: 'Wild Card Series', clubs: 16, series: null },
  { from: 2021, to: 2021, round: 'Wild Card Game', clubs: 10, series: [1, 1] },
  { from: 2022, to: null, round: 'Wild Card Series', clubs: 12, series: [2, 3] },
];
export const MLB_FIRST_ROUND_SRC: readonly string[] = ['espn-wildcard', 'almanac-postseason', 'cbs-2022-playoffs'];

/** The first season with no tiebreaker game: a 163rd game was how two clubs
 *  level for a place were split until then. CBS Sports, "2022 MLB playoffs:
 *  New postseason format explained, and why there are no more Game 163
 *  tiebreakers" (5 October 2022), and NBC Sports Boston, "How to watch MLB
 *  postseason, bracket, new format explained" (8 September 2022). */
export const MLB_NO_TIEBREAKER_GAME_FROM = 2022;
export const MLB_NO_TIEBREAKER_SRC: readonly string[] = ['cbs-2022-playoffs', 'nbcboston-2022-playoffs'];

/* LEAGUE SCORING, runs per team game, by era id: the 2004 season for the
   throwback and 2026 for the present day era. Baseball Reference, "Major
   League Baseball Batting Year-by-Year Averages" (4.81 and 4.48), and the
   runs columns of ESPN's 2004 and 2026 standings added up here: 23,364 runs
   in 4,856 team games (4.811) and 21,769 in 4,858 (4.481). */
export const MLB_SCORING: Readonly<Record<string, number>> = { now: 4.48, y2004: 4.81 };
export const MLB_SCORING_YEAR: Readonly<Record<string, number>> = { now: 2026, y2004: 2004 };
export const MLB_SCORING_SRC: readonly string[] = ['bref-league', 'espn-runs'];

/** The shares of games a score law would be held to. None is two sourced, so
 *  none is filled: MLB_THIN says what one source printed. A law that needs
 *  them is banded on its own measured output, and says so. */
export const MLB_GAME_SHARES: { shutouts: number | null; oneRun: number | null; extraInnings: number | null } = {
  shutouts: null, oneRun: null, extraInnings: null,
};

/* HOW A GAME ENDS. In the regular season every extra inning starts with a
   runner on second base, and in the postseason it does not: CBS Sports, "MLB
   ghost runner rule: League makes extra-innings change permanent for
   regular-season games, per report" (14 February 2023), and For The Win in
   Yahoo Sports, "MLB playoffs extra innings rules: Is there a 'ghost
   runner'? Here's the answer" (18 October 2024: "to start the 10th and
   onwards"). The year it began and the plain rule that a game has nine
   innings and plays on until one side leads are thin: MLB_THIN. */
export const MLB_GAME_RULES: { extraInningRunner: boolean; extraInningRunnerInPostseason: boolean; extraInningRunnerFrom: number | null; innings: number | null } = {
  extraInningRunner: true, extraInningRunnerInPostseason: false, extraInningRunnerFrom: null, innings: null,
};
export const MLB_GAME_RULES_SRC: readonly string[] = ['cbs-2023-runner', 'ftw-2024-runner'];

/* A CLUB OUTSIDE THE LEAGUE. The career's engine can send a player to the
   Yomiuri Giants for two years (src/lib/mlbCareerLifeB.ts). No MLB standings
   read for this ledger hold that club in any season, which is the fact a
   binding round needs: such a row is not an MLB season. What league it is
   in and how long its season is have one source each and are not filled. */
export const MLB_OUTSIDE_CLUBS: readonly { team: string; inMlb: false; league: string | null; games: number | null; src: readonly string[] }[] = [
  { team: 'Yomiuri Giants', inMlb: false, league: null, games: null, src: ['retro', 'espn'] },
];

/** THIN: every fact a binding round might want that is NOT two sourced, with
 *  what one source printed and what was tried. None of it is filled above. */
export const MLB_THIN: readonly { what: string; oneSource: string; tried: string }[] = [
  {
    what: 'The share of games decided by one run, and the share that went to extra innings.',
    oneSource: 'ESPN, "MLB Expanded Standings": 668 one run games and 209 extra inning games of 2,429 in 2026 (27.5 and 8.6 percent); 638 and 287 of 2,428 in 2004 (26.3 and 11.8 percent). Each table balances, wins against losses.',
    tried: 'Baseball Reference keeps these in tables the reader did not receive; the league site refused the reader.',
  },
  {
    what: 'The share of team games that are shutouts.',
    oneSource: 'None read.',
    tried: 'Baseball Reference (team pitching table not received), the league site (refused), one web search.',
  },
  {
    what: 'A division rival is met in four series (any season), and 26 of the 52 division games at home in 2023 and 2024.',
    oneSource: 'The four series: Ticketmaster, "A Look at the 2026 MLB Schedule and New Rules". The 26 of 2023 and 2024: Baseball Reference, the schedule pages of Detroit 2023 and Texas 2024.',
    tried: 'USA TODAY, the league releases and the 2022 ESPN report give the 13 games, not the series count; ESPN gives six or seven at home against a rival, not the 26. For 2025 and 2026 the 26 is filled: Ticketmaster and Baseball Reference agree.',
  },
  {
    what: 'Home and away inside the 62 games against the rest of the league (2025 and 2026), and the 81 home games of a season.',
    oneSource: 'Baseball Reference, the schedule pages: 31 at home and 31 away of the 62 in all five club seasons read (Detroit 2025 and 2026, Toronto, Texas and Houston 2026), and 81 home games in all seven read.',
    tried: 'Ticketmaster and USA TODAY do not give the split; no article read states 81. For 2023 and 2024 the 32 of 64 is filled: ESPN and Baseball Reference agree.',
  },
  {
    what: 'The first season of the extra inning runner (2020), and the rule that a game has nine innings and plays on until one side leads.',
    oneSource: 'CBS Sports (2023 and 2025) gives 2020; For The Win calls the first extra inning "the 10th".',
    tried: 'The league glossary refused the reader; a dictionary page refused the reader; the explainers a search found were not publishers this ledger would cite.',
  },
  {
    what: 'The 2020 Wild Card Series as a best of three, and the Division Series as a best of five before 2022.',
    oneSource: 'ESPN gives the best of five for 1995 to 2011. The best of three of 2020 is in src/lib/mlbPostseasonFormatHistory.ts from a CBS Sports report that was not read again today.',
    tried: 'Baseball Almanac names the rounds of every season and gives no lengths.',
  },
  {
    what: 'The league and the season length of the Yomiuri Giants.',
    oneSource: 'NPB, "2025 Standings": Central League, 143 games for every club.',
    tried: 'Two searches returned only wiki pages beside it; a ticket site gives the playoff shape and no season length.',
  },
  {
    what: 'Why each club on 161 fell short and what each 163rd game was, season by season.',
    oneSource: 'None for the throwback seasons. Only 2026 (the weather: the Associated Press, Bleacher Report and Field Level Media) and the two ties (2005 and 2016: the Associated Press and NBC Sports) were read, and those three are in their rows. That the 2026 game was rain is the Associated Press alone. Every other row says "finished on 161 games" or "played a 163rd game" and no more.',
    tried: 'Not gathered: 16 seasons hold such a club.',
  },
  {
    what: 'That the World Series is the only round against the other league.',
    oneSource: 'CBS Sports, 2025: "World Series: Best-of-seven series between AL and NL champion".',
    tried: 'The Associated Press primer was not asked that; no other source read says it in words.',
  },
  {
    what: 'The schedule formula before 2023.',
    oneSource: 'the 2022 ESPN report gives the totals it replaced: 76 division games, 66 in the league, 20 interleague.',
    tried: 'Not gathered: a throwback career plays unnamed opponents.',
  },
];
