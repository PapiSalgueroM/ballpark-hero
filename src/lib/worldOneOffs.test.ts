/* Round 1510: the one match cups (worldOneOffs.ts), on golden tables written by hand. The entrants for every entry
 * and double rule on crafted tables (always distinct clubs, or a skip); every shape's fixtures and grounds; the
 * evaluation on a SCRIPTED match per decider ('pens' never plays extra time, 'et' only when level, 'two' settled on
 * aggregate with away goals only where the row has them, one winner); the prefix property; and zero Math.random
 * under a spy, with a control that proves the spy sees a draw. The function under test is never its own oracle:
 * every expected value below is written out.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  entrantsFrom, evaluateOneOff, myOneOffFixture, oneOffFixturesOf, oneOffNightsOf, oneOffPartial, oneOffRowById,
  oneOffRowFor, oneOffRowId, oneOffWinner,
  type OneOffBind, type OneOffRow, type OneOffSlice,
} from './worldOneOffs';
import { keyedRng } from './keyedRng';

const row = (o: Partial<OneOffRow>): OneOffRow => ({
  id: 'tst-2026', nation: 'test', year: 2026, name: 'Test Cup', shape: 'one', decider: 'pens', entry: 'champCup',
  double: 'leagueRunnerUp', place: 'open', venue: 'n', awayGoals: false, pairing: null, ...o,
});
const T = (table: string[] | null, cupWinner: string | null, cupRunnerUp: string | null = null) => ({ table, cupWinner, cupRunnerUp });

describe('the rows', () => {
  it('England 2026 is the FA Community Shield, one match, straight to penalties, before the season, neutral', () => {
    const r = oneOffRowFor('england', 2026);
    expect(r).toEqual({ id: 'eng-2026', nation: 'england', year: 2026, name: 'FA Community Shield', shape: 'one', decider: 'pens', entry: 'champCup', double: 'leagueRunnerUp', place: 'open', venue: 'n', awayGoals: false, pairing: null });
    expect(oneOffRowById('eng-2026')).toEqual(r);
  });
  it('a country or era the round could not stand on has no row and is marked partial', () => {
    for (const [nation, year] of [['england', 2005], ['england', 2010], ['england', 2015], ['england', 2020], ['spain', 2026], ['italy', 2026], ['germany', 2026], ['france', 2026]] as const) {
      expect(oneOffRowFor(nation, year)).toBeNull();
      expect(oneOffPartial(nation, year)).toBe(true);
    }
    expect(oneOffRowId('spain', 2020)).toBe('esp-2020');
    expect(oneOffPartial('england', 2026)).toBe(false);
    expect(oneOffRowFor('netherlands', 2026)).toBeNull();
    expect(oneOffPartial('netherlands', 2026)).toBe(false);
  });
});

describe('entrantsFrom', () => {
  const one = row({});
  it('champions against cup winners, and a double by the row', () => {
    expect(entrantsFrom(one, T(['A', 'B', 'C'], 'D'))).toEqual({ clubs: ['A', 'D'] });
    expect(entrantsFrom(one, T(['A', 'B', 'C'], 'A', 'E'))).toEqual({ clubs: ['A', 'B'] });
    expect(entrantsFrom(row({ double: 'nextLeague' }), T(['A', 'B', 'C'], 'A', 'E'))).toEqual({ clubs: ['A', 'B'] });
    expect(entrantsFrom(row({ double: 'cupRunnerUp' }), T(['A', 'B', 'C'], 'A', 'E'))).toEqual({ clubs: ['A', 'E'] });
    expect(entrantsFrom(row({ double: 'cupRunnerUp' }), T(['A', 'B', 'C'], 'A', null))).toEqual({ skip: 'unfinished' });
  });
  it('no table, a table of one, or no cup final is a skip, never padded', () => {
    expect(entrantsFrom(one, T(null, 'D'))).toEqual({ skip: 'unfinished' });
    expect(entrantsFrom(one, T([], 'D'))).toEqual({ skip: 'unfinished' });
    expect(entrantsFrom(one, T(['A'], 'D'))).toEqual({ skip: 'unfinished' });
    expect(entrantsFrom(one, T(['A', 'B'], null))).toEqual({ skip: 'noFinal' });
  });
  it('a four: the top two and both finalists, a finalist already in hands its place down the league', () => {
    const four = row({ shape: 'four', entry: 'top2cup2', double: 'nextLeague', pairing: [0, 3, 2, 1] });
    expect(entrantsFrom(four, T(['A', 'B', 'C', 'D'], 'C', 'E'))).toEqual({ clubs: ['A', 'B', 'C', 'E'] });
    expect(entrantsFrom(four, T(['A', 'B', 'C', 'D'], 'A', 'B'))).toEqual({ clubs: ['A', 'B', 'C', 'D'] });
    expect(entrantsFrom(four, T(['A', 'B', 'C', 'D'], 'E', 'A'))).toEqual({ clubs: ['A', 'B', 'E', 'C'] });
    expect(entrantsFrom(four, T(['A', 'B', 'C', 'D'], 'B', 'E'))).toEqual({ clubs: ['A', 'B', 'C', 'E'] });
    expect(entrantsFrom(four, T(['A', 'B', 'C', 'D'], 'E', null))).toEqual({ skip: 'noFinal' });
    expect(entrantsFrom(four, T(['A', 'B', 'C'], 'A', 'B'))).toEqual({ skip: 'unfinished' });
  });
  it('over 600 crafted tables and finals: always distinct clubs of the right count, or a skip', () => {
    const rand = keyedRng('entrants-golden');
    const pool = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    for (let i = 0; i < 600; i += 1) {
      const n = Math.floor(rand() * 7);
      const table = pool.slice(0, n);
      const pick = () => (rand() < 0.15 ? null : pool[Math.floor(rand() * pool.length)]);
      const w = pick();
      let ru = pick();
      if (ru === w) ru = null;
      for (const r of [one, row({ double: 'cupRunnerUp' }), row({ shape: 'four', entry: 'top2cup2', double: 'nextLeague', pairing: [0, 3, 2, 1] })]) {
        const got = entrantsFrom(r, T(table, w, ru));
        if ('clubs' in got) {
          expect(new Set(got.clubs).size).toBe(r.shape === 'four' ? 4 : 2);
          expect(got.clubs.length).toBe(r.shape === 'four' ? 4 : 2);
          expect(got.clubs[0]).toBe(table[0]);
        } else expect(['unfinished', 'noFinal']).toContain(got.skip);
      }
    }
  });
});

describe('fixtures and grounds', () => {
  it('one match: the champions named first; on the champions ground or the cup winners ground by the row', () => {
    expect(oneOffFixturesOf(['A', 'B'], row({ venue: 'n' }))).toEqual([{ n: 0, night: 0, home: 'A', away: 'B', neutral: true, settles: true }]);
    expect(oneOffFixturesOf(['A', 'B'], row({ venue: 'c' }))).toEqual([{ n: 0, night: 0, home: 'A', away: 'B', neutral: false, settles: true }]);
    expect(oneOffFixturesOf(['A', 'B'], row({ venue: 'w' }))).toEqual([{ n: 0, night: 0, home: 'B', away: 'A', neutral: false, settles: true }]);
  });
  it('two legs: leg one at the second named club, leg two settles at the first', () => {
    expect(oneOffFixturesOf(['A', 'B'], row({ shape: 'two', venue: 'c' }))).toEqual([
      { n: 0, night: 0, home: 'B', away: 'A', neutral: false, leg: 1, settles: false },
      { n: 1, night: 1, home: 'A', away: 'B', neutral: false, leg: 2, settles: true },
    ]);
  });
  it('a four: the semi finals by the pairing on one night', () => {
    expect(oneOffFixturesOf(['A', 'B', 'C', 'D'], row({ shape: 'four', pairing: [0, 3, 2, 1] }))).toEqual([
      { n: 0, night: 0, home: 'A', away: 'D', neutral: true, settles: true },
      { n: 1, night: 0, home: 'C', away: 'B', neutral: true, settles: true },
    ]);
    expect(oneOffFixturesOf(['A', 'B', 'C', 'D'], row({ shape: 'four', pairing: [0, 2, 1, 3] })).map(f => [f.home, f.away])).toEqual([['A', 'C'], ['B', 'D']]);
  });
  it('the nights each shape wants', () => {
    expect(oneOffNightsOf(row({}))).toEqual([{ place: 'open' }]);
    expect(oneOffNightsOf(row({ shape: 'two' }))).toEqual([{ place: 'open' }, { place: 'early' }]);
    expect(oneOffNightsOf(row({ shape: 'four', place: 'newYear' }))).toEqual([{ place: 'newYear' }, { place: 'newYear', afterLeague: 1 }]);
  });
});

/* A scripted match: the clubs are told apart by their strength (A 1, B 2, C 3, D 4) and the ninety minutes from
   extra time by the scale. Every call is logged, so a test can say what was never played. */
const ET = 0.3;
const DEC = 0.965;
function scripted(script: Record<string, [number, number]>) {
  const calls: string[] = [];
  const bind: OneOffBind = {
    sim: (h, a, scale) => {
      const key = `${h}-${a}-${scale === ET ? 'et' : scale === DEC ? 'dec' : scale}`;
      calls.push(key);
      const got = script[key];
      if (!got) throw new Error(`no script for ${key}`);
      return got;
    },
    deciderScale: DEC, etScale: ET,
  };
  return { bind, calls };
}
const STR: Record<string, number> = { A: 1, B: 2, C: 3, D: 4 };
const slice = (clubs: string[], o: Partial<OneOffSlice> = {}): OneOffSlice => ({ v: 1, s: 2, row: 'tst-2026', clubs, str: clubs.map(c => STR[c]), seed: 77, ...o });

describe('evaluateOneOff on a scripted match', () => {
  it('a pens row: a level match goes straight to penalties, extra time never played', () => {
    const { bind, calls } = scripted({ '1-2-1': [1, 1] });
    const r = evaluateOneOff(slice(['A', 'B']), row({ decider: 'pens' }), 1, bind)!;
    expect(calls).toEqual(['1-2-1']);
    expect(r.fixtures[0]).toMatchObject({ home: 'A', away: 'B', hg: 1, ag: 1, pens: true });
    expect(r.fixtures[0].aet).toBeUndefined();
    expect(['A', 'B']).toContain(r.winner);
    expect(r.done).toBe(true);
    expect(r.runnerUp).toBe(r.winner === 'A' ? 'B' : 'A');
  });
  it('an et row: extra time only when level, then penalties only when still level', () => {
    const won = scripted({ '1-2-dec': [2, 0] });
    expect(evaluateOneOff(slice(['A', 'B']), row({ decider: 'et' }), 1, won.bind)!.fixtures[0]).toMatchObject({ hg: 2, ag: 0, winner: 'A' });
    expect(won.calls).toEqual(['1-2-dec']);
    const et = scripted({ '1-2-dec': [1, 1], '1-2-et': [0, 1] });
    const r = evaluateOneOff(slice(['A', 'B']), row({ decider: 'et' }), 1, et.bind)!;
    expect(et.calls).toEqual(['1-2-dec', '1-2-et']);
    expect(r.fixtures[0]).toMatchObject({ hg: 1, ag: 2, aet: true, winner: 'B' });
    expect(r.fixtures[0].pens).toBeUndefined();
    const pens = scripted({ '1-2-dec': [1, 1], '1-2-et': [1, 1] });
    expect(evaluateOneOff(slice(['A', 'B']), row({ decider: 'et' }), 1, pens.bind)!.fixtures[0]).toMatchObject({ hg: 2, ag: 2, aet: true, pens: true });
  });
  it('a two legged row: on aggregate, away goals only where the row has them', () => {
    /* Leg one B 1 A 1 at the ground of B, leg two A 0 B 0: level on aggregate, A scored the only away goal. */
    const script: Record<string, [number, number]> = { '2-1-1': [1, 1], '1-2-dec': [0, 0], '1-2-et': [0, 0] };
    const away = scripted(script);
    const r = evaluateOneOff(slice(['A', 'B']), row({ shape: 'two', decider: 'et', awayGoals: true, venue: 'c' }), 2, away.bind)!;
    expect(r.fixtures.map(f => [f.home, f.hg, f.ag, f.away])).toEqual([['B', 1, 1, 'A'], ['A', 0, 0, 'B']]);
    expect(r.agg).toEqual([1, 1]);
    expect(r.byAwayGoals).toBe(true);
    expect(r.winner).toBe('A');
    expect(away.calls).toEqual(['2-1-1', '1-2-dec']);
    const plain = scripted(script);
    const p = evaluateOneOff(slice(['A', 'B']), row({ shape: 'two', decider: 'et', awayGoals: false, venue: 'c' }), 2, plain.bind)!;
    expect(plain.calls).toEqual(['2-1-1', '1-2-dec', '1-2-et']);
    expect(p.byAwayGoals).toBeUndefined();
    expect(p.fixtures[1]).toMatchObject({ aet: true, pens: true });
    const one = evaluateOneOff(slice(['A', 'B']), row({ shape: 'two', decider: 'et', awayGoals: true, venue: 'c' }), 1, scripted(script).bind)!;
    expect(one.fixtures.length).toBe(1);
    expect(one.done).toBe(false);
    expect(one.winner).toBeUndefined();
  });
  it('a four: both semi finals on night one, the final of their winners on night two', () => {
    const { bind } = scripted({ '1-4-1': [2, 0], '3-2-1': [0, 1], '1-2-1': [3, 1] });
    const four = row({ shape: 'four', entry: 'top2cup2', double: 'nextLeague', pairing: [0, 3, 2, 1], venue: 'n' });
    const r1 = evaluateOneOff(slice(['A', 'B', 'C', 'D']), four, 1, bind)!;
    expect(r1.fixtures.map(f => f.winner)).toEqual(['A', 'B']);
    expect(r1.done).toBe(false);
    const r2 = evaluateOneOff(slice(['A', 'B', 'C', 'D']), four, 2, bind)!;
    expect(r2.fixtures[2]).toMatchObject({ n: 2, night: 1, home: 'A', away: 'B', hg: 3, ag: 1, winner: 'A' });
    expect([r2.winner, r2.runnerUp]).toEqual(['A', 'B']);
    expect(myOneOffFixture(r1, slice(['A', 'B', 'C', 'D']), four, 'C', 1)).toBeNull();
    expect(myOneOffFixture(r1, slice(['A', 'B', 'C', 'D']), four, 'B', 1)).toMatchObject({ n: 2, home: 'A', away: 'B' });
    expect(myOneOffFixture(null, slice(['A', 'B', 'C', 'D']), four, 'C', 0)).toMatchObject({ n: 1, home: 'C', away: 'B' });
  });
  it('my own result is read from the slice, never drawn', () => {
    const { bind, calls } = scripted({});
    const r = evaluateOneOff(slice(['A', 'B'], { mine: { 0: { h: 0, a: 0, pens: 'a' } } }), row({}), 1, bind)!;
    expect(calls).toEqual([]);
    expect(r.fixtures[0]).toMatchObject({ hg: 0, ag: 0, pens: true, winner: 'B', mine: true });
    expect(oneOffWinner(r)).toBe('B');
  });
  it('a stub evaluates to nothing', () => {
    expect(evaluateOneOff({ v: 1, s: 1, row: 'tst-2026', skip: 'seasonOne' }, row({}), 1, scripted({}).bind)).toBeNull();
  });
});

/* A plain Poisson match over the stream it is handed, the shape of the engine's watched match. */
const poisson = (lambda: number, rand: () => number): number => {
  const l = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do { k += 1; p *= rand(); } while (p > l && k < 12);
  return k - 1;
};
const keyed: OneOffBind = {
  sim: (h, a, scale, rand) => [poisson(1.4 * scale * (h / (h + a)) * 2, rand), poisson(1.4 * scale * (a / (h + a)) * 2, rand)],
  deciderScale: DEC, etScale: ET,
};

describe('the evaluation as a whole', () => {
  const shapes: OneOffRow[] = [
    row({ shape: 'one', decider: 'pens' }), row({ shape: 'one', decider: 'et', venue: 'c' }),
    row({ shape: 'two', decider: 'et', awayGoals: true, venue: 'c' }), row({ shape: 'two', decider: 'pens', venue: 'c' }),
    row({ shape: 'four', entry: 'top2cup2', double: 'nextLeague', pairing: [0, 3, 2, 1], decider: 'et', place: 'newYear' }),
  ];
  it('a prefix at every night, the same every time, and one winner on every finished cup over 300 seeds', () => {
    for (const r of shapes) {
      const clubs = r.shape === 'four' ? ['A', 'B', 'C', 'D'] : ['A', 'B'];
      const nights = oneOffNightsOf(r).length;
      for (let seed = 0; seed < 300; seed += 1) {
        const s = slice(clubs, { seed });
        const all = evaluateOneOff(s, r, nights, keyed)!;
        expect(evaluateOneOff(s, r, nights, keyed)).toEqual(all);
        for (let k = 0; k < nights; k += 1) {
          const part = evaluateOneOff(s, r, k, keyed)!;
          expect(all.fixtures.slice(0, part.fixtures.length)).toEqual(part.fixtures);
          expect(part.done).toBe(false);
          expect(part.winner).toBeUndefined();
        }
        expect(all.done).toBe(true);
        expect(clubs).toContain(all.winner);
        expect(clubs).toContain(all.runnerUp);
        expect(all.winner).not.toBe(all.runnerUp);
        for (const f of all.fixtures) {
          if (r.decider === 'pens') expect(f.aet).toBeUndefined();
          if (f.pens && r.shape !== 'two') expect(f.hg).toBe(f.ag);
        }
      }
    }
  });
  it('draws nothing from Math.random, and the spy sees a draw when one is made (the control)', () => {
    const spy = vi.spyOn(Math, 'random');
    for (const r of shapes) for (let seed = 0; seed < 40; seed += 1) evaluateOneOff(slice(r.shape === 'four' ? ['A', 'B', 'C', 'D'] : ['A', 'B'], { seed }), r, 2, keyed);
    expect(spy).toHaveBeenCalledTimes(0);
    const leaky: OneOffBind = { ...keyed, sim: (h, a, scale, rand) => { Math.random(); return keyed.sim(h, a, scale, rand); } };
    evaluateOneOff(slice(['A', 'B']), shapes[0], 1, leaky);
    expect(spy.mock.calls.length).toBeGreaterThan(0);
  });
});
afterEach(() => { vi.restoreAllMocks(); });
