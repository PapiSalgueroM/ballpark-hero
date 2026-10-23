import { describe, expect, it } from 'vitest';
import {
  buildWallShotRun, lehmer, takeWallShot, wallNextPeak, wallTravel, wallShotGeometry,
  type WallShotInput, type WallShotResult, type WallShotSetup,
} from '@/lib/careerDrills';

type Policy = 'deliberate-route' | 'fixed-centre' | 'high-corner-spam' | 'default-aim';
type Totals = { shots: number; goals: number; wall: number; saves: number; weakWidePost: number; draws: number };
const policies: Policy[] = ['deliberate-route', 'fixed-centre', 'high-corner-spam', 'default-aim'];
const variants = [
  { x: -0.06, y: -0.05, power: -0.05, time: -0.12 },
  { x: 0, y: 0, power: 0, time: 0 },
  { x: 0.06, y: 0.05, power: 0.05, time: 0.12 },
];
const empty = (): Totals => ({ shots: 0, goals: 0, wall: 0, saves: 0, weakWidePost: 0, draws: 0 });
const quantize = (v: number, step: number) => Math.round(v / step) * step;

function inputFor(s: WallShotSetup, round: number, policy: Policy, variant: typeof variants[number]): WallShotInput {
  const wall = wallShotGeometry(s);
  let x = 0;
  let y = 0.5;
  let power = 0.65;
  if (policy === 'default-aim') y = 0.8;
  if (policy === 'high-corner-spam') { x = 0.9; y = 0.9; power = 1; }
  if (policy === 'deliberate-route') {
    if (round % 3 === 0) { x = (wall.lo + wall.hi) / 2; y = 0.85; }
    else {
      const left = wall.lo - 0.12;
      const right = wall.hi + 0.12;
      x = round % 3 === 1 ? (left >= -0.88 ? left : right) : (right <= 0.88 ? right : left);
      y = 0.2;
    }
  }
  power = Math.max(0.3, Math.min(1, quantize(power + variant.power, 0.05)));
  let peak = wallNextPeak(s, 0.5);
  while (peak - wallTravel(power) < 0) peak += s.period;
  return {
    x: Math.max(-1.15, Math.min(1.15, quantize(x + variant.x, 0.06))),
    y: Math.max(0, Math.min(1.1, quantize(y + variant.y, 0.05))),
    power, press: Math.max(0, peak - wallTravel(power) + variant.time),
  };
}
function add(t: Totals, r: WallShotResult, draws: number) {
  t.shots += 1; t.draws += draws;
  if (r.won) t.goals += 1;
  else if (r.hitWall) t.wall += 1;
  else if (r.saved) t.saves += 1;
  else t.weakWidePost += 1;
}

describe('Wall Shot declared ordinary-input cohort', () => {
  it('prints paired legacy and finite-wall outcomes without guessing a completion margin', { timeout: 120000 }, () => {
    const rows: Record<string, Totals> = {};
    const witnesses = Array.from({ length: 10 }, () => 0);
    const seen: number[] = [];
    for (let index = 1; index <= 400; index += 1) {
      const seed = index * 7919 + 1454;
      seen.push(seed);
      const run = buildWallShotRun(seed);
      expect(run, 'WALL_COHORT_REAL_TEN_ROUNDS').toHaveLength(10);
      for (let round = 0; round < run.length; round += 1) {
        const s = run[round];
        for (let v = 0; v < variants.length; v += 1) {
          for (const policy of policies) {
            const input = inputFor(s, round, policy, variants[v]);
            const shotSeed = (seed * 131 + round * 733 + v * 503) % 2147483646 + 1;
            const values: WallShotResult[] = [];
            for (const rules of [1, 2] as const) {
              const stream = lehmer(shotSeed);
              const calls: number[] = [];
              const r = takeWallShot(input, { ...s, wallShotRules: rules }, () => { const value = stream(); calls.push(value); return value; });
              expect(calls, 'WALL_COHORT_FOUR_OUTCOME_DRAWS').toHaveLength(4);
              values.push(r);
              for (const bucket of ['whole', ...(round < 3 ? ['first3'] : []), ...(round >= 7 ? ['last3'] : [])]) {
                const key = policy + '|variant' + v + '|rules' + rules + '|' + bucket;
                rows[key] ??= empty();
                add(rows[key], r, calls.length);
              }
              if (rules === 2 && policy === 'deliberate-route' && r.won) witnesses[round] += 1;
            }
            expect(values[1].path, 'WALL_COHORT_SAME_FLIGHT_NO_EXTRA_ROLL').toEqual(values[0].path);
            expect([values[1].keeperX, values[1].keeperY], 'WALL_COHORT_SAME_KEEPER_ROLL').toEqual([values[0].keeperX, values[0].keeperY]);
          }
        }
      }
    }
    expect(new Set(seen).size, 'WALL_COHORT_FOUR_HUNDRED_DISTINCT_SEEDS').toBe(400);
    expect(Object.keys(rows), 'WALL_COHORT_COMPLETE_POLICY_VARIANT_RULE_BUCKETS').toHaveLength(72);
    for (const [key, row] of Object.entries(rows)) {
      const expected = key.endsWith('|whole') ? 4000 : 1200;
      expect(row.shots, 'WALL_COHORT_COMPLETE_SHOTS_' + key).toBe(expected);
      expect(row.draws, 'WALL_COHORT_COMPLETE_DRAWS_' + key).toBe(expected * 4);
      expect(row.goals + row.wall + row.saves + row.weakWidePost, 'WALL_COHORT_CLASSIFIED_' + key).toBe(expected);
    }
    expect(witnesses.every(n => n > 0), 'WALL_COHORT_REAL_SCORING_WITNESS_EACH_ROUND').toBe(true);
    console.info('WALL_COHORT_MEASURED ' + JSON.stringify({ runs: 400, rounds: 10, variants, sourceOnlyMargins: 'UNSET_MEASURE_FIRST', rows, deliberateRules2ScoringWitnessesByRound: witnesses }));
  });
});

