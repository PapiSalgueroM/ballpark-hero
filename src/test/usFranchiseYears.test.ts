/**
 * Round 1104: the franchise ledger as data. Nothing in the game reads it yet,
 * so this file is the whole of its contract: the rows are well formed, the
 * resolver answers from either id of a franchise, and every id it names is a
 * club id the NFL engine really uses.
 */
import { describe, it, expect } from 'vitest';
import { US_FRANCHISE_YEARS, franchiseAt, franchiseLabel, sameFranchise, type UsFranchiseLeague } from '@/data/usFranchiseYears';
import { NFL_ERAS } from '@/lib/nflMyCareer';

const LEAGUES: UsFranchiseLeague[] = ['nfl', 'nba', 'mlb', 'nhl'];

describe('Round 1104: the franchise ledger', () => {
  it('every franchise has ordered spans that meet with no gap and no overlap, and only its last span is open', () => {
    let franchises = 0;
    for (const league of LEAGUES) {
      const by = new Map<string, typeof US_FRANCHISE_YEARS.nfl[number][]>();
      for (const r of US_FRANCHISE_YEARS[league]) by.set(r.franchise, [...(by.get(r.franchise) ?? []), r]);
      for (const [name, rows] of by) {
        franchises += 1;
        rows.forEach((r, i) => {
          const last = i === rows.length - 1;
          expect(r.to === undefined, `${name} ${r.id}: only the last span is open`).toBe(last);
          if (r.to !== undefined) expect(r.to, `${name} ${r.id}: from before to`).toBeGreaterThanOrEqual(r.from);
          if (!last) expect(rows[i + 1].from, `${name}: ${r.id} hands over the next season`).toBe((r.to as number) + 1);
        });
        expect(new Set(rows.map(r => r.id)).size, `${name}: one id a span`).toBe(rows.length);
      }
      const ids = US_FRANCHISE_YEARS[league].map(r => r.id);
      expect(new Set(ids).size, `${league}: an id belongs to one span of one franchise`).toBe(ids.length);
    }
    expect(franchises).toBe(4);
  });

  it('answers from either id of a franchise, and null for a club with no row', () => {
    expect(franchiseAt('nfl', 'STL', 2016)?.id).toBe('LA');
    expect(franchiseAt('nfl', 'LA', 2010)?.id).toBe('STL');
    expect(franchiseAt('nfl', 'STL', 2015)?.id).toBe('STL');
    expect(franchiseAt('nfl', 'SD', 2017)?.id).toBe('LAC');
    expect(franchiseAt('nfl', 'LAC', 2016)?.id).toBe('SD');
    expect(franchiseAt('nfl', 'OAK', 2019)?.id).toBe('OAK');
    expect(franchiseAt('nfl', 'OAK', 2020)?.id).toBe('LV');
    expect(franchiseAt('nfl', 'WSH', 2022)?.id).toBe('WAS');
    expect(franchiseAt('nfl', 'WAS', 2021)?.id).toBe('WSH');
    expect(franchiseAt('nfl', 'DAL', 2016)).toBeNull();
    /* Before the first season the game can reach, nothing is claimed. */
    expect(franchiseAt('nfl', 'STL', 2004)).toBeNull();
    /* The other three leagues are not verified yet. */
    expect(franchiseAt('nba', 'SEA', 2008)).toBeNull();
    expect(franchiseAt('mlb', 'MON', 2005)).toBeNull();
    expect(franchiseAt('nhl', 'ATL', 2011)).toBeNull();
  });

  it('writes a club by city and nickname, or by the city alone when the row has none', () => {
    expect(franchiseLabel(franchiseAt('nfl', 'STL', 2016)!)).toBe('Los Angeles Rams');
    expect(franchiseLabel(franchiseAt('nfl', 'LV', 2019)!)).toBe('Oakland Raiders');
    expect(franchiseLabel(franchiseAt('nfl', 'WAS', 2010)!)).toBe('Washington');
    expect(franchiseLabel(franchiseAt('nfl', 'WSH', 2024)!)).toBe('Washington Commanders');
  });

  it('knows two ids of one franchise are one club, and two clubs in one city are not', () => {
    expect(sameFranchise('nfl', 'STL', 'LA')).toBe(true);
    expect(sameFranchise('nfl', 'LA', 'STL')).toBe(true);
    expect(sameFranchise('nfl', 'WSH', 'WAS')).toBe(true);
    expect(sameFranchise('nfl', 'DAL', 'DAL')).toBe(true);
    expect(sameFranchise('nfl', 'LA', 'LAC')).toBe(false);
    expect(sameFranchise('nfl', 'DAL', 'NYG')).toBe(false);
    expect(sameFranchise('nfl', 'STL', 'SD')).toBe(false);
  });

  it('names only club ids the NFL engine uses, with the label the engine prints for that id', () => {
    const labels = new Map<string, string>();
    for (const era of NFL_ERAS) for (const t of era.teams) labels.set(t.abbr, t.label);
    expect(labels.size).toBeGreaterThanOrEqual(36);
    for (const r of US_FRANCHISE_YEARS.nfl) {
      expect(labels.has(r.id), `${r.id} is an engine club id`).toBe(true);
      expect(franchiseLabel(r), `${r.id} reads as the engine prints it`).toBe(labels.get(r.id));
    }
  });
});
