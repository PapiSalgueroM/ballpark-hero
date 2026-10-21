import { describe, expect, it } from 'vitest';
import {
  engineRegistrations, playableClubs, playNextEntry, restoreEngineRegistrations,
  startCareer, type CareerState,
} from '@/lib/clubManager';
import { booksOf, projectFinances } from '@/lib/clubManagerFinances';

function withSeed<T>(seed: number, run: () => T): T {
  const random = Math.random;
  const now = Date.now;
  const registrations = engineRegistrations();
  let value = seed >>> 0;
  Math.random = () => {
    value = (value + 0x6d2b79f5) | 0;
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
  Date.now = () => Date.UTC(2026, 9, 21, 12);
  try { return run(); } finally {
    restoreEngineRegistrations(registrations);
    Math.random = random;
    Date.now = now;
  }
}

function firstChargedWeek(): CareerState {
  const random = Math.random;
  const now = Date.now;
  const after = withSeed(1519, () => {
    expect(playableClubs('premier').some(club => club.name === 'Manchester City')).toBe(true);
    const initial = startCareer('Manchester City');
    expect(initial.squad.length).toBeGreaterThan(0);
    expect(initial.calendar.length).toBeGreaterThan(0);
    const original = JSON.stringify(initial);
    const chargedBefore = booksOf(initial).season.weeks;
    let state = initial;
    for (let attempt = 0; attempt <= initial.calendar.length; attempt += 1) {
      if (booksOf(state).season.weeks > chargedBefore || state.week >= state.calendar.length) break;
      const before = JSON.stringify(state);
      const previousWeek = state.week;
      const result = playNextEntry(state, {
        skipHalftime: true, noCoach: true, untilWeek: state.week + 1,
      });
      expect(JSON.stringify(state)).toBe(before);
      expect(result.kind).not.toBe('halftime');
      expect(result.state.week).toBeGreaterThan(previousWeek);
      state = result.state;
    }
    expect(JSON.stringify(initial)).toBe(original);
    expect(booksOf(state).season.weeks - chargedBefore).toBe(1);
    expect(Number.isFinite(state.budget)).toBe(true);
    return state;
  });
  expect(Math.random).toBe(random);
  expect(Date.now).toBe(now);
  return after;
}

describe('Club Manager shirt sales through the real weekly engine', () => {
  it('records one retail week and gross sales after an actual charged week', () => {
    const state = firstChargedWeek();
    const season = booksOf(state).season as unknown as {
      shirts?: { weeks?: number; grossPence?: number; costPence?: number };
    };
    expect(season.shirts, 'SHIRT_ORIGINAL_LEDGER_MISSING').toBeDefined();
    expect(season.shirts!.weeks).toBe(1);
    expect(Number.isSafeInteger(season.shirts!.grossPence)).toBe(true);
    expect(season.shirts!.grossPence).toBeGreaterThan(0);
    expect(season.shirts!.costPence).toBeGreaterThanOrEqual(0);
    expect(season.shirts!.costPence).toBeLessThanOrEqual(season.shirts!.grossPence!);
  });

  it('exposes paid net cash as one kitty income source after an actual charged week', () => {
    const state = firstChargedWeek();
    const projection = projectFinances(state);
    expect(projection.income.length).toBeGreaterThan(0);
    const rows = projection.income.filter(row => row.id === 'shirtSales');
    expect(rows, 'SHIRT_ORIGINAL_INCOME_MISSING').toHaveLength(1);
    expect(rows[0].kitty).toBe(true);
    expect(Number.isFinite(rows[0].actual)).toBe(true);
    expect(rows[0].actual).toBeGreaterThanOrEqual(0);
    expect(rows[0].projected).toBeGreaterThanOrEqual(rows[0].actual);
  });
});
