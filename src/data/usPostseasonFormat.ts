/* Round 1300: the real postseason of the NBA and the NFL, by season, as data.

   WHY A FILE. The playoff deriver (src/lib/season/usPlayoffs.ts) lays a
   career's playoff run out game by game, and it may only do that for a
   season whose real format the game holds on two sources. This file is that
   gate, and the "?" of the playoff stage is written from it and never from
   memory.

   WHAT IS NOT TYPED HERE. The round names and each round's length are typed
   once, in `US_PLAYOFF_FORMAT` (src/data/usLeagueShape.ts, with its own two
   sources), and read from there by `usPostseasonRounds`. A round is handed
   on as { name, series: [wins needed, most games] }, the shape
   `postseasonRounds` gives the MLB and NHL careers, so every US career
   reads a round one way. No MLB row and no NHL row lives here: their
   ledgers are the data for those two.

   `year` is the year a season STARTS in (NBA 2011 is 2011-12), as in
   src/data/usSeasonLengths.ts.

   WHAT NO CAREER ENGINE MODELS, and the "?" says so: a bye (the NFL's top
   seed skips the Wild Card round; a career's champion always plays four
   games) and the stage before round one (the NBA's play-in). Both are
   recorded here as the league's real rule and never drawn as games.

   SOURCES, all read on 2026-10-10 by the builder of this round through a
   fetch that summarises a page and quotes it. What each one states is given
   in this file's own words. Two independent publishers stand behind every
   fact a row states; `src` names them fact by fact and
   src/test/usPostseasonFormat.test.ts counts them.

   NBA
   - 16 clubs, eight a conference, since the 1984 playoffs: CBS Sports (the
     play-in settles the eight playoff clubs of each conference); NBA.com
     (an official release dates the 16 team format to 1984); Sports
     Illustrated (16 clubs from the middle of the 1980s).
   - The Finals is the only round against the other conference: ESPN (two
     best of seven series decide the champions of the two conferences, and
     their winners meet in the Finals); Sports Illustrated (the bracket is
     seeded inside each conference, and the two conference champions meet in
     the Finals).
   - The first round has been a best of seven since the 2003 playoffs: NBC
     Sports (a press release states the year). The lengths themselves are
     `US_PLAYOFF_FORMAT`'s, on its own two sources. The first window starts
     with 2003-04 because that is the oldest season a career can play.
   - A play-in for places 7 to 10 of each conference, for the 7th and 8th
     seeds, in full from 2020-21: NBA.com (places 7 to 10 play for the 7th
     and 8th seeds; places 1 to 6 are in); CBS Sports (written in May 2021:
     that season is the first with the full play-in); Sports Illustrated
     (adopted in full for the 2021 playoffs).
   - 2019-20 was played to another format (a first version of the play-in,
     tried when the season restarted in one place): CBS Sports and Sports
     Illustrated both say so. Which clubs that version was open to is NOT
     claimed: see US_POSTSEASON_THIN.
   NFL
   - 14 clubs, seven a conference, from the 2020 season (12 before, since
     1990): ESPN (the owners' vote of March 2020); Sports Illustrated (the
     field grew to 14 starting in 2020); NBC Sports and Fox Sports (seven
     from each conference).
   - Only the top seed of each conference skips the Wild Card round: ESPN,
     NBC Sports and Fox Sports.
   - The Super Bowl is the only round against the other conference: NBC
     Sports and Sports Illustrated (the two conference champions meet in it).
   No NFL row before 2020: every NFL season the Season Center opens is 2021
   or later (src/data/usLeagueShape.ts says why).

   Imports one constant, read only inside functions (nothing is evaluated at
   module scope from an import). No React, no engine. */
import { US_PLAYOFF_FORMAT } from './usLeagueShape';

/** A source: who published it, its title as printed, the date it carries and the day it was read. */
export interface UsPostseasonSource { publisher: string; title: string; dated: string; read: string }

export const US_POSTSEASON_SOURCES: Readonly<Record<string, UsPostseasonSource>> = {
  cbsPlayIn: { publisher: 'CBS Sports', title: "NBA play-in tournament explained: What to know about league's playoff format change, which teams are involved", dated: '2021-05-20', read: '2026-10-10' },
  nbaPlayIn: { publisher: 'NBA.com', title: 'Everything to know about 2026 SoFi NBA Play-In Tournament', dated: '2026-04-18', read: '2026-10-10' },
  nbaNotable: { publisher: 'NBA.com', title: 'Notable numbers about best-of-seven series in NBA playoff history', dated: '2018-04-19', read: '2026-10-10' },
  siNbaTeams: { publisher: 'Sports Illustrated', title: 'How Many Teams Make the NBA Playoffs? A Look at the Past and Present of Playoff Expansion', dated: '2025-02-24', read: '2026-10-10' },
  siNbaFormat: { publisher: 'Sports Illustrated', title: 'NBA Playoffs Format, Key Dates and More', dated: '2025-02-24', read: '2026-10-10' },
  espnConfFinals: { publisher: 'ESPN', title: 'NBA conference finals history: Winners, records and stats', dated: '2026-05-30', read: '2026-10-10' },
  nbcFirstRound: { publisher: 'NBC Sports', title: "NBC and Peacock deliver the most-watched first round Game 7 in NBA history for Saturday night's 76ers-Celtics contest", dated: '2026-05-05', read: '2026-10-10' },
  espnNfl14: { publisher: 'ESPN', title: 'NFL playoff expansion to 14 teams: Everything you need to know', dated: '2020-03-31', read: '2026-10-10' },
  nbcNfl: { publisher: 'NBC Sports', title: 'How do the 2025-26 NFL playoffs work? Teams, first-round byes, bracket, reseeding', dated: '2026-01-07', read: '2026-10-10' },
  foxNfl: { publisher: 'Fox Sports', title: 'NFL Playoff Format: How does the NFL postseason work?', dated: '2025-12-22', read: '2026-10-10' },
  siNfl: { publisher: 'Sports Illustrated', title: 'NFL Playoff Format, Dates, History and Predictions', dated: '2024-11-13', read: '2026-10-10' },
};

/** The facts a row states, each with its own list of sources. */
export type UsPostseasonFact = 'clubs' | 'byes' | 'before' | 'lastRoundOnlyCross' | 'years' | 'modified';

export interface UsPostseasonWindow {
  sport: 'nba' | 'nfl';
  /** First and last season, by the year it starts, both in; null: still current (the career's own world keeps it). */
  from: number; to: number | null;
  /** Clubs in the bracket. */
  clubs: number;
  /** Clubs of EACH conference that skip round one. NOT MODELLED by any career engine: the "?" says so. */
  byes: number;
  /** A stage before round one that is not part of the bracket (the NBA play-in: places 7 to 10). Never drawn. */
  before: { name: string; places: readonly [number, number] } | null;
  /** The last round is the only one against the other conference; null: not two sourced, nothing claimed. */
  lastRoundOnlyCross: boolean | null;
  /** Seasons inside the window played to another format: no game by game postseason for them. */
  modified: readonly number[];
  /** Ids into US_POSTSEASON_SOURCES, fact by fact. A fact that states nothing (no stage before round one,
   *  no modified season) may have none; every other one needs two publishers. */
  src: Readonly<Partial<Record<UsPostseasonFact, readonly string[]>>>;
}

export const US_POSTSEASON: readonly UsPostseasonWindow[] = [
  {
    sport: 'nba', from: 2003, to: 2019, clubs: 16, byes: 0, before: null, lastRoundOnlyCross: true, modified: [2019],
    src: {
      clubs: ['cbsPlayIn', 'nbaNotable', 'siNbaTeams'],
      lastRoundOnlyCross: ['espnConfFinals', 'siNbaFormat'],
      years: ['nbcFirstRound', 'nbaNotable', 'cbsPlayIn', 'siNbaTeams'],
      modified: ['cbsPlayIn', 'siNbaTeams'],
    },
  },
  {
    sport: 'nba', from: 2020, to: null, clubs: 16, byes: 0, before: { name: 'Play-In Tournament', places: [7, 10] }, lastRoundOnlyCross: true, modified: [],
    src: {
      clubs: ['cbsPlayIn', 'nbaNotable', 'siNbaTeams'],
      before: ['nbaPlayIn', 'cbsPlayIn', 'siNbaTeams'],
      lastRoundOnlyCross: ['espnConfFinals', 'siNbaFormat'],
      years: ['cbsPlayIn', 'siNbaTeams'],
    },
  },
  {
    sport: 'nfl', from: 2020, to: null, clubs: 14, byes: 1, before: null, lastRoundOnlyCross: true, modified: [],
    src: {
      clubs: ['espnNfl14', 'nbcNfl', 'foxNfl', 'siNfl'],
      byes: ['espnNfl14', 'nbcNfl', 'foxNfl'],
      lastRoundOnlyCross: ['nbcNfl', 'siNfl'],
      years: ['espnNfl14', 'siNfl', 'foxNfl'],
    },
  },
];

/** What was looked for and NOT found on two sources. Nothing here is filled in anywhere. */
export const US_POSTSEASON_THIN: readonly { sport: string; what: string; found: string; tried: string }[] = [
  { sport: 'nba', what: 'which clubs the 2019-20 version of the play-in was open to', found: 'nothing exact', tried: 'CBS Sports and Sports Illustrated both say only that a version of it was tried that season' },
  { sport: 'nba', what: 'whether a play-in game counts in playoff statistics', found: 'nothing', tried: 'the NBA.com page on the play-in does not say' },
  { sport: 'nfl', what: 'how many clubs skipped round one before 2020', found: 'not looked for on two sources', tried: 'ESPN states the 12 club field since 1990 and no bye count; no row is needed, see the header' },
];

/** One round: the league's name for it and [wins needed, most games] ([1, 1]: one game). */
export interface UsPostseasonRound { name: string; series: readonly [number, number] }

const ONE_GAME: readonly [number, number] = [1, 1];

/** The rounds of a sport's bracket in order, read from `US_PLAYOFF_FORMAT` (typed there, once). */
export function usPostseasonRounds(sport: 'nba' | 'nfl'): readonly UsPostseasonRound[] {
  const f: { rounds: readonly string[]; series: readonly (readonly [number, number])[] | null } = US_PLAYOFF_FORMAT[sport];
  return f.rounds.map((name, i) => ({ name, series: f.series ? f.series[i] : ONE_GAME }));
}

export interface UsPostseasonFormat extends UsPostseasonWindow { rounds: readonly UsPostseasonRound[] }

/** The format that season was played to, with its rounds, or null: no row holds
 *  the year, or the season was played to another format. */
export function usPostseasonFormat(sport: string, year: number): UsPostseasonFormat | null {
  const w = US_POSTSEASON.find(x => x.sport === sport && year >= x.from && (x.to === null || year <= x.to));
  if (!w || w.modified.includes(year)) return null;
  return { ...w, rounds: usPostseasonRounds(w.sport) };
}
