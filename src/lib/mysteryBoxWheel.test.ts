import { describe, expect, it } from 'vitest';
import type { PackTier } from '@/lib/fetchPackPool';
import {
  easeOutCubic,
  extraTurnsForPack,
  jitterForPack,
  landingRotationDeg,
  spinTargetForPack,
  SECTOR_SPAN,
  tierUnderPointer,
  WHEEL_TIERS,
  wheelSectors,
} from '@/lib/mysteryBoxWheel';

const TIERS: PackTier[] = ['superstar', 'star', 'quality', 'squad', 'fringe'];

describe('mystery box wheel mapping', () => {
  it('covers every pack tier exactly once around the ring', () => {
    const sectors = wheelSectors();
    expect(sectors).toHaveLength(5);
    expect(sectors.map(s => s.tier)).toEqual(WHEEL_TIERS);
    expect(SECTOR_SPAN).toBe(72);
    expect(sectors[0].startDeg).toBe(0);
    expect(sectors[4].endDeg).toBe(360);
  });

  it('lands the pointer on the pack tier, never a second roll', () => {
    for (const tier of TIERS) {
      for (const packIndex of [0, 1, 7, 14]) {
        const rotation = spinTargetForPack(tier, packIndex);
        expect(tierUnderPointer(rotation)).toBe(tier);
      }
    }
  });

  it('keeps jitter inside the target sector', () => {
    for (const tier of TIERS) {
      for (const jitter of [0, 0.25, 0.5, 0.75, 1]) {
        const rotation = landingRotationDeg(tier, 6, jitter);
        expect(tierUnderPointer(rotation)).toBe(tier);
      }
    }
  });

  it('does not map a star pack onto fringe', () => {
    const rotation = spinTargetForPack('star', 3);
    expect(tierUnderPointer(rotation)).toBe('star');
    expect(tierUnderPointer(rotation)).not.toBe('fringe');
    expect(tierUnderPointer(rotation)).not.toBe('superstar');
  });

  it('uses a cubic ease-out, not a linear ramp', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    const mid = easeOutCubic(0.5);
    expect(mid).toBeGreaterThan(0.5);
    expect(mid).toBeCloseTo(0.875, 3);
  });

  it('varies extra turns with the pack index without leaving 5-7', () => {
    const turns = [0, 1, 2, 3, 14].map(extraTurnsForPack);
    expect(new Set(turns).size).toBeGreaterThan(1);
    for (const n of turns) {
      expect(n).toBeGreaterThanOrEqual(5);
      expect(n).toBeLessThanOrEqual(7);
    }
    const j = jitterForPack(4);
    expect(j).toBeGreaterThanOrEqual(0);
    expect(j).toBeLessThan(1);
  });
});
