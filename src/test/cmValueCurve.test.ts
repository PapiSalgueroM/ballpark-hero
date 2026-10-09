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
  POS_MAP, RATING_FLOOR, RATING_CEIL, valueRatingOf, gbpM, EUR_USD_RATE, usdOfEur, FLOOR_USD,
  CURVE_VERSION, YOUTH_FROM, YOUTH_MAX, VETERAN_CAP, VETERAN_POINTS, ENGINE_POSITIONS,
  agePoints, rateFrom, ratingOf,
} from '../../scripts/lib/cmValueCurve.mjs';
import {
  AGES_AS_OF, HAND_WRITTEN_FROM_ID, ERA_RATING_AGE_SHIFT, ageOn, buildBirths, tableAugustAge, augustAge2026,
} from '../../scripts/lib/cmAges.mjs';

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
      const got = valueRatingOf(usd);
      if (got !== want) moved.push(`${usd}: ${want} became ${got}`);
    }
    expect(moved).toEqual([]);
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

/* The age points as LITERAL cases, typed out by hand from the round's table and never computed from
   the module: every age from 14 to 45 at seven value ratings. Reading across one row: five ages 14
   to 18, five 19 to 23, six 24 to 29, eight 30 to 37, eight 38 to 45. */
const AGES = Array.from({ length: 32 }, (_, i) => 14 + i);
const TABLE: Record<number, number[]> = {
  48: [48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 48, 49, 50, 50, 51, 52, 53, 54, 55, 56, 56, 56, 56, 56, 56, 56, 56],
  64: [58, 58, 58, 58, 58, 59, 60, 61, 62, 63, 64, 64, 64, 64, 64, 64, 65, 66, 66, 67, 68, 69, 70, 71, 72, 72, 72, 72, 72, 72, 72, 72],
  80: [74, 74, 74, 74, 74, 75, 76, 77, 78, 79, 80, 80, 80, 80, 80, 80, 81, 82, 82, 83, 84, 85, 86, 87, 88, 88, 88, 88, 88, 88, 88, 88],
  85: [81, 81, 81, 81, 81, 81, 81, 82, 83, 84, 85, 85, 85, 85, 85, 85, 86, 87, 87, 88, 89, 90, 91, 92, 93, 93, 93, 93, 93, 93, 93, 93],
  89: [87, 87, 87, 87, 87, 87, 87, 87, 87, 88, 89, 89, 89, 89, 89, 89, 90, 91, 91, 92, 93, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94],
  92: [91, 91, 91, 91, 91, 91, 91, 91, 91, 91, 92, 92, 92, 92, 92, 92, 93, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94],
  94: [94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94, 94],
};

describe('Club Manager rating: the value rating plus points for age (Round 1102)', () => {
  it('is on curve 2 and holds thirteen positions', () => {
    expect(CURVE_VERSION).toBe(2);
    expect(ENGINE_POSITIONS.size).toBe(13);
    expect([...ENGINE_POSITIONS].sort()).toEqual(['CAM', 'CB', 'CDM', 'CF', 'CM', 'GK', 'LB', 'LM', 'LW', 'RB', 'RM', 'RW', 'ST']);
    expect([YOUTH_FROM, YOUTH_MAX, VETERAN_CAP]).toEqual([24, 6, 8]);
    expect(VETERAN_POINTS).toEqual({ 30: 1, 31: 2, 32: 2, 33: 3, 34: 4, 35: 5, 36: 6, 37: 7 });
  });

  it('every age from 14 to 45 at seven value ratings is the table typed out by hand', () => {
    const wrong: string[] = [];
    let checked = 0;
    for (const [vr, row] of Object.entries(TABLE)) {
      expect(row.length).toBe(32);
      AGES.forEach((age, i) => {
        checked += 1;
        const got = rateFrom(Number(vr), age, 'CB');
        if (got !== row[i]) wrong.push(`value rating ${vr} at ${age}: wanted ${row[i]}, got ${got}`);
      });
    }
    expect(checked).toBe(224);
    expect(wrong).toEqual([]);
  });

  it('the age points alone: a point a year under 24, nothing to 29, one at 30 rising to eight', () => {
    expect([14, 18, 19, 20, 21, 22, 23].map(a => agePoints(70, a))).toEqual([-6, -6, -5, -4, -3, -2, -1]);
    expect([24, 25, 26, 27, 28, 29].map(a => agePoints(70, a))).toEqual([0, 0, 0, 0, 0, 0]);
    expect([30, 31, 32, 33, 34, 35, 36, 37, 38, 41, 45].map(a => agePoints(70, a))).toEqual([1, 2, 2, 3, 4, 5, 6, 7, 8, 8, 8]);
    /* the half distance limit: at 90 a boy gives two back, at 93 nothing, at the cap nothing */
    expect([agePoints(90, 17), agePoints(91, 17), agePoints(93, 17), agePoints(94, 17)]).toEqual([-2, -1, 0, 0]);
  });

  it('position is checked and changes nothing', () => {
    for (const pos of ENGINE_POSITIONS) {
      expect(rateFrom(80, 35, pos)).toBe(85);
      expect(rateFrom(84, 22, pos)).toBe(82);
    }
  });

  it('ratingOf is the value rating read with the age', () => {
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
    expect(() => ratingOf(5_000_000, 26)).toThrow(/position/);
    expect(() => ratingOf(5_000_000, undefined, 'CB')).toThrow(/age/);
  });
});

/* Ages for 1 August 2026 (scripts/lib/cmAges.mjs): the rule's four cases, its throws, and the
   namesake guard, on literal rows. */
describe('Club Manager ages for August 2026 (Round 1102)', () => {
  const births = buildBirths({
    ledgerRows: [
      { name: 'Sepp van den Berg', club: 'Brentford', born: '2001-12-20' },
      { name: 'Virgil van Dijk', club: 'Liverpool', born: '1991-07-08' },
      { name: 'Moved By Overlay', club: 'Chelsea', born: '2000-03-03' },
    ],
    round669: {
      write: [
        { name: 'Allan', club: 'SC Corinthians', fotmob: { born: '1997-03-03' } },
        { name: 'Table Club Man', club: 'Old Table FC', fotmob: { born: '1999-05-05' } },
        { name: 'Unmodelled Man', club: 'A Club The Game Lacks', fotmob: { born: '1990-01-01' } },
      ],
      existingChecked: [{ name: 'Leander Dendoncker', stored: { club: 'HNK Hajduk Split' }, fotmob: { born: '1995-04-15' } }],
      corrections: [{ name: 'Leander Dendoncker', field: 'age', fotmob: { born: '1995-04-15' } }],
    },
    missing: [{ name: 'Serge Gnabry', to: 'Bayern Munich', db: 'Bayern Munich', born: '1995-07-14' }],
    dbToEngine: { 'SC Corinthians': 'Corinthians', 'Old Table FC': 'Old Table', 'HNK Hajduk Split': 'Hajduk Split', 'Bayern Munich': 'Bayern Munich' },
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
    expect(HAND_WRITTEN_FROM_ID).toBe(170000);
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
    /* a date tied to a club the game does not model matches nobody */
    const loose = augustAge2026({ name: 'Unmodelled Man', club: 'Everton', tableClub: 'Everton', age: 35, year: 2026, id: 300 }, births);
    expect(loose.basis).toBe('moved');
    expect(loose.note).toMatch(/a club the game does not model/);
  });

  it('throws on a club matched date more than two years from the table, naming both ages', () => {
    expect(() => augustAge2026({ name: 'Allan', club: 'Corinthians', tableClub: 'Corinthians', age: 20, year: 2025, id: 120000 }, births))
      .toThrow(/Allan at Corinthians is 22 by his table row .* and 29 by the birth date 1997-03-03/);
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
  });
});
