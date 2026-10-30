import { describe, expect, it } from 'vitest';
/* Round 1601: the season archive's pure rules, each held by a case that fails if its line goes. */
import {
  PAST_KEPT, archiveCareerSeason, averageOf, pastOf, pastRowOf, readPast, readPastLines, rowIsHere, withSeasonRow,
  type ArchiveIn, type LineIn, type PastRow,
} from '@/lib/clubManagerCareerLines';

const man = (id: string, line: Partial<LineIn> = {}): LineIn => ({ id, seasonGoals: 0, seasonAssists: 0, ...line });

describe('pastRowOf', () => {
  it('is null for a man with no game', () => {
    expect(pastRowOf(man('a'), 3)).toBeNull();
    expect(pastRowOf(man('a', { apps: 0, seasonGoals: 2 }), 3)).toBeNull();
  });
  it('is exact for a man who played, rating times ten from a one decimal sum', () => {
    expect(pastRowOf(man('a', { apps: 34, seasonGoals: 12, seasonAssists: 7, cleanSheets: 0, ratingSum: 241.4 }), 2))
      .toEqual([2, 34, 12, 7, 0, 2414]);
    expect(pastRowOf(man('k', { apps: 3, cleanSheets: 2, ratingSum: 20.3 }), 1)).toEqual([1, 3, 0, 0, 2, 203]);
  });
});

describe('readPast', () => {
  it('drops nulls, holes, strings, short tuples, negatives, zero apps and falling seasons', () => {
    const raw = [
      [1, 3, 0, 0, 0, 200], null, [2, 1, 0, 0], 'x', [3, 2, -1, 0, 0, 10], [4, 0, 0, 0, 0, 0],
      [5, 2, 1, 0, 0, 140], [5, 9, 9, 9, 9, 99], [4, 9, 9, 9, 9, 99], [6, 1.5, 0, 0, 0, 7], [7, '2', 0, 0, 0, 7],
      // eslint-disable-next-line no-sparse-arrays
      [8, 1, , 0, 0, 7], [0, 1, 0, 0, 0, 7], [9, 1, 0, 0, 0, 7, 1],
    ];
    expect(readPast(raw)).toEqual([[1, 3, 0, 0, 0, 200], [5, 2, 1, 0, 0, 140]]);
    expect(readPast(undefined)).toEqual([]);
    expect(readPast({})).toEqual([]);
  });
  it('keeps the newest PAST_KEPT', () => {
    const rows = Array.from({ length: PAST_KEPT + 4 }, (_, i) => [i + 1, 1, 0, 0, 0, 60]);
    const kept = readPast(rows);
    expect(kept.length).toBe(PAST_KEPT);
    expect(kept[0][0]).toBe(5);
  });
  it('reads a JSON round trip as the same rows', () => {
    const rows: PastRow[] = [[1, 30, 4, 2, 0, 2100], [2, 12, 0, 1, 3, 800]];
    expect(readPast(JSON.parse(JSON.stringify(rows)))).toEqual(rows);
  });
});

describe('withSeasonRow', () => {
  it('replaces a row for the same season instead of adding a second', () => {
    const once = withSeasonRow([[1, 2, 0, 0, 0, 120]], [2, 5, 1, 0, 0, 330]);
    expect(withSeasonRow(once, [2, 5, 1, 0, 0, 330])).toEqual(once);
    expect(once).toEqual([[1, 2, 0, 0, 0, 120], [2, 5, 1, 0, 0, 330]]);
  });
  it('caps at PAST_KEPT, newest kept', () => {
    let rows: PastRow[] = [];
    for (let s = 1; s <= PAST_KEPT + 3; s++) rows = withSeasonRow(rows, [s, 1, 0, 0, 0, 60]);
    expect(rows.length).toBe(PAST_KEPT);
    expect(rows[rows.length - 1][0]).toBe(PAST_KEPT + 3);
  });
});

describe('archiveCareerSeason', () => {
  const save = (over: Partial<ArchiveIn> = {}): ArchiveIn => ({
    season: 1,
    squad: [man('a', { apps: 10, seasonGoals: 3, ratingSum: 70 }), man('b'), man('c', { apps: 2, ratingSum: 13.1 })],
    ...over,
  });
  it('writes a row for every man who played and none for a man who did not', () => {
    const s = save();
    archiveCareerSeason(s);
    expect(s.pastLines).toEqual([['a', [[1, 10, 3, 0, 0, 700]]], ['c', [[1, 2, 0, 0, 0, 131]]]]);
    expect(s.pastFrom).toBe(1);
  });
  it('leaves the key off when nobody played, and still marks pastFrom once', () => {
    const s = save({ squad: [man('b')] });
    archiveCareerSeason(s);
    expect('pastLines' in s).toBe(false);
    expect(s.pastFrom).toBe(1);
    s.season = 2;
    archiveCareerSeason(s);
    expect(s.pastFrom).toBe(1);
  });
  it('archives a man out on loan, and drops a man who left', () => {
    const s = save({
      season: 2,
      squad: [man('a', { apps: 5, ratingSum: 33 })],
      loanedOut: [{ player: man('l', { apps: 4, seasonAssists: 1, ratingSum: 26 }) }],
      pastLines: [['gone', [[1, 30, 9, 9, 0, 2100]]], ['a', [[1, 10, 3, 0, 0, 700]]]],
      pastFrom: 1,
    });
    archiveCareerSeason(s);
    expect(s.pastLines).toEqual([['a', [[1, 10, 3, 0, 0, 700], [2, 5, 0, 0, 0, 330]]], ['l', [[2, 4, 0, 1, 0, 260]]]]);
    expect(pastOf(s.pastLines, 'gone')).toEqual([]);
  });
  it('keeps a man re-signed before the season ended, under the same id, and loses one who came back later', () => {
    const s = save({ season: 3, squad: [man('r', { apps: 1, ratingSum: 6 })], pastLines: [['r', [[2, 8, 1, 0, 0, 520]]]] });
    archiveCareerSeason(s);
    expect(pastOf(s.pastLines, 'r')).toEqual([[2, 8, 1, 0, 0, 520], [3, 1, 0, 0, 0, 60]]);
    const away = save({ season: 3, squad: [man('x')], pastLines: [['r', [[2, 8, 1, 0, 0, 520]]]] });
    archiveCareerSeason(away);
    away.season = 4;
    away.squad = [man('r', { apps: 2, ratingSum: 12 })];
    archiveCareerSeason(away);
    expect(pastOf(away.pastLines, 'r')).toEqual([[4, 2, 0, 0, 0, 120]]);
  });
  it('after a job move, a namesake at the new club does not inherit the seasons the old club\'s man played', () => {
    const s = save({
      season: 3, clubName: 'B',
      history: [{ season: 1, club: 'A' }, { season: 2, club: 'A' }, { season: 3, club: 'B' }],
      squad: [man('p-silva', { apps: 6, ratingSum: 40 })],
      pastLines: [['p-silva', [[1, 30, 9, 2, 0, 2100], [2, 28, 7, 1, 0, 1900]]]],
      pastFrom: 1,
    });
    archiveCareerSeason(s);
    expect(pastOf(s.pastLines, 'p-silva')).toEqual([[3, 6, 0, 0, 0, 400]]);
    expect(rowIsHere(s, [1, 30, 9, 2, 0, 2100])).toBe(false);
    expect(rowIsHere(s, [3, 6, 0, 0, 0, 400])).toBe(true);
    /* No history for a season, or no club on the save: the row is kept, never guessed away. */
    expect(rowIsHere({ clubName: 'B', history: [] }, [1, 1, 0, 0, 0, 6])).toBe(true);
    expect(rowIsHere({}, [1, 1, 0, 0, 0, 6])).toBe(true);
  });
  it('is idempotent for a second call in the same season', () => {
    const s = save();
    archiveCareerSeason(s);
    const once = JSON.stringify(s);
    archiveCareerSeason(s);
    expect(JSON.stringify(s)).toBe(once);
  });
  it('reads a damaged list without throwing', () => {
    expect(readPastLines([['a', [[1, 1, 0, 0, 0, 6]]], ['a', [[2, 1, 0, 0, 0, 6]]], [5, []], 'x', ['b', 'y'], ['c', []]]))
      .toEqual([['a', [[1, 1, 0, 0, 0, 6]]]]);
  });
});

describe('averageOf', () => {
  it('is the sum over apps, null for no game', () => {
    expect(averageOf(34, 2414)).toBeCloseTo(7.1, 9);
    expect(averageOf(0, 0)).toBeNull();
  });
});
