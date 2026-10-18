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

/* Round 1509 step 6a: the board's European rungs, graded by the rule (rulings 1e and 1i). */
import { REAL_LEAGUES, buildBoardObjectives, euroPlaceOf, euroPlaceRouteOf, europeRungOf, startCareer, type CareerState } from '@/lib/clubManager';

describe('the board reads the rule (Round 1509)', () => {
  it('names a rung for each of the three European labels the board writes, and for nothing else', () => {
    const labels = new Set<string>();
    for (const league of REAL_LEAGUES.filter(l => l.euro)) {
      for (const club of league.clubs) for (const o of buildBoardObjectives(club, false, league.clubs.length, undefined, league.clubs)) if (o.id === 'league') labels.add(o.label);
    }
    const rungs = [...labels].map(l => [l, europeRungOf({ id: 'league', label: l })] as const);
    expect(new Set(rungs.map(([, r]) => r).filter(Boolean))).toEqual(new Set(['ucl', 'uel', 'uecl']));
    for (const [label, rung] of rungs) expect(rung !== null).toBe(/^Qualify for the (Champions|Europa|Conference) League$/.test(label));
    expect(europeRungOf({ id: 'cup', label: 'Qualify for the Europa League' })).toBeNull();
  });

  /* A mid season state of a Premier League career, its table set so my club stands where a case needs it. */
  const base = startCareer('Chelsea');
  const at = (pos: number, cupWinner?: string): CareerState => {
    const s = JSON.parse(JSON.stringify(base)) as CareerState;
    s.week = 10;
    const others = s.table.map(r => r.club).filter(c => c !== s.clubName);
    const order = [...others.slice(0, pos - 1), s.clubName, ...others.slice(pos - 1)];
    s.table = order.map((club, i) => ({ club, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 100 - i }));
    s.cupBracket = cupWinner ? [{ round: 'F', slot: 0, home: cupWinner, away: 'Somebody', homeGoals: 1, awayGoals: 0, winner: cupWinner, mine: cupWinner === s.clubName } as never] : undefined;
    return s;
  };
  const clubAt = (s: CareerState, pos: number) => s.table[pos - 1].club;

  it('in the Champions League places is the Champions League, by its places alone', () => {
    expect(euroPlaceOf(at(3))).toBe('ucl');
    expect(euroPlaceOf(at(4))).toBe('ucl');
  });
  it('before the cup final counts the league places only', () => {
    expect(euroPlaceOf(at(5))).toBe('uel');
    expect(euroPlaceRouteOf(at(5))).toBe('L');
    expect(euroPlaceOf(at(6))).toBeNull();
    expect(euroPlaceOf(at(12))).toBeNull();
  });
  it('after the final counts the cup: my club winning it from outside the places, or a winner already in passing its place down to me', () => {
    const won = at(12, 'Chelsea');
    expect(euroPlaceOf(won)).toBe('uel');
    expect(euroPlaceRouteOf(won)).toBe('C');
    const s6 = at(6);
    const passed = at(6, clubAt(s6, 2));
    expect(euroPlaceOf(passed)).toBe('uel');
    expect(euroPlaceRouteOf(passed)).toBe('P');
    expect(euroPlaceOf(at(7, clubAt(s6, 2)))).toBeNull();
    expect(euroPlaceOf(at(6, 'Somebody From Below'))).toBeNull();
  });
});
