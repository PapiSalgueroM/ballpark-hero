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

   Not listed, so results only: every other league (the Primeira Liga, the
   Eredivisie, the Brasileirao, Liga MX, whose derby cadence of two is an
   Apertura and a Clausura, never one table, and MLS, conferences and an
   unbalanced schedule). Seasons after the latest one read keep the format
   in force today, the way LEAGUE_SIZES keeps the latest size.

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
};

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
