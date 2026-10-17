import { describe, expect, it } from 'vitest';
import { inFixtureOrder, mineFirstOfReport, myClubFirst } from '@/lib/cmMatchDisplay';

describe('the order rule (Round 1340)', () => {
  it('puts my club first at home and on a neutral ground, and second away', () => {
    expect(myClubFirst(true)).toBe(true);
    expect(myClubFirst(null)).toBe(true);
    expect(myClubFirst(false)).toBe(false);
  });

  it('reads a field from before the venue existed as today: my club first', () => {
    expect(myClubFirst(undefined)).toBe(true);
  });

  it('draws the pair home side first', () => {
    expect(inFixtureOrder(true, 'Liverpool', 'Newcastle')).toEqual(['Liverpool', 'Newcastle']);
    expect(inFixtureOrder(null, 'Liverpool', 'Newcastle')).toEqual(['Liverpool', 'Newcastle']);
    expect(inFixtureOrder(false, 'Liverpool', 'Newcastle')).toEqual(['Newcastle', 'Liverpool']);
    expect(inFixtureOrder(undefined, 2, 1)).toEqual([2, 1]);
  });

  it('reads a report the way the engine wrote it', () => {
    expect(mineFirstOfReport({ home: 'Liverpool' }, 'Liverpool')).toBe(true);
    expect(mineFirstOfReport({ home: 'Newcastle' }, 'Liverpool')).toBe(false);
  });

  it('agrees with the engine on every venue: report home is me exactly when myClubFirst', () => {
    // The engine's own construction (clubManager.ts playMyMatch): iAmHome = fx.home !== false.
    for (const home of [true, false, null, undefined] as const) {
      const iAmHome = home !== false;
      const report = { home: iAmHome ? 'Liverpool' : 'Newcastle' };
      expect(mineFirstOfReport(report, 'Liverpool')).toBe(myClubFirst(home));
    }
  });
});
