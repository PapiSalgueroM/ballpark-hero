/* Round 1048: how long each real NBA and NFL regular season was, so a career's
   "week by week" is only offered for a season whose real length is the one the
   game by game view is built for (82, 17: US_FULL_SEASON below). An NFL career
   plays the year's real length since Round 1104 and an NBA career since Round
   1103 (66 in 2011-12, 72 in 2020-21; a year with no single length plays 82).
   `year` is the year a season STARTS in (NBA 2011 is 2011-12).

   This file is eager (the hub reads it before a press) and imports nothing.

   SOURCES, all read 2026-10-07. Two independent sources agree on every window
   below; a season they do not settle is left out or held, never filled.

   NBA (23 seasons, 2003-04 to 2025-26):
   1. Basketball Reference, "NBA League Averages - Per Game": the league games
      column is 1189 in 2003-04 (29 teams at 82), 1230 in every full 30 team
      season (82 each), 990 in 2011-12 (66 each), 1229 in 2012-13, 1059 in
      2019-20 and 1080 in 2020-21 (72 each).
   2. NBA.com, "Season Review: 2011-12" (66 games after the lockout); NBA.com,
      "NBA announces structure and format for 2020-21 season" (72 games) and
      "Schedule breakdown: how rest, road trips and other factors will impact
      2021-22" (back to 82); NBA Communications, "Pacers at Celtics game
      canceled" (16 April 2013, not rescheduled, so both finished on 81);
      NBA.com, "2019-20 NBA Season Updates" (suspended in March, 22 teams
      added eight games each); the Basketball Reference and ESPN 2019-20
      standings, read 2026-10-08, where teams finished on 64 games
      (Minnesota, 19-45) to 75 (Dallas, 43-32); ESPN TrueHoop,
      "Why is there an 82-game schedule?" (82 since 1967-68); Up In The
      Rafters, "How Many Games Are in an NBA Season?" (14 April 2026); and the
      Basketball Reference and ESPN 2025-26 standings, where all 30 teams
      show 82 games.
   Two seasons have no single length and are held: 2012-13 (one game called
   off for good) and 2019-20 (cut short). Holding all of 2012-13 for the two
   teams that played 81 is the careful reading: the game does not know which
   team's game was lost.

   NFL (21 seasons, 2005 to 2025):
   1. ESPN, "NFL owners approve 17-game season, starting in 2021" ("The NFL
      has played 16-game seasons since 1978").
   2. NFL.com, "NFL season to feature 17 regular-season games per team"
      (beginning in 2021); NFL Football Operations, "Creating the NFL
      Schedule" ("Each NFL team plays 17 games over the 18-week season"); and
      the ESPN and NFL.com 2025 standings, where all 32 teams show 17 games.
   One season has no single length and is held: 2022. Both read 2026-10-08:
   ESPN, "NFL Standings 2022" (Buffalo 13-3-0 and Cincinnati 12-4-0, 16
   games each, every other team 17); CNBC, "Bills-Bengals game postponed
   after Damar Hamlin's cardiac arrest won't be made up, NFL says" (6 January
   2023: the Week 17 game is a no contest and is not replayed). It is the
   same case as NBA 2012-13, and it is held for the same reason.

   Facts confirmed by both sources: 23 NBA seasons (21 with one length, two
   with none) and 21 NFL seasons (20 with one length, one with none). A
   window with `to: null` is the latest verified format carried
   forward: from 2026 on the league is the career's own world on today's
   format, and the Season Center's "?" says so. */

export type UsLengthSport = 'nba' | 'nfl';

export interface UsLengthWindow {
  from: number;
  to: number | null;
  /** Games every team played, or null when the season had no single length. */
  games: number | null;
  /** For a `games: null` season: what happened, completing "the real 2019-20 season ...". */
  why?: string;
}

/** The season the game by game view is built for: 82, 17. An NFL career plays
 *  the real length of the year since Round 1104 (16 from 2005 to 2020) and an
 *  NBA career since Round 1103 (66 in 2011-12, 72 in 2020-21), so in those
 *  years the view has less than it needs. */
export const US_FULL_SEASON = { nba: 82, nfl: 17 } as const;

/** Does the career's engine play the real length of a year the ledger holds?
 *  The held line must not say "this career plays 17" of a season that played 16.
 *  The NBA is true since Round 1103: nbaSeasonGames reads this ledger, and
 *  src/test/usSeason.test.ts plays a season in every ledger year to prove it. */
const CAREER_PLAYS_REAL_LENGTH: Record<UsLengthSport, boolean> = { nba: true, nfl: true };

export const US_SEASON_LENGTHS: Record<UsLengthSport, readonly UsLengthWindow[]> = {
  nba: [
    { from: 2003, to: 2010, games: 82 },
    { from: 2011, to: 2011, games: 66 },
    { from: 2012, to: 2012, games: null, why: 'had one game called off for good, so two teams finished on 81 games' },
    { from: 2013, to: 2018, games: 82 },
    { from: 2019, to: 2019, games: null, why: 'was cut short and teams finished on different numbers of games' },
    { from: 2020, to: 2020, games: 72 },
    { from: 2021, to: null, games: 82 },
  ],
  nfl: [
    { from: 2005, to: 2020, games: 16 },
    { from: 2021, to: 2021, games: 17 },
    { from: 2022, to: 2022, games: null, why: 'had one game called off for good, so two teams finished on 16 games' },
    { from: 2023, to: null, games: 17 },
  ],
};

/** The last season both sources were read for. */
export const US_LENGTHS_VERIFIED_TO = { nba: 2025, nfl: 2025 } as const;

function windowOf(sport: UsLengthSport, year: number): UsLengthWindow | null {
  return US_SEASON_LENGTHS[sport].find(w => year >= w.from && (w.to === null || year <= w.to)) ?? null;
}

/** The real regular season's games per team, or null (no single length, or a year the ledger does not hold). */
export function usSeasonLength(sport: UsLengthSport, year: number): number | null {
  return windowOf(sport, year)?.games ?? null;
}

/** '2026-27' for the NBA, '2026' for the NFL. */
export function usSeasonLabel(sport: UsLengthSport, year: number): string {
  return sport === 'nba' ? `${year}-${String((year + 1) % 100).padStart(2, '0')}` : String(year);
}

/** Why the season of `year` has no game by game view, in the site's voice,
 *  or null exactly when its real length is the one the view is built for. */
export function usSeasonHeldLine(sport: UsLengthSport, year: number): string | null {
  const full = US_FULL_SEASON[sport];
  const w = windowOf(sport, year);
  if (w && w.games === full) return null;
  const label = usSeasonLabel(sport, year);
  if (!w) return `📺 No week by week this season: the game has no verified length for the real ${label} season.`;
  if (w.games === null) return `📺 No week by week this season: the real ${label} season ${w.why ?? 'had no single length'}.`;
  const why = CAREER_PLAYS_REAL_LENGTH[sport]
    ? `the real ${label} season had ${w.games} games and the week by week view is built for ${full}.`
    : `the real ${label} season had ${w.games} games and this career plays ${full}.`;
  const firstFull = US_SEASON_LENGTHS[sport].find(x => x.games === full)?.from;
  if (firstFull !== undefined && year < firstFull) {
    return `📺 Week by week starts with the ${usSeasonLabel(sport, firstFull)} season: ${why}`;
  }
  return `📺 No week by week this season: ${why}`;
}
