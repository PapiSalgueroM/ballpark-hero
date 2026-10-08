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

/* ------------------------------------------------------------------------- */
/* Added WITH the lift (Round 1105): the static door.                         */
/* ------------------------------------------------------------------------- */

import { fetchStaticJson, indexFranchiseRows, STATIC_INDEX_SLICE, type GridStaticSource } from '@/lib/gridEngine';

type Reply = { ok: boolean; json: () => Promise<unknown> };
const okJson = (body: unknown): Reply => ({ ok: true, json: async () => body });
/** What the live host sends for a missing file: index.html with a 200. */
const htmlWith200 = (): Reply => ({ ok: true, json: async () => { throw new SyntaxError('Unexpected token < in JSON'); } });

let urlSeq = 0;
/** A fresh pair of URLs per test: the engine holds one promise per URL for the page's life. */
const freshUrls = () => { urlSeq += 1; return [`/assets/probeA-${urlSeq}.json`, `/assets/probeB-${urlSeq}.json`]; };

const staticRows = () => table().map((r) => ({ player_name: r.player_name, teams: r.teams, n: r.n }));
const staticCfg = (urls: string[], toRows: GridStaticSource['toRows']): FranchiseGridConfig<Probe> => ({ ...CFG, staticSource: { urls, toRows } });
/** files[0] carries the rows, files[1] a stamp that has to match. */
const pairToRows: GridStaticSource['toRows'] = (files) => {
  const [a, b] = files as [{ stamp: string; rows: Record<string, unknown>[] }, { stamp: string }];
  return a?.stamp && a.stamp === b?.stamp && Array.isArray(a.rows) ? a.rows : null;
};

describe('the static door (Round 1105)', () => {
  it('fetches each URL once, makes no table request, and indexes the same way the paged door does', async () => {
    const urls = freshUrls();
    const seen: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => { seen.push(url); return okJson(url === urls[0] ? { stamp: 's1', rows: staticRows() } : { stamp: 's1' }); }));
    const data = await settle(fetchFranchiseGridData(staticCfg(urls, pairToRows)));
    expect(seen.slice().sort()).toEqual(urls.slice().sort());
    expect(stub.calls, 'no request to the table').toEqual([]);
    expect(data!.players.map((p) => p.n)).toEqual(Array.from({ length: TABLE_ROWS }, (_, i) => i));
    expect(data!.byNormalizedName.get('probe namesake')?.map((p) => p.n)).toEqual(SHARED);
    /* A second load in the same page life costs no request at all. */
    const again = await settle(fetchFranchiseGridData(staticCfg(urls, pairToRows)));
    expect(again!.players.length).toBe(TABLE_ROWS);
    expect(seen.length).toBe(2);
  });

  it('two callers share one in flight request', async () => {
    const [url] = freshUrls();
    let release: (r: Reply) => void = () => {};
    const fetchMock = vi.fn(() => new Promise<Reply>((r) => { release = r; }));
    vi.stubGlobal('fetch', fetchMock);
    const first = fetchStaticJson(url);
    const second = fetchStaticJson(url);
    expect(second, 'the very same promise').toBe(first);
    release(okJson({ hello: 1 }));
    expect(await settle(first)).toEqual({ hello: 1 });
    expect(await settle(second)).toEqual({ hello: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('a URL that fails three attempts is null, is not asked again until the next call, and is then retried', async () => {
    const [url] = freshUrls();
    let healthy = false;
    const fetchMock = vi.fn(async () => { if (!healthy) throw new TypeError('Failed to fetch'); return okJson({ ok: 1 }); });
    vi.stubGlobal('fetch', fetchMock);
    expect(await settle(fetchStaticJson(url))).toBeNull();
    expect(fetchMock, 'the first attempt and two more (400 ms, 800 ms)').toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock, 'nothing retries on its own').toHaveBeenCalledTimes(3);
    healthy = true;
    expect(await settle(fetchStaticJson(url))).toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(vi.getTimerCount(), 'no timer is left alive').toBe(0);
  });

  it('a 200 with an HTML body, a 404 and a body of null are all failures: null', async () => {
    for (const reply of [htmlWith200(), { ok: false, json: async () => ({}) }, okJson(null)]) {
      const urls = freshUrls();
      const fetchMock = vi.fn(async () => reply);
      vi.stubGlobal('fetch', fetchMock);
      expect(await settle(fetchFranchiseGridData(staticCfg(urls, pairToRows)))).toBeNull();
      expect(fetchMock, 'three attempts per URL').toHaveBeenCalledTimes(6);
      expect(stub.calls, 'and never a fall back to the table').toEqual([]);
    }
  });

  it('a body that parses but is refused by toRows is null, and the next call asks for each URL exactly once more', async () => {
    const urls = freshUrls();
    let stampB = 'OTHER';
    const fetchMock = vi.fn(async (url: string) => okJson(url === urls[0] ? { stamp: 's1', rows: staticRows() } : { stamp: stampB }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await settle(fetchFranchiseGridData(staticCfg(urls, pairToRows))), 'the stamps differ').toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    stampB = 's1';
    const data = await settle(fetchFranchiseGridData(staticCfg(urls, pairToRows)));
    expect(fetchMock, 'one new request per URL, no more').toHaveBeenCalledTimes(4);
    expect(data!.players.length).toBe(TABLE_ROWS);
    expect(stub.calls).toEqual([]);
  });

  it('a static pool under the floor is null and the engine forgets it itself: the next call asks for each URL once more', async () => {
    const urls = freshUrls();
    let short = true;
    const fetchMock = vi.fn(async (url: string) => okJson(url === urls[0] ? { stamp: 's1', rows: short ? staticRows().slice(0, 1999) : staticRows() } : { stamp: 's1' }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await settle(fetchFranchiseGridData(staticCfg(urls, pairToRows))), 'one player under the floor').toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    /* No forgetStaticJson from the caller: a sport that binds to this door does not have to remember to. */
    short = false;
    const data = await settle(fetchFranchiseGridData(staticCfg(urls, pairToRows)));
    expect(fetchMock, 'one new request per URL, no more').toHaveBeenCalledTimes(4);
    expect(data!.players.length).toBe(TABLE_ROWS);
    /* And a pool that passed is kept: a third load costs nothing. */
    await settle(fetchFranchiseGridData(staticCfg(urls, pairToRows)));
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  /** A reply whose body arrives through a reader, the way a browser hands it over. */
  type Step = { bytes: Uint8Array; afterMs: number } | 'stall';
  const BYTES = new TextEncoder().encode(JSON.stringify({ name: 'Zoë Probe', n: [1, 2, 3] }));
  function streamed(steps: Step[], signal: AbortSignal | undefined, log: { cancelled: number }): Reply {
    let at = 0;
    const read = () => new Promise<{ done: boolean; value?: Uint8Array }>((resolve, reject) => {
      const step = steps[at];
      at += 1;
      if (step === undefined) { resolve({ done: true }); return; }
      if (step === 'stall') {
        /* Nothing more ever arrives. A real stream errors when the request is aborted. */
        signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        return;
      }
      setTimeout(() => resolve({ done: false, value: step.bytes }), step.afterMs);
    });
    const body = { getReader: () => ({ read, cancel: async () => { log.cancelled += 1; } }) };
    return { ok: true, body, json: async () => { throw new Error('a streamed body must be read through its reader'); } } as unknown as Reply;
  }

  it('a body that stalls after the headers is cut after 20 seconds without a byte, and the next call starts over', async () => {
    const [url] = freshUrls();
    const log = { cancelled: 0 };
    const signals: AbortSignal[] = [];
    let healthy = false;
    const fetchMock = vi.fn(async (_url: string, init?: { signal?: AbortSignal }) => {
      if (init?.signal) signals.push(init.signal);
      /* Split inside the two byte letter, so the pieces only read right when they are joined as a stream. */
      const cut = BYTES.indexOf(0xc3) + 1;
      return healthy
        ? streamed([{ bytes: BYTES.slice(0, cut), afterMs: 5 }, { bytes: BYTES.slice(cut), afterMs: 5 }], init?.signal, log)
        : streamed([{ bytes: BYTES.slice(0, 9), afterMs: 5 }, 'stall'], init?.signal, log);
    });
    vi.stubGlobal('fetch', fetchMock);
    const load = fetchStaticJson(url);
    let settled = false;
    void load.then(() => { settled = true; });
    await vi.advanceTimersByTimeAsync(19_000);
    expect(fetchMock, 'still inside the first attempt at 19 seconds').toHaveBeenCalledTimes(1);
    expect(signals[0].aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1_500);
    expect(signals[0].aborted, 'no byte for 20 seconds: the attempt is cut').toBe(true);
    expect(fetchMock, 'and the second attempt is under way').toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(settled).toBe(true);
    expect(await load, 'three stalled attempts are a failed load').toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(log.cancelled, 'each stalled reader was let go').toBe(3);
    expect(vi.getTimerCount(), 'no timer is left alive').toBe(0);
    healthy = true;
    expect(await settle(fetchStaticJson(url)), 'the next call asks again and reads the two pieces as one text').toEqual({ name: 'Zoë Probe', n: [1, 2, 3] });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('a slow body that keeps arriving is never cut, however long the whole of it takes', async () => {
    const [url] = freshUrls();
    const log = { cancelled: 0 };
    const signals: AbortSignal[] = [];
    /* Six pieces, 15 seconds apart: 90 seconds in all, and never 20 seconds without a byte. */
    const size = Math.ceil(BYTES.length / 6);
    const steps: Step[] = Array.from({ length: 6 }, (_, i) => ({ bytes: BYTES.slice(i * size, (i + 1) * size), afterMs: 15_000 }));
    const fetchMock = vi.fn(async (_url: string, init?: { signal?: AbortSignal }) => { if (init?.signal) signals.push(init.signal); return streamed(steps, init?.signal, log); });
    vi.stubGlobal('fetch', fetchMock);
    const load = fetchStaticJson(url);
    await vi.advanceTimersByTimeAsync(95_000);
    expect(await load).toEqual({ name: 'Zoë Probe', n: [1, 2, 3] });
    expect(fetchMock, 'one request, never restarted').toHaveBeenCalledTimes(1);
    expect(signals[0].aborted).toBe(false);
    expect(log.cancelled).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('the static door indexes one slice of rows to a task, and the index is row for row the one built in one go', async () => {
    const urls = freshUrls();
    const total = STATIC_INDEX_SLICE * 2 + 345;
    const big = Array.from({ length: total }, (_, i) => ({
      player_name: i === 7 || i === total - 3 ? 'Probe Namesake' : `Row ${i}`,
      teams: i % 2 ? 'aaa, bbb' : 'CCC',
      n: i,
    }));
    vi.stubGlobal('fetch', vi.fn(async (url: string) => okJson(url === urls[0] ? { stamp: 's1', rows: big } : { stamp: 's1' })));
    const cfg = staticCfg(urls, pairToRows);
    let indexed = 0;
    const counting: FranchiseGridConfig<Probe> = { ...cfg, toPlayer: (raw) => { indexed += 1; return cfg.toPlayer(raw); } };
    const load = fetchFranchiseGridData(counting);
    let done = false;
    void load.then(() => { done = true; });
    /* One timer at a time: what was indexed between two of them is what one task indexed. */
    const perTask: number[] = [];
    for (let turn = 0; !done && turn < 40; turn += 1) {
      const before = indexed;
      await vi.advanceTimersToNextTimerAsync();
      if (indexed > before) perTask.push(indexed - before);
    }
    expect(done, 'the load finished').toBe(true);
    expect(perTask, 'two whole slices and the rest, each in a task of its own').toEqual([STATIC_INDEX_SLICE, STATIC_INDEX_SLICE, 345]);
    const data = await load;
    const whole = indexFranchiseRows(cfg, big)!;
    expect(data!.players.map((p) => p.n)).toEqual(whole.players.map((p) => p.n));
    expect(data!.byNormalizedName.size).toBe(whole.byNormalizedName.size);
    expect(data!.byNormalizedName.get('probe namesake')?.map((p) => p.n), 'namesakes from two slices, in load order').toEqual([7, total - 3]);
    expect(vi.getTimerCount(), 'no timer is left alive').toBe(0);
  });

  it('withIds with no id column is still refused before anything is fetched', async () => {
    const urls = freshUrls();
    const fetchMock = vi.fn(async () => okJson({}));
    vi.stubGlobal('fetch', fetchMock);
    const { idColumn: _dropped, ...noId } = staticCfg(urls, pairToRows);
    expect(await settle(fetchFranchiseGridData(noId as FranchiseGridConfig<Probe>, { withIds: true }))).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
