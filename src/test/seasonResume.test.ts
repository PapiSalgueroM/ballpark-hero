/* Round 1046: the resume record (src/lib/season/resume.ts). It is a per
   viewer convenience, so the rules are about never trusting it: only the
   exact shape is a record, storage that throws is no record, and a record
   belongs to a season only by that season's own key. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { asResume, readResume, resumeLabel, resumeRowIndex, resumeStorageKey, type SeasonResume } from '@/lib/season/resume';
import { clearResume, writeResume } from '@/components/season-centre/resumeStore';

const GOOD: SeasonResume = { key: 'Ada|Arsenal|2031|34|12|7|7.4|centre', year: 2031, md: 13, speed: 3, stable: false };

interface Row { club: string; year: number; type: string; apps: number; goals: number; assists: number; rating: number }
const keyOf = (name: string) => (r: Row) => `${name}|${r.club}|${r.year}|${r.apps}|${r.goals}|${r.assists}|${r.rating}|centre`;
const ROWS: Row[] = [
  { club: 'Lyon', year: 2029, type: 'playing', apps: 30, goals: 9, assists: 4, rating: 7.1 },
  { club: 'Arsenal', year: 2030, type: 'playing', apps: 0, goals: 0, assists: 0, rating: 0 },
  { club: 'Arsenal', year: 2031, type: 'playing', apps: 34, goals: 12, assists: 7, rating: 7.4 },
  { club: 'Arsenal', year: 2032, type: 'manager', apps: 0, goals: 0, assists: 0, rating: 0 },
];

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

describe('the resume record', () => {
  it('round trips through storage under the game\'s own key', () => {
    writeResume('soccer', GOOD);
    expect(localStorage.getItem('seasonCentre:v1:soccer')).toBe(JSON.stringify(GOOD));
    expect(readResume('soccer')).toEqual(GOOD);
    expect(readResume('nba')).toBeNull();
    clearResume('soccer');
    expect(readResume('soccer')).toBeNull();
    expect(resumeStorageKey('nba')).toBe('seasonCentre:v1:nba');
  });
  it('keeps two games apart', () => {
    writeResume('soccer', GOOD);
    writeResume('nba', { ...GOOD, key: 'other', md: 40 });
    expect(readResume('soccer')!.md).toBe(13);
    expect(readResume('nba')!.md).toBe(40);
  });
  it('accepts every speed and both answers for stable', () => {
    for (const speed of [1, 3, 'results'] as const) for (const stable of [true, false]) expect(asResume({ ...GOOD, speed, stable })).toEqual({ ...GOOD, speed, stable });
  });
  it('writes the five fields and nothing else', () => {
    writeResume('soccer', { ...GOOD, extra: 1, tag: 'abc' } as SeasonResume);
    expect(localStorage.getItem('seasonCentre:v1:soccer')).toBe(JSON.stringify(GOOD));
    expect(asResume({ ...GOOD, extra: 1 })).toMatchObject(GOOD);
  });
  const BAD: [string, unknown][] = [
    ['null', null], ['a string', 'x'], ['a number', 7], ['an array', [GOOD]], ['an empty object', {}],
    ['no key', { ...GOOD, key: undefined }], ['an empty key', { ...GOOD, key: '' }], ['a key of 201 characters', { ...GOOD, key: 'k'.repeat(201) }],
    ['a year as text', { ...GOOD, year: '2031' }], ['a year out of range', { ...GOOD, year: 1899 }], ['a year with a fraction', { ...GOOD, year: 2031.5 }],
    ['matchday 0', { ...GOOD, md: 0 }], ['matchday 401', { ...GOOD, md: 401 }], ['matchday 2.5', { ...GOOD, md: 2.5 }], ['a matchday of NaN', { ...GOOD, md: Number.NaN }],
    ['speed 2', { ...GOOD, speed: 2 }], ['speed as text', { ...GOOD, speed: '3' }],
    ['no stable', { ...GOOD, stable: undefined }], ['stable as a number', { ...GOOD, stable: 1 }],
  ];
  it.each(BAD)('is no record: %s', (_what, value) => {
    expect(asResume(value)).toBeNull();
    localStorage.setItem('seasonCentre:v1:soccer', JSON.stringify(value) ?? 'undefined');
    expect(readResume('soccer')).toBeNull();
  });
  it('is no record when the stored text is not JSON', () => {
    localStorage.setItem('seasonCentre:v1:soccer', '{not json');
    expect(readResume('soccer')).toBeNull();
  });
  it('never throws when storage does, on a read, a write or a clear', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('refused'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('refused'); });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('refused'); });
    expect(readResume('soccer')).toBeNull();
    expect(() => writeResume('soccer', GOOD)).not.toThrow();
    expect(() => clearResume('soccer')).not.toThrow();
  });
  it('prints the season and the NEXT round', () => {
    expect(resumeLabel(GOOD, '2031/32', 'matchday')).toBe('Resume 2031/32, matchday 14');
  });
});

describe('which season a record belongs to', () => {
  const stable = { ...GOOD, stable: true };
  it('finds its own row, and only a played season', () => {
    expect(resumeRowIndex(stable, ROWS, keyOf('Ada'))).toBe(2);
    expect(resumeRowIndex(null, ROWS, keyOf('Ada'))).toBe(-1);
    expect(resumeRowIndex({ ...stable, year: 2030, key: keyOf('Ada')(ROWS[1]) }, ROWS, keyOf('Ada'))).toBe(-1);
    expect(resumeRowIndex({ ...stable, year: 2032, key: keyOf('Ada')(ROWS[3]) }, ROWS, keyOf('Ada'))).toBe(-1);
  });
  it('moves off the row when any field of the key moves', () => {
    for (const change of [{ club: 'Spurs' }, { apps: 33 }, { goals: 13 }, { assists: 8 }, { rating: 7.5 }]) {
      const rows = ROWS.map((r, i) => (i === 2 ? { ...r, ...change } : r));
      expect(resumeRowIndex(stable, rows, keyOf('Ada')), JSON.stringify(change)).toBe(-1);
    }
    expect(resumeRowIndex(stable, ROWS, keyOf('Bea'))).toBe(-1);
    expect(resumeRowIndex({ ...stable, year: 2029 }, ROWS, keyOf('Ada'))).toBe(-1);
  });
  it('holds a season that is not stable to the one year the save can still show', () => {
    expect(resumeRowIndex(GOOD, ROWS, keyOf('Ada'))).toBe(-1);
    expect(resumeRowIndex(GOOD, ROWS, keyOf('Ada'), null)).toBe(-1);
    expect(resumeRowIndex(GOOD, ROWS, keyOf('Ada'), 2032)).toBe(-1);
    expect(resumeRowIndex(GOOD, ROWS, keyOf('Ada'), 2031)).toBe(2);
  });
});
