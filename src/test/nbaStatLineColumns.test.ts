/**
 * Round 1103: what an NBA season prints, before and after the new line.
 *
 * A season saved before Round 1103 recorded three averages, points as a whole
 * number. It prints exactly what it always printed. A season on the new line
 * also records minutes, steals and blocks, and prints every average to one
 * decimal. nbaStatLine stays three parts (the hub's Career Log tile cuts a
 * longer line off); nbaStatLineFull is the six part line for a row with room.
 *
 * src/test/usCareerStatLines.test.tsx holds the wider rules for all four sports
 * and is pinned by hash, so the new assertions live here.
 */
import { describe, it, expect } from 'vitest';
import { isNbaNewLine, nbaLegacyOf, type NbaCareerState, type NbaSeasonLine } from '@/lib/nbaMyCareer';
import { nbaStatLine, nbaStatLineFull, SUSPENDED_STAT_LINE } from '@/lib/usCareerStatLine';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const fixture = JSON.parse(readFileSync(path.resolve(__dirname, 'fixtures/nbaOldSaves1103.json'), 'utf8')) as { entries: { save: NbaCareerState }[] };

const OLD: NbaSeasonLine = { year: 2026, team: 'BOS', age: 24, ovr: 84, games: 80, ppg: 24, rpg: 7.5, apg: 7.6, awards: [], teamResult: 'Lost in the first round', salary: 20 };
const NEW: NbaSeasonLine = { ...OLD, ppg: 17, rpg: 5.1, apg: 3.2, mpg: 31.4, spg: 1.1, bpg: 0.6 };
const SUSPENDED: NbaSeasonLine = { year: 2027, team: 'BOS', age: 25, ovr: 84, games: 0, ppg: 0, rpg: 0, apg: 0, awards: [], teamResult: 'SUSPENDED', salary: 0 };
const FORBIDDEN = /\b(threes?|blocks?|steals?)\b/i;

describe('Round 1103: the NBA season line, old and new', () => {
  it('a season saved before the round prints its three parts as saved', () => {
    expect(isNbaNewLine(OLD)).toBe(false);
    expect(nbaStatLine(OLD)).toBe('24 ppg, 7.5 rpg, 7.6 apg');
    expect(nbaStatLineFull(OLD)).toBe('24 ppg, 7.5 rpg, 7.6 apg');
  });

  it('a season on the new line prints every average to one decimal', () => {
    expect(isNbaNewLine(NEW)).toBe(true);
    expect(nbaStatLine(NEW)).toBe('17.0 ppg, 5.1 rpg, 3.2 apg');
    expect(nbaStatLineFull(NEW)).toBe('17.0 ppg, 5.1 rpg, 3.2 apg, 1.1 spg, 0.6 bpg, 31.4 mpg');
  });

  it('the line every consumer gets stays three parts, so the hub tile never cuts it off', () => {
    const wide: NbaSeasonLine = { ...NEW, ppg: 31.4, rpg: 12.6, apg: 10.9, mpg: 38.2, spg: 2.1, bpg: 3.4 };
    expect(nbaStatLine(wide)).toBe('31.4 ppg, 12.6 rpg, 10.9 apg');
    expect(nbaStatLine(wide).split(', ')).toHaveLength(3);
    /* The widest three part line a new season prints is two characters past the widest an old one could
       ("38 ppg" became "38.0 ppg"). The browser walk measures the tile itself; this holds the count. */
    expect(nbaStatLine(wide).length).toBeLessThanOrEqual('38 ppg, 15.9 rpg, 12.9 apg'.length + 2);
  });

  it('a whole number average on a new line still shows its decimal', () => {
    expect(nbaStatLineFull({ ...NEW, ppg: 20, rpg: 5, apg: 4, spg: 1, bpg: 0, mpg: 30 })).toBe('20.0 ppg, 5.0 rpg, 4.0 apg, 1.0 spg, 0.0 bpg, 30.0 mpg');
  });

  it('a suspended season prints the suspended sentence, whichever line asks', () => {
    expect(nbaStatLine(SUSPENDED)).toBe(SUSPENDED_STAT_LINE);
    expect(nbaStatLineFull(SUSPENDED)).toBe(SUSPENDED_STAT_LINE);
  });

  it('no NBA line or legacy bullet spells out steals, blocks or threes', () => {
    for (const s of [OLD, NEW, SUSPENDED]) {
      expect(nbaStatLine(s)).not.toMatch(FORBIDDEN);
      expect(nbaStatLineFull(s)).not.toMatch(FORBIDDEN);
    }
    const saves = fixture.entries.map(e => e.save);
    expect(saves.length).toBeGreaterThan(20);
    for (const c of saves) {
      for (const s of c.seasons) expect(nbaStatLineFull(s)).not.toMatch(FORBIDDEN);
      for (const b of nbaLegacyOf(c).bullets) expect(b).not.toMatch(FORBIDDEN);
    }
  });
});
