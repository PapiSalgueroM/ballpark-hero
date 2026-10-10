/* Round 1211: the real shape of the NHL season, 2006-07 to 2026-27, as a
   sourced ledger. It is the data step for "NHL My Career, week by week": the
   binding round folds these rows into src/data/usSeasonLengths.ts and
   src/data/usLeagueShape.ts. NOTHING IMPORTS THIS FILE YET, and it imports
   nothing. `year` is the year a season STARTS in (2012 is 2012-13).

   THE RULE is the MLB ledger's (src/data/usSeasonLedgerMlb.ts): every fact
   was read on 2026-10-10 in two independent sources, neither a wiki; a fact
   only one source gave is null and named in NHL_THIN; the receipts are in
   scripts/data/usSeasonSources1211.json, keyed by the names in each `src`
   list; scripts/simUsSeasonLedger.mjs holds this file to them and to the
   game's own team lists.

   THE SOURCES, by the key used in `src`:
   nhl       The league's own standings feed for the last day of each regular
             season: every club's division, conference and games played (and,
             for 2006-07 and 2025-26, its overtime losses, shootout wins and
             goals).
   hr        Hockey Reference, "<season> NHL Summary": the standings by
             division with games played, and its "NHL League Averages" (the
             league's games and goals a game, season by season).
   espn-nhl  ESPN, "NHL Standings": games played for the seasons it was read
             for, and which clubs are in which conference.
   The rest are single articles and are named where they are used.

   CLUB IDS are the league feed's own three letters, which are the game's
   ids wherever the game has that club (NJD, TBL, LAK, SJS, PHX, ATL, UTA).
   ARI is the league's and is in neither of the game's lists.

   THE SAME CLUB, THE SAME NAME. The game's 2006 list (NHL_TEAMS_2006) is the
   real league of 2006-07 to 2010-11, club for club and name for name. From
   2011-12 it is not: NHL_NAME_SPANS says when the Thrashers and the Phoenix
   Coyotes stop being real clubs, and the league gains Winnipeg, Vegas,
   Seattle and Utah. Today's list is the real league of 2025-26 and 2026-27. */

export const NHL_LEDGER_READ_ON = '2026-10-10';
/** The last FINISHED season both sources were read for (2025-26). */
export const NHL_LENGTHS_VERIFIED_TO = 2025;

export interface NhlSeasonRow {
  /** The year the season starts in. */
  year: number;
  /** Games every club played, or null when the season had no single length. */
  games: number | null;
  /** For a `games: null` season: what the standings show, completing "the real 2019-20 season ...". */
  why?: string;
  /** Clubs in the league that season. */
  teams: number;
  /** Games in the whole league (hr's league table). teams x games = twice this. */
  leagueGames: number;
  /** Which row of NHL_ALIGNMENTS the season was played in. */
  align: string;
  /** False: a published schedule of a season still being played, not final standings. */
  finished: boolean;
  src: readonly string[];
}

const BOTH = ['nhl', 'hr', 'hr-league'] as const;

export const NHL_SEASONS: readonly NhlSeasonRow[] = [
  { year: 2006, games: 82, teams: 30, leagueGames: 1230, align: 'six-2006', finished: true, src: [...BOTH, 'espn-nhl'] },
  { year: 2007, games: 82, teams: 30, leagueGames: 1230, align: 'six-2006', finished: true, src: [...BOTH, 'espn-nhl'] },
  { year: 2008, games: 82, teams: 30, leagueGames: 1230, align: 'six-2006', finished: true, src: [...BOTH, 'espn-nhl'] },
  { year: 2009, games: 82, teams: 30, leagueGames: 1230, align: 'six-2006', finished: true, src: BOTH },
  { year: 2010, games: 82, teams: 30, leagueGames: 1230, align: 'six-2006', finished: true, src: BOTH },
  { year: 2011, games: 82, teams: 30, leagueGames: 1230, align: 'six-2011', finished: true, src: BOTH },
  { year: 2012, games: 48, teams: 30, leagueGames: 720, align: 'six-2011', finished: true, src: [...BOTH, 'espn-nhl'] },
  { year: 2013, games: 82, teams: 30, leagueGames: 1230, align: 'four-2013', finished: true, src: [...BOTH, 'espn-nhl'] },
  { year: 2014, games: 82, teams: 30, leagueGames: 1230, align: 'four-2014', finished: true, src: BOTH },
  { year: 2015, games: 82, teams: 30, leagueGames: 1230, align: 'four-2014', finished: true, src: BOTH },
  { year: 2016, games: 82, teams: 30, leagueGames: 1230, align: 'four-2014', finished: true, src: BOTH },
  { year: 2017, games: 82, teams: 31, leagueGames: 1271, align: 'four-2017', finished: true, src: [...BOTH, 'espn-nhl'] },
  { year: 2018, games: 82, teams: 31, leagueGames: 1271, align: 'four-2017', finished: true, src: BOTH },
  {
    year: 2019, games: null, teams: 31, leagueGames: 1082, align: 'four-2017', finished: true, src: BOTH,
    why: 'has no single length: clubs finished on 68 to 71 games',
  },
  { year: 2020, games: 56, teams: 31, leagueGames: 868, align: 'four-2020', finished: true, src: BOTH },
  { year: 2021, games: 82, teams: 32, leagueGames: 1312, align: 'four-2021', finished: true, src: [...BOTH, 'espn-nhl'] },
  { year: 2022, games: 82, teams: 32, leagueGames: 1312, align: 'four-2021', finished: true, src: BOTH },
  { year: 2023, games: 82, teams: 32, leagueGames: 1312, align: 'four-2021', finished: true, src: BOTH },
  { year: 2024, games: 82, teams: 32, leagueGames: 1312, align: 'four-2024', finished: true, src: BOTH },
  { year: 2025, games: 82, teams: 32, leagueGames: 1312, align: 'four-2024', finished: true, src: [...BOTH, 'espn-nhl'] },
  /* The league went to 84 games. 1,344 is the league's own count of the
     schedule (32 clubs at 84), not a finished season's. */
  { year: 2026, games: 84, teams: 32, leagueGames: 1344, align: 'four-2024', finished: false, src: ['nhl-84', 'espn-84', 'nhl', 'hr'] },
];

/** Games each club had played when the 2019-20 season stopped (both sources, club for club). */
export const NHL_2019_CLUB_GAMES: Readonly<Record<string, number>> = {
  BOS: 70, TBL: 70, TOR: 70, FLA: 69, BUF: 69, OTT: 71, DET: 71, MTL: 71,
  WSH: 69, PHI: 69, PIT: 69, CAR: 68, NYI: 68, CBJ: 70, NYR: 70, NJD: 69,
  STL: 71, COL: 70, DAL: 69, NSH: 69, WPG: 71, MIN: 69, CHI: 70,
  VGK: 71, EDM: 71, VAN: 69, CGY: 70, ARI: 70, LAK: 70, SJS: 70, ANA: 71,
};

/** The ids of the game's 2006 list that stop being a real club: the last
 *  season (start year) under that name, and what the club was called next.
 *  The other 28 kept their names through 2026-27 in both sources. */
export const NHL_NAME_SPANS: readonly { id: string; club: string; from: number; to: number; next: string; src: readonly string[] }[] = [
  { id: 'ATL', club: 'Atlanta Thrashers', from: 2006, to: 2010, next: 'Winnipeg Jets', src: ['nhl', 'hr'] },
  { id: 'PHX', club: 'Phoenix Coyotes', from: 2006, to: 2013, next: 'Arizona Coyotes', src: ['nhl', 'hr'] },
];

/* THE DIVISIONS, SEASON BY SEASON. Both sources were read for every season
   and agree on every club's division in all 21. `conf` is the conference
   (null in 2020-21, when the league played in four divisions with no
   conferences); it has two sources wherever it is not null: the league feed
   and ESPN's conference tables (2006-07, 2008-09, 2012-13, 2013-14, 2017-18,
   2021-22, 2025-26). */
export interface NhlDivision { conf: 'Eastern' | 'Western' | null; name: string; teams: readonly string[] }
export interface NhlAlignment { key: string; from: number; to: number | null; divisions: readonly NhlDivision[] }

const ATL_8 = ['BOS', 'BUF', 'DET', 'FLA', 'MTL', 'OTT', 'TBL', 'TOR'];
const MET_8 = ['CAR', 'CBJ', 'NJD', 'NYI', 'NYR', 'PHI', 'PIT', 'WSH'];
const six = (southeast: readonly string[]): readonly NhlDivision[] => [
  { conf: 'Eastern', name: 'Atlantic', teams: ['NJD', 'NYI', 'NYR', 'PHI', 'PIT'] },
  { conf: 'Eastern', name: 'Northeast', teams: ['BOS', 'BUF', 'MTL', 'OTT', 'TOR'] },
  { conf: 'Eastern', name: 'Southeast', teams: southeast },
  { conf: 'Western', name: 'Central', teams: ['CBJ', 'CHI', 'DET', 'NSH', 'STL'] },
  { conf: 'Western', name: 'Northwest', teams: ['CGY', 'COL', 'EDM', 'MIN', 'VAN'] },
  { conf: 'Western', name: 'Pacific', teams: ['ANA', 'DAL', 'LAK', 'PHX', 'SJS'] },
];
const four = (central: readonly string[], pacific: readonly string[]): readonly NhlDivision[] => [
  { conf: 'Eastern', name: 'Atlantic', teams: ATL_8 },
  { conf: 'Eastern', name: 'Metropolitan', teams: MET_8 },
  { conf: 'Western', name: 'Central', teams: central },
  { conf: 'Western', name: 'Pacific', teams: pacific },
];

export const NHL_ALIGNMENTS: readonly NhlAlignment[] = [
  /* 30 clubs, six divisions of five. The game's 2006 list, club for club. */
  { key: 'six-2006', from: 2006, to: 2010, divisions: six(['ATL', 'CAR', 'FLA', 'TBL', 'WSH']) },
  /* Atlanta's club is in Winnipeg and still in the Southeast. */
  { key: 'six-2011', from: 2011, to: 2012, divisions: six(['CAR', 'FLA', 'TBL', 'WPG', 'WSH']) },
  /* Four divisions: eight, eight, seven and seven. */
  { key: 'four-2013', from: 2013, to: 2013, divisions: four(['CHI', 'COL', 'DAL', 'MIN', 'NSH', 'STL', 'WPG'], ['ANA', 'CGY', 'EDM', 'LAK', 'PHX', 'SJS', 'VAN']) },
  /* The Coyotes are Arizona's by name. */
  { key: 'four-2014', from: 2014, to: 2016, divisions: four(['CHI', 'COL', 'DAL', 'MIN', 'NSH', 'STL', 'WPG'], ['ANA', 'ARI', 'CGY', 'EDM', 'LAK', 'SJS', 'VAN']) },
  /* Vegas joins the Pacific: 31 clubs. */
  { key: 'four-2017', from: 2017, to: 2019, divisions: four(['CHI', 'COL', 'DAL', 'MIN', 'NSH', 'STL', 'WPG'], ['ANA', 'ARI', 'CGY', 'EDM', 'LAK', 'SJS', 'VAN', 'VGK']) },
  /* One season in four other divisions (the league feed prints them under sponsors' names). */
  {
    key: 'four-2020', from: 2020, to: 2020, divisions: [
      { conf: null, name: 'North', teams: ['CGY', 'EDM', 'MTL', 'OTT', 'TOR', 'VAN', 'WPG'] },
      { conf: null, name: 'East', teams: ['BOS', 'BUF', 'NJD', 'NYI', 'NYR', 'PHI', 'PIT', 'WSH'] },
      { conf: null, name: 'Central', teams: ['CAR', 'CBJ', 'CHI', 'DAL', 'DET', 'FLA', 'NSH', 'TBL'] },
      { conf: null, name: 'West', teams: ['ANA', 'ARI', 'COL', 'LAK', 'MIN', 'SJS', 'STL', 'VGK'] },
    ],
  },
  /* Seattle joins the Pacific and Arizona moves to the Central: 32 clubs, four divisions of eight. */
  { key: 'four-2021', from: 2021, to: 2023, divisions: four(['ARI', 'CHI', 'COL', 'DAL', 'MIN', 'NSH', 'STL', 'WPG'], ['ANA', 'CGY', 'EDM', 'LAK', 'SEA', 'SJS', 'VAN', 'VGK']) },
  /* Utah's club takes Arizona's place in the Central. Read for 2024-25, 2025-26 and 2026-27; carried forward from there. */
  { key: 'four-2024', from: 2024, to: null, divisions: four(['CHI', 'COL', 'DAL', 'MIN', 'NSH', 'STL', 'UTA', 'WPG'], ['ANA', 'CGY', 'EDM', 'LAK', 'SEA', 'SJS', 'VAN', 'VGK']) },
];
export const NHL_ALIGNMENTS_SRC: readonly string[] = ['nhl', 'hr', 'espn-nhl'];

/* THE 84 GAME FORMULA, from 2026-27. The league's own site, "10 things to know about
   2026-27 NHL regular season" (16 July 2026), and ESPN, "NHL releases
   expanded 84-game schedule for 2026-27 season" (16 July 2026), agree on
   every number: four games against each of the 7 division rivals, two at
   home (28); three against each of the 8 other clubs of the conference, four
   of them met twice at home and four once (24); two against each of the 16
   clubs of the other conference, one at home (32); 42 at home. ESPN: "The
   NHL has had an 82-game season since 1995-96." */
export const NHL_FORMULA_84 = {
  from: 2026, games: 84,
  division: { opponents: 7, games: 4, home: 2, total: 28 },
  conference: { opponents: 8, games: 3, total: 24, twiceAtHome: 4, onceAtHome: 4 },
  other: { opponents: 16, games: 2, home: 1, total: 32 },
  homeGames: 42,
  src: ['nhl-84', 'espn-84'],
} as const;

/* THE PLAYOFFS, FROM 2013-14: sixteen clubs, four rounds, every one a best
   of seven. The league's own site, "Playoff Format" ("Each of the four
   rounds is a best-of-7"; its headings give the round names), and Sports
   Illustrated, "NHL Stanley Cup Playoffs: Format, Teams, Rules & Changes
   Through the Years" (10 April 2025). `series` is [wins needed, most games].

   `from` (a start year): Sports Illustrated dates this format from 2013-14,
   and Hockey Reference's page of the 2014 playoffs is the first to print a
   First Round and a Second Round (its 2007 page prints Conference
   Quarter-Finals and Conference Semi-Finals). THIS BLOCK SAYS NOTHING OF
   2006-07 TO 2012-13: what those seven seasons' playoffs were has one
   source and is in NHL_THIN.

   `modified` (start years): the two tournaments Sports Illustrated sets
   apart, and Hockey Reference shows both: the 2020 playoffs began with a
   Qualifying Round and a Round Robin and held 24 clubs, and the 2021
   playoffs had Semi-Finals where the other three pages read (2007, 2014
   and 2020) have Conference Finals.

   That the conference champions meet in the Final is one source's sentence
   and is in NHL_THIN, not here. */
export const NHL_PLAYOFF_FORMAT = {
  from: 2013,
  clubs: 16,
  rounds: ['First Round', 'Second Round', 'Conference Finals', 'Stanley Cup Final'],
  series: [[4, 7], [4, 7], [4, 7], [4, 7]],
  modified: [2019, 2020],
  src: ['nhl-playoff-format', 'si-playoff-format', 'hr-playoffs'],
} as const;
/** For `from` and for `modified`, each on its own: the league's page speaks of today only. */
export const NHL_PLAYOFF_FROM_SRC: readonly string[] = ['si-playoff-format', 'hr-playoffs'];
export const NHL_PLAYOFF_MODIFIED_SRC: readonly string[] = ['si-playoff-format', 'hr-playoffs'];

/* LEAGUE SCORING, goals per team game, by era id: 2006-07 for the throwback
   and 2025-26, the last finished season, for the present day era. There are
   two honest numbers, because the club that wins a shootout is given one
   goal on the final score that nobody scored:
   - `inPlay`: Hockey Reference, "NHL League Averages" (2.88 and 3.08), and
     the league feed's goals less its shootout wins, over the team games:
     (7,246 - 164) / 2,460 = 2.879 and (8,205 - 119) / 2,624 = 3.082.
   - `onTheBoard`: the goals columns of the league feed and of Hockey
     Reference, which agree club for club: 7,246 / 2,460 = 2.946 and
     8,205 / 2,624 = 3.127. */
export const NHL_SCORING: Readonly<Record<string, { inPlay: number; onTheBoard: number }>> = {
  now: { inPlay: 3.08, onTheBoard: 3.13 },
  y2006: { inPlay: 2.88, onTheBoard: 2.95 },
};
export const NHL_SCORING_YEAR: Readonly<Record<string, number>> = { now: 2025, y2006: 2006 };
export const NHL_SCORING_SRC: readonly string[] = ['nhl', 'hr', 'hr-league'];

/* PAST SIXTY MINUTES. How many games were level after regulation (the sum
   of every club's overtime losses) and how many of those went to a shootout
   (the sum of every club's shootout wins), in the same two seasons. The
   league feed and Hockey Reference agree club for club on both columns. */
export const NHL_OVERTIME: Readonly<Record<string, { games: number; pastSixty: number; shootouts: number }>> = {
  now: { games: 1312, pastSixty: 326, shootouts: 119 },
  y2006: { games: 1230, pastSixty: 281, shootouts: 164 },
};
export const NHL_OVERTIME_SRC: readonly string[] = ['nhl', 'hr', 'hr-shootout'];

/* THE RULES AFTER SIXTY MINUTES, regular season: five minutes of sudden
   death overtime, three skaters a side since 2015-16, then a shootout of
   three rounds that goes on until one side leads; the loser keeps a point in
   the standings (the third column of a record). Playoffs: sudden death
   periods of 20 minutes at five a side, and never a shootout. Sports
   Illustrated, "NHL Overtime Rules Explained: Playoffs and Regular Season"
   (5 March 2025), and NBC Chicago, "Everything to Know About NHL Overtime
   Rules" (19 May 2023). Every season this ledger holds had the shootout: the
   feed counts 164 of them in 2006-07. `skatersBefore2015` is thin.

   THE LOSER'S POINT has its own two sources, because NBC Chicago says
   nothing of it: Sports Illustrated ("both teams are awarded a single
   point") and the league's own standings feed for the last day of 2025-26,
   where every one of the 32 clubs has twice its wins plus its overtime
   losses in points (NHL_OVERTIME_POINT_SRC). */
export const NHL_OVERTIME_RULES: {
  minutes: number; skatersFrom2015: number; skatersBefore2015: number | null; shootoutRounds: number;
  loserGetsAPoint: boolean; playoffPeriodMinutes: number; playoffShootout: boolean;
} = {
  minutes: 5, skatersFrom2015: 3, skatersBefore2015: null, shootoutRounds: 3,
  loserGetsAPoint: true, playoffPeriodMinutes: 20, playoffShootout: false,
};
export const NHL_OVERTIME_RULES_SRC: readonly string[] = ['si-overtime', 'nbc-overtime'];
export const NHL_OVERTIME_POINT_SRC: readonly string[] = ['si-overtime', 'nhl-points'];

/** The game clock: three periods of 20 minutes (the same two articles). */
export const NHL_CLOCK = { periods: 3, minutes: 20 } as const;
export const NHL_CLOCK_SRC: readonly string[] = ['si-overtime', 'nbc-overtime'];

/** THIN: every fact a binding round might want that is NOT two sourced. None of it is filled above. */
export const NHL_THIN: readonly { what: string; oneSource: string; tried: string }[] = [
  {
    what: 'The 84 game season is a schedule, not a result.',
    oneSource: 'Both sources give the formula and the 84; no club has finished a season on it. The row is marked `finished: false`.',
    tried: 'Nothing more can be read until April 2027.',
  },
  {
    what: 'The schedule formula of the 82 game seasons (any of them).',
    oneSource: 'None read. ESPN says only that the 82 game schedule left some clubs with uneven numbers of division games.',
    tried: 'Not gathered: a throwback career plays unnamed opponents, and every present day season is on the 84 game formula.',
  },
  {
    what: 'How many skaters a side played overtime before 2015-16.',
    oneSource: 'NBC Chicago: four a side.',
    tried: 'Sports Illustrated gives 2015 for three a side and does not say what came before.',
  },
  {
    what: 'How the 2020 and 2021 playoffs differed (the seasons that started in 2019 and 2020).',
    oneSource: 'Hockey Reference: the 2020 playoffs held 24 clubs, with a Qualifying Round of eight series won with three wins and a Round Robin before the First Round; the 2021 playoffs had Semi-Finals in place of Conference Finals. Sports Illustrated says only that they were "modified". More detail is in src/lib/nhlPlayoffFormatHistory.ts, from pages not read again today.',
    tried: 'The league\'s own "Playoff Format" page describes today only.',
  },
  {
    what: 'The playoffs of 2006-07 to 2012-13: how many clubs, how many rounds, how long each series, and what the rounds were called.',
    oneSource: 'Hockey Reference, the 2007 playoffs: sixteen clubs, fifteen series each won with four wins, under the names Conference Quarter-Finals, Conference Semi-Finals, Conference Finals and Final. One season of the seven was read. src/lib/nhlPlayoffFormatHistory.ts says best of seven in every round since 1986-87, from pages not read again today.',
    tried: 'Sports Illustrated dates today\'s format from 2013-14 and the league\'s own page describes today only, so NHL_PLAYOFF_FORMAT starts in 2013.',
  },
  {
    what: 'That the Stanley Cup Final is the only round against the other conference.',
    oneSource: 'Sports Illustrated: "The conference champions meet in the Stanley Cup Final." Hockey Reference agrees for the one season read for it: on its 2014 page the Final is played by the winners of the two Conference Finals. It was not read season by season.',
    tried: 'The league\'s own "Playoff Format" page does not say who meets in the Final.',
  },
  {
    what: 'Why 2012-13 had 48 games, why 2019-20 stopped and why 2020-21 had 56.',
    oneSource: 'None read today: the rows give the lengths the standings show and no cause.',
    tried: 'Not gathered: the held line needs the length, not the reason.',
  },
  {
    what: 'The first season of the shootout.',
    oneSource: 'Sports Illustrated: "After 2005, the league introduced the shootout".',
    tried: 'Not needed: both sources count shootouts in 2006-07, the first season this ledger holds.',
  },
  {
    what: 'One goal of the 2006-07 New York Islanders.',
    oneSource: 'ESPN prints 247 goals for; the league feed and Hockey Reference print 248. The ledger follows the two that agree.',
    tried: 'Read once on ESPN.',
  },
];
