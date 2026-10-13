/**
 * Round 1318: the headline rule of Rounds 1280 to 1282, a made up Ballon d'Or
 * rival retires in the year he turns 37 and his slot gets a new face, held in
 * the whole unit suite (review-run-1318, mutation M5: rivals retiring at 38,
 * copy and reader changed together, passed every unit file and was caught
 * only by simSoccerAwardGenerations, which is in no gate list).
 *
 * One saved night, two of its saved primary rivals aged on purpose: one is 36
 * this year, so he turns 37 at the next night and must retire with a new face
 * in his slot; the other is 35, turns 36 and must stay. Both pools are valid
 * for the reader before and after.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import * as E from '@/lib/soccerCareerEngine';
import { copy, nextNight, poolNight, type Saved } from './helpers/ballonPoolDrive';

let night: Saved;
const lastYear = (s: Saved) => s.seasons.at(-1).year as number;

beforeAll(() => {
  night = nextNight(poolNight(1, true), 7).value;
});

describe('a made up rival retires in the year he turns 37', () => {
  it('the rival who turns 37 retires and gets a new face, the one who turns 36 stays', () => {
    const s = copy(night), pool = s.generatedBallonPool;
    const live = pool.entries.filter((e: Saved) => e.role === 'primary' && e.retiredYear === null);
    expect(live.length).toBeGreaterThanOrEqual(2);
    const [old, younger] = live;
    // Ages this year: 36 and 35 (entry age 28, made 8 and 7 years ago).
    old.entryAge = 28; old.firstYear = pool.year - 8;
    younger.entryAge = 28; younger.firstYear = pool.year - 7;
    expect(E.isGeneratedBallonPool(pool, lastYear(s))).toBe(true);

    const after = nextNight(s, 11).value, year = lastYear(after), next = after.generatedBallonPool;
    expect(year).toBe(pool.year + 1);
    expect(next.entries[old.id].retiredYear).toBe(year);
    expect(next.entries[younger.id].retiredYear).toBeNull();
    expect(next.entries[younger.id].entryAge + year - next.entries[younger.id].firstYear).toBe(36);
    const face = next.entries.find((e: Saved) => e.role === 'primary' && e.slot === old.slot && e.retiredYear === null);
    expect(face).toBeDefined();
    expect(face.id).toBeGreaterThanOrEqual(pool.nextId);
    expect(face.seed).toBe(9900 + face.id);
    expect(face.firstYear).toBe(year);
    expect(E.isGeneratedBallonPool(next, year)).toBe(true);
  });

  it('the reader refuses a live rival of 37 and a retirement written past the year he turned 37', () => {
    const s = copy(night), pool = s.generatedBallonPool;
    const [entry] = pool.entries.filter((e: Saved) => e.role === 'primary' && e.retiredYear === null);
    // 37 this year (entry age 28, made 9 years ago): he cannot still be live, he retired this year.
    entry.entryAge = 28; entry.firstYear = pool.year - 9;
    expect(E.isGeneratedBallonPool(pool, lastYear(s))).toBe(false);
    entry.retiredYear = pool.year;
    expect(E.isGeneratedBallonPool(pool, lastYear(s))).toBe(true);
    // 37 last year: a retirement written this year is past the year he turned 37.
    entry.firstYear = pool.year - 10;
    expect(E.isGeneratedBallonPool(pool, lastYear(s))).toBe(false);
    entry.retiredYear = pool.year - 1;
    expect(E.isGeneratedBallonPool(pool, lastYear(s))).toBe(true);
  });
});
