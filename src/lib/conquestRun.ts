import { dailyConquestRng, loadDailyRun, type ConquestDailyRun } from './conquestDaily';
import {
  seedEmpires, randomPairings, resolveGame, buildHeadlines, emptyRecords, applyRecords,
  empireCounts, playoffSeeds, totalConquest, finalScore, statesOf, teamLabel, regionNoun,
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
  /** The owners map after every settled round. history[0] is the opening map. Each entry is its own object. */
  history: Record<string, string>[];
  /** Every settled round in order, regular then playoff. rounds[i] was played on history[i] and produced history[i + 1]. */
  rounds: ImpRoundResult[];
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
  const owners = seedEmpires(sport);
  return {
    favorite,
    owners,
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
    history: [{ ...owners }],
    rounds: [],
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
    history: [...run.history, { ...owners }],
    rounds: [...run.rounds, lastRound],
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

/* Round 529: the season's own record book, read off history and rounds.
 * Nothing here is saved. A reload rebuilds history through replayRun, so the
 * records come back identical without the daily record growing a byte. */

/** One of the four end of season records the web map's format shows. */
export interface SeasonRecord {
  key: 'landGrab' | 'reign' | 'conquered' | 'collapse';
  /** 'Biggest Land Grab', 'Longest Reign', 'Most Conquered', 'Biggest Collapse'. */
  title: string;
  teamId: string | null;
  value: number;
  /** Names the team and the round label, e.g. "Chiefs took 9 states from the Broncos, Week 4". Empty when teamId is null. */
  detail: string;
}

const RECORD_TITLES: Record<SeasonRecord['key'], string> = {
  landGrab: 'Biggest Land Grab',
  reign: 'Longest Reign',
  conquered: 'Most Conquered',
  collapse: 'Biggest Collapse',
};

function emptyRecord(key: SeasonRecord['key']): SeasonRecord {
  return { key, title: RECORD_TITLES[key], teamId: null, value: 0, detail: '' };
}

/** A team losing its last region in one settled round: round is the 1 based
 *  index into history, held is the empire it had going in. */
interface Wipe { teamId: string; round: number; held: number }

/** Every wipe in round order, then sport team order inside a round. */
function wipesOf(sport: ImperialismSport, run: ConquestRun): Wipe[] {
  const out: Wipe[] = [];
  for (let i = 1; i < run.history.length; i++) {
    for (const t of sport.teams) {
      const held = statesOf(run.history[i - 1], t.id).length;
      if (held > 0 && statesOf(run.history[i], t.id).length === 0) out.push({ teamId: t.id, round: i, held });
    }
  }
  return out;
}

/** The four records, always in the order landGrab, reign, conquered, collapse, computed from run.rounds and run.history only. */
export function seasonRecords(sport: ImperialismSport, run: ConquestRun): SeasonRecord[] {
  const label = (id: string) => teamLabel(sport, id);
  const labelAt = (round: number) => run.rounds[round - 1].label;

  /* Biggest Land Grab: the single game that moved the most land, earliest on a tie. */
  const games: { game: ImpGame; order: number; label: string }[] = [];
  for (const r of run.rounds) for (const game of r.games) games.push({ game, order: games.length, label: r.label });
  const grabs = games.filter(x => x.game.swing > 0).sort((a, b) => b.game.swing - a.game.swing || a.order - b.order);
  const top = grabs[0];
  let landGrab = emptyRecord('landGrab');
  if (top) {
    const loser = top.game.winner === top.game.home ? top.game.away : top.game.home;
    landGrab = {
      ...landGrab,
      teamId: top.game.winner,
      value: top.game.swing,
      detail: `${label(top.game.winner)} took ${top.game.swing} ${regionNoun(sport, top.game.swing)} from ${label(loser)}, ${top.label}`,
    };
  }

  /* Longest Reign: the most consecutive settled rounds ending as the outright
     biggest empire. A round with a tie at the top counts for nobody. */
  const leaders: (string | null)[] = [];
  for (let i = 1; i < run.history.length; i++) {
    let best: string | null = null;
    let max = -1;
    let tied = false;
    for (const [t, n] of empireCounts(sport, run.history[i])) {
      if (n > max) { max = n; best = t; tied = false; }
      else if (n === max) tied = true;
    }
    leaders.push(tied ? null : best);
  }
  let reign = emptyRecord('reign');
  let start = 0;
  for (let i = 0; i <= leaders.length; i++) {
    if (i < leaders.length && leaders[i] !== null && leaders[i] === leaders[start]) continue;
    const team = leaders[start];
    const length = i - start;
    if (team !== null && length > reign.value) {
      const first = labelAt(start + 1);
      const last = labelAt(i);
      reign = {
        ...reign,
        teamId: team,
        value: length,
        detail: `${label(team)} held the biggest empire ${length === 1 ? `in ${first}` : `from ${first} to ${last}`}`,
      };
    }
    start = i;
  }

  /* Most Conquered: the team wiped off the map most often; on a tie the one
     wiped first, then sport team order. wipesOf lists in exactly that order. */
  const wipes = wipesOf(sport, run);
  const byTeam = new Map<string, Wipe[]>();
  for (const w of wipes) byTeam.set(w.teamId, [...(byTeam.get(w.teamId) ?? []), w]);
  let mostWiped: Wipe[] | null = null;
  for (const t of sport.teams) {
    const list = byTeam.get(t.id);
    if (!list) continue;
    if (!mostWiped || list.length > mostWiped.length || (list.length === mostWiped.length && list[0].round < mostWiped[0].round)) mostWiped = list;
  }
  let conquered = emptyRecord('conquered');
  if (mostWiped) {
    const last = mostWiped[mostWiped.length - 1];
    conquered = {
      ...conquered,
      teamId: last.teamId,
      value: mostWiped.length,
      detail: `${label(last.teamId)} wiped off the map ${mostWiped.length} time${mostWiped.length === 1 ? '' : 's'}, last in ${labelAt(last.round)}`,
    };
  }

  /* Biggest Collapse: the largest empire lost in one round, credited to the
     team that lost it. Strictly greater keeps the earliest on a tie. */
  let collapse = emptyRecord('collapse');
  for (const w of wipes) {
    if (w.held > collapse.value) {
      collapse = {
        ...collapse,
        teamId: w.teamId,
        value: w.held,
        detail: `${label(w.teamId)} lost an empire of ${w.held} ${regionNoun(sport, w.held)} in ${labelAt(w.round)}`,
      };
    }
  }

  return [landGrab, reign, conquered, collapse];
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
