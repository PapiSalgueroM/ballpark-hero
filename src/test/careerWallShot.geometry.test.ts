import { describe, expect, it, vi } from 'vitest';
import {
  buildWallShotRun, takeWallShot, wallShotBlocked, wallShotContact,
  wallShotGeometry, wallShotPreview, wallShotRules, wallNextPeak, wallTravel,
} from '@/lib/careerDrills';

function setup() {
  return { ...buildWallShotRun(1454)[0], gapCentre: 0, keeperLean: 0, wallShotRules: 2 as const };
}

describe('finite Wall Shot geometry and honest preview', () => {
  it('builds exactly five equal adjoining cells and keeps every seeded span inside the goal', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      for (const s of buildWallShotRun(seed)) {
        const wall = wallShotGeometry(s);
        expect(wall.count, 'WALL_GEOMETRY_FIVE').toBe(5);
        expect(wall.centres, 'WALL_GEOMETRY_CENTRES').toHaveLength(5);
        expect((wall.hi - wall.lo) * 7.32 / 2, 'WALL_GEOMETRY_WIDTH_METRES').toBeCloseTo(2.5, 12);
        expect(wall.lo, 'WALL_GEOMETRY_LEFT_BOUND').toBeGreaterThanOrEqual(-1);
        expect(wall.hi, 'WALL_GEOMETRY_RIGHT_BOUND').toBeLessThanOrEqual(1);
        for (let i = 0; i < 5; i += 1) {
          expect(wall.centres[i], 'WALL_GEOMETRY_CELL_MIDPOINT').toBe(wall.lo + (i + 0.5) * (wall.hi - wall.lo) / 5);
        }
      }
    }
  });

  it.each([
    ['wall', 0, 0.18, 0.65],
    ['weak', 0.7, 0.8, 0.3],
    ['off-target', 1.1, 0.8, 0.65],
    ['clear', 0, 0.9, 0.65],
  ] as const)('reports the actual no-spray %s route without a random draw', (reason, x, y, power) => {
    const s = setup();
    const input = { x, y, power, press: 0 };
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      const preview = wallShotPreview(input, s);
      let draws = 0;
      const actual = takeWallShot(input, s, () => { draws += 1; return 0.5; });
      expect(preview.reason, 'WALL_PREVIEW_REASON_' + reason).toBe(reason);
      expect(preview.path, 'WALL_PREVIEW_SAME_ZERO_SPRAY_FLIGHT').toEqual(actual.path);
      expect(wallShotBlocked(s, preview.path), 'WALL_PREVIEW_SAME_COLLISION').toBe(actual.hitWall);
      expect(wallShotContact(preview.path), 'WALL_PREVIEW_REAL_CONTACT_SAMPLE').toBe(preview.path[Math.round(preview.path.length * 0.45)]);
      expect(draws, 'WALL_PREVIEW_RESOLVE_FOUR_DRAWS').toBe(4);
      expect(random, 'WALL_PREVIEW_NO_GLOBAL_RANDOM').not.toHaveBeenCalled();
    } finally { random.mockRestore(); }
  });

  it('keeps flight, keeper, points and draw order identical when both wall rules allow the shot', () => {
    const legacy = { ...setup(), wallShotRules: 1 as const };
    const modern = { ...legacy, wallShotRules: 2 as const };
    const power = 0.65;
    const input = { x: 0, y: 0.9, power, press: wallNextPeak(legacy, 0) - wallTravel(power) };
    const before: number[] = [];
    const after: number[] = [];
    const a = takeWallShot(input, legacy, () => { before.push(0.5); return 0.5; });
    const b = takeWallShot(input, modern, () => { after.push(0.5); return 0.5; });
    expect(a.won && b.won, 'WALL_BOTH_RULES_REAL_GOAL').toBe(true);
    const { verdict: oldWords, ...oldFacts } = a;
    const { verdict: newWords, ...newFacts } = b;
    expect(newFacts, 'WALL_ONLY_COLLISION_LAW_CHANGED').toEqual(oldFacts);
    expect(after, 'WALL_EXISTING_DRAW_ORDER_HELD').toEqual(before);
    expect(before, 'WALL_EXISTING_FOUR_DRAWS_HELD').toHaveLength(4);
    expect(oldWords, 'WALL_LEGACY_WORDS_HELD').toBe('Through the wall and in.');
    expect(newWords, 'WALL_MODERN_WORDS_HONEST').toBe('In the net.');
  });

  it('refuses an unsupported explicit rule without consuming a shot', () => {
    expect(wallShotRules({}), 'WALL_MISSING_RULE_IS_LEGACY').toBe(1);
    expect(wallShotRules({ wallShotRules: 2 }), 'WALL_NEW_RULE_EXPLICIT').toBe(2);
    expect(() => wallShotRules({ wallShotRules: 3 }), 'WALL_UNKNOWN_RULE_REFUSED').toThrow('Unsupported Wall Shot rules');
  });
});

