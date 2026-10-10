/* Round 1226: the one reader between the two sourced season ledgers
   (src/data/usSeasonLedgerMlb.ts, src/data/usSeasonLedgerNhl.ts) and the MLB
   and NHL career engines. The engines used to type the season themselves (a
   skater's 79 to 82 games, a hitter's 155 to 162, one playoff ladder for
   every year). They ask here now, so a season's length and the shape of its
   postseason have one source: the ledger's row.

   WHAT IS BOUND. Only what a ledger row says on two sources. Where a row is
   thin, where a year is before the ledger, and where a club was not in the
   league that year, every function here hands back what the engine played
   before it read anything (US_ENGINE_SEASON, its own playoff law), so the
   engine goes on playing that there and nothing throws.

   A YEAR AFTER THE LAST ROW reads the last row's schedule. That is the
   present day league carried forward (the NHL's 84 games "from 2026-27" by
   NHL_FORMULA_84), never a new fact about a season nobody has played. */

import { MLB_SEASONS, MLB_PLAYOFF_FORMAT, MLB_FIRST_ROUND, MLB_OUTSIDE_CLUBS } from '@/data/usSeasonLedgerMlb';
import { NHL_SEASONS, NHL_2019_CLUB_GAMES, NHL_PLAYOFF_FORMAT } from '@/data/usSeasonLedgerNhl';
import { playoffGames } from './careerVariance';

export type ShapeSport = 'mlb' | 'nhl';

/** The season each engine was written on, and what it still plays where the
 *  ledger holds nothing: the fallback of every reader below. It is also the
 *  season the engines' workloads and award gates are written per, so a count
 *  from a season of another length is compared as its full season equivalent. */
export const US_ENGINE_SEASON: Readonly<Record<ShapeSport, number>> = { mlb: 162, nhl: 82 };

/** How many rounds each engine's playoff ladder holds. */
const ENGINE_ROUNDS = 4;

export interface SeasonLengthRow {
  /** Games that club's season held. */
  games: number;
  /** 'ledger': a row of that year says so. 'carried': the last row, for a year after it.
   *  'engine': nothing two sourced for that year or that club, so the engine's own season. */
  from: 'ledger' | 'carried' | 'engine';
}

/** The length of one club's season, with where the number came from. Total: never throws. */
export function seasonLengthRow(sport: ShapeSport, year: number, club?: string): SeasonLengthRow {
  const engine: SeasonLengthRow = { games: US_ENGINE_SEASON[sport], from: 'engine' };
  if (sport === 'nhl') {
    const last = NHL_SEASONS[NHL_SEASONS.length - 1];
    if (year > last.year) return last.games === null ? engine : { games: last.games, from: 'carried' };
    const row = NHL_SEASONS.find(r => r.year === year);
    if (!row) return engine;
    if (row.games !== null) return { games: row.games, from: 'ledger' };
    /* A season with no single length (2019-20): club by club, and only for a
       club the ledger holds under the id the game gives it. */
    const own = club !== undefined && Object.prototype.hasOwnProperty.call(NHL_2019_CLUB_GAMES, club) && row.year === 2019
      ? NHL_2019_CLUB_GAMES[club] : undefined;
    return own === undefined ? engine : { games: own, from: 'ledger' };
  }
  /* A club outside the league (the ledger names it) has no MLB season at all:
     how long its own season is has one source, so the engine's stands. */
  if (club !== undefined && MLB_OUTSIDE_CLUBS.some(o => o.team === club)) return engine;
  const last = MLB_SEASONS[MLB_SEASONS.length - 1];
  if (year > last.year) return { games: last.games, from: 'carried' };
  const row = MLB_SEASONS.find(r => r.year === year);
  if (!row) return engine;
  const group = club === undefined ? undefined : row.clubs.find(g => g.ids.includes(club));
  return { games: group ? group.games : row.games, from: 'ledger' };
}

/** The length of one club's season. Total: the engine's own season where the ledger holds nothing. */
export function seasonLength(sport: ShapeSport, year: number, club?: string): number {
  return seasonLengthRow(sport, year, club).games;
}

/** The length a SAVED season was played on. A line saved before the engines
 *  read the ledger carries no `slate`, and it was played on the engine's own
 *  season: it is a record of what the game played and it stays that. */
export function slateOf(sport: ShapeSport, line: { slate?: number }): number {
  return line.slate ?? US_ENGINE_SEASON[sport];
}

/** A workload drawn on the engine's own season, carried to a season of
 *  `slate` games. The same length hands the draw back untouched. */
export function toSlate(sport: ShapeSport, draw: number, slate: number): number {
  const base = US_ENGINE_SEASON[sport];
  return slate === base ? draw : Math.round(draw * slate / base);
}

/** A count from a season of `slate` games as its full season equivalent, which
 *  is what the engines' award gates are written in. */
export function fullSeasonOf(sport: ShapeSport, count: number, slate: number): number {
  const base = US_ENGINE_SEASON[sport];
  return slate === base ? count : count * base / slate;
}

export interface PostseasonRound {
  /** The round's name in the ledger, or null where the ledger does not hold it for that year. */
  name: string | null;
  /** [wins needed, most games], or null where the ledger does not hold the length for that year. */
  series: readonly [number, number] | null;
}

const OPEN: PostseasonRound = { name: null, series: null };
const openRounds = (n: number): readonly PostseasonRound[] => Array.from({ length: n }, () => OPEN);

/** The rounds a champion played that year, first to last. Total: a year the
 *  ledger says nothing of is the engine's own ladder with every round open. */
export function postseasonRounds(sport: ShapeSport, year: number): readonly PostseasonRound[] {
  if (sport === 'nhl') {
    const f = NHL_PLAYOFF_FORMAT;
    if (year < f.from || (f.modified as readonly number[]).includes(year)) return openRounds(ENGINE_ROUNDS);
    return f.rounds.map((name, i) => ({ name, series: f.series[i] }));
  }
  const f = MLB_PLAYOFF_FORMAT;
  if (year >= f.from) return f.rounds.map((name, i) => ({ name, series: f.series[i] }));
  const first = MLB_FIRST_ROUND.find(w => year >= w.from && (w.to === null || year <= w.to));
  if (!first) return openRounds(ENGINE_ROUNDS);
  /* No wild card round that year: the ladder is one round shorter. */
  if (!first.wildCard) return openRounds(ENGINE_ROUNDS - 1);
  return [{ name: first.round, series: first.series }, ...openRounds(ENGINE_ROUNDS - 1)];
}

/** The engine's result index (0 a first exit, 4 the title) on that year's
 *  ladder. A year with one round fewer folds the engine's first two exits
 *  into its first round, so the odds of a title are the engine's own. */
export function postseasonRung(sport: ShapeSport, year: number, stage: number): number {
  return Math.max(0, stage - (ENGINE_ROUNDS - postseasonRounds(sport, year).length));
}

/** Games played in a playoff run that ended at the engine's result `stage`.
 *  ONE draw from `rng`, exactly as the engine's own law takes, so the stream
 *  that follows is where it was.
 *  - No round played is in the ledger: the engine's law over the rounds played.
 *  - Every round played is in the ledger: the engine's count stands when those
 *    rounds can hold it, and is drawn again inside them when they cannot.
 *  - Some are: the ledger's rounds inside their own lengths, the rest by the law. */
export function playoffRunGames(sport: ShapeSport, year: number, stage: number, rng: () => number): number {
  const rounds = postseasonRounds(sport, year);
  const skip = ENGINE_ROUNDS - rounds.length;
  const rung = Math.max(0, stage - skip);
  const played = rounds.slice(0, Math.min(rung + 1, rounds.length));
  const known = played.filter(r => r.series !== null);
  let u = 0;
  const draw = () => (u = rng());
  if (known.length === 0) return playoffGames(Math.max(0, stage - skip), draw, sport);
  const lo = known.reduce((t, r) => t + r.series![0], 0);
  const hi = known.reduce((t, r) => t + r.series![1], 0);
  /* The same draw, spread again, so a count that is drawn a second time is
     not tied to the end of the range the first one fell off. */
  const inside = () => lo + Math.min(hi - lo, Math.floor(((u * 9973) % 1) * (hi - lo + 1)));
  if (known.length === played.length) {
    const own = playoffGames(stage, draw, sport);
    return own >= lo && own <= hi ? own : inside();
  }
  const rest = playoffGames(Math.max(0, stage - skip - known.length), draw, sport);
  return inside() + rest;
}
