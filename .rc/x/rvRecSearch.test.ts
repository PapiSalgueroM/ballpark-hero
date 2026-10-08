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
