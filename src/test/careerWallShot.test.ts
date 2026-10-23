import { describe, expect, it } from 'vitest';
import {
  buildWallShotRun, takeWallShot, wallNextPeak, wallTravel,
  type WallShotInput,
} from '@/lib/careerDrills';

function wall(rules?: 1 | 2) {
  const seeded = buildWallShotRun(1454)[0];
  const setup = {
    ...seeded, gapCentre: 0, gapMax: 0.34, period: 2.8,
    phase: 0, keeperLean: 0,
  };
  return rules === undefined ? setup : { ...setup, wallShotRules: rules };
}

function resolve(input: WallShotInput, setup = wall()) {
  let draws = 0;
  const result = takeWallShot(input, setup, () => { draws += 1; return 0.5; });
  return { result, draws };
}

const closed = (x: number, y: number): WallShotInput => ({ x, y, power: 0.65, press: 1.8 });

describe('career Wall Shot finite five-defender rules', () => {
  it('allows a low shot around either end of the rules-2 wall', () => {
    const setup = wall(2);
    const shots = [-0.72, 0.72].map(x => resolve(closed(x, 0.18), setup));
    expect(shots.map(s => s.draws), 'WALL_V2_WINGS_FOUR_DRAWS').toEqual([4, 4]);
    expect(shots.every(s => s.result.path[Math.round(s.result.path.length * 0.45)].y < 0.38),
      'WALL_V2_WINGS_ACTUALLY_LOW').toBe(true);
    expect(shots.map(s => s.result.hitWall), 'WALL_V2_FINITE_WINGS_CLEAR').toEqual([false, false]);
    expect(shots.map(s => s.result.onTarget), 'WALL_V2_WINGS_REACH_GOAL').toEqual([true, true]);
  });

  it('allows a high shot above the rules-2 wall even when the old gap is closed', () => {
    const shot = resolve(closed(0, 0.9), wall(2));
    const contact = shot.result.path[Math.round(shot.result.path.length * 0.45)];
    expect(contact.y, 'WALL_V2_ABOVE_ACTUAL_HEIGHT').toBeGreaterThan(0.38);
    expect(shot.draws, 'WALL_V2_ABOVE_FOUR_DRAWS').toBe(4);
    expect(shot.result.hitWall, 'WALL_V2_ABOVE_WALL_CLEAR').toBe(false);
    expect(shot.result.onTarget, 'WALL_V2_ABOVE_REACHES_GOAL').toBe(true);
  });

  it('still blocks a low shot into the middle of the rules-2 wall', () => {
    const shot = resolve(closed(0, 0.18), wall(2));
    expect(shot.result.hitWall, 'WALL_V2_CENTRAL_LOW_BLOCK').toBe(true);
    expect(shot.result.won, 'WALL_V2_BLOCK_CANNOT_SCORE').toBe(false);
    expect(shot.result.points, 'WALL_V2_BLOCK_HAS_NO_POINTS').toBe(0);
    expect(shot.draws, 'WALL_V2_BLOCK_FOUR_DRAWS').toBe(4);
  });

  it('keeps a missing rules marker identical to explicit legacy rules', () => {
    const input = closed(0.72, 0.9);
    const missing = resolve(input, wall());
    const explicit = resolve(input, wall(1));
    expect(explicit, 'WALL_V1_MISSING_MARKER_IS_LEGACY').toEqual(missing);
    expect(missing.draws, 'WALL_V1_FOUR_DRAWS').toBe(4);
  });

  it('retains the legacy closed-gap result even for an above-wall input', () => {
    const shot = resolve(closed(0, 0.9), wall());
    expect(shot.result.hitWall, 'WALL_V1_CLOSED_GAP_REPLAY_HELD').toBe(true);
    expect(shot.result.won, 'WALL_V1_CLOSED_MISS_HELD').toBe(false);
    expect(shot.result.points, 'WALL_V1_CLOSED_POINTS_HELD').toBe(0);
    expect(shot.draws, 'WALL_V1_CLOSED_DRAWS_HELD').toBe(4);
  });

  it('retains a legitimate legacy peak goal and replays the packed input exactly', () => {
    const setup = wall();
    const power = 0.65;
    const press = wallNextPeak(setup, 0) - wallTravel(power);
    const input = { x: 0, y: 0.9, power, press };
    const first = resolve(input, setup);
    const packed = [input.x, input.y, input.power, input.press].map(v => Math.round(v * 10000) / 10000);
    const replay = resolve({ x: packed[0], y: packed[1], power: packed[2], press: packed[3] }, setup);
    expect(first.result.won, 'WALL_V1_PEAK_POSITIVE_WITNESS').toBe(true);
    expect(first.result.points, 'WALL_V1_PEAK_POINTS_POSITIVE').toBeGreaterThan(0);
    expect(replay, 'WALL_V1_PACKED_REPLAY_HELD').toEqual(first);
  });
});

