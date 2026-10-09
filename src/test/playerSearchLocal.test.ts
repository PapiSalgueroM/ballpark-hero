/**
 * Round 1105: a player source held in memory.
 *
 * THE FIRST BLOCK WAS RECORDED BEFORE src/lib/playerSearch.ts WAS TOUCHED. It
 * pins what searchPlayers sends for a source that lives in a table: for a five
 * letter query, exactly the two queries it has always made (the ilike leg and
 * the prominence leg), their table, select, order and limit, and no call to
 * fetch. The round then adds ONE optional field to PlayerSourceConfig (local)
 * and one early branch for it. Every source that does not set it must keep
 * sending exactly this, so the block passes with no edit to any expectation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type Step = [method: string, ...args: unknown[]];
type Query = { table: string; steps: Step[] };

const stub = vi.hoisted(() => ({
  queries: [] as Query[],
  rows: [] as Record<string, unknown>[],
}));

vi.mock('@/integrations/supabase/client', () => {
  const from = (table: string) => {
    const query: Query = { table, steps: [] };
    stub.queries.push(query);
    const q: Record<string, unknown> = {};
    for (const m of ['select', 'ilike', 'or', 'eq', 'in', 'order', 'limit', 'abortSignal']) {
      q[m] = (...args: unknown[]) => { query.steps.push([m, ...args]); return q; };
    }
    /* A postgrest builder is awaited directly. */
    q.then = (resolve: (v: unknown) => unknown) => resolve({ data: stub.rows, error: null });
    return q;
  };
  return { SUPABASE_URL: 'https://offline.invalid', SUPABASE_PUBLISHABLE_KEY: 'offline', supabase: { from } };
});

import { searchPlayers, type PlayerSourceConfig } from '@/lib/playerSearch';

/** The shape College Grid's search had on main: a table, a name and a prominence column. */
const REMOTE: PlayerSourceConfig = {
  table: 'college_grid_players',
  nameColumn: 'display_name',
  prominenceColumn: 'seasons',
  ilikeLimit: 200,
  prominenceLimit: 1000,
};

const fetchSpy = vi.fn(async () => { throw new Error('searchPlayers must never call fetch itself'); });

beforeEach(() => {
  stub.queries.length = 0;
  stub.rows = [
    { display_name: 'Aaron Brady', seasons: 2 },
    { display_name: 'Tom Brady', seasons: 23 },
    { display_name: 'Brady Quinn', seasons: 7 },
  ];
  fetchSpy.mockClear();
  vi.stubGlobal('fetch', fetchSpy);
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('a source in a table, recorded on main before Round 1105 added the local seam', () => {
  it('a five letter query sends exactly the ilike leg and the prominence leg', async () => {
    const out = await searchPlayers({ source: REMOTE, query: 'Brady' });
    expect(stub.queries).toEqual([
      {
        table: 'college_grid_players',
        steps: [
          ['select', 'display_name, seasons'],
          ['ilike', 'display_name', '%Brady%'],
          ['order', 'seasons', { ascending: false }],
          ['order', 'display_name', { ascending: true }],
          ['limit', 200],
        ],
      },
      {
        table: 'college_grid_players',
        steps: [
          ['select', 'display_name, seasons'],
          ['order', 'seasons', { ascending: false }],
          ['order', 'display_name', { ascending: true }],
          ['limit', 1000],
        ],
      },
    ]);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(out.error).toBeNull();
    /* Exact prefix first, then the word prefixes by prominence. */
    expect(out.results.map((r) => r.name)).toEqual(['Brady Quinn', 'Tom Brady', 'Aaron Brady']);
  });

  it('under three letters nothing is sent at all', async () => {
    const out = await searchPlayers({ source: REMOTE, query: 'Br' });
    expect(out).toEqual({ results: [], error: null });
    expect(stub.queries).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------------- */
/* Added WITH the seam (Round 1105): a source held in memory.                 */
/* ------------------------------------------------------------------------- */

const POOL = ['Brady Quinn', 'Tom Brady', 'Aaron Brady', 'Kyle Brady', 'Bradyn Smith', 'Jeff Hornbrady', 'Joe Montana'];
/** Prominence falls with position in the list, the way the College Grid key file is ordered. */
const poolRows = (q: string) => POOL
  .map((name, i) => ({ display_name: name, rank: POOL.length - i }))
  .filter((r) => r.display_name.toLowerCase().includes(q));

const memory = (local: PlayerSourceConfig['local']): PlayerSourceConfig => ({ table: '(memory)', nameColumn: 'display_name', prominenceColumn: 'rank', local });

describe('a source held in memory (Round 1105)', () => {
  it('asks the local rows with the normalized query and makes no request of any kind', async () => {
    const local = vi.fn(async (q: string) => poolRows(q));
    const out = await searchPlayers({ source: memory(local), query: '  BRÁDY ' });
    expect(local).toHaveBeenCalledTimes(1);
    expect(local).toHaveBeenCalledWith('brady');
    expect(stub.queries, 'no supabase query').toEqual([]);
    expect(fetchSpy, 'no fetch').not.toHaveBeenCalled();
    expect(out.error).toBeNull();
    /* Exact prefix (Brady Quinn, Bradyn Smith by rank), then word prefix by rank, then contains. */
    expect(out.results.map((r) => r.name)).toEqual(['Brady Quinn', 'Bradyn Smith', 'Tom Brady', 'Aaron Brady', 'Kyle Brady', 'Jeff Hornbrady']);
    expect(out.results.map((r) => r.matchRank)).toEqual([0, 0, 1, 1, 1, 2]);
  });

  it('honours exclude and limit', async () => {
    const source = memory(async (q) => poolRows(q));
    const limited = await searchPlayers({ source, query: 'brady', limit: 3 });
    expect(limited.results.map((r) => r.name)).toEqual(['Brady Quinn', 'Bradyn Smith', 'Tom Brady']);
    const excluded = await searchPlayers({ source, query: 'brady', exclude: new Set(['brady quinn', 'tom brady']) });
    expect(excluded.results.map((r) => r.name)).toEqual(['Bradyn Smith', 'Aaron Brady', 'Kyle Brady', 'Jeff Hornbrady']);
  });

  it('under three letters the local rows are never asked', async () => {
    const local = vi.fn(async () => poolRows('br'));
    expect(await searchPlayers({ source: memory(local), query: 'br' })).toEqual({ results: [], error: null });
    expect(local).not.toHaveBeenCalled();
  });

  it('rows that cannot be had are an error, never "nobody by that name"', async () => {
    const missing = await searchPlayers({ source: memory(async () => null), query: 'brady' });
    expect(missing).toEqual({ results: [], error: 'Could not load players' });
    const thrown = await searchPlayers({ source: memory(async () => { throw new Error('boom'); }), query: 'brady' });
    expect(thrown).toEqual({ results: [], error: 'Could not load players' });
    expect(stub.queries, 'and never a fall back to the table').toEqual([]);
  });

  it('a match of nobody is an empty list with no error', async () => {
    expect(await searchPlayers({ source: memory(async (q) => poolRows(q)), query: 'zzzz' })).toEqual({ results: [], error: null });
  });

  it('an aborted search settles empty with no error, whatever the rows did', async () => {
    const abort = new AbortController();
    const source = memory(async (q) => { abort.abort(); return poolRows(q); });
    expect(await searchPlayers({ source, query: 'brady', signal: abort.signal })).toEqual({ results: [], error: null });
    const gone = new AbortController();
    expect(await searchPlayers({ source: memory(async () => { gone.abort(); return null; }), query: 'brady', signal: gone.signal })).toEqual({ results: [], error: null });
  });
});
