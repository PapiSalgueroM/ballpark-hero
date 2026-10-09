import { describe, expect, it } from 'vitest';
import { buildWallShotRun, lehmer, takeWallShot, wallNextPeak, wallTravel, type WallShotSetup } from '@/lib/careerDrills';

const legacySetup = (setup: WallShotSetup, round: number): WallShotSetup => {
  const t = round / 9;
  return { ...setup, gapMax: Math.round((0.30 - t * 0.17) * 100) / 100, period: Math.round((2.4 - t * 1.1) * 100) / 100 };
};

function attempt(setup: WallShotSetup, seed: number, dx: number, dt: number) {
  const power = 0.6;
  const peak = wallNextPeak(setup, wallTravel(power) + 0.2);
  return takeWallShot({ x: setup.gapCentre + dx, y: 0.85, power, press: peak - wallTravel(power) + dt }, setup, lehmer(seed));
}

describe('career wall shot forgiveness', () => {
  it('scores more with modest aiming and timing errors than the previous ladder', () => {
    let current = 0, previous = 0, attempts = 0;
    for (let seed = 1; seed <= 200; seed += 1) {
      buildWallShotRun(seed * 7919).forEach((setup, round) => {
        for (const dx of [-0.09, 0, 0.09]) for (const dt of [-0.16, 0, 0.16]) {
          const draw = seed * 104729 + round;
          current += Number(attempt(setup, draw, dx, dt).won);
          previous += Number(attempt(legacySetup(setup, round), draw, dx, dt).won);
          attempts += 1;
        }
      });
    }
    console.log(`wall shot forgiveness: ${current}/${attempts} scored, previous ${previous}/${attempts}`);
    expect(current).toBeGreaterThan(previous);
  });

  it('still blocks a shot that reaches a closed wall', () => {
    for (let seed = 1; seed <= 40; seed += 1) for (const setup of buildWallShotRun(seed * 7919)) {
      const power = 0.6;
      const closed = wallNextPeak(setup, wallTravel(power)) + setup.period / 2;
      const result = takeWallShot({ x: setup.gapCentre, y: 0.85, power, press: closed - wallTravel(power) }, setup, lehmer(seed));
      expect(result.hitWall).toBe(true);
      expect(result.won).toBe(false);
    }
  });

  it('still rejects aiming at the opposite side of the goal', () => {
    for (let seed = 1; seed <= 40; seed += 1) for (const setup of buildWallShotRun(seed * 7919)) {
      const power = 0.6;
      const result = takeWallShot({ x: setup.gapCentre >= 0 ? -1 : 1, y: 0.85, power, press: wallNextPeak(setup, wallTravel(power)) - wallTravel(power) }, setup, lehmer(seed));
      expect(result.won).toBe(false);
    }
  });
});
