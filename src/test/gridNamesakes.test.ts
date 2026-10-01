/**
 * Round 653 fix: a grid guess is right when ANY player under the typed name
 * fits the cell.
 *
 * THE BUG. Every grid lib indexed players by normalized name in a Map that
 * kept one player per name, the last row loaded. ncaa_player_stats carries
 * 1,697 names that belong to two or more players, so typing "Danny Manning"
 * for Kansas x 1,500+ Career Points was judged on a later Danny Manning with
 * 59 games and refused, in the live game, since Round 368. The archive page
 * listed 227 such names as answers while promising the game would take them.
 *
 * WHAT THIS PROVES, through the real fetch and index code with the network
 * stubbed to serve two rows under one name: the franchise engine
 * (src/lib/gridEngine.ts, which nbaGrid, mlbGrid, hockeyGrid, nflGrid and
 * collegeGrid all run on) and the college basketball lib (src/lib/cbbGrid.ts,
 * its own fetch) both keep every namesake, and pickNamesake, the one function
 * every grid page and hook judges through, returns the namesake who fits.
 * The last row alone, which is what the old map handed back, does not fit,
 * so the old path is shown refusing exactly the guess the new one accepts.
 */
import { describe, it, expect, vi } from 'vitest';

const stub = vi.hoisted(() => ({ rows: {} as Record<string, Record<string, unknown>[]> }));

vi.mock('@/integrations/supabase/client', () => {
  const from = (table: string) => {
    const q = {
      select: () => q,
      not: () => q,
      order: () => q,
      range: async (lo: number, hi: number) => ({ data: (stub.rows[table] ?? []).slice(lo, hi + 1), error: null }),
    };
    return q;
  };
  return { SUPABASE_URL: 'https://offline.invalid', SUPABASE_PUBLISHABLE_KEY: 'offline', supabase: { from } };
});

import { pickNamesake } from '@/lib/gridEngine';
import { normalizeName } from '@/lib/playerSearch';
import { fetchNbaGridData, playerMatchesCell as nbaMatches, MIN_POOL_SIZE as NBA_FLOOR } from '@/lib/nbaGrid';
import { fetchCbbGridData, playerMatchesCell as cbbMatches, CBB_ACHIEVEMENTS, CBB_MIN_POOL_SIZE } from '@/lib/cbbGrid';

/* Filler rows so the fetch clears each lib's broken-read floor. */
const filler = (n: number, row: (i: number) => Record<string, unknown>) => Array.from({ length: n }, (_, i) => row(i));

describe('grid namesakes (Round 653 fix)', () => {
  it('the franchise engine keeps every player under a shared name and pickNamesake judges the one who fits', async () => {
    stub.rows.nba_player_stats = [
      /* The famous one loads first, the namesake who never wore the jersey loads last. */
      { id: 1, player_name: 'Probe Namesake', teams: 'LAL,BOS', points: 12000, trb: 3000, ast: 2000, games: 950 },
      ...filler(NBA_FLOOR, i => ({ id: 100 + i, player_name: `Filler ${i}`, teams: 'CHI', points: 10, trb: 1, ast: 1, games: 5 })),
      { id: 2, player_name: 'Probe Namesake', teams: 'MIA', points: 100, trb: 30, ast: 20, games: 59 },
    ];
    const data = await fetchNbaGridData();
    expect(data, 'the fetch clears the floor and indexes').not.toBeNull();
    const under = data!.byNormalizedName.get('probe namesake');
    expect(under?.map(p => p.games), 'both namesakes are held, in load order').toEqual([950, 59]);

    const cell = { row: { kind: 'franchise' as const, id: 'LAL', label: 'Lakers' }, col: { kind: 'achievement' as const, id: 'gp900', label: '900+ Games Played' } };
    const judged = pickNamesake(under, p => nbaMatches(p, cell));
    expect(judged?.games, 'the namesake who fits is the one judged').toBe(950);
    expect(nbaMatches(judged!, cell)).toBe(true);
    /* The old map handed back the last row alone, and he does not fit. */
    expect(nbaMatches(under![under!.length - 1], cell), 'the last row loaded, which the old map kept, is refused').toBe(false);

    const wrongCell = { row: { kind: 'franchise' as const, id: 'CHI', label: 'Bulls' }, col: cell.col };
    const miss = pickNamesake(under, p => nbaMatches(p, wrongCell));
    expect(miss?.games, 'when nobody fits, the first stands in so the miss names a real player').toBe(950);
    expect(nbaMatches(miss!, wrongCell)).toBe(false);
    expect(pickNamesake(undefined, () => true), 'a name nobody carries').toBeNull();
    expect(pickNamesake([], () => true)).toBeNull();
  });

  it('the index is keyed the way the pages look a name up, special Latin letters folded (Pétur Guðmundsson)', async () => {
    /* The four grid pages normalize the typed name with normalizeName from
       the search layer, which folds ð to d. The index used its own NFD strip,
       which leaves ð alone, so the key never matched and a real Laker and
       Spur was refused in the live game. */
    stub.rows.nba_player_stats = [
      { id: 1, player_name: 'Pétur Guðmundsson', teams: 'POR,SAS,LAL', points: 1000, trb: 500, ast: 50, games: 200 },
      ...filler(NBA_FLOOR, i => ({ id: 100 + i, player_name: `Filler ${i}`, teams: 'CHI', points: 10, trb: 1, ast: 1, games: 5 })),
    ];
    const data = await fetchNbaGridData();
    expect(data).not.toBeNull();
    const under = data!.byNormalizedName.get(normalizeName('Pétur Guðmundsson'));
    expect(under?.length, 'the typed name, normalized as the page does it, finds him').toBe(1);
    expect(normalizeName('Pétur Guðmundsson')).toBe('petur gudmundsson');
    const cell = { row: { kind: 'franchise' as const, id: 'LAL', label: 'Lakers' }, col: { kind: 'franchise' as const, id: 'SAS', label: 'Spurs' } };
    expect(nbaMatches(pickNamesake(under, p => nbaMatches(p, cell))!, cell)).toBe(true);
  });

  it('the college basketball lib keeps every namesake too (the Danny Manning shape)', async () => {
    stub.rows.ncaa_player_stats = [
      { player_slug: 'danny-manning-1', player_name: 'Danny Manning', schools: 'Kansas', points: 2951, trb: 1187, ast: 342, games: 147, position: 'F', year_from: '1984-85', year_to: '1987-88' },
      ...filler(CBB_MIN_POOL_SIZE, i => ({ player_slug: `filler-${i}`, player_name: `Filler ${i}`, schools: 'Elsewhere', points: 10, trb: 1, ast: 1, games: 5, position: 'G', year_from: '2000-01', year_to: '2001-02' })),
      { player_slug: 'danny-manning-2', player_name: 'Danny Manning', schools: 'Somewhere Else', points: 300, trb: 100, ast: 30, games: 59, position: 'G', year_from: '2010-11', year_to: '2012-13' },
    ];
    const data = await fetchCbbGridData();
    expect(data).not.toBeNull();
    const under = data!.byNormalizedName.get('danny manning');
    expect(under?.map(p => p.games)).toEqual([147, 59]);
    const cell = { row: { kind: 'school' as const, id: 'Kansas', label: 'Kansas' }, col: CBB_ACHIEVEMENTS.find(a => a.id === 'pts1500')! };
    const judged = pickNamesake(under, p => cbbMatches(p, cell));
    expect(judged?.games, 'Kansas x 1,500+ Career Points takes the 1980s Jayhawk').toBe(147);
    expect(cbbMatches(under![under!.length - 1], cell), 'the last row, the old answer, is refused').toBe(false);
  });
});
