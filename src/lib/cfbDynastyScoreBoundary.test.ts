import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { initCfb, simCfbRound, type CfbState } from '@/lib/cfbDynasty';

const SEED = 539004;
const CUTOFF = 0.0175;
const BELOW = CUTOFF - 2 ** -58;
const DIAGNOSTIC = 0.03;
const REST_OF_ROUND = Array.from({ length: 21 }, () => [0, 0.625, 0.32]).flat();

type Side = 'away' | 'home';
type Spec = { key: string; loserDraw: number; loserOC: number; winnerDC: number };

const cases: Record<string, Observation[]> = {};

function kickoff() {
  let seed = SEED;
  let initialDraws = 0;
  const state = initCfb('ALA', () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    initialDraws += 1;
    return seed / 4294967296;
  }, { depth: true });
  return { state, initialDraws };
}

function firstDraws(side: Side, loserDraw: number) {
  return side === 'away' ? [0, 0.01, loserDraw] : [1 - Number.EPSILON, loserDraw, 0.01];
}

function play(before: ReturnType<typeof kickoff>, side: Side, spec: Spec) {
  const state = JSON.parse(JSON.stringify(before.state)) as CfbState;
  const week = state.slate?.rounds[0] ?? [];
  const first = week[0];
  let loserRating: number | null = null;
  let winnerRating: number | null = null;
  if (first) {
    state.myTeam = first[0];
    for (const team of Object.values(state.teams)) {
      if (team.staff?.OC) team.staff.OC.rating = 70;
      if (team.staff?.DC) team.staff.DC.rating = 70;
    }
    const [home, away] = first;
    const loser = state.teams[side === 'home' ? home : away].staff?.OC;
    const winner = state.teams[side === 'home' ? away : home].staff?.DC;
    if (loser) loser.rating = spec.loserOC;
    if (winner) winner.rating = spec.winnerDC;
    loserRating = loser?.rating ?? null;
    winnerRating = winner?.rating ?? null;
  }
  const planned = [...firstDraws(side, spec.loserDraw), ...REST_OF_ROUND];
  const draws: number[] = [];
  const { games, myGame } = simCfbRound(state, () => {
    const draw = planned[draws.length] ?? 0.5;
    draws.push(draw);
    return draw;
  });
  return {
    key: spec.key, side, loserDraw: spec.loserDraw, loserOC: loserRating, winnerDC: winnerRating,
    initialDraws: before.initialDraws, week, draws, target: myGame, mySlate: state.mySlate ?? null,
    games: games.map(game => [game.home, game.away, game.hs, game.as, game.winner]),
    winners: {
      home: games.filter(game => game.winner === game.home).length,
      away: games.filter(game => game.winner === game.away).length,
    },
  };
}

type Observation = ReturnType<typeof play>;

function retain(key: string, observations: Observation[]) {
  cases[key] = observations;
  const file = process.env.CFB_DYNASTY_SCORE_BOUNDARY_RAW;
  if (file) {
    writeFileSync(file, JSON.stringify({
      schema: 1, report: 'R0004', seed: SEED, cutoff: CUTOFF, below: BELOW, diagnostic: DIAGNOSTIC, cases,
    }) + '\n');
  }
}

function loserScore(row: Observation): number {
  return (row.side === 'away' ? row.target?.as : row.target?.hs) ?? -1;
}

function checkRound(row: Observation, spec: Spec) {
  expect([row.loserOC, row.winnerDC]).toEqual([spec.loserOC, spec.winnerDC]);
  expect(row.week).toHaveLength(22);
  expect(row.games).toHaveLength(22);
  expect(row.draws).toEqual([...firstDraws(row.side, spec.loserDraw), ...REST_OF_ROUND]);
  const [home, away] = row.week[0];
  const homeWon = row.side === 'away';
  const winner = homeWon ? home : away;
  const loser = loserScore(row);
  expect(Number.isInteger(loser) && loser >= 0 && loser <= 21).toBe(true);
  expect(row.target).toMatchObject({ home, away, winner, [homeWon ? 'hs' : 'as']: 24 });
  expect(row.games[0]).toEqual([home, away, homeWon ? 24 : loser, homeWon ? loser : 24, winner]);
  expect(row.games.slice(1)).toEqual(row.week.slice(1).map(([h, a]) => [h, a, 44, 11, h]));
  expect(row.winners).toEqual({ home: homeWon ? 22 : 21, away: homeWon ? 0 : 1 });
  expect(row.mySlate).toEqual([{
    round: 1, opp: away, home: true, us: row.target?.hs, them: row.target?.as, won: homeWon,
    conference: row.target?.conference, rivalry: false,
  }]);
}

const CUTOFF_CASES: Spec[] = [
  { key: 'below-adjusted', loserDraw: BELOW, loserOC: 60, winnerDC: 70 },
  { key: 'below-neutral', loserDraw: BELOW, loserOC: 70, winnerDC: 70 },
  { key: 'at-adjusted', loserDraw: CUTOFF, loserOC: 60, winnerDC: 70 },
  { key: 'at-neutral', loserDraw: CUTOFF, loserOC: 70, winnerDC: 70 },
  { key: 'held-diagnostic', loserDraw: DIAGNOSTIC, loserOC: 60, winnerDC: 70 },
];

function cutoffTest(side: Side, key: string, marker: string) {
  const before = kickoff();
  const rows = CUTOFF_CASES.map(spec => play(before, side, spec));
  retain(key, rows);
  rows.forEach((row, i) => checkRound(row, CUTOFF_CASES[i]));
  expect(BELOW).toBeLessThan(CUTOFF);
  expect(rows.map(loserScore), marker).toEqual([0, 0, 2, 3, 2]);
}

function checkCap(scores: number[], order: 'up' | 'down') {
  const [low, neutral, high] = scores;
  expect(Math.abs(low - neutral)).toBeLessThanOrEqual(1);
  expect(Math.abs(high - neutral)).toBeLessThanOrEqual(1);
  if (order === 'up') {
    expect(low).toBeLessThanOrEqual(neutral);
    expect(neutral).toBeLessThanOrEqual(high);
  } else {
    expect(low).toBeGreaterThanOrEqual(neutral);
    expect(neutral).toBeGreaterThanOrEqual(high);
  }
}

describe('CFB Dynasty low-score boundaries', () => {
  it('uses the strict shutout cutoff for the away loser', () => {
    cutoffTest('away', 'awayCutoff', 'CFB_DYNASTY_AWAY_LOSER_SCORE_CUTOFF');
  });

  it('uses the strict shutout cutoff for the home loser', () => {
    cutoffTest('home', 'homeCutoff', 'CFB_DYNASTY_HOME_LOSER_SCORE_CUTOFF');
  });

  it('keeps staff caps and monotonic scores through the low-score floor', () => {
    const before = kickoff();
    const levels = [65, 70, 75];
    const specs: Spec[] = [
      ...levels.map(loserOC => ({ key: 'collision-' + loserOC, loserDraw: DIAGNOSTIC, loserOC, winnerDC: 81 })),
      ...levels.map(loserOC => ({ key: 'offense-' + loserOC, loserDraw: DIAGNOSTIC, loserOC, winnerDC: 70 })),
      ...levels.map(winnerDC => ({ key: 'defense-' + winnerDC, loserDraw: DIAGNOSTIC, loserOC: 70, winnerDC })),
    ];
    const sides: Side[] = ['away', 'home'];
    const rows = sides.flatMap(side => specs.map(spec => play(before, side, spec)));
    retain('staffFloor', rows);
    rows.forEach((row, i) => checkRound(row, specs[i % specs.length]));

    const collisions = sides.map((_, i) => {
      const offset = i * specs.length;
      const collision = rows.slice(offset, offset + 3).map(loserScore);
      const offense = rows.slice(offset + 3, offset + 6).map(loserScore);
      const defense = rows.slice(offset + 6, offset + 9).map(loserScore);
      checkCap(collision, 'up');
      checkCap(offense, 'up');
      checkCap(defense, 'down');
      expect(offense).toEqual([2, 3, 4]);
      expect(defense).toEqual([4, 3, 2]);
      return collision;
    });
    expect(collisions, 'CFB_DYNASTY_LOW_SCORE_STAFF_CAP_FLOOR').toEqual([[2, 2, 2], [2, 2, 2]]);
  });
});
