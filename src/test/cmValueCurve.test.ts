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
import {
  AGES_AS_OF, HAND_WRITTEN_FROM_ID, ID_GAP_FROM, ID_GAP_TO, NAMESAKE_YEARS, ERA_RATING_AGE_SHIFT,
  ageOn, buildBirths, tableAugustAge, augustAge2026,
} from '../../scripts/lib/cmAges.mjs';
import { DB_TO_ENGINE } from '../../scripts/lib/dbClubNames.mjs';
import * as door from '../lib/cmAgeRead';
import type { AgeReading, AgeWorld } from '../lib/cmAgeRead';
import { eraUpliftRating } from '../lib/clubManagerEras';
import { CM_ROSTERS, CM_ROSTER_META } from '../data/clubManagerRosters';
import { CM_ALEAGUE_ROSTERS } from '../data/clubManagerALeague2026';
import { CM_RUSSIA_ROSTERS } from '../data/clubManagerRussia2026';
import { CM_FINAL_TABLES_2025_26 } from '../data/clubManagerFinalTables2025_26';
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

  it('readInWorld names a bad world: null, a number, a list or a stretch that is no function is a RangeError', () => {
    /* A null handed in from a lookup that found no season used to die inside the destructuring with
       a TypeError that named nothing. The door types the world as optional and the app is not strict,
       so the type gate lets a null through: the library has to say what is wrong. */
    const bad: any[] = [null, 0, 94, 'era2010', true, [], [{ top: 97 }]];
    for (const world of bad) {
      expect(() => readInWorld(80, 35, world), JSON.stringify(world)).toThrow(RangeError);
      expect(() => readInWorld(80, 35, world), JSON.stringify(world)).toThrow(/readInWorld: the world must be an object/);
    }
    for (const stretch of [97, 'up', {}, true] as any[]) {
      expect(() => readInWorld(80, 35, { stretch }), String(stretch)).toThrow(/readInWorld: the stretch must be a function/);
    }
    /* left out, undefined or empty is 2026; a stretch left out or undefined is no stretch */
    expect(readInWorld(80, 35, undefined)).toEqual({ level: 80, age: 35, rating: 85 });
    expect(readInWorld(80, 35, { stretch: undefined, top: 94 })).toEqual({ level: 80, age: 35, rating: 85 });
    /* and what a bad world does further in is still named: a top off the scale, a stretch that gives a fraction */
    expect(() => readInWorld(80, 35, { top: 120 })).toThrow(/ageRead: the top must be a whole number/);
    expect(() => readInWorld(80, 35, { stretch: (r: number) => r + 0.5 })).toThrow(/ageRead: the level or rating must be a whole number/);
    expect(() => readInWorld(80, 35, { ageShift: 0.5 })).toThrow(/ageRead: the age must be a whole number/);
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

/* Ages for 1 August 2026 (scripts/lib/cmAges.mjs): the rule's four cases, its throws, and the
   namesake guard, on literal rows. */
describe('Club Manager ages for August 2026', () => {
  const births = buildBirths({
    ledgerRows: [
      { name: 'Sepp van den Berg', club: 'Brentford', born: '2001-12-20' },
      { name: 'Virgil van Dijk', club: 'Liverpool', born: '1991-07-08' },
      { name: 'Moved By Overlay', club: 'Chelsea', born: '2000-03-03' },
      { name: 'Thin Row Man', club: 'Everton', born: '1999-09-09', thin: 'one publisher only' },
    ],
    round669: {
      write: [
        { name: 'Allan', club: 'SC Corinthians', fotmob: { born: '1997-03-03' } },
        { name: 'Table Club Man', club: 'Old Table FC', fotmob: { born: '1999-05-05' } },
        { name: 'Unmodelled Man', club: 'A Club The Game Lacks', fotmob: { born: '1990-01-01' } },
      ],
      /* as the real ledger has him: stored without a club, then corrected to one */
      existingChecked: [{ name: 'Leander Dendoncker', stored: { club: 'Without Club' }, fotmob: { born: '1995-04-15' } }],
      corrections: [
        { name: 'Leander Dendoncker', field: 'club', from: 'Without Club', to: 'HNK Hajduk Split' },
        { name: 'Leander Dendoncker', field: 'age', fotmob: { born: '1995-04-15' } },
      ],
    },
    missing: [
      { name: 'Serge Gnabry', to: 'Bayern Munich', db: 'Bayern Munich', born: '1995-07-14' },
      /* the window ledger ties a date to TWO clubs: the one he joined and the one his table row names */
      { name: 'Window Two Clubs', to: 'Joined Club', db: 'Table Side FC', born: '1998-02-02' },
    ],
    dbToEngine: {
      'SC Corinthians': 'Corinthians', 'Old Table FC': 'Old Table', 'HNK Hajduk Split': 'Hajduk Split', 'Bayern Munich': 'Bayern Munich',
      'Table Side FC': 'Table Side',
    },
  });

  it('counts whole years to a day', () => {
    expect(ageOn('1991-07-08', '2026-08-01')).toBe(35);
    expect(ageOn('2001-12-20', '2026-08-01')).toBe(24);
    expect(ageOn('2001-08-01', '2026-08-01')).toBe(25);
    expect(ageOn('2001-08-02', '2026-08-01')).toBe(24);
    expect(ageOn('2001-01-01', '2026-01-01')).toBe(25);
    expect(() => ageOn('20 Dec 2001', '2026-08-01')).toThrow(/YYYY-MM-DD/);
    expect(() => ageOn('2001-13-01', '2026-08-01')).toThrow(/calendar/);
    expect(AGES_AS_OF).toBe('2026-08-01');
    expect([HAND_WRITTEN_FROM_ID, ID_GAP_FROM, ID_GAP_TO, NAMESAKE_YEARS]).toEqual([170000, 167000, 176415, 2]);
    expect(ERA_RATING_AGE_SHIFT).toBe(1);
  });

  it('case 1, a birth date on file: the exact age, whichever way the table rule would err', () => {
    /* an autumn birthday: the table rule would say 25 */
    expect(augustAge2026({ name: 'Sepp van den Berg', club: 'Brentford', tableClub: 'Brentford', age: 24, year: 2026, id: 23347 }, births))
      .toEqual({ age: 24, basis: 'born', born: '2001-12-20' });
    expect(augustAge2026({ name: 'Virgil van Dijk', club: 'Liverpool', tableClub: 'Liverpool', age: 34, year: 2026, id: 23441 }, births))
      .toEqual({ age: 35, basis: 'born', born: '1991-07-08' });
    /* the window ledger's date, found by the club he joined */
    expect(augustAge2026({ name: 'Serge Gnabry', club: 'Bayern Munich', tableClub: 'Bayern Munich', age: 30, year: 2026, id: 177000 }, births))
      .toEqual({ age: 31, basis: 'born', born: '1995-07-14' });
  });

  it('case 2, a bulk row: plus one for a 2026 row and plus two for a 2025 row', () => {
    expect(augustAge2026({ name: 'Nobody Ledgered', club: 'Leeds United', tableClub: 'Leeds United', age: 27, year: 2026, id: 5000 }, births)).toEqual({ age: 28, basis: 'moved' });
    expect(augustAge2026({ name: 'Nobody Ledgered', club: 'Leeds United', tableClub: 'Leeds United', age: 27, year: 2025, id: 166766 }, births)).toEqual({ age: 29, basis: 'moved' });
  });

  it('case 3, a hand written row: the age as written', () => {
    expect(augustAge2026({ name: 'Written Man', club: 'Inter Miami', tableClub: 'Inter Miami', age: 39, year: 2026, id: 176416 }, births)).toEqual({ age: 39, basis: 'written' });
  });

  it('case 4, no table row: the age as typed, marked unknown', () => {
    expect(augustAge2026({ name: 'Overlay Add', club: 'Hull City', age: 18 }, births)).toEqual({ age: 18, basis: 'unknown' });
    expect(augustAge2026({ name: 'Overlay Add', club: 'Hull City', age: 18, id: null }, births)).toEqual({ age: 18, basis: 'unknown' });
  });

  it('a ledger row marked thin is left out: the man keeps the table rule and nothing reads his date', () => {
    /* born in September 1999 he would be 26 by the date; the table rule says 27 and that stands */
    expect(births.has('Thin Row Man')).toBe(false);
    expect(augustAge2026({ name: 'Thin Row Man', club: 'Everton', tableClub: 'Everton', age: 26, year: 2026, id: 700 }, births)).toEqual({ age: 27, basis: 'moved' });
    /* the same row without the mark is read, so the mark is what keeps it out */
    const read = buildBirths({ ledgerRows: [{ name: 'Thin Row Man', club: 'Everton', born: '1999-09-09' }] });
    expect(augustAge2026({ name: 'Thin Row Man', club: 'Everton', tableClub: 'Everton', age: 26, year: 2026, id: 700 }, read)).toEqual({ age: 26, basis: 'born', born: '1999-09-09' });
  });

  it('Allan twice: the Corinthians man gets his date, the Palmeiras namesake keeps the table rule', () => {
    expect(augustAge2026({ name: 'Allan', club: 'Corinthians', tableClub: 'Corinthians', age: 28, year: 2026, id: 177100 }, births))
      .toEqual({ age: 29, basis: 'born', born: '1997-03-03' });
    const other = augustAge2026({ name: 'Allan', club: 'Palmeiras', tableClub: 'Palmeiras', age: 20, year: 2025, id: 120000 }, births);
    expect(other.age).toBe(22);
    expect(other.basis).toBe('moved');
    expect(other.note).toMatch(/Allan at Corinthians, not at Palmeiras/);
  });

  it('a moved man is found by his table club, and by his baked club', () => {
    /* the Round 669 ledger knows him at his table club; the overlay baked him somewhere else */
    expect(augustAge2026({ name: 'Table Club Man', club: 'New Club', tableClub: 'Old Table', age: 26, year: 2026, id: 177200 }, births))
      .toEqual({ age: 27, basis: 'born', born: '1999-05-05' });
    /* the birth date ledger knows him at the club he is baked at; his table row is elsewhere */
    expect(augustAge2026({ name: 'Moved By Overlay', club: 'Chelsea', tableClub: 'Aston Villa', age: 25, year: 2026, id: 4000 }, births))
      .toEqual({ age: 26, basis: 'born', born: '2000-03-03' });
    /* the window ledger, both halves of its join. The club he joined finds him... */
    expect(augustAge2026({ name: 'Window Two Clubs', club: 'Joined Club', tableClub: 'Somewhere Else', age: 28, year: 2026, id: 177300 }, births))
      .toEqual({ age: 28, basis: 'born', born: '1998-02-02' });
    /* ...and so does the club of his table row, alone: baked at a third club (a later move), with a
       table row at the club the ledger's db column names. Drop that half of the join and he falls
       back to the age as written. */
    expect(augustAge2026({ name: 'Window Two Clubs', club: 'Third Club', tableClub: 'Table Side', age: 27, year: 2026, id: 177300 }, births))
      .toEqual({ age: 28, basis: 'born', born: '1998-02-02' });
    expect([...births.get('Window Two Clubs')![0].clubs].sort()).toEqual(['Joined Club', 'Table Side']);
    /* at neither of the two he is another man of that name */
    expect(augustAge2026({ name: 'Window Two Clubs', club: 'Third Club', tableClub: 'Fourth Club', age: 27, year: 2026, id: 177300 }, births).basis).toBe('written');
    /* a date tied to a club the game does not model matches nobody */
    const loose = augustAge2026({ name: 'Unmodelled Man', club: 'Everton', tableClub: 'Everton', age: 35, year: 2026, id: 300 }, births);
    expect(loose.basis).toBe('moved');
    expect(loose.note).toMatch(/a club the game does not model/);
  });

  it('throws on a club matched date more than two years from the table, naming both ages', () => {
    expect(() => augustAge2026({ name: 'Allan', club: 'Corinthians', tableClub: 'Corinthians', age: 20, year: 2025, id: 120000 }, births))
      .toThrow(/Allan at Corinthians is 22 by his table row .* and 29 by the birth date 1997-03-03/);
  });

  it('the namesake guard starts past two years: exactly two apart is the same man, three is not', () => {
    /* Virgil van Dijk is 35 on the day by his date. A bulk 2026 row of age 32 reads 33 by the table
       rule: two under, accepted. Age 31 reads 32: three under, refused. */
    const vanDijk = (age: number) => augustAge2026({ name: 'Virgil van Dijk', club: 'Liverpool', tableClub: 'Liverpool', age, year: 2026, id: 23441 }, births);
    expect(NAMESAKE_YEARS).toBe(2);
    expect(vanDijk(32)).toEqual({ age: 35, basis: 'born', born: '1991-07-08' });
    expect(() => vanDijk(31)).toThrow(/is 32 by his table row .* and 35 by the birth date 1991-07-08 .*: more than 2 years apart/);
    /* and the same edge from above: a table age two over is accepted, three over is refused */
    expect(vanDijk(36)).toEqual({ age: 35, basis: 'born', born: '1991-07-08' });
    expect(() => vanDijk(37)).toThrow(/is 38 by his table row .* and 35 by the birth date 1991-07-08 .*: more than 2 years apart/);
  });

  it('throws on a row the rule was never measured on', () => {
    expect(() => augustAge2026({ name: 'Gap Row', club: 'X', age: 25, year: 2026, id: 167000 }, births)).toThrow(/inside the gap/);
    expect(() => augustAge2026({ name: 'Gap Row', club: 'X', age: 25, year: 2026, id: 176415 }, births)).toThrow(/inside the gap/);
    expect(() => augustAge2026({ name: 'Old Year', club: 'X', age: 25, year: 2024, id: 900 }, births)).toThrow(/bulk row of year 2024/);
    expect(() => augustAge2026({ name: 'Hand 2025', club: 'X', age: 25, year: 2025, id: 177500 }, births)).toThrow(/hand written row of year 2025/);
    expect(() => augustAge2026({ name: 'No Age', club: 'X', age: undefined, year: 2026, id: 900 }, births)).toThrow(/whole number age/);
    expect(tableAugustAge({ name: 'Edge', age: 25, year: 2026, id: 166999 })).toEqual({ age: 26, basis: 'moved' });
    expect(tableAugustAge({ name: 'Edge', age: 25, year: 2026, id: 176416 })).toEqual({ age: 25, basis: 'written' });
  });

  it('two ledgers that disagree about one man are fatal, and a date with no club must have a twin', () => {
    expect(() => buildBirths({
      ledgerRows: [{ name: 'Serge Gnabry', club: 'Bayern Munich', born: '1995-07-15' }],
      missing: [{ name: 'Serge Gnabry', to: 'Bayern Munich', db: 'Bayern Munich', born: '1995-07-14' }],
    })).toThrow(/two birth dates for Serge Gnabry/);
    expect(() => buildBirths({ round669: { corrections: [{ name: 'Loose Man', fotmob: { born: '1990-02-02' } }] } })).toThrow(/no club/);
    expect(() => buildBirths({ ledgerRows: [{ name: 'Bad Date', club: 'X', born: '14.07.1995' }] })).toThrow(/YYYY-MM-DD/);
    /* the same man on two ledgers with the same date is fine, and stays one answer */
    const both = buildBirths({
      ledgerRows: [{ name: 'Serge Gnabry', club: 'Bayern Munich', born: '1995-07-14' }],
      missing: [{ name: 'Serge Gnabry', to: 'Bayern Munich', db: 'Bayern Munich', born: '1995-07-14' }],
    });
    expect(augustAge2026({ name: 'Serge Gnabry', club: 'Bayern Munich', age: 30, year: 2026, id: 177000 }, both).age).toBe(31);
    expect(births.get('Leander Dendoncker')?.length).toBe(1);
    /* found through the club the ledger corrected him to */
    expect(augustAge2026({ name: 'Leander Dendoncker', club: 'Hajduk Split', tableClub: 'Hajduk Split', age: 30, year: 2026, id: 176483 }, births))
      .toEqual({ age: 31, basis: 'born', born: '1995-04-15' });
  });
});

/* The app will import both script libraries (src/lib/cmAgeRead.ts), so neither may ever import
   anything: a node module pulled in here would break the build or ship a server file to a phone. The
   comments are stripped first, because each header SAYS "no import" in prose. */
describe('the two script libraries stay pure, because the app imports them', () => {
  const codeOf = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  for (const file of ['scripts/lib/cmValueCurve.mjs', 'scripts/lib/cmAges.mjs']) {
    it(`${file} has no import, no require, no file, clock, random or network read`, () => {
      const code = codeOf(file);
      expect(code.length).toBeGreaterThan(1500);
      expect(code).toMatch(/export function /);
      const found = [
        /^\s*import[\s{*'"]/m, /\bimport\s*\(/, /\brequire\s*\(/, /\bexport\s+[*{][^;]*\bfrom\b/, /\bprocess\./, /\bfetch\s*\(/,
        /\bDate\.now\b/, /\bnew Date\b/, /\bMath\.random\b/, /\bglobalThis\b/, /\bwindow\./, /\blocalStorage\b/,
      ].filter(shape => shape.test(code)).map(String);
      expect(found).toEqual([]);
    });
  }
});

/* THE LEDGERS. Three committed files that nothing shipped reads yet. Each real fact in them stands on
   two publishers that are independent of each other and neither is a wiki, or it is marked thin and
   left out of what a later part reads. */
const readJson = (file: string): any => JSON.parse(fs.readFileSync(path.resolve(process.cwd(), file), 'utf8'));
const birthLedger = readJson('scripts/data/cmBirthDates2026.json');
const agesBasis = readJson('scripts/data/cmAgesBasis2026.json');
const finalTables = readJson('scripts/data/finalTables2025.json');
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const WIKI = /wiki|fandom/i;
const FAMILIES = ['club', 'league', 'competition', 'stats'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, '');

/** Does the text a page printed show this birth date: its day, its month (a number or a name) and
 *  its year (four digits or two)? */
const printedShows = (printed: string, born: string) => {
  const [year, month, day] = born.split('-').map(Number);
  const text = printed.toLowerCase();
  const numbers = (text.match(/\d+/g) ?? []).map(Number);
  return (numbers.includes(year) || numbers.includes(year % 100)) && numbers.includes(day)
    && (numbers.includes(month) || text.includes(MONTHS[month - 1]));
};

/** Everything wrong with one row of the birth date ledger. A thin row is excused the two kinds rule
 *  and nothing else. */
const birthRowProblems = (row: any): string[] => {
  const out: string[] = [];
  const who = `${row.name} at ${row.club}`;
  if (!row.name || !row.club) out.push(`${who}: no name or no club`);
  if (!ISO_DAY.test(String(row.born))) out.push(`${who}: born is not YYYY-MM-DD`);
  const sources: any[] = row.sources ?? [];
  for (const s of sources) {
    if (!FAMILIES.includes(s.family)) out.push(`${who}: ${s.publisher} has the family ${s.family}`);
    if (WIKI.test(`${s.publisher} ${s.url}`)) out.push(`${who}: ${s.publisher} is a wiki`);
    if (!/^https:\/\//.test(String(s.url)) || !hostOf(s.url).endsWith(s.publisher)) out.push(`${who}: the url of ${s.publisher} is not on that publisher`);
    if (!ISO_DAY.test(String(s.readOn))) out.push(`${who}: ${s.publisher} has no day it was read`);
    if (!s.printed || !printedShows(String(s.printed), String(row.born))) out.push(`${who}: what ${s.publisher} printed does not show ${row.born}`);
  }
  if (row.thin) {
    if (typeof row.thin !== 'string' || row.thin.length < 12) out.push(`${who}: thin has to say why`);
    return out;
  }
  if (new Set(sources.map(s => s.publisher)).size < 2) out.push(`${who}: under two publishers`);
  if (new Set(sources.map(s => s.family)).size < 2) out.push(`${who}: two publishers of one kind (${sources.map(s => s.family).join(', ')})`);
  return out;
};

const realBirths = () => buildBirths({
  ledgerRows: birthLedger.rows,
  round669: readJson('scripts/data/defensiveMidfield2026.json'),
  missing: readJson('scripts/data/window2026/missingPlayers.json'),
  dbToEngine: DB_TO_ENGINE,
});

describe('the birth date ledger: two publishers of two kinds a man, neither a wiki', () => {
  it('the checker itself fires: two statistics sites, a wiki, a date the page never printed, a thin row with no reason', () => {
    const good = {
      name: 'Good Row', club: 'Everton', born: '1999-09-09',
      sources: [
        { publisher: 'soccerbase.com', family: 'stats', url: 'https://www.soccerbase.com/x', printed: 'Birthdate 9/9/1999 (26), month first', readOn: '2026-10-09' },
        { publisher: 'laliga.com', family: 'league', url: 'https://www.laliga.com/x', printed: 'DATE OF BIRTH 09-09-1999, day first', readOn: '2026-10-09' },
      ],
    };
    expect(birthRowProblems(good)).toEqual([]);
    /* a second statistics site, made up: two publishers, one kind */
    const oneKind = { ...good, sources: [good.sources[0], { ...good.sources[0], publisher: 'second-stats-site.example', url: 'https://second-stats-site.example/x' }] };
    expect(birthRowProblems(oneKind).join(' | ')).toMatch(/two publishers of one kind/);
    /* the same row marked thin is excused that rule, and only that rule */
    expect(birthRowProblems({ ...oneKind, thin: 'both publishers are statistics sites' })).toEqual([]);
    expect(birthRowProblems({ ...oneKind, thin: true }).join(' | ')).toMatch(/thin has to say why/);
    const wiki = { ...good, sources: [good.sources[0], { ...good.sources[1], publisher: 'en.wikipedia.org', url: 'https://en.wikipedia.org/wiki/X' }] };
    expect(birthRowProblems(wiki).join(' | ')).toMatch(/is a wiki/);
    const neverPrinted = { ...good, born: '1999-09-10' };
    expect(birthRowProblems(neverPrinted).join(' | ')).toMatch(/does not show 1999-09-10/);
    const elsewhere = { ...good, sources: [good.sources[0], { ...good.sources[1], url: 'https://example.com/laliga.com/x' }] };
    expect(birthRowProblems(elsewhere).join(' | ')).toMatch(/not on that publisher/);
    expect(birthRowProblems({ ...good, sources: [good.sources[0]] }).join(' | ')).toMatch(/under two publishers/);
  });

  it('every one of the 109 rows meets the rule, and none is thin', () => {
    expect(birthLedger.asOf).toBe(AGES_AS_OF);
    expect(birthLedger.rows.length).toBe(109);
    const problems = birthLedger.rows.flatMap(birthRowProblems);
    expect(problems).toEqual([]);
    expect(birthLedger.rows.filter((r: any) => r.thin).map((r: any) => r.name)).toEqual([]);
    /* one man a row, and a publisher is one kind of publisher everywhere in the file */
    const keys = birthLedger.rows.map((r: any) => `${r.name}|${r.club}`);
    expect(new Set(keys).size).toBe(109);
    const kind = new Map<string, Set<string>>();
    for (const r of birthLedger.rows) for (const s of r.sources) kind.set(s.publisher, (kind.get(s.publisher) ?? new Set()).add(s.family));
    expect([...kind.entries()].filter(([, set]) => set.size !== 1).map(([p]) => p)).toEqual([]);
    /* the two rows Round 1102 left on two statistics sites each have a third publisher of another kind */
    /* (the publishers are read off the rows: scripts/simLiveScores.mjs lets a file under src name one
       statistics host only inside a cited url value, and this file is under src) */
    const sourcesOf = (name: string): any[] => birthLedger.rows.find((r: any) => r.name === name).sources;
    const kindsOf = (name: string) => sourcesOf(name).map(s => s.family);
    const closedBy = (name: string) => sourcesOf(name).filter(s => s.family !== 'stats').map(s => `${s.publisher} ${s.family}`);
    const publishersOf = (name: string) => new Set(sourcesOf(name).map(s => s.publisher)).size;
    expect(kindsOf('Mohamed Salah')).toEqual(['stats', 'stats', 'league']);
    expect(closedBy('Mohamed Salah')).toEqual(['bundesliga.com league']);
    expect(kindsOf('João Pedro')).toEqual(['stats', 'stats', 'club']);
    expect(closedBy('João Pedro')).toEqual(['chelseafc.com club']);
    expect([publishersOf('Mohamed Salah'), publishersOf('João Pedro')]).toEqual([3, 3]);
    /* and the four men Round 1102 left on ONE publisher each have a row now: a club or competition
       page and a statistics page, both opened on 2026-10-10 */
    const four = ['Willian José', 'Saúl Ñíguez', 'Hulk', 'Stefan Savic'].map(name => {
      const row = birthLedger.rows.find((r: any) => r.name === name);
      return [name, row?.club, row?.born, kindsOf(name).join(' and '), row?.sources.every((s: any) => s.readOn === '2026-10-10')];
    });
    expect(four).toEqual([
      ['Willian José', 'Bahia', '1991-11-23', 'club and stats', true],
      ['Saúl Ñíguez', 'Flamengo', '1994-11-21', 'club and stats', true],
      ['Hulk', 'Fluminense', '1986-07-25', 'club and stats', true],
      ['Stefan Savic', 'Trabzonspor', '1991-01-08', 'competition and stats', true],
    ]);
  });

  it('every bulk table row holds the age on 1 January of its year, which is what the rule stands on', () => {
    let bulk = 0;
    let written = 0;
    const off: string[] = [];
    for (const r of birthLedger.rows) {
      const table = tableAugustAge({ name: r.name, ...r.table });
      if (table.basis === 'written') { written += 1; continue; }
      bulk += 1;
      const onNewYear = ageOn(r.born, `${r.table.year}-01-01`);
      if (onNewYear !== r.table.age) off.push(`${r.name}: the table says ${r.table.age} in ${r.table.year}, his date gives ${onNewYear}`);
      /* so the moved rule is never more than a year over, and never under */
      const exact = ageOn(r.born, AGES_AS_OF);
      if (table.age !== exact && table.age !== exact + 1) off.push(`${r.name}: moved to ${table.age}, exact ${exact}`);
    }
    expect(off).toEqual([]);
    expect([bulk, written]).toEqual([82, 27]);
  });

  it('the three ledgers join with no two dates for one man, and every ledger man is in his squad once', () => {
    const births = realBirths();
    expect(births.size).toBe(525);
    const lost: string[] = [];
    for (const r of birthLedger.rows) {
      const rows = (CM_ROSTERS[r.club] ?? []).filter(p => p.n === r.name);
      if (rows.length !== 1) { lost.push(`${r.name} at ${r.club}: ${rows.length} rows`); continue; }
      const got = augustAge2026({ name: r.name, club: r.club, ...r.table }, births);
      if (got.basis !== 'born' || got.born !== r.born || got.age !== ageOn(r.born, AGES_AS_OF)) lost.push(`${r.name}: ${JSON.stringify(got)}`);
    }
    expect(lost).toEqual([]);
  });
});

/* The basis file: one line a club, one entry a man in squad order,
   [table age, table year, table id, basis, (the birth date for born), value rating].
   A RED HERE AFTER A SQUADS CHANGE IS NOT A DEFECT OF THE ROUND THAT MADE IT. Until the bake owns
   the basis file, a round that moves, adds, drops or re-orders a 2026 squad man, or adds a birth
   date to a ledger, runs
     node scripts/genCmAgesBasis2026.mjs --from <the commit before the change> --write
   commits scripts/data/cmAgesBasis2026.json, and sets the three counts below to what the script
   prints. A man new to the squads file needs his table row passed with --rows (the script says so). */
describe('what every 2026 age will stand on (the basis file), man for man against the squads main ships', () => {
  const stocked = Object.entries(CM_ROSTERS).filter(([, list]) => list.length > 0);

  it('holds exactly the men of the squads file, in its order', () => {
    expect(agesBasis.asOf).toBe(AGES_AS_OF);
    expect(Object.keys(agesBasis.clubs)).toEqual(stocked.map(([club]) => club));
    expect(stocked.length).toBe(384);
    const uneven = stocked.filter(([club, list]) => agesBasis.clubs[club].length !== list.length).map(([club]) => club);
    expect(uneven).toEqual([]);
    const men = stocked.reduce((sum, [, list]) => sum + list.length, 0);
    expect([agesBasis.players, men, CM_ROSTER_META.players]).toEqual([4401, 4401, 4401]);
  });

  it('every line is what the ages rule resolves from the committed ledgers, and its last item is the value rating', () => {
    /* While the squads file is on curve 1 its rating IS the value rating. The round that re-rates the
       file changes this one comparison to the level (levelFrom of the shipped rating and age). */
    expect((CM_ROSTER_META as any).curve ?? 1).toBe(1);
    const births = realBirths();
    const wrong: string[] = [];
    const basisCount: Record<string, number> = {};
    const againstShipped: Record<string, number> = {};
    const swing: Record<string, number> = {};
    let changed = 0;
    for (const [club, list] of stocked) {
      list.forEach((row, i) => {
        const entry: any[] = agesBasis.clubs[club][i];
        const [age, year, id, basis] = entry;
        const born = basis === 'born' ? entry[4] : undefined;
        if (entry.length !== (basis === 'born' ? 6 : 5)) wrong.push(`${row.n} at ${club}: ${entry.length} items for a ${basis} line`);
        const got = augustAge2026({ name: row.n, club, age, year, id }, births);
        if (got.basis !== basis || got.born !== born) wrong.push(`${row.n} at ${club}: the file says ${basis} ${born ?? ''}, the rule says ${got.basis} ${got.born ?? ''}`);
        if (basis === 'unknown') wrong.push(`${row.n} at ${club}: a man with no table row may not ship`);
        if (entry[entry.length - 1] !== row.r) wrong.push(`${row.n} at ${club}: value rating ${entry[entry.length - 1]}, the squads file ${row.r}`);
        basisCount[basis] = (basisCount[basis] ?? 0) + 1;
        const step = String(got.age - row.a);
        againstShipped[step] = (againstShipped[step] ?? 0) + 1;
        /* and the whole chain runs for him: the value rating, his August age and his position rate */
        const shown = rateFrom(row.r, got.age, row.p);
        const move = shown - row.r;
        swing[String(move)] = (swing[String(move)] ?? 0) + 1;
        if (move !== 0) changed += 1;
        if (move < -6 || move > 8) wrong.push(`${row.n} at ${club}: ${row.r} would become ${shown}`);
      });
    }
    expect(wrong).toEqual([]);
    /* These restate the value table as the lead pulled it (2026-10-07): how each age is known, and
       how far the August age sits from the age main ships today. A new pull recounts them, and
       scripts/genCmAgesBasis2026.mjs prints all three. */
    expect(basisCount).toEqual({ born: 427, moved: 3974 });
    expect(againstShipped).toEqual({ '1': 4221, '0': 176, '-1': 4 });
    expect(changed).toBe(2078);
    console.log(`2026 at the flip: ${changed} of 4401 ratings change; by points ${JSON.stringify(swing)}`);
  });

  it('the eight 2026 men of the brief table come out of the files alone: squads file, basis, ages rule, age read', () => {
    const births = realBirths();
    const got: [string, number, number, number][] = [];
    for (const [world, name, fileAge, ratedAt, mainShows, shown] of BRIEF_TABLE) {
      if (world !== 'now') continue;
      const [club, list] = stocked.find(([, l]) => l.some(p => p.n === name))!;
      const i = list.findIndex(p => p.n === name);
      const [age, year, id] = agesBasis.clubs[club][i];
      const august = augustAge2026({ name, club, age, year, id }, births);
      expect([name, august.basis]).toEqual([name, 'born']);
      got.push([name, august.age, list[i].r, rateFrom(list[i].r, august.age, list[i].p)]);
      expect([name, list[i].a, august.age, list[i].r, rateFrom(list[i].r, august.age, list[i].p)]).toEqual([name, fileAge, ratedAt, mainShows, shown]);
    }
    expect(got.length).toBe(8);
  });
});

/* The folded final tables. A table is one fact, so the rule is a league: two different publishers
   printed the whole table and neither is a wiki, or the league is marked thin and a reader skips it. */
const ROLES = ['table', 'results', 'detail'];
const CROWD = /wiki|fandom|thesportsdb/i;
const publisherSite = (url: string) => new URL(url).hostname.replace(/^(www|us|site\.api|en|sport|sports)\./, '');
const leagueProblems = (id: string, league: any): string[] => {
  const out: string[] = [];
  const tableSites = new Set<string>();
  for (const s of league.sources ?? []) {
    if (!ROLES.includes(s.role)) out.push(`${id}: ${s.publisher} has the role ${s.role}`);
    if (!/^https:\/\//.test(String(s.url))) out.push(`${id}: ${s.publisher} has no https url`);
    if (!ISO_DAY.test(String(s.readOn))) out.push(`${id}: ${s.publisher} has no day it was read`);
    if (s.role === 'table') {
      if (CROWD.test(`${s.publisher} ${s.url}`)) out.push(`${id}: ${s.publisher} is a wiki or a crowd database and may not stand as a table publisher`);
      else tableSites.add(publisherSite(s.url));
    }
  }
  if (league.thin) {
    if (typeof league.thin !== 'string' || league.thin.length < 12) out.push(`${id}: thin has to say why`);
  } else if (tableSites.size < 2) out.push(`${id}: ${tableSites.size} table publisher(s), the rule is two`);
  const rows: any[] = league.rows ?? [];
  rows.forEach((r, i) => {
    if (r.pos !== i + 1) out.push(`${id}: row ${i + 1} is numbered ${r.pos}`);
    if (!Number.isInteger(r.played) || !Number.isInteger(r.points) || r.played < 1) out.push(`${id} ${r.pos}: played ${r.played}, points ${r.points}`);
    if (typeof r.source !== 'string' || !r.source) out.push(`${id} ${r.pos}: no publisher spelling`);
    if (r.club !== null && typeof r.club !== 'string') out.push(`${id} ${r.pos}: club is neither a game club nor null`);
  });
  const clubs = rows.filter(r => r.club).map(r => r.club);
  if (new Set(clubs).size !== clubs.length) out.push(`${id}: one game club on two rows`);
  if (clubs.length !== league.clubsInBothSeasons) out.push(`${id}: ${clubs.length} rows carry a game club, clubsInBothSeasons says ${league.clubsInBothSeasons}`);
  const away = rows.filter(r => !r.club).map(r => r.source).sort();
  if (JSON.stringify(away) !== JSON.stringify([...(league.notInTheGameLeague ?? [])].sort())) out.push(`${id}: notInTheGameLeague is not the rows without a game club`);
  return out;
};

/** What a spot checked line says: "Coventry City 95", "Schalke 04 70", "Volos NFC 17 (last of the
 *  Europe play-offs)". The points are the last number before a bracketed remark. */
const printedRow = (text: string): { club: string; points: number } | null => {
  const m = /^(.*?)[,\s]+(\d+)$/.exec(String(text).replace(/\s*\(.*\)\s*$/, ''));
  return m ? { club: m[1], points: Number(m[2]) } : null;
};
/** A club name as its words: accents folded (the combining marks dropped by code point), lower case. */
const wordsOf = (name: string) => new Set(
  [...String(name).normalize('NFD')].filter(ch => ch.charCodeAt(0) < 0x300 || ch.charCodeAt(0) > 0x36f).join('')
    .toLowerCase().split(/[^a-z0-9]+/).filter(Boolean),
);
const allIn = (a: Set<string>, b: Set<string>) => a.size > 0 && [...a].every(word => b.has(word));
const namesOf = (row: any): string[] => [row.source, row.club].filter(Boolean);
const fitsClub = (printed: string, row: any) => namesOf(row).some(name => allIn(wordsOf(printed), wordsOf(name)) || allIn(wordsOf(name), wordsOf(printed)));
const sameWords = (printed: string, row: any) => namesOf(row).some(name => allIn(wordsOf(printed), wordsOf(name)) && allIn(wordsOf(name), wordsOf(printed)));

describe('the folded final tables: two table publishers a league, neither a wiki', () => {
  const leagues: [string, any][] = Object.entries(finalTables.leagues);

  it('the checker itself fires: one table publisher, a wiki as the second, a thin league with no reason', () => {
    const row = (pos: number, club: string | null, source: string) => ({ pos, club, source, played: 2, points: 3 - pos });
    const good = {
      sources: [
        { url: 'https://www.espn.com/t', publisher: 'ESPN', role: 'table', readOn: '2026-10-07' },
        { url: 'https://rsssf.org/t', publisher: 'RSSSF', role: 'table', readOn: '2026-10-07' },
        { url: 'https://www.example.org/n', publisher: 'A report, one note', role: 'detail', readOn: '2026-10-07' },
      ],
      clubsInBothSeasons: 1, notInTheGameLeague: ['Gone FC'],
      rows: [row(1, 'Everton', 'Everton FC'), row(2, null, 'Gone FC')],
    };
    expect(leagueProblems('x', good)).toEqual([]);
    const one = { ...good, sources: [good.sources[0], good.sources[2]] };
    expect(leagueProblems('x', one).join(' | ')).toMatch(/1 table publisher\(s\), the rule is two/);
    /* the same publisher twice is one publisher */
    expect(leagueProblems('x', { ...good, sources: [good.sources[0], { ...good.sources[0], url: 'https://www.espn.com/other' }] }).join(' | ')).toMatch(/1 table publisher/);
    expect(leagueProblems('x', { ...one, thin: 'only one publisher printed the whole table' })).toEqual([]);
    expect(leagueProblems('x', { ...one, thin: true }).join(' | ')).toMatch(/thin has to say why/);
    const wiki = { ...good, sources: [good.sources[0], { ...good.sources[1], url: 'https://en.wikipedia.org/wiki/T', publisher: 'Wikipedia' }] };
    expect(leagueProblems('x', wiki).join(' | ')).toMatch(/is a wiki or a crowd database/);
    expect(leagueProblems('x', { ...good, rows: [row(1, 'Everton', 'Everton FC'), row(3, null, 'Gone FC')] }).join(' | ')).toMatch(/row 2 is numbered 3/);
    expect(leagueProblems('x', { ...good, clubsInBothSeasons: 2 }).join(' | ')).toMatch(/clubsInBothSeasons says 2/);
  });

  it('all 27 leagues meet the rule, none is thin, and every game club named is a club of the game', () => {
    expect(leagues.length).toBe(27);
    expect(leagues.flatMap(([id, league]) => leagueProblems(id, league))).toEqual([]);
    expect(leagues.filter(([, league]) => league.thin).map(([id]) => id)).toEqual([]);
    const gameClubs = new Set([...Object.keys(CM_ROSTERS), ...Object.keys(CM_ALEAGUE_ROSTERS), ...Object.keys(CM_RUSSIA_ROSTERS)]);
    const strangers = leagues.flatMap(([id, league]) => league.rows.filter((r: any) => r.club && !gameClubs.has(r.club)).map((r: any) => `${id}: ${r.club}`));
    expect(strangers).toEqual([]);
    const roles: Record<string, number> = {};
    for (const [, league] of leagues) for (const s of league.sources) roles[s.role] = (roles[s.role] ?? 0) + 1;
    expect(roles).toEqual({ table: 96, results: 5, detail: 35 });
    /* a page that prints only one half of a split table is a detail, however good it is */
    const half = finalTables.leagues.switzerland.sources.find((s: any) => /plattformj/.test(s.url));
    expect(half.role).toBe('detail');
  });

  it('agrees place for place with the final tables the game already ships (Round 612, a separate research run)', () => {
    const shipped: [string, { table: string[] }][] = Object.entries(CM_FINAL_TABLES_2025_26.leagues);
    let places = 0;
    const apart: string[] = [];
    for (const [id, { table }] of shipped) {
      const league = finalTables.leagues[id];
      if (!league) { apart.push(`${id}: not folded`); continue; }
      table.forEach((club, i) => {
        places += 1;
        if (league.rows[i]?.club !== club) apart.push(`${id} ${i + 1}: the game ships ${club}, the fold has ${league.rows[i]?.club} (${league.rows[i]?.source})`);
      });
    }
    expect(apart).toEqual([]);
    expect([shipped.length, places]).toEqual([15, 145]);
  });

  /* The comparison above reaches 145 places, the top of 15 leagues. The two tests below hold all 27
     leagues to the bottom row, from the file's own second witnesses: the order a table has to be in,
     and the three rows of each league a checker read off a page on the day of the fold. */
  it('points never rise down a table, except where a split league starts a new group', () => {
    /* A final table runs in points order, so two rows that changed places show as a rise. Four
       leagues stack two or three group tables and restart at the first place of a group; each place
       is typed from the league's own format line. (The Scottish and Swiss splits lock places 1 to 6
       as well, and their format lines say no bottom half club passed a top half club this season.) */
    const GROUP_STARTS = { austria: [7], proleague: [7, 13], denmark: [7], greece: [9] };
    const rises: Record<string, number[]> = {};
    let rows = 0;
    for (const [id, league] of leagues) {
      rows += league.rows.length;
      const at = league.rows.filter((r: any, i: number) => i > 0 && r.points > league.rows[i - 1].points).map((r: any) => r.pos);
      if (at.length) rises[id] = at;
    }
    expect(rises).toEqual(GROUP_STARTS);
    expect(rows).toBe(456);
    for (const [id, starts] of Object.entries(GROUP_STARTS)) {
      for (const place of starts) expect([id, place, finalTables.leagues[id].format.includes(`${place} to `)]).toEqual([id, place, true]);
    }
  });

  it('each league still says what its spot checked page printed: the first row, a middle row and the last, club and points', () => {
    /* the checker itself: the points are the last number before a bracketed remark, and a club fits a
       row when one name's words are all in the other's (a publisher adds or drops FC, SC and the like) */
    expect(printedRow('Schalke 04 70')).toEqual({ club: 'Schalke 04', points: 70 });
    expect(printedRow('Panserraikos FC, 29 (last of the relegation group)')).toEqual({ club: 'Panserraikos FC', points: 29 });
    expect(printedRow('no points here')).toBe(null);
    expect(fitsClub('SC Amiens', { source: 'Amiens SC', club: null })).toBe(true);
    expect(fitsClub('Sheffield United', { source: 'Sheffield Wednesday', club: 'Sheffield Wednesday' })).toBe(false);
    expect(fitsClub('Arsenal', { source: 'Manchester City', club: 'Manchester City' })).toBe(false);
    const wrong: string[] = [];
    let read = 0;
    for (const [id, league] of leagues) {
      const spot = league.spotChecked;
      const whole = spot && spot.rows?.length === 3 && spot.printed?.length === 3 && ISO_DAY.test(String(spot.on)) && /^https:\/\//.test(String(spot.url));
      if (!whole) { wrong.push(`${id}: no whole spot check`); continue; }
      if (spot.rows[0] !== 1 || spot.rows[2] !== league.rows.length) wrong.push(`${id}: the spot check does not read the first and the last row`);
      spot.rows.forEach((pos: number, k: number) => {
        read += 1;
        const row = league.rows[pos - 1];
        const said = printedRow(spot.printed[k]);
        if (!row || !said) { wrong.push(`${id} ${pos}: no row, or the printed text has no points`); return; }
        if (said.points !== row.points) wrong.push(`${id} ${pos}: the page printed ${said.points} points for ${said.club}, the row holds ${row.points}`);
        /* his own row, and where the words fit a second row too (Dundee United and Dundee) the exact one */
        const fits = league.rows.filter((r: any) => fitsClub(said.club, r));
        if (!fits.includes(row) || (fits.length > 1 && !sameWords(said.club, row))) wrong.push(`${id} ${pos}: the page printed ${said.club}, the row holds ${row.source}`);
      });
    }
    expect(wrong).toEqual([]);
    expect(read).toBe(81);
  });
});

/* THE TYPED DOOR, src/lib/cmAgeRead.ts: what the engine will import. It must be the script's own
   functions (one implementation for the bake and the engine), typed, and imported by nothing yet. */
const IMPORTS_THE_AGE_READ = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)['"][^'"\n]*(?:cmAgeRead|scripts\/lib\/cmValueCurve|scripts\/lib\/cmAges)(?:\.[a-z]+)?['"]/m;
const sourceFilesUnder = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return sourceFilesUnder(full);
  return /\.(ts|tsx|mts|js|jsx|mjs)$/.test(entry.name) ? [full] : [];
});

describe('the typed door the engine will import (src/lib/cmAgeRead.ts)', () => {
  it('is the script library itself, not a second implementation', () => {
    expect(door.agePoints).toBe(agePoints);
    expect(door.ageRead).toBe(ageRead);
    expect(door.levelFrom).toBe(levelFrom);
    expect(door.readInWorld).toBe(readInWorld);
    expect([door.RATING_FLOOR, door.RATING_CEIL, door.LEVEL_MAX, door.CM_AGE_CURVE, door.ERA_RATING_AGE_SHIFT]).toEqual([48, 94, 99, 2, 1]);
    expect(Object.keys(door).sort()).toEqual(['CM_AGE_CURVE', 'ERA_RATING_AGE_SHIFT', 'LEVEL_MAX', 'RATING_CEIL', 'RATING_FLOOR', 'agePoints', 'ageRead', 'levelFrom', 'readInWorld']);
  });

  it('reads a man through its types the way the engine will', () => {
    const season2010: AgeWorld = { stretch: r => eraUpliftRating('era2010', r), top: 97, ageShift: door.ERA_RATING_AGE_SHIFT };
    const messi: AgeReading = door.readInWorld(90, 22, season2010);
    expect(messi).toEqual({ level: 97, age: 23, rating: 97 });
    const vanDijk: number = door.ageRead(80, 35);
    const kayodeLevel: number = door.levelFrom(82, 22);
    const youth: number = door.agePoints(84, 22, door.RATING_CEIL);
    expect([vanDijk, kayodeLevel, youth]).toEqual([85, 84, -2]);
    /* a past season row the way part two will write it: the shown rating beside the level it stands on */
    const nedved = door.readInWorld(82, 32, { stretch: r => eraUpliftRating('era2005', r), top: 96, ageShift: 1 });
    expect({ r: nedved.rating, l: nedved.level }).toEqual({ r: 88, l: 85 });
    expect(door.levelFrom(nedved.rating, nedved.age, 96)).toBe(nedved.level);
  });

  it('nothing shipped imports it, or either script library, yet (part two deletes this test with its first import)', () => {
    /* the shape fires on an import and stays quiet on prose about the file */
    expect(IMPORTS_THE_AGE_READ.test("import { ageRead } from '@/lib/cmAgeRead';")).toBe(true);
    expect(IMPORTS_THE_AGE_READ.test("import { ageRead } from './cmAgeRead';")).toBe(true);
    expect(IMPORTS_THE_AGE_READ.test("const m = await import('../../scripts/lib/cmValueCurve.mjs');")).toBe(true);
    expect(IMPORTS_THE_AGE_READ.test("import '../../scripts/lib/cmAges.mjs';")).toBe(true);
    expect(IMPORTS_THE_AGE_READ.test('// rated on the curve (scripts/lib/cmValueCurve.mjs). 310 players')).toBe(false);
    expect(IMPORTS_THE_AGE_READ.test(' * the typed door is src/lib/cmAgeRead.ts')).toBe(false);
    const root = path.resolve(process.cwd(), 'src');
    const files = sourceFilesUnder(root);
    expect(files.length).toBeGreaterThan(1500);
    const allowed = new Set(['lib/cmAgeRead.ts', 'test/cmValueCurve.test.ts']);
    const importers = files
      .map(file => path.relative(root, file).split(path.sep).join('/'))
      .filter(rel => !allowed.has(rel))
      .filter(rel => IMPORTS_THE_AGE_READ.test(fs.readFileSync(path.join(root, rel), 'utf8')));
    expect(importers).toEqual([]);
    /* and the door itself imports the two script libraries and nothing else */
    const doorSource = fs.readFileSync(path.join(root, 'lib/cmAgeRead.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const doorImports = [...doorSource.matchAll(/from\s+'([^']+)'/g)].map(m => m[1]);
    expect(doorImports).toEqual(['../../scripts/lib/cmValueCurve.mjs', '../../scripts/lib/cmAges.mjs']);
  });
});
