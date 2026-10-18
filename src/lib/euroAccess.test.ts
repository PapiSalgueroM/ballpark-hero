import { afterEach, describe, expect, it } from 'vitest';
import { euroFieldFromTables, euroRouteOf, type EuroFieldInput, type EuroTable } from '@/lib/euroAccess';

/* Round 1509 step 3: the Europa League's access rule on crafted tables, one case for every route the rule plays.
   Each table is a league in world order, its clubs in finishing order; the names say where each club finished
   (E3 is third in England), so every expectation can be read off the names alone. */

const table = (leagueId: string, nationId: string, prefix: string, n: number, uclPlaces: number, uelLast: number): EuroTable => ({
  leagueId, nationId, uclPlaces, uelLast, clubs: Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`),
});
const ENG = table('premier', 'england', 'E', 12, 4, 5);
const ESP = table('laliga', 'spain', 'S', 12, 4, 5);
const NED = table('eredivisie', 'netherlands', 'N', 10, 2, 3);
const SCO = table('scottish', 'scotland', 'C', 8, 1, 2);
const tops = (...ts: EuroTable[]) => ts.flatMap(t => t.clubs.slice(0, t.uclPlaces));
const base = (over: Partial<EuroFieldInput> = {}): EuroFieldInput => ({
  tables: [ENG, ESP, NED, SCO], cups: {}, uclEntrants: tops(ENG, ESP, NED, SCO), size: 8, ...over,
});

describe('the Europa League access rule (Round 1509)', () => {
  it('gives each league its places below the Champions League ones, in world order', () => {
    const f = euroFieldFromTables(base());
    expect(f.clubs.slice(0, 4)).toEqual(['E5', 'S5', 'N3', 'C2']);
    expect(['E5', 'S5', 'N3', 'C2'].every(c => f.via[c] === 'L')).toBe(true);
  });

  it('passes a league place down past a club the Champions League already has', () => {
    const f = euroFieldFromTables(base({ uclEntrants: [...tops(ENG, ESP, NED, SCO), 'E5'] }));
    expect(f.via.E5).toBeUndefined();
    expect(f.via.E6).toBe('L');
  });

  it('puts my nation\'s cup winner in by the cup', () => {
    const f = euroFieldFromTables(base({ cups: { england: 'E9' } }));
    expect(f.via.E9).toBe('C');
    expect(f.via.E5).toBe('L');
  });

  it('hands the place of a cup winner already in down its league to the next club that is not', () => {
    const inUcl = euroFieldFromTables(base({ cups: { england: 'E1' } }));
    expect(inUcl.via.E1).toBeUndefined();
    expect(inUcl.via.E6).toBe('P');
    expect(inUcl.passed).toBe(1);
    const byLeague = euroFieldFromTables(base({ cups: { england: 'E5' } }));
    expect(byLeague.via.E5).toBe('L');
    expect(byLeague.via.E6).toBe('P');
  });

  it('takes a cup winner from below the top division, which no table lists', () => {
    const f = euroFieldFromTables(base({ cups: { england: 'Championship Town' } }));
    expect(f.via['Championship Town']).toBe('C');
  });

  it('passes the cup place down when there is no winner to place (null), and gives none before the final (left out)', () => {
    const none = euroFieldFromTables(base({ cups: { spain: null } }));
    expect(none.via.S6).toBe('P');
    const notYet = euroFieldFromTables(base({ cups: { spain: undefined }, size: 4 }));
    expect(notYet.clubs).toEqual(['E5', 'S5', 'N3', 'C2']);
    expect(notYet.passed).toBe(0);
  });

  it('gives a nation with no European row nothing for its cup', () => {
    const f = euroFieldFromTables(base({ cups: { usa: 'Some Club' }, size: 4 }));
    expect(f.via['Some Club']).toBeUndefined();
    expect(f.clubs).toEqual(['E5', 'S5', 'N3', 'C2']);
  });

  it('keeps my club out of every route, its place passing on, and the fill never takes it', () => {
    const f = euroFieldFromTables(base({ cups: { england: 'E5' }, exclude: ['E5'], size: 12 }));
    expect(f.clubs).not.toContain('E5');
    expect(f.via.E6).toBe('L');
    expect(f.via.E7).toBe('P');
    expect(f.clubs).toHaveLength(12);
    /* The route it earned is the rule without the exclusion, and the fill is not a route a club earns. */
    expect(euroRouteOf(base({ cups: { england: 'E5' } }), 'E5')).toBe('L');
    expect(euroRouteOf(base({ cups: { england: 'E9' } }), 'E9')).toBe('C');
    expect(euroRouteOf(base({ cups: { england: 'E1' } }), 'E6')).toBe('P');
    expect(euroRouteOf(base({ size: 12 }), 'E6')).toBeNull();
    expect(euroFieldFromTables(base({ size: 12 })).via.E6).toBe('F');
  });

  it('fills to the size from the deepest leagues first, plain text order between equals, no club twice', () => {
    const f = euroFieldFromTables(base({ cups: { england: 'E1', spain: 'S1', netherlands: null, scotland: null }, size: 14 }));
    expect(f.clubs).toHaveLength(14);
    expect(new Set(f.clubs).size).toBe(14);
    expect(f.clubs.filter(c => f.via[c] === 'F').slice(0, 2)).toEqual(['S7', 'E7']);
    expect(f.clubs.some(c => tops(ENG, ESP, NED, SCO).includes(c))).toBe(false);
  });

  it('puts the Conference League titleholder in, unless it is already in', () => {
    expect(euroFieldFromTables(base({ ueclHolder: 'E11' })).via.E11).toBe('H');
    const already = euroFieldFromTables(base({ ueclHolder: 'E5' }));
    expect(already.via.E5).toBe('L');
    expect(Object.values(already.via).includes('H')).toBe(false);
  });

  describe('a device whose language orders names otherwise', () => {
    const real = String.prototype.localeCompare;
    afterEach(() => { String.prototype.localeCompare = real; });
    it('draws the same field', () => {
      const input = base({ cups: { england: 'E1', spain: 'S1' }, size: 14 });
      const before = JSON.stringify(euroFieldFromTables(input));
      String.prototype.localeCompare = function (this: string, other: string) { return -real.call(this, other); };
      expect(JSON.stringify(euroFieldFromTables(input))).toBe(before);
    });
  });
});
