/* Round 1032: the Through Ball rules, played for real against the module.
   scripts/simThroughBallDrill.mjs runs this file and the board's, and its
   controls point them at a rewritten copy of the rules to prove they go red.

   Measured on 2026-10-06 over five batches of 240 paired runs (bases 314159,
   271828, 161803, 141421, 173205), which is where every floor below comes from:
     weight only, error +-0.03 / 0.06 / 0.10 / 0.18 of a full pass:
       100.0 / 88.9 to 89.8 / 55.8 to 56.9 / 30.7 to 31.2 points,
       so the three gaps were 10.2 to 11.1, 32.4 to 33.8 and 24.6 to 25.8.
     one fixed weight with perfect aim and timing: 38.0 at 0.50, 66.8 at
       0.55, 65.8 at 0.60, 33.0 at 0.65 (the ideal weight runs 0.506 to 0.632
       from the 10th to the 90th percentile), so weight is a decision on
       every ball, not a setting.
     all round (angle +-4 deg, weight +-0.04, release +-0.15 s, times
       0.6 / 1 / 1.4 / 2): 99.4 to 99.7 / 86.8 to 88.5 / 65.3 to 68.4 /
       33.8 to 35.9, so the gaps were 10.9 to 12.6, 20.2 to 21.5, 31.5 to 32.7.
     the run gets harder: a noisy player converts 0.726 to 0.751 of the first
       three balls and 0.511 to 0.526 of the last three.
     the best fixed input found by the sweep: about 10 points. */
import { describe, expect, it } from 'vitest';
import { applyDrillResult, daySeed, drillForPosition, drillSeed, drillStatFor, lehmer, DRILL_META, type DrillKind } from '@/lib/careerDrills';
import {
  aimFor, ballAt, buildThroughBallRun, crossTime, KEEPER_Y, MAX_PASS, maxThroughBallScore, passTarget, PASSER,
  perfectThroughBall, runnerAt, takeThroughBall, throughBallDeadline, validateThroughBallRecord,
  type ThroughBallInput, type ThroughBallOutcome, type ThroughBallSetup,
} from '@/lib/throughBallDrill';
import type { CareerState } from '@/lib/soccerCareerEngine';

const DATE = '2026-10-06';
type Policy = (setup: ThroughBallSetup, rng: () => number, index: number) => ThroughBallInput;
const sample = (n: number, base = 314159) => Array.from({ length: n }, (_, i) => buildThroughBallRun(base + i * 7919));
const meanScore = (runs: ThroughBallSetup[][], policy: Policy) => runs.reduce((sum, run, ri) => {
  const rng = lehmer(ri * 104729 + 17);
  return sum + run.reduce((n, setup, i) => n + takeThroughBall(policy(setup, rng, i), setup).points, 0);
}, 0) / runs.length;
const jitter = (rng: () => number, size: number) => (rng() * 2 - 1) * size;
const weightOnly = (size: number): Policy => (setup, rng) => { const p = perfectThroughBall(setup); return { ...p, weight: p.weight + jitter(rng, size) }; };
const allRound = (k: number): Policy => (setup, rng) => {
  const p = perfectThroughBall(setup);
  return { angle: p.angle + jitter(rng, 4 * k), weight: p.weight + jitter(rng, 0.04 * k), press: p.press + jitter(rng, 0.15 * k) };
};
const RUNS = sample(240);

describe('seeded Through Ball rules', { timeout: 20000 }, () => {
  it('deals Through Ball to CM and CAM, keeps every old seed and replays one daily for a seed', () => {
    for (const [kind, salt] of [['wallshot', 1719], ['tackle', 4583], ['gloves', 8317], ['firsttouch', 12011], ['throughball', 15887]] as const) {
      expect(drillSeed(kind, DATE)).toBe(((daySeed(DATE) * 7919 + salt) % 2147483646) + 1);
    }
    expect(['CM', 'CAM'].map(drillForPosition)).toEqual(['throughball', 'throughball']);
    expect(['LW', 'RW', 'ST'].map(drillForPosition)).toEqual(['wallshot', 'wallshot', 'wallshot']);
    expect(['CB', 'LB', 'RB', 'CDM'].map(drillForPosition)).toEqual(Array(4).fill('tackle'));
    expect(drillForPosition('GK')).toBe('gloves');
    const seed = drillSeed('throughball', DATE);
    const run = buildThroughBallRun(seed);
    expect(run).toHaveLength(10);
    expect(JSON.stringify(buildThroughBallRun(seed))).toBe(JSON.stringify(run));
    expect(buildThroughBallRun(drillSeed('throughball', '2026-10-07'))).not.toEqual(run);
    for (const kind of ['wallshot', 'tackle', 'gloves', 'firsttouch'] as DrillKind[]) expect(drillSeed(kind, DATE)).not.toBe(seed);
    const input = { angle: -12, weight: 0.55, press: 1.4 };
    expect(takeThroughBall(input, run[3])).toEqual(takeThroughBall(input, run[3]));
  });

  it('scores the stated maximum, 100, for the perfect input on every sampled day', () => {
    for (let day = 0; day < 120; day++) {
      const date = new Date(Date.UTC(2026, 0, 1) + day * 86400000).toISOString().slice(0, 10);
      const run = buildThroughBallRun(drillSeed('throughball', date));
      expect(maxThroughBallScore(run)).toBe(100);
      for (const setup of run) {
        const perfect = perfectThroughBall(setup);
        expect(perfect.press).toBeLessThanOrEqual(crossTime(setup));
        expect(takeThroughBall(perfect, setup)).toMatchObject({ won: true, points: 10, outcome: 'through' });
      }
    }
  });

  it('settles every verdict the rules name, and no round is free', () => {
    const seen = new Set<ThroughBallOutcome>();
    for (const run of RUNS.slice(0, 30)) for (const setup of run) {
      const perfect = perfectThroughBall(setup);
      const offside = { ...perfect, press: crossTime(setup) + 0.01 };
      for (const input of [offside, { ...perfect, press: throughBallDeadline(setup) }, { ...perfect, press: Infinity }, { ...perfect, press: NaN }]) {
        expect(takeThroughBall(input, setup)).toMatchObject({ won: false, points: 0, outcome: 'offside' });
        seen.add(takeThroughBall(input, setup).outcome);
      }
      expect(takeThroughBall({ ...perfect, weight: 0.2 }, setup)).toMatchObject({ won: false, outcome: 'short', crossX: null });
      for (const x of setup.defenders) {
        const atHim = aimFor({ x: PASSER.x + (x - PASSER.x) * 1.3, y: PASSER.y + (setup.line - PASSER.y) * 1.3 });
        const hit = takeThroughBall({ ...atHim, press: perfect.press }, setup);
        expect(hit.outcome).toBe('cutout');
        const stop = ballAt(hit, hit.arrival);
        expect(stop.x).toBeCloseTo(hit.crossX!, 6); expect(stop.y).toBeCloseTo(setup.line, 6);
      }
      const long = takeThroughBall({ ...perfect, weight: 1 }, setup);
      if (long.target.y <= KEEPER_Y) expect(long.outcome).toBe('keeper');
      for (let angle = -60; angle <= 60; angle += 6) for (let weight = 0.3; weight <= 1; weight += 0.05) for (const press of [perfect.press - 0.6, perfect.press - 0.3, perfect.press]) {
        seen.add(takeThroughBall({ angle, weight, press }, setup).outcome);
      }
    }
    expect([...seen].sort()).toEqual(['behind', 'cutout', 'early', 'keeper', 'offside', 'short', 'through', 'wide']);
  });

  it('moves the ball as far as the weight says, at every step of the bar', () => {
    for (let step = 0; step <= 20; step++) {
      const weight = step / 20;
      for (const angle of [-50, 0, 35]) {
        const spot = passTarget(angle, weight);
        expect(Math.hypot(spot.x - PASSER.x, spot.y - PASSER.y)).toBeCloseTo(weight * MAX_PASS, 6);
        if (weight > 0) expect(aimFor(spot).weight).toBeCloseTo(weight, 6);
      }
    }
    const setup = RUNS[0][0];
    expect(runnerAt(setup, 0)).toEqual(setup.start);
    expect(runnerAt(setup, setup.hold)).toEqual(setup.start);
    expect(runnerAt(setup, crossTime(setup)).y).toBeCloseTo(setup.line, 6);
    const clean = takeThroughBall(perfectThroughBall(setup), setup);
    expect(ballAt(clean, clean.press)).toEqual(PASSER);
    const landed = ballAt(clean, clean.arrival + 1);
    expect(landed.x).toBeCloseTo(clean.target.x, 6); expect(landed.y).toBeCloseTo(clean.target.y, 6);
  });

  it('a better judge of weight outscores a worse one at three skill gaps', () => {
    const errors = [0.03, 0.06, 0.1, 0.18];
    const floors = [5, 16, 12];
    const means = errors.map(size => meanScore(RUNS, weightOnly(size)));
    console.log(`Through Ball weight ladder over ${RUNS.length} paired runs: ${means.map(m => m.toFixed(1)).join(' / ')} points`);
    floors.forEach((floor, i) => expect(means[i] - means[i + 1]).toBeGreaterThan(floor));
    /* and no one weight is right every time: the best fixed weight, with
       perfect aim and timing, still trails reading the weight ball by ball */
    let bestFixed = -1;
    for (let w = 8; w <= 16; w++) bestFixed = Math.max(bestFixed, meanScore(RUNS, setup => ({ ...perfectThroughBall(setup), weight: w / 20 })));
    console.log(`Through Ball best single weight with perfect aim and timing: ${bestFixed.toFixed(1)} points`);
    expect(meanScore(RUNS, setup => perfectThroughBall(setup)) - bestFixed).toBeGreaterThan(18);
  });

  it('a better all round player outscores a worse one at three skill gaps', () => {
    const scales = [0.6, 1, 1.4, 2];
    const floors = [5, 10, 15];
    const means = scales.map(k => meanScore(RUNS, allRound(k)));
    console.log(`Through Ball all round ladder over ${RUNS.length} paired runs: ${means.map(m => m.toFixed(1)).join(' / ')} points`);
    floors.forEach((floor, i) => expect(means[i] - means[i + 1]).toBeGreaterThan(floor));
  });

  it('reading the round beats every fixed input the sweep can find, and the run gets harder', () => {
    const runs = RUNS.slice(0, 120);
    let best = -1;
    for (let angle = -40; angle <= 40; angle += 10) for (let w = 8; w <= 16; w++) for (let p = 0; p <= 8; p++) {
      best = Math.max(best, meanScore(runs, () => ({ angle, weight: w / 20, press: 0.6 + p * 0.25 })));
    }
    const skilled = meanScore(runs, allRound(1));
    console.log(`Through Ball: all round skill 1 scores ${skilled.toFixed(1)}, the best of 729 fixed inputs ${best.toFixed(1)}`);
    expect(skilled - best).toBeGreaterThan(50);
    let first = 0;
    let last = 0;
    RUNS.forEach((run, ri) => {
      const rng = lehmer(ri * 7 + 3);
      run.forEach((setup, i) => {
        const p = perfectThroughBall(setup);
        const won = takeThroughBall({ angle: p.angle + jitter(rng, 5), weight: p.weight + jitter(rng, 0.06), press: p.press + jitter(rng, 0.2) }, setup).won;
        if (i < 3) first += Number(won);
        if (i > 6) last += Number(won);
      });
    });
    console.log(`Through Ball ladder: first three balls ${(first / (3 * RUNS.length)).toFixed(3)}, last three ${(last / (3 * RUNS.length)).toFixed(3)}`);
    expect(first / (3 * RUNS.length) - last / (3 * RUNS.length)).toBeGreaterThan(0.1);
  });

  it('banks Passing through the shared season pipeline, once, capped by the ceiling', () => {
    const career = { position: 'CM', overall: 70, potential: 80, potentialEarned: 0, seasons: [{ year: 2026 }], trainingSeasonYear: 2025, statBoostNextSeason: { shooting: 1 }, morale: 60, events: [] } as unknown as CareerState;
    expect(drillStatFor('throughball', 'CM')).toEqual({ stat: 'passing', label: 'Passing' });
    expect(drillStatFor('throughball', 'GK')).toEqual({ stat: 'passing', label: 'Distribution' });
    expect(DRILL_META.throughball.slug).toBe('career-drill-throughball');
    const saved = applyDrillResult(career, 'throughball', 8);
    expect(saved.statBoostNextSeason).toEqual({ shooting: 1, passing: 2 });
    expect(saved.trainingSeasonYear).toBe(2026);
    expect(saved.events.at(-1)).toBe("🎯 Through Ball drill: 8 of 10. +2 Passing coming with next season's growth");
    expect(applyDrillResult(saved, 'throughball', 10)).toBe(saved);
    expect(applyDrillResult(saved, 'firsttouch', 10)).toBe(saved);
    expect(applyDrillResult(career, 'throughball', 5).statBoostNextSeason?.passing).toBe(1);
    expect(applyDrillResult(career, 'throughball', 4).statBoostNextSeason?.passing).toBeUndefined();
    expect(applyDrillResult({ ...career, potential: 71 }, 'throughball', 10).statBoostNextSeason?.passing).toBe(1);
    expect(applyDrillResult({ ...career, potential: 70 }, 'throughball', 10).statBoostNextSeason?.passing).toBeUndefined();
    expect(career.statBoostNextSeason).toEqual({ shooting: 1 });
  });

  it('shares First Touch checkpoint validation, so a bad save grants nothing', () => {
    expect(validateThroughBallRecord({ rounds: 4, count: 3, score: 30, banked: false })).toEqual({ rounds: 4, count: 3, score: 30, banked: false });
    for (const fields of [{ rounds: 11, count: 8, score: 80, banked: false }, { rounds: 5, count: 3, score: 30, banked: true }, { rounds: 5, count: 6, score: 60, banked: false }, { rounds: 5, count: 3, score: 99, banked: false }]) {
      expect(validateThroughBallRecord(fields)).toBeNull();
    }
  });
});
