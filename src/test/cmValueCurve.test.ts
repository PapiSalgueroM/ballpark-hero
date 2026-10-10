/**
 * Round 1214 (part one of four): the Club Manager curve and ages libraries, proven on their own.
 * Nothing shipped imports them yet. The round's brief cut the Round 1102 ratings work in four so
 * that no number a player sees moves until everything under it is proven; this file is that proof
 * for the two script libraries (scripts/lib/cmValueCurve.mjs, scripts/lib/cmAges.mjs), the ledgers
 * beside them and the typed wrapper the app will import (src/lib/cmAgeRead.ts).
 *
 * 1. THE VALUE CURVE, photographed before any round gave ratings an age term.
 *    src/test/fixtures/cmValueCurve.json was recorded ONCE from the untouched module (the commit and
 *    the module's blob are in the fixture; the blob is the one main shipped before this round) and
 *    is never re recorded. It holds what the module answered for 1,001 dollar values (200 a decade,
 *    log spaced, 10,000 to 1,000,000,000), for nothing, a negative and a missing value, for the
 *    floor value and the dollar under it, and for the whole dollar either side of each of the 46
 *    rounding steps from 48.5 to 93.5; the pounds conversion at one and at two decimals for the
 *    same values; the euro rate for 50 values; the floor value and the position map.
 * 2. THE AGE READ: the tables typed out by hand at tops 94, 96, 97 and 98, never computed from the
 *    module; the two limits that read the world's own top; the fail closed cases.
 * 3. levelFrom: total, and the age read's inverse wherever no clamp bit.
 * 4. ONE ORDER: the stretch first, then the age points. The brief's table of 29 men (computed by its
 *    scout and again by its critic from the data files) is typed here and the library has to give
 *    every row from the files as main ships them.
 *
 * Every property has a mutation that turns it red; the round's notes
 * (docs/audits/ROUND-1214-NOTES.md) name each one and the runner result that showed it.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  POS_MAP, RATING_FLOOR, RATING_CEIL, valueRatingOf, gbpM, EUR_USD_RATE, usdOfEur, FLOOR_USD,
  CURVE_VERSION, YOUTH_FROM, YOUTH_MAX, VETERAN_FROM, VETERAN_CAP, VETERAN_POINTS, LEVEL_MAX, ENGINE_POSITIONS,
  agePoints, ageRead, levelFrom, readInWorld, rateFrom, ratingOf,
} from '../../scripts/lib/cmValueCurve.mjs';
import { eraUpliftRating } from '../lib/clubManagerEras';
import { CM_ROSTERS } from '../data/clubManagerRosters';
import { ERA2005_ROSTERS } from '../data/clubManagerEra2005';
import { ERA2010_ROSTERS } from '../data/clubManagerEra2010';
import { ERA2015_ROSTERS } from '../data/clubManagerEra2015';
import { ERA2020_ROSTERS } from '../data/clubManagerEra2020';

/* eslint-disable @typescript-eslint/no-explicit-any */
const fixture: any = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'src/test/fixtures/cmValueCurve.json'), 'utf8'),
);

describe('Club Manager value curve (recorded before any age read)', () => {
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
      const got = valueRatingOf(usd);
      if (got !== want) moved.push(`${usd}: ${want} became ${got}`);
    }
    expect(moved).toEqual([]);
  });

  it('ratingOf with one argument is still that value rating, so no generator writes a new byte', () => {
    /* Every generator on main calls ratingOf(usd). Until the round that re-rates the 2026 files it
       must answer exactly as the recorded module did. */
    const moved: string[] = [];
    for (const [usd, want] of fixture.rating) {
      const got = (ratingOf as any)(usd);
      if (got !== want) moved.push(`${usd}: ${want} became ${got}`);
    }
    expect(moved).toEqual([]);
    expect((ratingOf as any)(null)).toBe(48);
    expect((ratingOf as any)(undefined)).toBe(48);
  });

  it('the two anchors read as the header says', () => {
    expect(valueRatingOf(216_000_000)).toBe(94);
    expect(valueRatingOf(1_000_000)).toBe(64);
    expect(valueRatingOf(FLOOR_USD)).toBe(48);
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

/* The age read as LITERAL cases, typed out by hand from the rule and never computed from the
   module: every age from 14 to 45 at chosen levels, for each of the four tops a world has. Reading
   across one row: five ages 14 to 18, five 19 to 23, six 24 to 29, eight 30 to 37, eight 38 to 45. */
const AGES = Array.from({ length: 32 }, (_, i) => 14 + i);
const eight = (n: number) => [n, n, n, n, n, n, n, n];
const TABLES: Record<number, Record<number, number[]>> = {
  /* 2026: the top is the curve's own ceiling */
  94: {
    48: [48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 49, 50, 50, 51, 52, 53, 54, 55, ...eight(56)],
    64: [58, 58, 58, 58, 58, 59, 60, 61, 62, 63, 64, 64, 64, 64, 64, 64, 65, 66, 66, 67, 68, 69, 70, 71, ...eight(72)],
    80: [74, 74, 74, 74, 74, 75, 76, 77, 78, 79, 80, 80, 80, 80, 80, 80, 81, 82, 82, 83, 84, 85, 86, 87, ...eight(88)],
    85: [81, 81, 81, 81, 81, 81, 81, 82, 83, 84, 85, 85, 85, 85, 85, 85, 86, 87, 87, 88, 89, 90, 91, 92, ...eight(93)],
    89: [87, 87, 87, 87, 87, 87, 87, 87, 87, 88, 89, 89, 89, 89, 89, 89, 90, 91, 91, 92, 93, 94, 94, 94, ...eight(94)],
    92: [91, 91, 91, 91, 91, 91, 91, 91, 91, 91, 92, 92, 92, 92, 92, 92, 93, 94, 94, 94, 94, 94, 94, 94, ...eight(94)],
    94: [94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, ...eight(94)],
  },
  /* 2005-06: the top is 96 */
  96: {
    73: [67, 67, 67, 67, 67, 68, 69, 70, 71, 72, 73, 73, 73, 73, 73, 73, 74, 75, 75, 76, 77, 78, 79, 80, ...eight(81)],
    85: [80, 80, 80, 80, 80, 80, 81, 82, 83, 84, 85, 85, 85, 85, 85, 85, 86, 87, 87, 88, 89, 90, 91, 92, ...eight(93)],
    91: [89, 89, 89, 89, 89, 89, 89, 89, 89, 90, 91, 91, 91, 91, 91, 91, 92, 93, 93, 94, 95, 96, 96, 96, ...eight(96)],
    96: [96, 96, 96, 96, 96, 96, 96, 96, 96, 96, 96, 96, 96, 96, 96, 96, 96, 96, 96, 96, 96, 96, 96, 96, ...eight(96)],
  },
  /* 2010-11: the top is 97 */
  97: {
    85: [79, 79, 79, 79, 79, 80, 81, 82, 83, 84, 85, 85, 85, 85, 85, 85, 86, 87, 87, 88, 89, 90, 91, 92, ...eight(93)],
    92: [90, 90, 90, 90, 90, 90, 90, 90, 90, 91, 92, 92, 92, 92, 92, 92, 93, 94, 94, 95, 96, 97, 97, 97, ...eight(97)],
    94: [93, 93, 93, 93, 93, 93, 93, 93, 93, 93, 94, 94, 94, 94, 94, 94, 95, 96, 96, 97, 97, 97, 97, 97, ...eight(97)],
    97: [97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, ...eight(97)],
  },
  /* 2015-16: the top is 98 */
  98: {
    60: [54, 54, 54, 54, 54, 55, 56, 57, 58, 59, 60, 60, 60, 60, 60, 60, 61, 62, 62, 63, 64, 65, 66, 67, ...eight(68)],
    91: [88, 88, 88, 88, 88, 88, 88, 88, 89, 90, 91, 91, 91, 91, 91, 91, 92, 93, 93, 94, 95, 96, 97, 98, ...eight(98)],
    96: [95, 95, 95, 95, 95, 95, 95, 95, 95, 95, 96, 96, 96, 96, 96, 96, 97, 98, 98, 98, 98, 98, 98, 98, ...eight(98)],
    98: [98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, 98, ...eight(98)],
  },
};

describe('Club Manager rating: the level plus points for age, on the top of the world', () => {
  it('the constants are the measured ones', () => {
    expect(CURVE_VERSION).toBe(2);
    expect(LEVEL_MAX).toBe(99);
    expect(ENGINE_POSITIONS.size).toBe(13);
    expect([...ENGINE_POSITIONS].sort()).toEqual(['CAM', 'CB', 'CDM', 'CF', 'CM', 'GK', 'LB', 'LM', 'LW', 'RB', 'RM', 'RW', 'ST']);
    expect([YOUTH_FROM, YOUTH_MAX, VETERAN_FROM, VETERAN_CAP]).toEqual([24, 6, 30, 8]);
    expect(VETERAN_POINTS).toEqual({ 30: 1, 31: 2, 32: 2, 33: 3, 34: 4, 35: 5, 36: 6, 37: 7 });
  });

  it('every age from 14 to 45 is the table typed out by hand, at tops 94, 96, 97 and 98', () => {
    const wrong: string[] = [];
    let checked = 0;
    for (const [top, rows] of Object.entries(TABLES)) {
      for (const [level, row] of Object.entries(rows)) {
        expect(row.length).toBe(32);
        AGES.forEach((age, i) => {
          checked += 1;
          const got = ageRead(Number(level), age, Number(top));
          if (got !== row[i]) wrong.push(`top ${top}, level ${level} at ${age}: wanted ${row[i]}, got ${got}`);
        });
      }
    }
    expect(checked).toBe(19 * 32);
    expect(wrong).toEqual([]);
  });

  it('with no top given the top is 94, and rateFrom is that read for a generator', () => {
    for (const [level, row] of Object.entries(TABLES[94])) {
      AGES.forEach((age, i) => {
        expect(ageRead(Number(level), age)).toBe(row[i]);
        expect(rateFrom(Number(level), age, 'CB')).toBe(row[i]);
      });
    }
  });

  it('the age points alone: a point a year under 24, nothing to 29, one at 30 rising to eight', () => {
    expect([14, 18, 19, 20, 21, 22, 23].map(a => agePoints(70, a))).toEqual([-6, -6, -5, -4, -3, -2, -1]);
    expect([24, 25, 26, 27, 28, 29].map(a => agePoints(70, a))).toEqual([0, 0, 0, 0, 0, 0]);
    expect([30, 31, 32, 33, 34, 35, 36, 37, 38, 41, 45].map(a => agePoints(70, a))).toEqual([1, 2, 2, 3, 4, 5, 6, 7, 8, 8, 8]);
    /* the half distance limit: at 90 a boy gives two back, at 93 nothing, at the cap nothing */
    expect([agePoints(90, 17), agePoints(91, 17), agePoints(93, 17), agePoints(94, 17)]).toEqual([-2, -1, 0, 0]);
    /* any whole age answers: a saved man can be older than a file row, an academy boy younger */
    expect([agePoints(70, 9), agePoints(70, 13), agePoints(70, 46), agePoints(70, 60)]).toEqual([-6, -6, 8, 8]);
  });

  it('the half distance limit reads the top of the man own world, never the constant 94', () => {
    /* A 23 year old on a level of 97 in a world whose top is 97 gives nothing back. Read against
       94 the half distance is under zero and he would be moved; read against 99 he would lose one. */
    expect(agePoints(97, 23, 97)).toBe(0);
    expect(ageRead(97, 23, 97)).toBe(97);
    /* the same man of 20 on 91: two off at a top of 96 (half of five), one off at 94, three at 98 */
    expect([agePoints(91, 20, 94), agePoints(91, 20, 96), agePoints(91, 20, 98)]).toEqual([-1, -2, -3]);
    /* a level above the top (a wrong top handed in) never turns the youth term into a gain */
    expect(agePoints(96, 20, 94)).toBe(0);
    expect(ageRead(96, 20, 94)).toBe(94);
    for (const top of [94, 96, 97, 98]) {
      for (let level = 48; level <= 99; level += 1) {
        for (const age of AGES) {
          const pts = agePoints(level, age, top);
          if (age < 24) expect(pts <= 0 && pts >= -6).toBe(true);
          else expect(pts >= 0 && pts <= 8).toBe(true);
        }
      }
    }
  });

  it('the upper clamp reads the same top: nobody passes the best of his world for being old', () => {
    /* 98 at 30 is 99 before the clamp; the world's top is 98, so 98 (and 94 would cut him to 94) */
    expect(ageRead(98, 30, 98)).toBe(98);
    expect(ageRead(92, 40, 97)).toBe(97);
    expect(ageRead(92, 40, 96)).toBe(96);
    expect(ageRead(92, 40, 94)).toBe(94);
    expect(ageRead(92, 40, 99)).toBe(99);
    for (const top of [94, 96, 97, 98]) {
      for (let level = 48; level <= 99; level += 1) {
        for (const age of AGES) {
          const got = ageRead(level, age, top);
          expect(Number.isInteger(got) && got >= 48 && got <= top).toBe(true);
        }
      }
      /* the man on the top stays on it at every age */
      for (const age of AGES) expect(ageRead(top, age, top)).toBe(top);
    }
  });

  it('position is checked and changes nothing', () => {
    for (const pos of ENGINE_POSITIONS) {
      expect(rateFrom(80, 35, pos)).toBe(85);
      expect(rateFrom(84, 22, pos)).toBe(82);
    }
  });

  it('ratingOf with an age and a position is the value rating read with the age', () => {
    /* one million dollars is a 64 on value; 216 million is the cap at any age */
    expect(ratingOf(1_000_000, 26, 'CM')).toBe(64);
    expect(ratingOf(1_000_000, 35, 'CM')).toBe(69);
    expect(ratingOf(1_000_000, 19, 'CM')).toBe(59);
    for (const age of AGES) expect(ratingOf(216_000_000, age, 'RW')).toBe(94);
    expect(ratingOf(0, 26, 'GK')).toBe(48);
    expect(ratingOf(null, 40, 'GK')).toBe(56);
  });

  it('fails closed on a bad value rating, age or position, naming the inputs', () => {
    expect(() => rateFrom(80.5, 26, 'CB')).toThrow(/value rating/);
    expect(() => rateFrom(47, 26, 'CB')).toThrow(/value rating/);
    expect(() => rateFrom(95, 26, 'CB')).toThrow(/value rating/);
    expect(() => rateFrom(80, 13, 'CB')).toThrow(/age/);
    expect(() => rateFrom(80, 46, 'CB')).toThrow(/age/);
    expect(() => rateFrom(80, 26.5, 'CB')).toThrow(/age/);
    expect(() => rateFrom(80, undefined, 'CB')).toThrow(/age/);
    expect(() => rateFrom(80, '26' as any, 'CB')).toThrow(/age/);
    expect(() => rateFrom(80, 26, 'SW')).toThrow(/position/);
    expect(() => rateFrom(80, 26, undefined)).toThrow(/position/);
    expect(() => rateFrom(80, 26, 'Centre-Back')).toThrow(/position/);
    expect(() => rateFrom(80, 13, 'SW')).toThrow(/valueRating 80, age 13, pos SW/);
    /* a call that passes ANY second argument is held to the whole rule: a row with no age throws */
    expect(() => (ratingOf as any)(5_000_000, undefined)).toThrow(/age/);
    expect(() => (ratingOf as any)(5_000_000, undefined, undefined)).toThrow(/age/);
    expect(() => (ratingOf as any)(5_000_000, 26)).toThrow(/position/);
    expect(() => ratingOf(5_000_000, undefined, 'CB')).toThrow(/age/);
  });

  it('the three reads throw on anything that is not a whole number, so no NaN reaches a save', () => {
    for (const read of [agePoints, ageRead, levelFrom] as any[]) {
      expect(() => read(NaN, 25)).toThrow(/the level or rating must be a whole number/);
      expect(() => read(undefined, 25)).toThrow(/the level or rating must be a whole number/);
      expect(() => read(80.5, 25)).toThrow(/the level or rating must be a whole number/);
      expect(() => read('80', 25)).toThrow(/the level or rating must be a whole number/);
      expect(() => read(80, NaN)).toThrow(/the age must be a whole number/);
      expect(() => read(80, undefined)).toThrow(/the age must be a whole number/);
      expect(() => read(80, 25.5)).toThrow(/the age must be a whole number/);
      expect(() => read(80, 25, 47)).toThrow(/the top must be a whole number from 48 to 99/);
      expect(() => read(80, 25, 100)).toThrow(/the top must be a whole number from 48 to 99/);
      expect(() => read(80, 25, NaN)).toThrow(/the top must be a whole number from 48 to 99/);
      expect(() => read(80, 25, null)).toThrow(/the top must be a whole number from 48 to 99/);
      expect(Number.isInteger(read(80, 25))).toBe(true);
    }
  });
});

/* levelFrom, the age read run backwards. The engine will price a created club's founders through it
   and those ratings were never read off a level, so it has to answer for EVERY rating, not only the
   ones the read can produce. The holes below were enumerated by the brief's critic at top 94. */
const HOLES_94: Record<number, number[]> = {
  17: [77, 80, 83, 86, 89, 92],
  18: [77, 80, 83, 86, 89, 92],
  19: [80, 83, 86, 89, 92],
  20: [83, 86, 89, 92],
  21: [86, 89, 92],
  22: [89, 92],
  23: [92],
};
const TOPS = [94, 96, 97, 98];

describe('levelFrom: the age read run backwards, total', () => {
  it('answers a whole level from 48 to the top for every rating 48 to 99, every age 14 to 45, every top', () => {
    let cells = 0;
    const bad: string[] = [];
    for (const top of TOPS) {
      for (const age of AGES) {
        for (let rating = 48; rating <= 99; rating += 1) {
          cells += 1;
          const level = levelFrom(rating, age, top);
          if (!Number.isInteger(level) || level < 48 || level > top) bad.push(`rating ${rating} at ${age}, top ${top}: ${level}`);
        }
      }
    }
    expect(cells).toBe(4 * 32 * 52);
    expect(bad).toEqual([]);
    /* and outside that grid: under the floor, over the cap, a boy, an old man */
    expect([levelFrom(40, 20), levelFrom(120, 20), levelFrom(80, 9), levelFrom(80, 60)]).toEqual([48, 94, 85, 72]);
  });

  it('it is the smallest level whose read is at least the rating, and the top when there is none', () => {
    const wrong: string[] = [];
    for (const top of TOPS) {
      for (const age of AGES) {
        for (let rating = 48; rating <= 99; rating += 1) {
          const level = levelFrom(rating, age, top);
          const reaches = ageRead(level, age, top) >= rating;
          const firstThatDoes = level === 48 || ageRead(level - 1, age, top) < rating;
          if (rating > top ? level !== top : !(reaches && firstThatDoes)) wrong.push(`rating ${rating} at ${age}, top ${top}: ${level}`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  it('the ratings the read skips for a young man are the enumerated ones, and each takes the next level up', () => {
    for (const age of AGES) {
      const image = new Set<number>();
      for (let level = 48; level <= 94; level += 1) image.add(ageRead(level, age, 94));
      const holes: number[] = [];
      for (let rating = 48; rating <= 94; rating += 1) if (!image.has(rating)) holes.push(rating);
      /* 14 to 16 give back the full six like 17 and 18; from 24 the read is the level plus a constant */
      const skipped = age < 17 ? HOLES_94[17] : age < 24 ? HOLES_94[age] : [];
      /* a man of 30 or more is never shown under 48 plus his points, so those ratings are unreachable */
      const points = age < 30 ? 0 : age >= 38 ? 8 : (VETERAN_POINTS as Record<number, number>)[age];
      const underHisFloor = Array.from({ length: points }, (_, i) => 48 + i);
      expect(holes).toEqual([...underHisFloor, ...skipped]);
      for (const hole of skipped) {
        const level = levelFrom(hole, age);
        expect(ageRead(level, age)).toBe(hole + 1);
        expect(ageRead(level - 1, age)).toBe(hole - 1);
      }
      for (const hole of underHisFloor) expect(levelFrom(hole, age)).toBe(48);
    }
    /* the founder the critic worked: a rotation man of 21 to 23 rated 86, 89 or 92 */
    expect([levelFrom(86, 21), levelFrom(89, 22), levelFrom(92, 23), levelFrom(92, 21)]).toEqual([89, 91, 93, 93]);
  });

  it('it inverts the read wherever no clamp bit, and the clamped cells are counted', () => {
    /* Every level 48 to 99 at every age and top. Where the round trip does not give the level back
       the read sits on the floor or on the top, levelFrom gives the LOWEST level with that read, and
       the count is the one worked out by hand: under the floor a boy's first `d` levels share 48
       (45 cells over the ten ages under 24), on the top a veteran's last `k` levels share it (30
       cells from 30 to 37 and 64 from 38 to 45), and every level above the top reads the top. */
    const counts: Record<number, number> = {};
    for (const top of TOPS) {
      let clamped = 0;
      const offALimit: string[] = [];
      const notTheSameRead: string[] = [];
      const notTheLowest: string[] = [];
      for (const age of AGES) {
        for (let level = 48; level <= 99; level += 1) {
          const read = ageRead(level, age, top);
          const back = levelFrom(read, age, top);
          if (ageRead(back, age, top) !== read) notTheSameRead.push(`level ${level} at ${age}, top ${top}`);
          if (back === level) continue;
          clamped += 1;
          if (back > level) notTheLowest.push(`level ${level} at ${age}, top ${top}: ${back}`);
          if (read !== 48 && read !== top) offALimit.push(`level ${level} at ${age}, top ${top}: read ${read}`);
        }
      }
      expect(notTheSameRead).toEqual([]);
      expect(notTheLowest).toEqual([]);
      expect(offALimit).toEqual([]);
      expect(clamped).toBe(45 + 30 + 64 + (99 - top) * 32);
      counts[top] = clamped;
    }
    expect(counts).toEqual({ 94: 299, 96: 235, 97: 203, 98: 171 });
    console.log(`levelFrom: clamped cells of 1,664 a top (52 levels by 32 ages): ${JSON.stringify(counts)}`);
  });
});

/* ONE ORDER. The brief's table: 29 men, computed by its scout and again by its critic from the data
   files, typed here from the brief and never from the module. Each row: the world, the man, the age
   the file holds, the age he is rated at, what main shows today (the level) and what he is shown
   once the age read is live. The library has to give every row from the files as main ships them. */
type World = { rosters: Record<string, { n: string; a: number; r: number }[]>; top: number; rawTop: number; rows: number; changed: number; onTheTop: string[] };
const ERAS: Record<string, World> = {
  era2005: { rosters: ERA2005_ROSTERS, top: 96, rawTop: 86, rows: 1727, changed: 829, onTheTop: ['Ronaldinho', 'Thierry Henry'] },
  era2010: { rosters: ERA2010_ROSTERS, top: 97, rawTop: 90, rows: 1751, changed: 890, onTheTop: ['Cristiano Ronaldo', 'Lionel Messi'] },
  era2015: { rosters: ERA2015_ROSTERS, top: 98, rawTop: 91, rows: 1659, changed: 738, onTheTop: ['Cristiano Ronaldo', 'Lionel Messi'] },
  era2020: { rosters: ERA2020_ROSTERS, top: 94, rawTop: 93, rows: 1774, changed: 862, onTheTop: ['Kylian Mbappé', 'Lionel Messi'] },
};
const BRIEF_TABLE: [string, string, number, number, number, number][] = [
  ['era2005', 'Ronaldinho', 24, 25, 96, 96],
  ['era2005', 'Thierry Henry', 27, 28, 96, 96],
  ['era2005', 'Pavel Nedved', 32, 33, 85, 88],
  ['era2005', 'Roy Keane', 33, 34, 79, 83],
  ['era2005', 'Wayne Rooney', 19, 20, 91, 89],
  ['era2005', 'Cristiano Ronaldo', 19, 20, 88, 84],
  ['era2005', 'Sergio Ramos', 18, 19, 88, 84],
  ['era2005', 'Lionel Messi', 17, 18, 73, 67],
  ['era2010', 'Lionel Messi', 22, 23, 97, 97],
  ['era2010', 'Cristiano Ronaldo', 24, 25, 97, 97],
  ['era2010', 'Xavi', 29, 30, 94, 95],
  ['era2010', 'Didier Drogba', 31, 32, 89, 91],
  ['era2010', 'Cesc Fàbregas', 22, 23, 92, 91],
  ['era2015', 'Cristiano Ronaldo', 29, 30, 98, 98],
  ['era2015', 'Lionel Messi', 27, 28, 98, 98],
  ['era2015', 'Neymar', 22, 23, 96, 95],
  ['era2015', 'Paul Pogba', 21, 22, 91, 89],
  ['era2020', 'Lionel Messi', 32, 33, 92, 94],
  ['era2020', 'Kylian Mbappé', 21, 22, 94, 94],
  ['era2020', 'Cristiano Ronaldo', 34, 35, 87, 92],
  ['era2020', 'Erling Haaland', 19, 20, 91, 90],
  ['now', 'Virgil van Dijk', 34, 35, 80, 85],
  ['now', 'Mohamed Salah', 33, 34, 83, 87],
  ['now', 'Lionel Messi', 39, 39, 78, 86],
  ['now', 'Luka Modrić', 40, 40, 72, 80],
  ['now', 'Harry Kane', 32, 33, 88, 91],
  ['now', 'Lamine Yamal', 18, 19, 94, 94],
  ['now', 'Michael Kayode', 21, 22, 84, 82],
  ['now', 'Ethan Nwaneri', 18, 19, 85, 81],
];
const eraWorld = (era: string) => ({ stretch: (r: number) => eraUpliftRating(era, r), top: ERAS[era].top, ageShift: 1 });
const rowsNamed = (rosters: World['rosters'], name: string) => Object.values(rosters).flat().filter(p => p.n === name);

describe('one order in every world: the stretch first, then the age points', () => {
  it('readInWorld stretches, then reads the age on the stretched scale and its own top', () => {
    /* 2010 Messi: value rating 90, 22 in the file. The stretch takes 90 to 97, he is rated at 23 and
       a man on the top gives nothing back. */
    expect(readInWorld(90, 22, eraWorld('era2010'))).toEqual({ level: 97, age: 23, rating: 97 });
    /* 2026 has no stretch and its files will hold the August age */
    expect(readInWorld(80, 35)).toEqual({ level: 80, age: 35, rating: 85 });
    expect(readInWorld(80, 35, {})).toEqual({ level: 80, age: 35, rating: 85 });
    /* THE OTHER ORDER is the bug Round 1102 could not ship: the points under the stretch, which
       multiplies them. The same three men, points first: 95, 93 and 80 where the rule gives 97, 88
       and 89. */
    const pointsFirst = (era: string, r: number, a: number) => eraUpliftRating(era, ageRead(r, a + 1, 94));
    expect([pointsFirst('era2010', 90, 22), pointsFirst('era2005', 82, 32), pointsFirst('era2005', 84, 19)]).toEqual([95, 93, 80]);
    expect([
      readInWorld(90, 22, eraWorld('era2010')).rating,
      readInWorld(82, 32, eraWorld('era2005')).rating,
      readInWorld(84, 19, eraWorld('era2005')).rating,
    ]).toEqual([97, 88, 89]);
  });

  it('each past season top is the stretch of the highest rating in its file: 96, 97, 98 and 94', () => {
    for (const [era, world] of Object.entries(ERAS)) {
      const raw = Math.max(...Object.values(world.rosters).flat().map(p => p.r));
      expect([era, raw]).toEqual([era, world.rawTop]);
      expect([era, eraUpliftRating(era, raw)]).toEqual([era, world.top]);
    }
  });

  it('the 29 men of the brief table, row for row, from the files main ships', () => {
    const wrong: string[] = [];
    let checked = 0;
    for (const [world, name, fileAge, ratedAt, mainShows, shown] of BRIEF_TABLE) {
      const found = rowsNamed(world === 'now' ? CM_ROSTERS : ERAS[world].rosters, name);
      if (found.length !== 1) { wrong.push(`${world} ${name}: ${found.length} rows of that name`); continue; }
      const row = found[0];
      checked += 1;
      if (row.a !== fileAge) wrong.push(`${world} ${name}: the file holds age ${row.a}, the table was typed from ${fileAge}`);
      /* in 2026 the file will hold the August age at the flip; until then it is typed beside the row */
      const got = world === 'now' ? readInWorld(row.r, ratedAt) : readInWorld(row.r, row.a, eraWorld(world));
      if (got.level !== mainShows) wrong.push(`${world} ${name}: main shows ${got.level}, the table says ${mainShows}`);
      if (got.age !== ratedAt) wrong.push(`${world} ${name}: rated at ${got.age}, the table says ${ratedAt}`);
      if (got.rating !== shown) wrong.push(`${world} ${name}: the library gives ${got.rating}, the table says ${shown}`);
    }
    expect(wrong).toEqual([]);
    expect(checked).toBe(29);
  });

  it('over every row of the four past seasons: never more than six down or eight up, nobody past the top', () => {
    for (const [era, world] of Object.entries(ERAS)) {
      let rows = 0;
      let changed = 0;
      let low = 0;
      let high = 0;
      const pastTheTop: string[] = [];
      const onTheTop: string[] = [];
      for (const list of Object.values(world.rosters)) {
        for (const b of list) {
          rows += 1;
          const got = readInWorld(b.r, b.a, eraWorld(era));
          const swing = got.rating - got.level;
          if (swing !== 0) changed += 1;
          low = Math.min(low, swing);
          high = Math.max(high, swing);
          if (got.rating > world.top || got.level > world.top) pastTheTop.push(`${b.n} ${got.rating}`);
          if (got.rating === world.top) onTheTop.push(b.n);
        }
      }
      expect([era, pastTheTop]).toEqual([era, []]);
      expect([era, low, high]).toEqual([era, -6, 8]);
      expect([era, onTheTop.sort()]).toEqual([era, world.onTheTop]);
      /* These two restate the era file itself (how many men it holds and how many the age read
         moves). A re-bake of a past season moves them for an honest reason: recount, do not widen. */
      expect([era, rows, changed]).toEqual([era, world.rows, world.changed]);
      console.log(`${era}: ${changed} of ${rows} rows change, swing ${low} to ${high}, on the top of ${world.top}: ${onTheTop.join(', ')}`);
    }
  });
});
