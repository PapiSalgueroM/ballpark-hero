import { describe, expect, it } from 'vitest';
import { buildWallShotRun, wallShotBlocked, wallShotContact, wallShotGeometry } from '@/lib/careerDrills';

function contactPath(x: number, y: number) {
  const path = Array.from({ length: 25 }, () => ({ x: 0, y: 0 }));
  path[Math.round(path.length * 0.45)] = { x, y };
  return path;
}

describe('Wall Shot exact finite contact boundaries', () => {
  it('keeps the left edge open and blocks only contacts inside it', () => {
    const s = { ...buildWallShotRun(1454)[0], gapCentre: 0, wallShotRules: 2 as const };
    const wall = wallShotGeometry(s);
    const values = [wall.lo - 1e-8, wall.lo, wall.lo + 1e-8].map(x => wallShotBlocked(s, contactPath(x, 0.1)));
    expect(values, 'WALL_BOUNDARY_LEFT_EXACT').toEqual([false, false, true]);
  });
  it('keeps the right edge open and blocks only contacts inside it', () => {
    const s = { ...buildWallShotRun(1454)[0], gapCentre: 0, wallShotRules: 2 as const };
    const wall = wallShotGeometry(s);
    const values = [wall.hi - 1e-8, wall.hi, wall.hi + 1e-8].map(x => wallShotBlocked(s, contactPath(x, 0.1)));
    expect(values, 'WALL_BOUNDARY_RIGHT_EXACT').toEqual([true, false, false]);
  });
  it('clears the exact top and above it while blocking immediately below', () => {
    const s = { ...buildWallShotRun(1454)[0], gapCentre: 0, wallShotRules: 2 as const };
    const wall = wallShotGeometry(s);
    const paths = [wall.top - 1e-8, wall.top, wall.top + 1e-8].map(y => contactPath(0, y));
    expect(paths.map(p => wallShotContact(p).y), 'WALL_BOUNDARY_CONTACT_VALUES').toEqual([wall.top - 1e-8, wall.top, wall.top + 1e-8]);
    expect(paths.map(p => wallShotBlocked(s, p)), 'WALL_BOUNDARY_TOP_EXACT').toEqual([true, false, false]);
  });
});

