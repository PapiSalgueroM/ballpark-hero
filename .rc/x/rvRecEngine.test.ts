/**
 * Round 1105: where the franchise grid engine gets its rows.
 *
 * THE FIRST BLOCK WAS RECORDED BEFORE THE ENGINE WAS TOUCHED. It pins the paged
 * read of src/lib/gridEngine.ts request for request (the table, the select, the
 * two filters, the three ranges of a 2,345 row table, the Round 358 retry, the
 * broken-read floor) on the code that was live on main, and it was committed
 * green there. The round then lifts that read into readPagedRows and adds a
 * second door (a static source that ships with the site). Four grids (NBA, MLB,
 * NHL and NFL) stay on the paged door, so this block must keep passing with no
 * edit to any expectation in it: a red one means the lift changed what those
 * four pages send.
 *
 * The source needles at the bottom of the block are there for a harness this
 * suite cannot run: scripts/simMlbGridPool.mjs times the real request against
 * the database and aborts with NOTHING WAS CHECKED (a skip, not a red) unless
 * the engine still carries these four strings byte for byte. A later tidy of
 * the paged read would turn that harness into a silent skip; this turns it red
 * here first.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

type Call = { table: string; select?: string; not?: unknown[]; order?: unknown[]; range?: [number, number] };

const stub = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  calls: [] as Call[],
  /** range start -> how many more times that page answers with an error. */
  fail: new Map<number, number>(),
}));

vi.mock('@/integrations/supabase/client', () => {
  const from = (table: string) => {
    const call: Call = { table };
    const q = {
      select: (s: string) => { call.select = s; return q; },
      not: (...a: unknown[]) => { call.not = a; return q; },
      order: (...a: unknown[]) => { call.order = a; return q; },
      range: async (lo: number, hi: number) => {
        stub.calls.push({ ...call, range: [lo, hi] });
        const left = stub.fail.get(lo) ?? 0;
        if (left > 0) {
          stub.fail.set(lo, left - 1);
          return { data: null, error: { code: '57014', message: 'canceling statement due to statement timeout' } };
        }
        return { data: stub.rows.slice(lo, hi + 1), error: null };
      },
    };
    return q;
  };
  return { SUPABASE_URL: 'https://offline.invalid', SUPABASE_PUBLISHABLE_KEY: 'offline', supabase: { from } };
});

import { fetchFranchiseGridData, splitFranchises, type FranchiseGridConfig, type FranchisePlayer } from '@/lib/gridEngine';

interface Probe extends FranchisePlayer { n: number }

const CFG: FranchiseGridConfig<Probe> = {
  table: 'probe_grid_players',
  select: 'player_name, teams, n',
  franchiseColumn: 'teams',
  orderColumn: 'player_name',
  toPlayer: (raw) => (raw.player_name
    ? { name: String(raw.player_name), franchises: splitFranchises(String(raw.teams ?? '')), n: Number(raw.n) }
    : null),
  minPoolSize: 2000,
  idColumn: 'id',
};

const TABLE_ROWS = 2345;
/** Two rows under one name, on different pages, so load order across pages is pinned. */
const SHARED = [7, 2100];
const table = () => Array.from({ length: TABLE_ROWS }, (_, i) => ({
  id: 9000 + i,
  player_name: SHARED.includes(i) ? 'Probe Namesake' : `Row ${i}`,
  teams: i % 2 ? 'aaa, bbb' : 'CCC',
  n: i,
}));

const fetchSpy = vi.fn(async () => { throw new Error('the paged door must never call fetch'); });

/** Runs the fetch to its end with the retry backoff on fake timers. */
async function settle<T>(p: Promise<T>): Promise<T> {
  await vi.advanceTimersByTimeAsync(10_000);
  return p;
}

beforeEach(() => {
  stub.rows = table();
  stub.calls.length = 0;
  stub.fail.clear();
  fetchSpy.mockClear();
  vi.stubGlobal('fetch', fetchSpy);
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the paged door, recorded on main before Round 1105 touched the engine', () => {
  it('asks for the table in three pages of 1,000, filtered and ordered the way it always has', async () => {
    const data = await settle(fetchFranchiseGridData(CFG));
    expect(data).not.toBeNull();
    expect(stub.calls).toEqual([0, 1000, 2000].map((from) => ({
      table: 'probe_grid_players',
      select: 'player_name, teams, n',
      not: ['teams', 'is', null],
      order: ['player_name', { ascending: true }],
      range: [from, from + 999],
    })));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('hands back every player in load order, and every namesake under one key in load order', async () => {
    const data = await settle(fetchFranchiseGridData(CFG));
    expect(data!.players.length).toBe(TABLE_ROWS);
    expect(data!.players.map((p) => p.n)).toEqual(Array.from({ length: TABLE_ROWS }, (_, i) => i));
    expect(data!.players[1].franchises).toEqual(new Set(['AAA', 'BBB']));
    expect(data!.players[0].id, 'no id unless it was asked for').toBeUndefined();
    expect(data!.byNormalizedName.get('probe namesake')?.map((p) => p.n)).toEqual(SHARED);
    expect(data!.byNormalizedName.get('row 11')?.map((p) => p.n)).toEqual([11]);
    expect(data!.byNormalizedName.size).toBe(TABLE_ROWS - 1);
  });

  it('withIds puts the id column first in the select and copies it onto each player', async () => {
    const data = await settle(fetchFranchiseGridData(CFG, { withIds: true }));
    expect(stub.calls.map((c) => c.select)).toEqual(Array(3).fill('id, player_name, teams, n'));
    expect(data!.players[0].id).toBe('9000');
    expect(data!.players[2344].id).toBe('11344');
  });

  it('withIds with no id column is refused before any request is made', async () => {
    const { idColumn: _dropped, ...noId } = CFG;
    const data = await settle(fetchFranchiseGridData(noId as FranchiseGridConfig<Probe>, { withIds: true }));
    expect(data).toBeNull();
    expect(stub.calls).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('a page that errors twice and then answers costs three calls for that range and loses nothing', async () => {
    stub.fail.set(1000, 2);
    const data = await settle(fetchFranchiseGridData(CFG));
    expect(stub.calls.map((c) => c.range![0])).toEqual([0, 1000, 1000, 1000, 2000]);
    expect(data!.players.length).toBe(TABLE_ROWS);
    expect(data!.players.map((p) => p.n).slice(998, 1003)).toEqual([998, 999, 1000, 1001, 1002]);
  });

  it('a page that errors three times is a failed read: null, and the read stops there', async () => {
    stub.fail.set(1000, 3);
    const data = await settle(fetchFranchiseGridData(CFG));
    expect(data).toBeNull();
    expect(stub.calls.map((c) => c.range![0])).toEqual([0, 1000, 1000, 1000]);
  });

  it('a pool under the floor is a broken read: null', async () => {
    stub.rows = table().slice(0, 1999);
    expect(await settle(fetchFranchiseGridData(CFG))).toBeNull();
    stub.rows = table().slice(0, 2000);
    stub.calls.length = 0;
    const atFloor = await settle(fetchFranchiseGridData(CFG));
    expect(atFloor!.players.length, 'exactly the floor is enough').toBe(2000);
    expect(stub.calls.map((c) => c.range![0]), 'a full last page asks for one more').toEqual([0, 1000, 2000]);
  });

  it('the engine source still carries the four strings scripts/simMlbGridPool.mjs needs, comments stripped', () => {
    const raw = readFileSync(path.resolve(process.cwd(), 'src/lib/gridEngine.ts'), 'utf8');
    const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const needle of [
      ".not(cfg.franchiseColumn, 'is', null)",
      '.order(cfg.orderColumn, { ascending: true })',
      '.range(from, from + PAGE_SIZE - 1)',
      'const PAGE_SIZE = 1000;',
    ]) {
      expect(code.split(needle).length - 1, `the engine carries ${needle} exactly once`).toBe(1);
    }
  });
});
