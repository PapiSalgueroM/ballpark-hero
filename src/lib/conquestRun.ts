import { dailyConquestRng, loadDailyRun, type ConquestDailyRun } from './conquestDaily';
import {
  seedEmpires, randomPairings, resolveGame, buildHeadlines, emptyRecords, applyRecords,
  empireCounts, playoffSeeds, totalConquest, finalScore,
  type ImperialismSport, type ImpGame, type ImpRoundResult, type ImpRecords,
} from './imperialismEngine';

/**
 * Round 476: the conquest season as a value, so the daily can be replayed.
 *
 * The board used to hold the season in ten separate pieces of component state
 * and advance them inline. Nothing about a run in progress was written down,
 * and start() re-seeds the whole season from the date, so a player who
 * reloaded on the last matchday was dealt the identical season back with
 * every result already known and could call all thirteen games right. That is
 * a points exploit on five routes at once.
 *
 * The season is seeded from the date, so the only things a player contributes
 * are the club they ride and the winner they call each round. Everything else
 * is a function of those two plus the seed. So the run does not need to be
 * saved: the CLUB PLUS THE LIST OF CALLS replays it exactly, which is what
 * src/lib/conquestDaily.ts records after every settled round.
 *
 * The rng is consumed in exactly one order (the pairings for a regular round,
 * then one resolveGame per pairing in order), and a call never touches it, so
 * replaying the calls through the same functions reproduces the run byte for
 * byte. That is what makes the log enough, and scripts/simConquestDaily.mjs
 * holds it.
 */

export interface ConquestBracket {
  /** 0 quarter-finals, 1 semi-finals, 2 the final. */
  round: number;
  alive: string[];
}

export type ConquestPhase = 'preview' | 'recap' | 'done';

export interface ConquestRun {
  /** The club the player rides. */
  favorite: string;
  owners: Record<string, string>;
  records: ImpRecords;
  /** Regular round number, 1 based. Frozen once the bracket starts. */
  round: number;
  bracket: ConquestBracket | null;
  pairings: [string, string][];
  lastRound: ImpRoundResult | null;
  champion: string | null;
  madePlayoffs: boolean;
  /** The winner called on each settled round, in order. This is the log. */
  picks: string[];
  /** How many of those calls came in. */
  hits: number;
  phase: ConquestPhase;
}

/** The label the board prints for the round about to be played. */
export function roundLabel(sport: ImperialismSport, run: ConquestRun): string {
  return run.bracket ? sport.playoffLabels[run.bracket.round] : `${sport.roundNoun} ${run.round}`;
}

/** The game the player calls: their club's game, else the biggest clash. */
export function featuredPairing(sport: ImperialismSport, run: ConquestRun): [string, string] | null {
  if (!run.pairings.length) return null;
  const mine = run.pairings.find(([h, a]) => h === run.favorite || a === run.favorite);
  if (mine) return mine;
  const counts = empireCounts(sport, run.owners);
  return [...run.pairings].sort(
    (p, q) =>
      (counts.get(q[0])! + counts.get(q[1])!) - (counts.get(p[0])! + counts.get(p[1])!),
  )[0];
}

/** The result of the featured game inside a settled round, for the map. */
export function featuredResult(run: ConquestRun, featured: [string, string] | null): ImpGame | undefined {
  if (!featured || !run.lastRound) return undefined;
  return run.lastRound.games.find(
    g => (g.home === featured[0] && g.away === featured[1]) || (g.home === featured[1] && g.away === featured[0]),
  );
}

export function startRun(sport: ImperialismSport, favorite: string, rng: () => number): ConquestRun {
  return {
    favorite,
    owners: seedEmpires(sport),
    records: emptyRecords(sport),
    round: 1,
    bracket: null,
    pairings: randomPairings(sport, rng),
    lastRound: null,
    champion: null,
    madePlayoffs: false,
    picks: [],
    hits: 0,
    phase: 'preview',
  };
}

/** Settle the round the player just called, and move the season on. */
export function playRound(sport: ImperialismSport, run: ConquestRun, call: string, rng: () => number): ConquestRun {
  const featured = featuredPairing(sport, run);
  const owners = { ...run.owners };
  const games: ImpGame[] = [];
  for (const [h, a] of run.pairings) games.push(resolveGame(sport, h, a, owners, rng, run.records));
  const records = applyRecords(run.records, games);

  const settled = featured
    ? games.find(g => (g.home === featured[0] && g.away === featured[1]) || (g.home === featured[1] && g.away === featured[0]))
    : undefined;
  const hits = run.hits + (settled && settled.winner === call ? 1 : 0);

  const lastRound: ImpRoundResult = {
    round: run.round,
    label: roundLabel(sport, run),
    games,
    headlines: buildHeadlines(sport, games, owners, records),
  };

  let { bracket, round, champion, madePlayoffs } = run;
  if (bracket) {
    const winners = games.map(g => g.winner);
    if (bracket.round >= 2 || winners.length === 1) champion = winners[0];
    else bracket = { round: bracket.round + 1, alive: winners };
  } else {
    const wiped = totalConquest(owners);
    if (wiped) {
      champion = wiped;
    } else if (round >= sport.regularRounds) {
      const seeds = playoffSeeds(sport, owners, records);
      madePlayoffs = seeds.includes(run.favorite);
      bracket = { round: 0, alive: seeds };
    } else {
      round += 1;
    }
  }

  return {
    ...run,
    owners, records, round, bracket, lastRound, champion, madePlayoffs,
    picks: [...run.picks, call],
    hits,
    phase: 'recap',
  };
}

/** Leave the recap: deal the next round, or end the season. */
export function continueRun(sport: ImperialismSport, run: ConquestRun, rng: () => number): ConquestRun {
  if (run.champion) return { ...run, phase: 'done' };
  if (run.bracket) {
    const seeds = run.bracket.alive;
    const pairs: [string, string][] = [];
    for (let i = 0; i < seeds.length / 2; i++) pairs.push([seeds[i], seeds[seeds.length - 1 - i]]);
    return { ...run, pairings: pairs, phase: 'preview' };
  }
  return { ...run, pairings: randomPairings(sport, rng), phase: 'preview' };
}

/**
 * Replay a logged run from its club and its calls. The rng must be the one
 * that dealt the run in the first place (the sport's daily rng for the same
 * date), and it is consumed here exactly as the live board consumed it.
 * A log longer than the season stops at the champion, so a tampered store
 * cannot drive extra rounds.
 */
export function replayRun(sport: ImperialismSport, favorite: string, picks: string[], rng: () => number): ConquestRun {
  let run = startRun(sport, favorite, rng);
  for (const call of picks) {
    if (run.champion) break;
    if (run.phase === 'recap') run = continueRun(sport, run, rng);
    run = playRound(sport, run, call, rng);
  }
  return run;
}

export function runScore(run: ConquestRun): number {
  return finalScore(run.favorite, run.owners, run.hits, run.champion, run.madePlayoffs);
}

/** The run as the daily record holds it: the club, the calls, nothing else. */
export function dailyRunRecord(run: ConquestRun): ConquestDailyRun {
  return { team: run.favorite, picks: run.picks, done: false, result: null };
}

/**
 * Pick a daily back up where the player left it, or null for the pick screen.
 *
 * The board and scripts/simConquestDaily.mjs both go through this, so the
 * harness measures the restore the routes actually use rather than a copy of
 * it. A finished day is deliberately NOT restored: the board shows the result
 * card and free play instead, so no sequence of reloads can walk back into a
 * scoring run. A record naming a club the sport does not have is refused the
 * same way every other read here fails closed.
 */
export function restoreDailyRun(
  sport: ImperialismSport,
  todayStr: string,
): { run: ConquestRun; rng: () => number } | null {
  const saved = loadDailyRun(sport.key, todayStr);
  if (!saved || saved.done || !sport.teams.some(t => t.id === saved.team)) return null;
  const rng = dailyConquestRng(sport.key, todayStr);
  return { run: replayRun(sport, saved.team, saved.picks, rng), rng };
}
