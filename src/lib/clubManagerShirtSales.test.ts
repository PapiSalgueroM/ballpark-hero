import { describe, expect, it } from 'vitest';
import {
  engineRegistrations, playableClubs, playNextEntry, restoreEngineRegistrations,
  finishSeason, loadCareer, SAVE_KEY, saveCareer, startCareer, startNextSeason,
  wildernessWeek, type CareerState,
} from '@/lib/clubManager';
import {
  booksOf, closeLedger, emptyShirtSales, ensureBooks, projectFinances, readShirtSales,
  rolloverBooks, settleShirtSales, shirtPendingPence, shirtSalesForWeek, tickBooks,
} from '@/lib/clubManagerFinances';
import { fanMeter } from '@/lib/clubManagerMeters';
import { kittyChange } from '@/lib/clubManagerHubLines';
import { retireCareer } from '@/lib/clubManagerRetire';
import { fenceKeyOf, saveFence } from '@/lib/saveFence';

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

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const fresh = () => withSeed(1519, () => startCareer('Manchester City'));
const pennies = (state: CareerState) => readShirtSales(booksOf(state).season.shirts)!;
const retailRow = (state: CareerState) => projectFinances(state).income.find(row => row.id === 'shirtSales')!;

describe('Club Manager shirt sales accounting outcomes', () => {
  it('retains tiny net, pays the exact threshold and settles several batches only once', () => {
    const opening = emptyShirtSales();
    const tiny = settleShirtSales(opening, { grossPence: 900_000, costPence: 400_000 })!;
    expect(tiny).toEqual({ ledger: { v: 1, weeks: 1, openingPence: 0, grossPence: 900_000, costPence: 400_000, paidPence: 0 }, cashPence: 0 });
    expect(shirtPendingPence(tiny.ledger)).toBe(500_000);
    const threshold = settleShirtSales(tiny.ledger, { grossPence: 500_001, costPence: 1 })!;
    expect(threshold).toEqual({ ledger: { v: 1, weeks: 2, openingPence: 0, grossPence: 1_400_001, costPence: 400_001, paidPence: 1_000_000 }, cashPence: 1_000_000 });
    const carried = emptyShirtSales(999_999);
    const batches = settleShirtSales(carried, { grossPence: 10_000_005, costPence: 3_000_004 })!;
    expect(batches.cashPence).toBe(8_000_000);
    expect(shirtPendingPence(batches.ledger)).toBe(0);
    expect(settleShirtSales(batches.ledger, { grossPence: 0, costPence: 0 })!.cashPence).toBe(0);
    expect(opening).toEqual(emptyShirtSales());
    expect(carried).toEqual(emptyShirtSales(999_999));
    expect(tiny.ledger).not.toBe(opening);
    expect(threshold.ledger).not.toBe(tiny.ledger);
    expect(shirtPendingPence(tiny.ledger)).toBe(500_000);
  });

  it('rejects malformed records, impossible quotes and unsafe accumulation without changing them', () => {
    const invalid: unknown[] = [null, [], {}, false, { ...emptyShirtSales(), v: 2 },
      { ...emptyShirtSales(), weeks: -1 }, { ...emptyShirtSales(), weeks: 0.5 },
      { ...emptyShirtSales(), openingPence: 1_000_000 },
      { ...emptyShirtSales(), grossPence: 1_000_000 },
      { ...emptyShirtSales(), costPence: 1 }, { ...emptyShirtSales(), paidPence: 1 },
      { ...emptyShirtSales(), grossPence: Infinity },
      { ...emptyShirtSales(), grossPence: Number.MAX_SAFE_INTEGER + 1 }];
    expect(readShirtSales(undefined)).toEqual(emptyShirtSales());
    expect(readShirtSales(undefined)).not.toBe(readShirtSales(undefined));
    for (const value of invalid) expect(readShirtSales(value)).toBeNull();
    for (const quote of [{ grossPence: -1, costPence: 0 }, { grossPence: 1.1, costPence: 0 },
      { grossPence: 1, costPence: 2 }, { grossPence: NaN, costPence: 0 },
      { grossPence: Number.MAX_SAFE_INTEGER + 1, costPence: 0 }]) {
      expect(settleShirtSales(emptyShirtSales(), quote)).toBeNull();
    }
    const large = { ...emptyShirtSales(), grossPence: 9_007_199_254_000_000, paidPence: 9_007_199_254_000_000 };
    expect(readShirtSales(large)).not.toBeNull();
    const before = JSON.stringify(large);
    expect(settleShirtSales(large, { grossPence: 1_000_000, costPence: 0 })).toBeNull();
    expect(JSON.stringify(large)).toBe(before);
    expect(settleShirtSales({ ...emptyShirtSales(), weeks: Number.MAX_SAFE_INTEGER }, { grossPence: 0, costPence: 0 })).toBeNull();
  });

  it('reads old books without mutation or backpay and starts at one new charged week', () => {
    const state = fresh(), books = ensureBooks(state);
    books.season.weeks = 25; books.season.tickets = 7.25; books.season.travel = 0.125;
    delete books.season.shirts;
    const before = JSON.stringify(state), budget = state.budget;
    const quote = shirtSalesForWeek(state);
    const expected = settleShirtSales(emptyShirtSales(), quote)!;
    expect(retailRow(state).actual).toBe(0);
    expect(closeLedger(state).shirts).toEqual(emptyShirtSales());
    expect(JSON.stringify(state)).toBe(before);
    tickBooks(state);
    expect(pennies(state)).toEqual(expected.ledger);
    expect(pennies(state).weeks).toBe(1);
    expect(booksOf(state).season).toMatchObject({ weeks: 26, tickets: 7.25, travel: 0.125 });
    expect(state.budget).toBe(Math.round((budget + expected.cashPence / 100_000_000) * 100) / 100);
  });

  it('uses displayed fan demand and club stature, independently of hidden gate mood and available cash', () => {
    const state = fresh(); state.form = ['W', 'D']; state.resultLog = [];
    const shown = fanMeter(state).shown;
    const units = Math.floor(1600 * (0.5 + shown / 100));
    expect(shirtSalesForWeek(state)).toEqual({ grossPence: units * 5000, costPence: units * 2000 });
    const low = copy(state), high = copy(state);
    ensureBooks(low).fanMood = 0; low.budget = 0;
    ensureBooks(high).fanMood = 100; high.budget = 999;
    expect(shirtSalesForWeek(low)).toEqual(shirtSalesForWeek(high));
    low.form = Array.from({ length: 12 }, () => 'L');
    high.form = Array.from({ length: 12 }, () => 'W');
    expect(fanMeter(high).shown).toBeGreaterThan(fanMeter(low).shown);
    expect(shirtSalesForWeek(high).grossPence).toBeGreaterThan(shirtSalesForWeek(low).grossPence);
  });

  it('credits only net batches and preserves a fractional kitty when nothing is payable', () => {
    const state = fresh(); state.budget = 12.345;
    const quote = shirtSalesForWeek(state), budget = state.budget;
    const expected = settleShirtSales(emptyShirtSales(), quote)!;
    expect(expected.cashPence).toBeGreaterThan(0);
    tickBooks(state);
    expect(state.budget).toBe(Math.round((budget + expected.cashPence / 100_000_000) * 100) / 100);
    expect(pennies(state)).toEqual(expected.ledger);
    withSeed(1519, () => {
      const custom = startCareer('Shirt Penny Fixture', 'now', {
        name: 'Shirt Penny Fixture', leagueId: 'premier', stadium: 'Fixture Ground', budgetTier: 'small', quality: 72,
        crest: { shape: 0, pattern: 0, color1: '#2563eb', color2: '#ffffff', initials: 'SP' }, replacedClub: '',
      });
      custom.budget = 12.345;
      expect(shirtSalesForWeek(custom).grossPence - shirtSalesForWeek(custom).costPence).toBeLessThan(1_000_000);
      tickBooks(custom);
      expect(custom.budget).toBe(12.345);
      expect(pennies(custom).paidPence).toBe(0);
      expect(shirtPendingPence(pennies(custom))).toBeGreaterThan(0);
    });
  });

  it('counts paid net once in the projection, closed income and hub kitty without board-covered production', () => {
    const state = fresh();
    ensureBooks(state).season.shirts = { v: 1, weeks: 3, openingPence: 500_000, grossPence: 5_000_000, costPence: 2_000_000, paidPence: 3_000_000 };
    const zero = copy(state); ensureBooks(zero).season.shirts = emptyShirtSales();
    const p = projectFinances(state), z = projectFinances(zero);
    const rows = p.income.filter(row => row.id === 'shirtSales');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ actual: 0.03, kitty: true, unavailable: false });
    expect(p.spend).toEqual(z.spend);
    expect(p.incomeActual - z.incomeActual).toBeCloseTo(0.03, 10);
    expect(closeLedger(state).income - closeLedger(zero).income).toBeCloseTo(0.03, 10);
    expect(kittyChange(p).actual - kittyChange(z).actual).toBeCloseTo(0.03, 10);
    expect(p.income.filter(row => row.id !== 'shirtSales')).toEqual(z.income.filter(row => row.id !== 'shirtSales'));
  });

  it('projects pending and only remaining charged weeks, excluding nights and already played entries', () => {
    const state = fresh();
    state.calendar = [{ type: 'window', round: 0 }, { type: 'oneOff', round: 0, night: { k: 'dsc', n: 99999 } }, { type: 'window', round: 0 }];
    state.week = 1;
    ensureBooks(state).season.shirts = { ...emptyShirtSales(999_999), paidPence: 0 };
    const quote = shirtSalesForWeek(state);
    const expected = Math.floor((999_999 + quote.grossPence - quote.costPence) / 1_000_000) / 100;
    expect(retailRow(state).projected).toBe(expected);
    state.week = state.calendar.length;
    expect(retailRow(state).projected).toBe(0);
  });

  it('marks unsafe future estimates unavailable while retaining known paid income and a valid zero-week forecast', () => {
    const large = { ...emptyShirtSales(), weeks: 1, grossPence: 9_007_199_254_000_000, paidPence: 9_007_199_254_000_000 };
    for (const retail of [large, { ...emptyShirtSales(), weeks: Number.MAX_SAFE_INTEGER }]) {
      const state = fresh(); state.calendar = [{ type: 'window', round: 0 }]; state.week = 0;
      ensureBooks(state).season.shirts = retail;
      const before = JSON.stringify(state);
      expect(readShirtSales(retail)).not.toBeNull();
      const row = retailRow(state);
      expect(row).toMatchObject({ unavailable: false, projectionUnavailable: true, actual: retail.paidPence / 100_000_000, projected: retail.paidPence / 100_000_000 });
      expect(JSON.stringify(state)).toBe(before);
      state.week = state.calendar.length;
      expect(retailRow(state)).toMatchObject({ unavailable: false, projectionUnavailable: false, projected: retail.paidPence / 100_000_000 });
    }
    const quote = { grossPence: 900_000, costPence: 400_000 };
    const batch = settleShirtSales(emptyShirtSales(), quote, 3)!;
    expect(batch.ledger).toEqual({ v: 1, weeks: 3, openingPence: 0, grossPence: 2_700_000, costPence: 1_200_000, paidPence: 1_000_000 });
    expect(batch.cashPence).toBe(1_000_000);
    expect(shirtPendingPence(batch.ledger)).toBe(500_000);
    expect(settleShirtSales(batch.ledger, quote, 0)).toEqual({ ledger: batch.ledger, cashPence: 0 });
    for (const weeks of [-1, 0.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) expect(settleShirtSales(emptyShirtSales(), quote, weeks)).toBeNull();
  });

  it('charges twice at a fixed calendar pointer and does not charge a skipped night in the real engine', () => {
    const state = fresh(), pointer = state.week;
    tickBooks(state); tickBooks(state);
    expect(state.week).toBe(pointer);
    expect(pennies(state).weeks).toBe(2);
    const initial = fresh();
    initial.calendar.splice(initial.week, 0, { type: 'oneOff', round: 0, night: { k: 'dsc', n: 99999 } });
    const before = JSON.stringify(initial), retail = copy(pennies(initial));
    const after = withSeed(1519, () => playNextEntry(initial, { skipHalftime: true, noCoach: true, untilWeek: initial.week + 1 }).state);
    expect(after.week).toBe(initial.week + 1);
    expect(booksOf(after).season.weeks).toBe(booksOf(initial).season.weeks);
    expect(pennies(after)).toEqual(retail);
    expect(JSON.stringify(initial)).toBe(before);
  });

  it('round trips pending pennies without loading or reading paying the kitty', () => {
    const state = fresh(); ensureBooks(state).season.shirts = { ...emptyShirtSales(765_432), weeks: 2 };
    const saved = localStorage.getItem(SAVE_KEY), fence = localStorage.getItem(fenceKeyOf(SAVE_KEY));
    saveFence.release(SAVE_KEY);
    try {
      const before = JSON.stringify(state);
      expect(saveCareer(state)).toBe(true);
      const stored = localStorage.getItem(SAVE_KEY);
      const loaded = loadCareer()!;
      expect(loaded).not.toBeNull();
      expect(pennies(loaded)).toEqual(pennies(state));
      expect(loaded.budget).toBe(state.budget);
      const bytes = JSON.stringify(loaded);
      projectFinances(loaded); closeLedger(loaded); shirtSalesForWeek(loaded);
      expect(JSON.stringify(loaded)).toBe(bytes);
      expect(localStorage.getItem(SAVE_KEY)).toBe(stored);
      expect(JSON.stringify(state)).toBe(before);
    } finally {
      saveFence.release(SAVE_KEY);
      if (saved === null) localStorage.removeItem(SAVE_KEY); else localStorage.setItem(SAVE_KEY, saved);
      if (fence === null) localStorage.removeItem(fenceKeyOf(SAVE_KEY)); else localStorage.setItem(fenceKeyOf(SAVE_KEY), fence);
    }
  });

  it('carries pending at the same club, leaves it behind on a move and opens fresh after unavailable retail', () => {
    const state = fresh();
    ensureBooks(state).season.shirts = { v: 1, weeks: 3, openingPence: 500_000, grossPence: 5_000_000, costPence: 2_000_000, paidPence: 3_000_000 };
    const before = JSON.stringify(state), next = copy(state), budget = next.budget;
    rolloverBooks(next, state, false);
    expect(pennies(next)).toEqual(emptyShirtSales(500_000));
    expect(booksOf(next).lastSeason!.shirts).toEqual(pennies(state));
    expect(next.budget).toBe(budget);
    expect(JSON.stringify(state)).toBe(before);
    const moved = copy(state); rolloverBooks(moved, state, true);
    expect(pennies(moved)).toEqual(emptyShirtSales());
    const broken = copy(state); ensureBooks(broken).season.shirts = null;
    ensureBooks(broken).season.tickets = 7.25;
    const brokenBudget = broken.budget;
    tickBooks(broken);
    expect(broken.budget).toBe(brokenBudget);
    expect(booksOf(broken).season.tickets).toBe(7.25);
    expect(retailRow(broken)).toMatchObject({ unavailable: true, actual: 0, projected: 0 });
    rolloverBooks(next, broken, false);
    expect(booksOf(next).lastSeason!.shirts).toBeNull();
    expect(pennies(next)).toEqual(emptyShirtSales());
  });

  it('uses the actual season rollover without paying or copying the former club balance to a new job', () => {
    withSeed(1520, () => {
      // Explicit completed-calendar fixture, not a claim of a naturally played season.
      const state = startCareer('Manchester City'); state.week = state.calendar.length;
      ensureBooks(state).season.shirts = { ...emptyShirtSales(345_678), weeks: 2 };
      const finished = finishSeason(state).state, before = JSON.stringify(finished);
      const same = startNextSeason(finished);
      expect(pennies(same)).toEqual(emptyShirtSales(345_678));
      expect(booksOf(same).lastSeason!.shirts).toEqual(pennies(finished));
      const moved = startNextSeason(finished, 'Arsenal');
      expect(moved.clubName).toBe('Arsenal');
      expect(pennies(moved)).toEqual(emptyShirtSales());
      expect(JSON.stringify(finished)).toBe(before);
    });
  });

  it('does not accrue during out-of-work waiting or retirement', () => {
    withSeed(1521, () => {
      const state = startCareer('Manchester City'); tickBooks(state);
      const original = JSON.stringify(state), retail = copy(pennies(state));
      const waiting = wildernessWeek({ ...state, sacked: true }, () => 0.6);
      expect(pennies(waiting)).toEqual(retail);
      expect(waiting.budget).toBe(state.budget);
      const retired = retireCareer(state)!;
      expect(retired).not.toBeNull();
      expect(pennies(retired)).toEqual(retail);
      expect(retired.budget).toBe(state.budget);
      expect(JSON.stringify(state)).toBe(original);
    });
  });

  it('makes quotes, settlement and finance reads without clock or random calls', () => {
    const state = fresh(), before = JSON.stringify(state), random = Math.random, now = Date.now;
    Math.random = () => { throw new Error('SHIRT_UNEXPECTED_RANDOM'); };
    Date.now = () => { throw new Error('SHIRT_UNEXPECTED_CLOCK'); };
    try {
      const quote = shirtSalesForWeek(state);
      expect(settleShirtSales(emptyShirtSales(), quote)).not.toBeNull();
      projectFinances(state); closeLedger(state);
      expect(JSON.stringify(state)).toBe(before);
    } finally { Math.random = random; Date.now = now; }
    expect(Math.random).toBe(random);
    expect(Date.now).toBe(now);
  });
});
