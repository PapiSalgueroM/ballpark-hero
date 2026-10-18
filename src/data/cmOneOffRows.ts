/**
 * Round 1510: the domestic super cups Club Manager follows and plays, as rows.
 *
 * One row per country and FORMAT YEAR, the year the Champions League's format is read by (uclSeasonYear in
 * clubManager.ts: an era save's start year for its whole life, 2026 for today's world). Every value below is a
 * verified fact of scripts/data/cmOneOffFormats.json, two families each (an official page and a press page, none a
 * wiki), and scripts/simOneOffCups.mjs section 0 fails if a row here and its ledger row disagree. A country and year
 * the round could not stand on is named in CM_ONE_OFF_PARTIAL (the CM_PARTIAL shape): it has no row, so the game
 * plays no super cup there and the Cups panel says it could not confirm one. Never filled because it is likely.
 *
 * Tuples, not objects, to keep the engine chunk small. Import free on purpose, so it can never close an import cycle
 * with the engine, and nothing here is read at another module's scope.
 */

export type OneOffShape = 'one' | 'two' | 'four';
/** How a level match that settles the cup is decided: straight to penalties, or extra time then penalties. */
export type OneOffDecider = 'pens' | 'et';
/** Who gets in: the league champions against the cup winners, or the top two of the league and both cup
 *  finalists (a 'four'). */
export type OneOffEntry = 'champCup' | 'top2cup2';
/** Who takes a place a club holds twice: the league's runners-up, the cup's runners-up, or the next league place. */
export type OneOffDouble = 'leagueRunnerUp' | 'cupRunnerUp' | 'nextLeague';
/** Where it sits in the season: before the opening league round, after it, or in the new year. */
export type OneOffPlace = 'open' | 'early' | 'newYear';
/** Whose ground: neutral, the league champions', the cup winners'. */
export type OneOffVenue = 'n' | 'c' | 'w';

/** [id, nation (LEAGUE_RULES' nationId), format year, plain name, shape, decider, entry, double, place, venue,
 *  away goals in a 'two' (1) or not (0), a 'four' semi final pairing over the entrants' order]. */
export type OneOffRowTuple = readonly [
  string, string, number, string, OneOffShape, OneOffDecider, OneOffEntry, OneOffDouble, OneOffPlace, OneOffVenue,
  (0 | 1)?, (readonly [number, number, number, number])?,
];

/** The rows the game plays. Ledger row eng-2026 (The FA, the Premier League, Arsenal FC, Liverpool FC; Sports
 *  Mole, The Sports Cast, Graphic Online, Reuters). */
export const CM_ONE_OFF_ROWS: readonly OneOffRowTuple[] = [
  ['eng-2026', 'england', 2026, 'FA Community Shield', 'one', 'pens', 'champCup', 'leagueRunnerUp', 'open', 'n'],
];

/** Season one editions: [row id, the season its clubs come from, the clubs in the row's order, its ground]. The
 *  ground is printed for this edition only. Ledger row eng-2026-s1 (The FA, Arsenal FC; Sports Mole, Outlook
 *  India, Reuters). */
export const CM_ONE_OFF_SEASON_ONE: readonly (readonly [string, string, readonly string[], string?])[] = [
  ['eng-2026', '2025-26', ['Arsenal', 'Manchester City'], 'the Principality Stadium in Cardiff'],
];

/** Countries and years the round looked at and could not stand on: no row, nothing played, said on the tile. */
export const CM_ONE_OFF_PARTIAL: string[] = ['eng-2005', 'eng-2010', 'eng-2015', 'eng-2020', 'esp-2026', 'ita-2026', 'ger-2026', 'fra-2026'];
