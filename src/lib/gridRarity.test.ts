/**
 * Round 401. The rarity formula, on counts taken before the player's own row
 * is inserted. scripts/simGridRarity.mjs runs this file and also reads the
 * three hooks to hold the measure-then-insert order as code.
 */
import { describe, it, expect } from 'vitest';
import { rarityPercent } from '@/lib/gridRarity';

describe('rarityPercent counts the player as the one row the formula adds', () => {
  it('is the unicorn when nobody has picked anything for the cell', () => {
    expect(rarityPercent(0, 0)).toBe(101);
  });

  it('shares the cell with the crowd that picked before', () => {
    // four earlier picks, one of them this name: (1 + 1) / (4 + 1)
    expect(rarityPercent(4, 1)).toBe(40);
    // four earlier picks, none of them this name: 1 / 5
    expect(rarityPercent(4, 0)).toBe(20);
  });

  it('repeating the only earlier pick is 100 percent', () => {
    expect(rarityPercent(1, 1)).toBe(100);
  });

  it('never exceeds 100 once anyone has picked', () => {
    for (let total = 1; total <= 50; total += 7) {
      expect(rarityPercent(total, total)).toBeLessThanOrEqual(100);
    }
  });
});
