import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cfbFixtures, initCfb, simCfbRound, type CfbState } from '@/lib/cfbDynasty';

const SEED = 539004;
const cases: Record<string, { key: string; observations: Observation[] }> = {};

function kickoff(depth: boolean) {
  let seed = SEED;
  let draws = 0;
  const state = initCfb('ALA', () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    draws += 1;
    return seed / 4294967296;
  }, { depth });
  return { state, draws };
}

type Kickoff = ReturnType<typeof kickoff>;

function play(key: string, before: Kickoff, awayOC: number | null, homeDC: number | null) {
  const state = JSON.parse(JSON.stringify(before.state)) as CfbState;
  const week = state.slate?.rounds[0] ?? [];
  const target = week[0] ?? null;
  if (target !== null && awayOC !== null && homeDC !== null) {
    state.myTeam = target[0];
    for (const team of Object.values(state.teams)) {
      if (team.staff?.OC) team.staff.OC.rating = 70;
      if (team.staff?.DC) team.staff.DC.rating = 70;
    }
    const away = state.teams[target[1]];
    const home = state.teams[target[0]];
    if (away.staff?.OC) away.staff.OC.rating = awayOC;
    if (home.staff?.DC) home.staff.DC.rating = homeDC;
  }
  const fixturesBefore = cfbFixtures(state);
  const staff = Object.values(state.teams).map(team => ({
    id: team.id, oc: team.staff?.OC?.rating ?? null, dc: team.staff?.DC?.rating ?? null,
  }));
  const planned = state.depth
    ? week.flatMap((_, i) => i === 0 ? [0, 0.01, 0.03] : [0, 0.625, 0.32])
    : Array<number>(86).fill(0);
  const draws: number[] = [];
  const { games, myGame } = simCfbRound(state, () => {
    const draw = planned[draws.length] ?? 0.5;
    draws.push(draw);
    return draw;
  });
  return {
    key, season: state.season, round: state.round, myTeam: state.myTeam,
    depth: state.depth ?? null, format: state.format ?? null, initialDraws: before.draws,
    target, week, fixturesBefore, staff, draws, games, myGame, mySlate: state.mySlate ?? null,
    records: Object.values(state.teams).map(team => ({
      id: team.id, wins: team.wins, losses: team.losses, confWins: team.confWins,
      confLosses: team.confLosses, opponents: team.opps ?? null,
    })),
  };
}

type Observation = ReturnType<typeof play>;

function retain(key: string, observations: Observation[]) {
  cases[key] = { key, observations };
  const file = process.env.CFB_DYNASTY_LOW_SCORE_RAW;
  if (file) {
    writeFileSync(file, JSON.stringify({ schema: 1, report: 'R0004', seed: SEED, cases }, null, 2) + '\n');
  }
}

function score(game: Observation['myGame']) {
  return game === null ? null : [game.hs, game.as];
}

function checkSchedule(frame: Observation, awayOC: number, homeDC: number) {
  expect([frame.season, frame.round, frame.depth, frame.format]).toEqual([2026, 1, 1, 1]);
  expect(frame.week).toHaveLength(22);
  expect(frame.games).toHaveLength(22);
  expect(frame.fixturesBefore).toHaveLength(12);
  expect(frame.records).toHaveLength(44);
  const [home, away] = frame.week[0];
  expect(frame.staff).toHaveLength(44);
  expect(frame.staff.map(team => [team.oc, team.dc])).toEqual(frame.staff.map(({ id }) => [
    id === away ? awayOC : 70,
    id === home ? homeDC : 70,
  ]));
  expect(frame.target).toEqual([home, away]);
  expect(frame.myTeam).toBe(home);
  expect(frame.fixturesBefore[0]).toMatchObject({ round: 1, opp: away, home: true });
  expect(frame.myGame).toEqual(frame.games[0]);
  expect(frame.games.map(game => [game.home, game.away])).toEqual(frame.week);
  expect(frame.draws).toEqual([0, 0.01, 0.03, ...Array.from({ length: 21 }, () => [0, 0.625, 0.32]).flat()]);
  expect(frame.games.slice(1).map(game => [game.hs, game.as, game.winner]))
    .toEqual(frame.week.slice(1).map(([winner]) => [44, 11, winner]));
  expect(frame.myGame).toMatchObject({ home, away, hs: 24, winner: home });
  expect(frame.mySlate).toEqual([{
    round: 1, opp: away, home: true, us: 24, them: frame.myGame?.as, won: true,
    conference: frame.myGame?.conference, rivalry: false,
  }]);
  expect(frame.records.find(team => team.id === home)).toMatchObject({ wins: 1, losses: 0, opponents: [away] });
  expect(frame.records.find(team => team.id === away)).toMatchObject({ wins: 0, losses: 1, opponents: [home] });
}

const LEGACY_PAIRS = [
  ['ALA', 'OSU'], ['UGA', 'MICH'], ['TEX', 'ORE'], ['OU', 'PSU'], ['LSU', 'USC'], ['TENN', 'WASH'],
  ['AUB', 'UCLA'], ['FLA', 'WISC'], ['A&M', 'IOWA'], ['MISS', 'NEB'], ['MIZZ', 'IND'], ['SCAR', 'MSU'],
  ['CLEM', 'UTAH'], ['FSU', 'KSU'], ['MIA', 'OKST'], ['ND', 'TCU'], ['UNC', 'BAY'], ['LOU', 'ASU'],
  ['SMU', 'COL'], ['VT', 'ISU'], ['BSU', 'MEM'], ['TUL', 'UNLV'],
];

describe('CFB Dynasty simulated low scores', () => {
  it('keeps neutral and legal low scores on the scheduled slate', () => {
    const before = kickoff(true);
    const neutral = play('neutral', before, 70, 70);
    const zero = play('modeled-zero', before, 45, 70);
    const two = play('modeled-two', before, 65, 70);
    retain('depthControls', [neutral, zero, two]);

    checkSchedule(neutral, 70, 70);
    checkSchedule(zero, 45, 70);
    checkSchedule(two, 65, 70);
    expect(score(neutral.myGame)).toEqual([24, 3]);
    expect(zero.games.slice(1)).toEqual(neutral.games.slice(1));
    expect(two.games.slice(1)).toEqual(neutral.games.slice(1));
    expect(zero.records).toEqual(neutral.records);
    expect(two.records).toEqual(neutral.records);
    const zeroSide = zero.games[0].as;
    const twoSide = two.games[0].as;
    expect(Number.isInteger(zeroSide) && Number.isInteger(twoSide)).toBe(true);
    expect(zeroSide).toBeGreaterThanOrEqual(0);
    expect(zeroSide).toBeLessThanOrEqual(twoSide);
    expect(twoSide).toBeLessThanOrEqual(3);
  });

  it('keeps the depth-disabled legacy round', () => {
    const frame = play('legacy', kickoff(false), null, null);
    retain('legacy', [frame]);

    expect([frame.depth, frame.format, frame.initialDraws, frame.target, frame.mySlate])
      .toEqual([null, null, 3168, null, null]);
    expect(frame.week).toEqual([]);
    expect(frame.fixturesBefore).toEqual([]);
    expect(frame.staff.every(team => team.oc === null && team.dc === null)).toBe(true);
    expect(frame.draws).toEqual(Array<number>(86).fill(0));
    expect(frame.games).toEqual(LEGACY_PAIRS.map(([home, away], i) => ({
      home, away, hs: 24, as: 3, winner: home, conference: i >= 20,
    })));
    expect(frame.myGame).toEqual(frame.games[0]);
  });

  it('does not manufacture one point in ordinary coordinator-adjusted scoring', () => {
    const before = kickoff(true);
    const neutral = play('neutral', before, 70, 70);
    const witness = play('ordinary-one', before, 60, 70);
    const capLow = play('cap-low', before, 65, 81);
    const capNeutral = play('cap-neutral', before, 70, 81);
    const capHigh = play('cap-high', before, 75, 81);
    retain('ordinaryOne', [neutral, witness, capLow, capNeutral, capHigh]);

    checkSchedule(neutral, 70, 70);
    checkSchedule(witness, 60, 70);
    checkSchedule(capLow, 65, 81);
    checkSchedule(capNeutral, 70, 81);
    checkSchedule(capHigh, 75, 81);
    expect(score(neutral.myGame)).toEqual([24, 3]);
    for (const frame of [witness, capLow, capNeutral, capHigh]) {
      expect(frame.games.slice(1)).toEqual(neutral.games.slice(1));
      expect(frame.records).toEqual(neutral.records);
      expect(frame.initialDraws).toBe(neutral.initialDraws);
    }
    // This witness permits a bounded change. The separate collision frames record
    // why global remapping cannot preserve every prior low total and staff cap.
    const losingScore = witness.games[0].as;
    expect(Number.isInteger(losingScore)).toBe(true);
    expect(losingScore).toBeGreaterThanOrEqual(1);
    expect(losingScore).toBeLessThanOrEqual(3);
    expect(losingScore, 'CFB_DYNASTY_ORDINARY_ONE_POINT').not.toBe(1);
  });
});
