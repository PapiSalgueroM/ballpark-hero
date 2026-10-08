/* Round 1045: LEAGUE_FORMAT, the Season Centre's table gate.

   A table with a matchday count and a points column makes three claims
   about a real league in a real season: how many clubs (LEAGUE_SIZES, Round
   929, and the Round 1036 ledgers), that every club met every other club
   home and away in ONE table with no split, conference or playoff that
   reorders it, and how many points a win was worth. This ledger holds the
   second and the third. A league or a season it does not list shows the
   season as results only, never as a table.

   Round one holds every season before 1995-96 out (the brief's scope cut):
   the switch from two points to three is not two sourced here, so a season
   before it never shows a table. Every window below is three points for a
   win and one for a draw.

   How it was read (2026-10-07, raw pages parsed by a script, never a
   summary): for every season from 1995-96 to 2023-24, statscrew.com's
   per season standings (worldfootball/standings/l-<CODE>/y-<YEAR>, W L T
   Pts per club), checking that every club played 2(N-1) games and that
   Pts = 3W + D; and rsssf.org's per season tables (P W D L Pts per club)
   for the same seasons, which agreed wherever the table parsed and were
   read by eye at both ends of each window where it did not. 2024-25 from
   rsssf.org and ESPN's standings feed (site.api.espn.com/apis/v2/sports/
   soccer/<league>/standings?season=2024, gamesPlayed, wins, ties, points),
   because statscrew has no 2024 table yet. Clubs and sizes per season are
   the Round 1036 receipts (two non wiki sources a season). A points
   deduction (Middlesbrough 1996-97, Fiorentina, Lazio, Milan, Reggina and
   Siena 2006-07, Portsmouth 2009-10, Everton and Nottingham Forest 2023-24)
   leaves a club's points
   below 3W + D in both sources; it is a sanction, not a format, and the
   Season Centre's tables are the career's own results, so none applies.

   Premier League (statscrew l-ENGPRE): 20 clubs, 38 games, every season
     1995-96 to 2024-25. rsssf.org/engpaul/FLA/1995-96.html to 2007-08,
     rsssf.org/tablese/eng09.html (2008-09), eng2010.html (2009-10) and
     eng2011.html to eng2025.html.
   La Liga (l-SPAPRI): 22 clubs and 42 games in 1995-96 and 1996-97, 20 and
     38 from 1997-98. rsssf.org/tabless/span96.html to span2025.html, all 29
     seasons to 2023-24 parsed clean.
   Serie A (l-ITASEA): 18 and 34 to 2003-04, 20 and 38 from 2004-05.
     rsssf.org/tablesi/ital96.html (read by eye: Milan 21 wins, 10 draws, 73
     points), ital05.html to ital2025.html. Two clubs level on points for a
     relegation place have been split by a playoff after the table: two legs
     in 2004-05 (Parma and Bologna, both on 42; rsssf ital05.html, and ESPN's
     ita.1 scoreboards for 14 and 18 June 2005), one game in 2022-23 (Spezia
     and Verona, rsssf ital2023.html). It only orders two level clubs. The
     Season Centre never shows his club level on points with the club above
     or below him, nor two clubs level at the top; other clubs may sit level,
     and the footnote gives this game's tiebreak.
   Bundesliga (l-GERBUN): 18 and 34, every season. rsssf.org/tablesd/
     duit96.html (read by eye: Dortmund 19 wins, 11 draws, 68 points) and
     duit2025.html (Bayern 25, 7, 82). The relegation playoff with the second
     division's third club is played after the table and does not reorder it.
   Ligue 1 (l-FRALG1): 20 and 38 to 1996-97, 18 and 34 to 2001-02, 20 and 38
     to 2022-23, 18 and 34 from 2023-24. rsssf.org/tablesf/fran96.html to
     fran2025.html. HELD: 2019-20, abandoned after 27 or 28 games a club and
     settled on points per game (rsssf fran2020.html and statscrew y-2019
     both show 27 and 28 games played).

   Round 1100, from 2026-27 only (no earlier season of these leagues is
   claimed): the Championship (24 clubs, 46 games), the Eredivisie, the
   Primeira Liga, the Super Lig, the Saudi Pro League, the Belgian Pro
   League and the 2. Bundesliga (18 and 34 each), and the Brasileirao (20
   and 38, the calendar year 2026). Each was read from two hosts as one
   table, every club meeting every other home and away, three points for a
   win: ESPN's scoreboard feed for every day of the season calendar (every
   home and away pairing exactly once) and a page that states the format,
   both in scripts/data/soccerCareerFacts.json leagueWorld with what each
   said. Belgium is plain from 2026-27 by its own reform: 18 clubs, 34
   games, no play-offs (bx1.be and sporza.be). A play-off played AFTER the
   table does not reorder it and does not make a league odd: the
   Championship's promotion play-offs (third to eighth from 2026-27), the
   Eredivisie's European play-offs and the 2. Bundesliga's relegation tie.

   Not listed, so results only: every other league. The ones that split
   their season, play in conferences or play two tournaments a year are in
   ODD_FORMATS below with their real number of clubs and games, and get no
   row here. Seasons after the latest one read keep the format in force
   today, the way LEAGUE_SIZES keeps the latest size.

   This file imports nothing. */

export interface FormatWindow { from: number; to?: number }

/** Seasons (start years) in which the league was one double round robin
 *  table, three points for a win, one for a draw. */
export const LEAGUE_FORMAT: Readonly<Record<string, readonly FormatWindow[]>> = {
  "Premier League": [{ from: 1995 }],
  "La Liga": [{ from: 1995 }],
  "Serie A": [{ from: 1995 }],
  "Bundesliga": [{ from: 1995 }],
  "Ligue 1": [{ from: 1995, to: 2018 }, { from: 2020 }],
  "Championship": [{ from: 2026 }],
  "Eredivisie": [{ from: 2026 }],
  "Primeira Liga": [{ from: 2026 }],
  "Super Lig": [{ from: 2026 }],
  "Saudi Pro League": [{ from: 2026 }],
  "Belgian Pro League": [{ from: 2026 }],
  "2. Bundesliga": [{ from: 2026 }],
  "Brasileirao": [{ from: 2026 }],
};

/* ─── Round 1100: ODD_FORMATS, the leagues that are not one plain table ───
   A league that splits in two late on, ends in play-off groups, plays every
   pair four times, plays in conferences or plays two tournaments a year
   never gets a LEAGUE_SIZES or a LEAGUE_FORMAT row: the Season Centre's
   table would claim a season that league does not play. Its real number of
   clubs and games goes here instead, read by nothing that draws a finish or
   a table. The dugout takes its number of table rows from it (and prints
   the order only, no points), and Round 1114 reads it to give these leagues
   their own season shape.

   A row needs the lineup and the format read from two hosts each, in
   scripts/data/soccerCareerFacts.json leagueWorld, from 2026 only.
   scripts/simCareerLeagueWorld.mjs section A holds every row to that file
   and fails a league that has both this and a size.

   Scottish Premiership 2026-27: 12 clubs; 33 games each before the split
   (every pair three times: ESPN's scoreboard feed, 198 fixtures to 10 April
   2027), then the top six and the bottom six play on among themselves (Sky
   Sports, 2026-07-29: "The final pre-split fixtures take place on April
   10", "Action resumes on April 24, 2027, with the first post-split
   matches"). The number of games after the split was not read from two
   hosts, so `after` is null.

   Waiting, no row yet, each one format host short (the lineups are read):
   MLS, Liga MX, the A-League, the Austrian Bundesliga, the Danish
   Superliga and Super League Greece (ESPN's fixture feed only), the Swiss
   Super League and the HNL (no format page read). Their dugout tables stay
   as on main until a row lands. */
export interface OddFormat {
  from: number; to?: number;
  /** Clubs in the league that season. */
  clubs: number;
  /** League games every club plays before the league divides, or in the
   *  whole regular season (in one of the two tournaments for a
   *  'two-tournaments' league: see `tournaments`). */
  games: number;
  /** Games every club plays after it divides; null when that differs by
   *  group, is a knockout, or was not read from two hosts. */
  after: number | null;
  shape: 'split' | 'groups' | 'four-meetings' | 'finals' | 'conferences' | 'two-tournaments';
  /** Tournaments in a season, when `games` is the count of one of them. */
  tournaments?: number;
  /** Finishes the sentence "The order only: <league> ...". Casual, true, no
   *  number that can rot. */
  words: string;
}
export const ODD_FORMATS: Readonly<Record<string, readonly OddFormat[]>> = {
  "Scottish Premiership": [{ from: 2026, clubs: 12, games: 33, after: null, shape: 'split', words: "splits in two late in the season" }],
};

/** The league's odd format in the season starting in `year`, or null. */
export function oddFormatFor(league: string, year: number): OddFormat | null {
  for (const w of ODD_FORMATS[league] ?? []) {
    if (year >= w.from && (w.to === undefined || year <= w.to)) return w;
  }
  return null;
}

export interface PointsRule { win: number; draw: number; loss: number }

/** The season's points rule when the league is a verified single double
 *  round robin table that season, otherwise null (results only). */
export function leagueFormatFor(league: string, year: number): PointsRule | null {
  const windows = LEAGUE_FORMAT[league];
  if (!windows) return null;
  for (const w of windows) {
    if (year >= w.from && (w.to === undefined || year <= w.to)) return { win: 3, draw: 1, loss: 0 };
  }
  return null;
}
