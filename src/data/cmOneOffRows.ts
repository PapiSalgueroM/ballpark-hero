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
 *  finalists (a 'four'). Round 1514: or last season's Champions League winners against its Europa League winners
 *  (the UEFA Super Cup, worldComps.usc). */
export type OneOffEntry = 'champCup' | 'top2cup2' | 'euroWinners';
/** Who takes a place a club holds twice: the league's runners-up, the cup's runners-up, or the next league place.
 *  Round 1514: 'none' where no club can hold both (two competitions no club plays in one season). */
export type OneOffDouble = 'leagueRunnerUp' | 'cupRunnerUp' | 'nextLeague' | 'none';
/** Where it sits in the season: before the opening league round, after it, or in the new year. Round 1514: or
 *  'dated', the free midweek nearest its edition's date (CM_ONE_OFF_EDITIONS), the game's own Wednesday. */
export type OneOffPlace = 'open' | 'early' | 'newYear' | 'dated';
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
  /* Round 1514, each fact on two independent publishers (the ledger's rule twoPublishers, from the other lane's
     SUPER-CUP-SOURCES.md of 2026-10-18, each page reopened on 2026-10-19). uefa-2026: UEFA's 2026 regulations,
     Tottenham Hotspur FC. ger-2026: the DFL's rules, Borussia Dortmund, the DFB (its venue 'c' is the game's
     simplification: the DFL picks the ground and either club may apply). fra-2026: the LFP, Ligue 1, Paris
     Saint-Germain, L'Avenir, Goal. ita-2026: Lega Serie A, Inter, Football Italia, its 2026-27 edition only. */
  ['uefa-2026', 'uefa', 2026, 'UEFA Super Cup', 'one', 'pens', 'euroWinners', 'none', 'early', 'n'],
  ['ger-2026', 'germany', 2026, 'German Supercup', 'one', 'pens', 'champCup', 'leagueRunnerUp', 'open', 'c'],
  ['fra-2026', 'france', 2026, 'Trophée des Champions', 'one', 'pens', 'champCup', 'leagueRunnerUp', 'open', 'n'],
  ['ita-2026', 'italy', 2026, 'Supercoppa Italiana', 'one', 'et', 'champCup', 'cupRunnerUp', 'dated', 'c'],
];

/** Round 1514: the editions the ledger dates, [row id, edition year (the season's start year), the edition's date,
 *  its venue for that season, its ground]. The game plays every night on its own calendar: the date places a
 *  'dated' row's night and is printed nowhere; the venue and ground stand for that edition alone (Dortmund hosted
 *  Germany's 2026 one, Lens France's after a draw, Inter Italy's at San Siro). Ledger rows *-e2026. */
export const CM_ONE_OFF_EDITIONS: readonly (readonly [string, number, string, OneOffVenue, string])[] = [
  ['ger-2026', 2026, '2026-08-22', 'w', 'Signal Iduna Park in Dortmund'],
  ['fra-2026', 2026, '2026-08-16', 'w', 'the Stade Bollaert-Delelis in Lens'],
  ['ita-2026', 2026, '2026-12-22', 'c', 'San Siro in Milan'],
];

/** Round 1514: rows played in their dated editions only; every other season of the save is partial (said on the
 *  tile). Italy: the league champions against the cup's runners up is this edition's announced pairing, never a
 *  general rule. */
export const CM_ONE_OFF_EDITION_ONLY: readonly string[] = ['ita-2026'];

/** Round 1514: the real 2025-26 domestic cup runners up a season one edition needs (a 'cupRunnerUp' double), by
 *  the league id, as the game spells them. Ledger row cup-seriea-2025-26 (Lega Serie A, Football Italia). */
export const CM_ONE_OFF_CUP_RUNNERS_UP_2025_26: Readonly<Record<string, string>> = { seriea: 'Lazio' };

/** Season one editions: [row id, the season its clubs come from, the clubs in the row's order, its ground]. The
 *  ground is printed for this edition only. Ledger row eng-2026-s1 (The FA, Arsenal FC; Sports Mole, Outlook
 *  India, Reuters). */
export const CM_ONE_OFF_SEASON_ONE: readonly (readonly [string, string, readonly string[], string?])[] = [
  ['eng-2026', '2025-26', ['Arsenal', 'Manchester City'], 'the Principality Stadium in Cardiff'],
];

/** Countries and years the round looked at and could not stand on: no row, nothing played, said on the tile.
 *  Round 1514: Italy's later seasons are partial too, but through CM_ONE_OFF_EDITION_ONLY (oneOffPartial's edition
 *  test), so they are not listed here; their reason is in CM_ONE_OFF_PARTIAL_WHY. */
export const CM_ONE_OFF_PARTIAL: string[] = ['eng-2005', 'eng-2010', 'eng-2015', 'eng-2020', 'esp-2026'];

/** Round 1514: what a played row simplifies or leaves out, said on its card (the brief's partial marks). */
export const CM_ONE_OFF_MARKS: Readonly<Record<string, string>> = {
  'uefa-2026': 'UEFA picks the stadium and the date in advance. The game plays it on its own first free midweek after the opening league game.',
  'ger-2026': "The league picks the real ground and either club can bid to host. The game plays it at the champions' ground, apart from 2026's at Dortmund, and on its own date.",
  'fra-2026': 'The league picks the ground, in principle a neutral one. The game plays it on its own date, and the rulebook\'s rarer exceptions are not played here.',
  'ita-2026': 'Only the 2026-27 edition is confirmed, and the game plays it on its own midweek nearest the real date. Later seasons show as not confirmed until the game can stand on them.',
};

/** Round 1514: why a partial row is partial, where the tile says more than "not confirmed". */
export const CM_ONE_OFF_PARTIAL_WHY: Readonly<Record<string, string>> = {
  'esp-2026': "Spain's is a four club cup with semi finals, and it comes in a later update.",
  'ita-2026': 'Only the 2026-27 edition is confirmed: the league champions against the cup runners up, because one club won both. Later editions are not confirmed yet.',
};
