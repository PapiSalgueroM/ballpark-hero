import type { HoopSetup } from './buzzerBeater';

export const CONTEST_RACKS = 5;
export const BALLS_PER_RACK = 5;
export const CONTEST_SHOTS = 25;
export const MAX_CONTEST_SCORE = 30;

/* These are our arcade racks, not an official contest layout. */
export function buildThreePointContest(): HoopSetup[] {
  return [7.3, 7.6, 8, 7.6, 7.3].flatMap((distance, rack) =>
    Array.from({ length: BALLS_PER_RACK }, () => ({
      distance, contestReach: 0, contestDist: 0, contestSide: 0,
      label: `Rack ${rack + 1}, ${distance} m, nobody there`,
    })),
  );
}

export function contestShotValue(index: number): number {
  return (index + 1) % BALLS_PER_RACK === 0 ? 2 : 1;
}

export function contestPoints(index: number, made: boolean): number {
  return made ? contestShotValue(index) : 0;
}
