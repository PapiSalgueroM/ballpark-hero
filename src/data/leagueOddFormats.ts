/* Round 1100: the odd ledger. Its own module, with no imports, because
   src/lib/soccerCareerLeague.ts (on the Soccer Career page from the first
   screen) reads it for the dugout, while src/data/leagueFormat.ts belongs to
   the Season Centre, which the page downloads only when it is opened
   (scripts/simFlagshipWeight.mjs section 1). */

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
   and fails a league that has both a row here and a size or a
   LEAGUE_FORMAT window (src/data/leagueFormat.ts).

   Scottish Premiership 2026-27: 12 clubs; 33 games each before the split
   (every pair three times: ESPN's scoreboard feed, 198 fixtures to 10 April
   2027), then the top six and the bottom six play on among themselves (Sky
   Sports, 2026-07-29: "The final pre-split fixtures take place on April
   10", "Action resumes on April 24, 2027, with the first post-split
   matches"). The number of games after the split was not read from two
   hosts, so `after` is null.

   MLS 2026 (a calendar year season, the one the list's label means): 30
   clubs in two conferences, 34 games each (ESPN's scoreboard feed, 2026-02-21
   to 2026-11-08; the league's own schedule release, 2025-11-20: "each team
   play 34 games", conference opponents twice, six cross conference games).
   Nothing is claimed about a later season's calendar.

   Austrian Bundesliga 2026-27: 12 clubs; 22 games each (every pair twice:
   ESPN's scoreboard feed, 132 fixtures to 27 February 2027), then a
   champions group and a qualification group (flashscore.de on the 2026/27
   fixture list: "die zwölf Bundesligisten in 22 Runden", "um die
   Qualifikation für die Meister- beziehungsweise Qualifikationsgruppe").
   The games after the split were not read from two hosts: `after` is null.

   Waiting, no row yet, each one format host short (the lineups are read):
   Liga MX, the A-League, the Danish Superliga and Super League Greece
   (ESPN's fixture feed only), the Swiss Super League and the HNL (no format
   page read). Their dugout tables stay as on main until a row lands. */
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
  "MLS": [{ from: 2026, clubs: 30, games: 34, after: null, shape: 'conferences', words: "plays in two conferences" }],
  "Austrian Bundesliga": [{ from: 2026, clubs: 12, games: 22, after: null, shape: 'split', words: "splits in two after the regular season" }],
};

/** The league's odd format in the season starting in `year`, or null. */
export function oddFormatFor(league: string, year: number): OddFormat | null {
  for (const w of ODD_FORMATS[league] ?? []) {
    if (year >= w.from && (w.to === undefined || year <= w.to)) return w;
  }
  return null;
}
