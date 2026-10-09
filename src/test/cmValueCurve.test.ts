/**
 * Round 1102: the value curve, photographed before the round gave ratings an age term.
 *
 * src/test/fixtures/cmValueCurve.json was recorded ONCE from the untouched
 * scripts/lib/cmValueCurve.mjs (the commit and the module's blob are in the fixture) and is never
 * re recorded. It holds what the module answered for 1,001 dollar values (200 a decade, log spaced,
 * 10,000 to 1,000,000,000), for nothing, a negative and a missing value, for the floor value and the
 * dollar under it, and for the whole dollar either side of each of the 46 rounding steps from 48.5
 * to 93.5; the pounds conversion at one and at two decimals for the same values; the euro rate for
 * 50 values; the floor value and the position map.
 *
 * The round's promise is that the VALUE curve does not move: 216 million dollars is still 94, one
 * million is still 64, and every shipped pound value still reads the same. The age points sit on
 * top of this integer (rateFrom), so a shipped row's old rating IS its value rating and re rating a
 * shipped file is exact.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  POS_MAP, RATING_FLOOR, RATING_CEIL, ratingOf, gbpM, EUR_USD_RATE, usdOfEur, FLOOR_USD,
} from '../../scripts/lib/cmValueCurve.mjs';

/* eslint-disable @typescript-eslint/no-explicit-any */
const fixture: any = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'src/test/fixtures/cmValueCurve.json'), 'utf8'),
);

describe('Club Manager value curve (recorded before Round 1102)', () => {
  it('the fixture is whole, so nothing below can pass empty', () => {
    expect(fixture.rating.length).toBe(1098);
    expect(fixture.counts).toEqual({ rating: 1098, logSpaced: 1001, steps: 92, special: 5, gbp: 1097, eur: 50 });
    expect(fixture.gbp1.length).toBe(1097);
    expect(fixture.gbp2.length).toBe(1097);
    expect(fixture.eurUsd.length).toBe(50);
    const seen = new Set(fixture.rating.map((row: any) => row[1]));
    expect(seen.size).toBe(47);
    expect(Math.min(...(seen as any))).toBe(48);
    expect(Math.max(...(seen as any))).toBe(94);
  });

  it('the constants and the position map are the recorded ones', () => {
    expect(RATING_FLOOR).toBe(fixture.RATING_FLOOR);
    expect(RATING_CEIL).toBe(fixture.RATING_CEIL);
    expect(FLOOR_USD).toBe(fixture.FLOOR_USD);
    expect(EUR_USD_RATE).toBe(fixture.EUR_USD_RATE);
    expect(POS_MAP).toEqual(fixture.POS_MAP);
    expect(Object.keys(POS_MAP).length).toBe(13);
  });

  it('every recorded dollar value still gets its recorded value rating', () => {
    const moved: string[] = [];
    for (const [usd, want] of fixture.rating) {
      const got = ratingOf(usd);
      if (got !== want) moved.push(`${usd}: ${want} became ${got}`);
    }
    expect(moved).toEqual([]);
  });

  it('the two anchors read as the header says', () => {
    expect(ratingOf(216_000_000)).toBe(94);
    expect(ratingOf(1_000_000)).toBe(64);
    expect(ratingOf(FLOOR_USD)).toBe(48);
  });

  it('pounds, at one and at two decimals, are the recorded ones', () => {
    const moved: string[] = [];
    for (const [usd, want] of fixture.gbp1) if (gbpM(usd) !== want) moved.push(`1dp ${usd}: ${want} became ${gbpM(usd)}`);
    for (const [usd, want] of fixture.gbp2) if (gbpM(usd, 2) !== want) moved.push(`2dp ${usd}: ${want} became ${gbpM(usd, 2)}`);
    expect(moved).toEqual([]);
  });

  it('euros convert at the recorded rate', () => {
    const moved: string[] = [];
    for (const [eur, want] of fixture.eurUsd) if (usdOfEur(eur) !== want) moved.push(`${eur}: ${want} became ${usdOfEur(eur)}`);
    expect(moved).toEqual([]);
  });
});
