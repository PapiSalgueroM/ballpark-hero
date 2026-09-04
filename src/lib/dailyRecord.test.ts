/**
 * The one daily record reader fails closed on shape, not just on parse.
 *
 * Round 428. Eleven daily games are about to keep their finished daily in
 * localStorage through src/lib/dailyRecord.ts, and scripts/sweepSaves.mjs
 * will reload each of them with every key set to six kinds of wreckage.
 * The reader is the only place those forms are handled, so it gets the one
 * test instead of eleven: every wreckage form, a record from another day,
 * a record whose date disagrees with its key, and a record the caller's
 * validate rejects all read back as null; a good record round trips with
 * the version and the date stamped on it.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { dailyRecordKey, readDailyRecord, writeDailyRecord } from './dailyRecord';

const SLUG = 'probe-game';
const TODAY = '2026-09-04';
const YESTERDAY = '2026-09-03';

interface Probe { score: number; guesses: string[] }

const validate = (f: Record<string, unknown>): Probe | null => {
  if (typeof f.score !== 'number' || !Number.isFinite(f.score)) return null;
  if (!Array.isArray(f.guesses) || f.guesses.some(g => typeof g !== 'string')) return null;
  return { score: f.score, guesses: f.guesses as string[] };
};

/* The same six forms scripts/sweepSaves.mjs writes, in its order. */
const WRECKAGE: [string, string][] = [
  ['garbage', 'not json at all {'],
  ['truncated', '{"v":1,"cash":12'],
  ['hostileVersion', '{"v":999,"version":999}'],
  ['emptyObject', '{}'],
  ['bareNull', 'null'],
  ['emptyArray', '[]'],
];

describe('dailyRecord', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keys one record per game per day in the shape every daily key on the site uses', () => {
    expect(dailyRecordKey('guess-the-year', TODAY)).toBe('guess-the-year-daily-2026-09-04');
  });

  it('reads null for every wreckage form sweepSaves writes, without throwing', () => {
    for (const [name, form] of WRECKAGE) {
      localStorage.setItem(dailyRecordKey(SLUG, TODAY), form);
      let out: Probe | null | undefined;
      expect(() => { out = readDailyRecord(SLUG, TODAY, validate); }, name).not.toThrow();
      expect(out, name).toBeNull();
    }
  });

  it("reads null for yesterday's record, and for a record whose date disagrees with its key", () => {
    writeDailyRecord(SLUG, YESTERDAY, { score: 5, guesses: ['a'] });
    expect(readDailyRecord(SLUG, TODAY, validate)).toBeNull();
    expect(readDailyRecord(SLUG, YESTERDAY, validate)).toEqual({ score: 5, guesses: ['a'] });

    localStorage.setItem(dailyRecordKey(SLUG, TODAY), JSON.stringify({ v: 1, date: YESTERDAY, score: 5, guesses: [] }));
    expect(readDailyRecord(SLUG, TODAY, validate)).toBeNull();
  });

  it('reads null when the caller rejects the fields, so a bad field never reaches the page', () => {
    localStorage.setItem(dailyRecordKey(SLUG, TODAY), JSON.stringify({ v: 1, date: TODAY, score: 'NaN pts', guesses: [] }));
    expect(readDailyRecord(SLUG, TODAY, validate)).toBeNull();
    localStorage.setItem(dailyRecordKey(SLUG, TODAY), JSON.stringify({ v: 1, date: TODAY, score: 3, guesses: [7] }));
    expect(readDailyRecord(SLUG, TODAY, validate)).toBeNull();
  });

  it('round trips a good record with v 1 and the date stamped on it', () => {
    writeDailyRecord(SLUG, TODAY, { score: 42, guesses: ['x', 'y'] });
    const keys = Object.keys(localStorage).filter(k => k.startsWith(`${SLUG}-daily-`));
    expect(keys).toEqual([dailyRecordKey(SLUG, TODAY)]);
    const raw = JSON.parse(localStorage.getItem(keys[0])!);
    expect(raw.v).toBe(1);
    expect(raw.date).toBe(TODAY);
    expect(readDailyRecord(SLUG, TODAY, validate)).toEqual({ score: 42, guesses: ['x', 'y'] });
  });

  it('cannot be talked into another version or date by the caller', () => {
    writeDailyRecord(SLUG, TODAY, { v: 999, date: YESTERDAY, score: 1, guesses: [] });
    const raw = JSON.parse(localStorage.getItem(dailyRecordKey(SLUG, TODAY))!);
    expect(raw.v).toBe(1);
    expect(raw.date).toBe(TODAY);
    expect(readDailyRecord(SLUG, TODAY, validate)).toEqual({ score: 1, guesses: [] });
  });
});
