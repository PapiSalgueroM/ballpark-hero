/* Round 1300: the guards of src/data/usPostseasonFormat.ts. The file states
   real facts, so the guards are about its SHAPE and its sourcing (a fact
   with one publisher behind it must not ship), about the one typed copy of
   the round lengths, and about what the accessor refuses. */
import { describe, expect, it } from 'vitest';
import {
  US_POSTSEASON, US_POSTSEASON_SOURCES, US_POSTSEASON_THIN, usPostseasonFormat, usPostseasonRounds,
  type UsPostseasonFact, type UsPostseasonWindow,
} from '@/data/usPostseasonFormat';
import { US_PLAYOFF_FORMAT } from '@/data/usLeagueShape';
import { NBA_SEASON } from '@/lib/season/nba';
import { NFL_SEASON } from '@/lib/season/nfl';
import { NBA_PLAYOFF_PERIODS } from '@/lib/nbaPlayoffFormatHistory';
import { NFL_PLAYOFF_PERIODS } from '@/lib/nflPlayoffFormatHistory';

const publishersOf = (ids: readonly string[]) => new Set(ids.map(id => US_POSTSEASON_SOURCES[id]?.publisher));
/** A fact needs sources when the row states something with it. */
const states = (w: UsPostseasonWindow, fact: UsPostseasonFact): boolean => {
  if (fact === 'before') return w.before !== null;
  if (fact === 'modified') return w.modified.length > 0;
  if (fact === 'lastRoundOnlyCross') return w.lastRoundOnlyCross !== null;
  if (fact === 'byes') return w.byes > 0;
  return true;
};
const FACTS: UsPostseasonFact[] = ['clubs', 'byes', 'before', 'lastRoundOnlyCross', 'years', 'modified'];

describe('the postseason format rows', () => {
  it('holds the NBA and the NFL and nothing else (the MLB and the NHL read their ledgers)', () => {
    expect([...new Set(US_POSTSEASON.map(w => w.sport))].sort()).toEqual(['nba', 'nfl']);
  });

  it('puts two publishers, none of them a wiki, behind every fact a row states', () => {
    for (const w of US_POSTSEASON) {
      for (const fact of FACTS) {
        const ids = w.src[fact] ?? [];
        for (const id of ids) expect(US_POSTSEASON_SOURCES[id], `${w.sport} ${w.from} ${fact}: source ${id}`).toBeDefined();
        if (states(w, fact)) expect(publishersOf(ids).size, `${w.sport} ${w.from} ${fact}`).toBeGreaterThanOrEqual(2);
      }
    }
    for (const [id, s] of Object.entries(US_POSTSEASON_SOURCES)) {
      expect(`${s.publisher} ${s.title}`.toLowerCase(), id).not.toMatch(/wiki|fandom/);
      expect(s.read, id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(s.dated, id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(s.dated <= s.read, `${id} is dated after it was read`).toBe(true);
    }
  });

  it('cites every source it lists (no source nobody stands on)', () => {
    const used = new Set(US_POSTSEASON.flatMap(w => Object.values(w.src).flat()));
    expect(Object.keys(US_POSTSEASON_SOURCES).filter(id => !used.has(id))).toEqual([]);
  });

  it('has windows of one sport in order, never overlapping, at most one still open', () => {
    for (const sport of ['nba', 'nfl'] as const) {
      const ws = US_POSTSEASON.filter(w => w.sport === sport);
      expect(ws.length).toBeGreaterThan(0);
      expect(ws.filter(w => w.to === null).length).toBeLessThanOrEqual(1);
      ws.forEach((w, i) => {
        if (w.to !== null) expect(w.to).toBeGreaterThanOrEqual(w.from);
        if (i > 0) { expect(ws[i - 1].to).not.toBeNull(); expect(w.from).toBeGreaterThan(ws[i - 1].to!); }
        for (const y of w.modified) { expect(y).toBeGreaterThanOrEqual(w.from); if (w.to !== null) expect(y).toBeLessThanOrEqual(w.to); }
        if (w.before) { expect(w.before.places[0]).toBeLessThanOrEqual(w.before.places[1]); expect(w.before.name.length).toBeGreaterThan(0); }
      });
    }
  });

  it('reads the rounds from the one typed copy, a one game round as [1, 1]', () => {
    for (const sport of ['nba', 'nfl'] as const) {
      const typed: { rounds: readonly string[]; series: readonly (readonly [number, number])[] | null } = US_PLAYOFF_FORMAT[sport];
      const rounds = usPostseasonRounds(sport);
      expect(rounds.map(r => r.name)).toEqual([...typed.rounds]);
      expect(rounds.map(r => [...r.series])).toEqual(typed.rounds.map((_, i) => (typed.series ? [...typed.series[i]] : [1, 1])));
      for (const r of rounds) { expect(r.series[0]).toBeGreaterThanOrEqual(1); expect(r.series[1]).toBeGreaterThanOrEqual(r.series[0]); expect(r.series[1]).toBeLessThanOrEqual(2 * r.series[0] - 1); }
    }
    /* and the binds the Season Center plays with read the same copy */
    expect(usPostseasonRounds('nba').map(r => r.name)).toEqual([...NBA_SEASON.rounds]);
    expect(usPostseasonRounds('nba').map(r => [...r.series])).toEqual(NBA_SEASON.series!.map(s => [...s]));
    expect(usPostseasonRounds('nfl').map(r => r.name)).toEqual([...NFL_SEASON.rounds]);
    expect(NFL_SEASON.series).toBeNull();
  });

  it('holds clubs and byes as a pair: a knockout of R rounds seats 2^R, and a bye is a seat nobody fills', () => {
    for (const w of US_POSTSEASON) {
      const seats = 2 ** usPostseasonRounds(w.sport).length;
      /* two conferences, `byes` clubs of each skip round one */
      expect(seats - w.clubs, `${w.sport} ${w.from}`).toBe(2 * w.byes);
    }
  });

  it('agrees with the prose histories on the size of the field (two files of this repo, not a source)', () => {
    const periods = { nba: NBA_PLAYOFF_PERIODS, nfl: NFL_PLAYOFF_PERIODS };
    for (const w of US_POSTSEASON) {
      const last = w.to ?? w.from + 12;
      for (let y = w.from; y <= last; y += 1) {
        const p = periods[w.sport].find(x => y >= x.from && (x.to === null || y <= x.to));
        expect(p, `${w.sport} ${y} has a period`).toBeDefined();
        expect(p!.fieldSize, `${w.sport} ${y}`).toBe(w.clubs);
      }
    }
  });
});

describe('usPostseasonFormat', () => {
  it('answers a season inside a window with its row and its rounds', () => {
    const nba = usPostseasonFormat('nba', 2018);
    expect(nba?.clubs).toBe(16);
    expect(nba?.before).toBeNull();
    expect(nba?.rounds.map(r => [...r.series])).toEqual([[4, 7], [4, 7], [4, 7], [4, 7]]);
    expect(usPostseasonFormat('nba', 2020)?.before).toEqual({ name: 'Play-In Tournament', places: [7, 10] });
    expect(usPostseasonFormat('nba', 2041)?.from).toBe(2020);
    const nfl = usPostseasonFormat('nfl', 2021);
    expect(nfl?.clubs).toBe(14);
    expect(nfl?.byes).toBe(1);
    expect(nfl?.rounds.map(r => [...r.series])).toEqual([[1, 1], [1, 1], [1, 1], [1, 1]]);
  });

  it('refuses a season no row holds, a season played to another format, and a sport it does not hold', () => {
    expect(usPostseasonFormat('nba', 2002)).toBeNull();
    expect(usPostseasonFormat('nba', 2019)).toBeNull();
    expect(usPostseasonFormat('nfl', 2019)).toBeNull();
    expect(usPostseasonFormat('mlb', 2023)).toBeNull();
    expect(usPostseasonFormat('nhl', 2023)).toBeNull();
    expect(usPostseasonFormat('', 2023)).toBeNull();
  });

  it('marks what it could not two source instead of filling it', () => {
    expect(US_POSTSEASON_THIN.length).toBeGreaterThan(0);
    for (const t of US_POSTSEASON_THIN) { expect(t.what.length).toBeGreaterThan(10); expect(t.tried.length).toBeGreaterThan(10); }
  });
});
