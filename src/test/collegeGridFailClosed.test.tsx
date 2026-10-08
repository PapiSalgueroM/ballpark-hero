/**
 * Round 1105: College Grid's key comes through a new door, and a pick made
 * while the key is missing is UNVERIFIED. Driven by
 * scripts/simCollegeGridShipped.mjs section 8, which also runs the two
 * controls below and grades them.
 *
 * WHAT MOVED. Until this round the hook paged public.college_grid_players
 * before it showed the board, so a pick could never meet a missing key. Now
 * the board is up at once and the key (two files that ship with the site)
 * loads behind it. The validator rule of this repo is fail closed: a pick the
 * page cannot check adds nothing to the guess log, costs no guess, writes
 * nothing, and the player is told to try again. Never accept on an error.
 *
 * WHAT IS REAL HERE: the hook, fetchCollegeGridData, the engine's static door,
 * the decoder and the judge, over the two committed files. Only global fetch,
 * the supabase client, sonner and the completion writers are stubbed.
 *
 *   (a) the door: two fetches, one per key file, and no read of the table.
 *   (b) the key never arrives: the board is up at once; a pick waits
 *       KEY_WAIT_MS and is then unverified.
 *   (c) the key fails five ways: unverified each time, the next pick starts a
 *       new load, and when that load succeeds the pick is judged.
 *   (d) the key lands 3 seconds after the pick: that same pick is judged, on
 *       the cell it was made for, even when another cell was tapped meanwhile.
 *   (e) the player leaves during the wait: the pick is dropped, nothing is
 *       written and nothing is said.
 *   Then the decoder alone: every damaged file is null, never a row.
 *
 * TWO NEGATIVE CONTROLS, each printing a marker line with a count:
 *   CG_FAILCLOSED_CONTROL=paged          fetchCollegeGridData reads the key the
 *       way main did (the engine's paged door over a stubbed table). (a) must fail.
 *   CG_FAILCLOSED_CONTROL=acceptmissing  a load that fails or is late hands the
 *       hook a key that says yes to any name (accept on error). (b) and (c) must fail.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';

const CONTROL = process.env.CG_FAILCLOSED_CONTROL || '';

const state = vi.hoisted(() => ({
  tableRows: [] as Record<string, unknown>[],
  /** Reads of college_grid_players (pages served under the paged control, refusals otherwise). */
  tableReads: 0,
  /** The same, never reset: the paged control's proof that it fired. */
  tableReadsEver: 0,
  acceptedLoads: 0,
  toasts: [] as unknown[][],
}));

vi.mock('@/integrations/supabase/client', () => {
  const paged = (process.env.CG_FAILCLOSED_CONTROL || '') === 'paged';
  const from = (table: string) => {
    if (table === 'college_grid_players') {
      state.tableReads += 1;
      state.tableReadsEver += 1;
      if (paged) {
        const q = {
          select: () => q, not: () => q, order: () => q,
          range: async (lo: number, hi: number) => ({ data: state.tableRows.slice(lo, hi + 1), error: null }),
        };
        return q;
      }
    }
    throw new Error(`network stubbed to throw: ${table}`);
  };
  return {
    SUPABASE_URL: 'https://offline.invalid',
    SUPABASE_PUBLISHABLE_KEY: 'offline',
    supabase: { from, functions: { invoke: () => { throw new Error('stubbed'); } }, rpc: () => { throw new Error('stubbed'); } },
  };
});

vi.mock('@/lib/collegeGrid', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/collegeGrid')>();
  const control = process.env.CG_FAILCLOSED_CONTROL || '';
  if (control && control !== 'paged' && control !== 'acceptmissing') throw new Error(`CG_FAILCLOSED_CONTROL=${control} is not a control this suite knows (paged, acceptmissing)`);
  if (control === 'paged') {
    /* The world before Round 1105: the whole key paged out of the table. */
    const { fetchFranchiseGridData } = await import('@/lib/gridEngine');
    const fetchCollegeGridData = async () => {
      const data = await fetchFranchiseGridData({
        table: 'college_grid_players', select: 'id, display_name', franchiseColumn: 'colleges', orderColumn: 'id',
        minPoolSize: actual.MIN_POOL_SIZE, toPlayer: actual.toCollegeEntry,
      });
      if (data) actual.markCollegeNamesakes(data.players);
      return data;
    };
    return { ...actual, fetchCollegeGridData };
  }
  if (control === 'acceptmissing') {
    /* Accept on error: a key that carries every name and says yes to every cell. */
    const anyone = (name: string) => [{
      name, franchises: new Set<string>(), colleges: actual.COLLEGE_LABELS.map((l) => l.label),
      groups: new Set(['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB']), bestPick: 1, firstRound: true,
      undrafted: false, heismanYear: 1999, identityOpen: false, heismanOpen: false,
    }];
    const yesKey = { players: [], byNormalizedName: { get: (name: string) => anyone(name) } } as unknown as import('@/lib/collegeGrid').CollegeGridData;
    const fetchCollegeGridData: typeof actual.fetchCollegeGridData = async (urls) => {
      const late = new Promise<null>((resolve) => { setTimeout(() => resolve(null), 1000); });
      const real = await Promise.race([actual.fetchCollegeGridData(urls), late]);
      if (real) return real;
      state.acceptedLoads += 1;
      return yesKey;
    };
    return { ...actual, fetchCollegeGridData };
  }
  return actual;
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, refreshProfile: async () => undefined }),
}));
vi.mock('sonner', () => {
  const toast = Object.assign((...args: unknown[]) => { state.toasts.push(args); }, {
    success: () => undefined, error: (...args: unknown[]) => { state.toasts.push(['error', ...args]); }, info: () => undefined,
  });
  return { toast };
});
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'fail closed bot' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

import { useCollegeGrid, KEY_WAIT_MS, KEY_UNVERIFIED } from '@/hooks/useCollegeGrid';
import { forgetStaticJson, normalizeGridName } from '@/lib/gridEngine';
import searchUrl from '@/data/collegeGrid/collegeGridSearch.json?url';
import judgeUrl from '@/data/collegeGrid/collegeGridJudge.json?url';

const note = (msg: string) => console.log('CGFAILCLOSED| ' + msg);
const SEARCH_TEXT = fs.readFileSync(path.resolve(process.cwd(), 'src/data/collegeGrid/collegeGridSearch.json'), 'utf8');
const JUDGE_TEXT = fs.readFileSync(path.resolve(process.cwd(), 'src/data/collegeGrid/collegeGridJudge.json'), 'utf8');
const KEY_FILE = path.resolve(process.cwd(), 'scripts/data/collegeGridPlayers.json');
const INDEX_HTML = '<!doctype html><html><head><title>DoUKnowBall</title></head><body><div id="root"></div></body></html>';

type Real = typeof import('@/lib/collegeGrid');
type Reply = { ok: boolean; json: () => Promise<unknown> };
/** A reply whose json() really parses the text, so HTML and a cut file fail the way they do in a browser. */
const textReply = (text: string): Reply => ({ ok: true, json: async () => JSON.parse(text) });

/** What the network does for the two key files in the current test. */
const net = {
  calls: [] as string[],
  respond: (_url: string): Promise<Reply> => Promise.reject(new Error('no world set')),
};
const serve = (search: string, judge: string) => { net.respond = async (url) => textReply(url === searchUrl ? search : judge); };
const serveGood = () => serve(SEARCH_TEXT, JUDGE_TEXT);
const judgeWith = (edit: (j: Record<string, unknown>) => void) => { const j = JSON.parse(JUDGE_TEXT); edit(j); return JSON.stringify(j); };

let real: Real;
let yesName = '';
let noName = '';
let noNameForFour = '';

const storageSnapshot = () => JSON.stringify(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)]));
const dailyKeys = () => Object.keys(localStorage).filter((k) => k.startsWith('college-grid-daily-'));

/** Advances the fake clock and lets every promise settle. */
const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

async function mount() {
  const view = renderHook(() => useCollegeGrid());
  await tick(0);
  return view;
}
type View = Awaited<ReturnType<typeof mount>>;

/** Taps a cell, submits a name and runs the clock until the pick has settled. */
async function pick(view: View, cell: number, name: string, runMs = KEY_WAIT_MS + 200) {
  act(() => view.result.current.setActiveCell(cell));
  await act(async () => {
    const done = view.result.current.submitGuess(name);
    await vi.advanceTimersByTimeAsync(runMs);
    await done;
  });
}

function expectUnverified(view: View, before: string, toastsBefore: number, cell = 0) {
  const r = view.result.current;
  expect(r.cells.map((c) => c.status), 'no cell changed').toEqual(Array(9).fill('empty'));
  expect(r.correctCount).toBe(0);
  expect(r.guessesLeft, 'no guess was spent').toBe(15);
  expect(r.gameStatus).toBe('playing');
  expect(storageSnapshot(), 'nothing was written').toBe(before);
  expect(dailyKeys(), 'no save for today exists').toEqual([]);
  expect(state.toasts.slice(toastsBefore), 'the player was told, once').toEqual([[KEY_UNVERIFIED]]);
  expect(r.activeCell, 'the cell stays open').toBe(cell);
  expect(r.validating, 'the spinner is gone').toBe(false);
}

beforeAll(async () => {
  real = await vi.importActual<Real>('@/lib/collegeGrid');
  const rows = real.decodeCollegeKey([JSON.parse(SEARCH_TEXT), JSON.parse(JUDGE_TEXT)]);
  if (!rows) throw new Error('the committed key files do not decode');
  const entries = rows.map((r) => real.toCollegeJudgeEntry(r)).filter((e): e is NonNullable<typeof e> => e !== null);
  const sharing = new Map<string, number>();
  for (const e of entries) sharing.set(normalizeGridName(e.name), (sharing.get(normalizeGridName(e.name)) ?? 0) + 1);
  const alone = entries.filter((e) => sharing.get(normalizeGridName(e.name)) === 1);
  /* Today's board, read the way the hook deals it. */
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  net.respond = () => new Promise<Reply>(() => {});
  vi.stubGlobal('fetch', (url: unknown) => { net.calls.push(String(url)); return net.respond(String(url)); });
  const probe = await mount();
  const board = probe.result.current.puzzle;
  probe.unmount();
  const at = (cell: number) => [board.rows[Math.floor(cell / 3)], board.cols[cell % 3]] as const;
  yesName = alone.find((e) => real.judgeCollegeCell(e, ...at(0)) === 'yes')?.name ?? '';
  noName = alone.find((e) => real.judgeCollegeCell(e, ...at(0)) === 'no' && real.judgeCollegeCell(e, ...at(1)) === 'no')?.name ?? '';
  noNameForFour = alone.find((e) => real.judgeCollegeCell(e, ...at(4)) === 'no' && real.judgeCollegeCell(e, ...at(0)) === 'no' && e.name !== noName)?.name ?? '';
  if (!yesName || !noName || !noNameForFour) throw new Error(`board ${board.id} gave the bot no names to play`);
  if (CONTROL === 'paged') {
    const file = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8')) as { columns: string[]; rows: unknown[][] };
    state.tableRows = file.rows.map((r) => Object.fromEntries(file.columns.map((c, i) => [c, r[i]])));
  }
  note(`board ${board.id}: yes ${yesName}, no ${noName}`);
}, 120_000);

beforeEach(() => {
  cleanup();
  localStorage.clear();
  forgetStaticJson([searchUrl, judgeUrl]);
  net.calls.length = 0;
  state.toasts.length = 0;
  state.tableReads = 0;
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.stubGlobal('fetch', (url: unknown) => { net.calls.push(String(url)); return net.respond(String(url)); });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
afterAll(() => {
  vi.unstubAllGlobals();
  if (CONTROL === 'paged') note(`control paged: ${state.tableReadsEver} reads of the stubbed table over the run`);
  if (CONTROL === 'acceptmissing') note(`control acceptmissing: ${state.acceptedLoads} loads answered with the accept anything key`);
});

describe('College Grid fail closed (Round 1105)', () => {
  it('(a) the door: one fetch per key file and no read of the table', async () => {
    serveGood();
    const view = await mount();
    await tick(50);
    expect(view.result.current.keyReady, 'the key landed').toBe(true);
    expect(net.calls.slice().sort(), 'exactly the two key files, once each').toEqual([searchUrl, judgeUrl].sort());
    expect(state.tableReads, 'no read of college_grid_players').toBe(0);
    /* And a pick is then judged at once: a true answer fills its cell. */
    await pick(view, 0, yesName, 50);
    expect(view.result.current.cells[0]).toMatchObject({ status: 'correct', playerName: yesName });
    expect(net.calls.length, 'a pick makes no request for the key').toBe(2);
  }, 120_000);

  it('(b) the key never arrives: the board is up at once, and a pick waits and is then unverified', async () => {
    net.respond = () => new Promise<Reply>(() => {});
    const view = await mount();
    const r = () => view.result.current;
    expect(r().isLoading, 'the board does not wait for the key').toBe(false);
    expect(r().dataError).toBe(false);
    expect(r().keyReady).toBe(false);
    expect(r().puzzle.rows.length + r().puzzle.cols.length, 'the six labels are served').toBe(6);
    expect(r().cells.map((c) => c.status)).toEqual(Array(9).fill('empty'));
    expect(dailyKeys(), 'nothing saved before the pick').toEqual([]);
    const before = storageSnapshot();
    /* The two requests still in flight each hold the engine's own timer for the response headers. */
    const timersBefore = vi.getTimerCount();

    act(() => r().setActiveCell(0));
    let settled = false;
    let done: Promise<void> = Promise.resolve();
    await act(async () => {
      done = r().submitGuess(yesName).then(() => { settled = true; });
      await vi.advanceTimersByTimeAsync(KEY_WAIT_MS - 1);
    });
    expect(settled, 'still waiting one millisecond before the limit').toBe(false);
    expect(r().validating, 'the spinner shows while it waits').toBe(true);
    expect(state.toasts).toEqual([]);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); await done; });
    expect(settled).toBe(true);
    expectUnverified(view, before, 0);
    expect(vi.getTimerCount(), 'the wait left no timer of its own behind').toBe(timersBefore);
  }, 120_000);

  const FAILURES: [string, () => void][] = [
    ['fetch throws', () => { net.respond = async () => { throw new TypeError('Failed to fetch'); }; }],
    ['a 200 with an HTML body', () => serve(SEARCH_TEXT, INDEX_HTML)],
    ['truncated JSON', () => serve(SEARCH_TEXT, JUDGE_TEXT.slice(0, Math.floor(JUDGE_TEXT.length / 2)))],
    ['the two stamps differ', () => serve(SEARCH_TEXT, judgeWith((j) => { j.stamp = '0000000000000000'; }))],
    ['a column one row short', () => serve(SEARCH_TEXT, judgeWith((j) => { (j.p as unknown[]).pop(); }))],
  ];

  it('(c) the key fails five ways: unverified each time, the next pick starts a new load, and a good load is judged', async () => {
    for (const [what, breakIt] of FAILURES) {
      cleanup();
      localStorage.clear();
      forgetStaticJson([searchUrl, judgeUrl]);
      net.calls.length = 0;
      state.toasts.length = 0;
      breakIt();
      const view = await mount();
      await tick(2000);
      const r = () => view.result.current;
      expect(r().isLoading, `${what}: the board is up`).toBe(false);
      expect(r().keyReady, `${what}: no key`).toBe(false);
      const before = storageSnapshot();
      const callsAfterMount = net.calls.length;
      expect(callsAfterMount, `${what}: the mount asked for the files`).toBeGreaterThanOrEqual(2);

      await pick(view, 0, yesName);
      expect(net.calls.length, `${what}: the pick started a new load`).toBeGreaterThan(callsAfterMount);
      expectUnverified(view, before, 0);

      /* The network heals. The same pick, made again, starts another load and is judged. */
      serveGood();
      const callsBeforeHeal = net.calls.length;
      await pick(view, 0, yesName);
      expect(net.calls.length, `${what}: the healed pick asked again`).toBeGreaterThan(callsBeforeHeal);
      expect(r().cells[0], `${what}: a true answer fills its cell`).toMatchObject({ status: 'correct', playerName: yesName });
      expect(r().guessesLeft).toBe(14);
      await pick(view, 1, noName, 50);
      expect(r().guessesLeft, `${what}: a definite no costs exactly one`).toBe(13);
      expect(r().correctCount).toBe(1);
      await tick(2000);
      view.unmount();
    }
    note(`fail closed: ${FAILURES.length} of ${FAILURES.length} failure worlds left the pick unverified and judged it after the network healed`);
  }, 120_000);

  it('(d) the key lands 3 seconds after the pick: that pick is judged on the cell it was made for', async () => {
    for (const [name, expected] of [[yesName, 'correct'], [noName, 'wrong']] as const) {
      cleanup();
      localStorage.clear();
      forgetStaticJson([searchUrl, judgeUrl]);
      net.calls.length = 0;
      state.toasts.length = 0;
      const held: (() => void)[] = [];
      net.respond = (url) => new Promise<Reply>((resolve) => { held.push(() => resolve(textReply(url === searchUrl ? SEARCH_TEXT : JUDGE_TEXT))); });
      const view = await mount();
      const r = () => view.result.current;
      act(() => r().setActiveCell(0));
      let done: Promise<void> = Promise.resolve();
      await act(async () => { done = r().submitGuess(name); await vi.advanceTimersByTimeAsync(1000); });
      /* A tap on another cell while the pick waits moves the open cell, not the pick. */
      act(() => r().setActiveCell(4));
      await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
      expect(r().validating, 'still waiting at 3 seconds').toBe(true);
      await act(async () => { held.forEach((release) => release()); await vi.advanceTimersByTimeAsync(10); await done; });
      expect(r().cells[0].status, `${name}: the captured cell is the one ${expected}`).toBe(expected);
      expect(r().cells[4].status, 'the cell tapped during the wait is untouched').toBe('empty');
      expect(r().guessesLeft, 'exactly one guess is on the log').toBe(14);
      expect(net.calls.length, 'no second request for either file').toBe(2);
      expect(state.toasts, 'nothing was reported as unverified').toEqual([]);
      await tick(2000);
      view.unmount();
    }
  }, 120_000);

  it('(e) the player leaves while a pick waits: the pick is dropped, nothing is written, nothing is said', async () => {
    const held: (() => void)[] = [];
    net.respond = (url) => new Promise<Reply>((resolve) => { held.push(() => resolve(textReply(url === searchUrl ? SEARCH_TEXT : JUDGE_TEXT))); });
    const view = await mount();
    act(() => view.result.current.setActiveCell(0));
    const before = storageSnapshot();
    let done: Promise<void> = Promise.resolve();
    /* A definite no: if it were judged after he left, it would write a spent guess into today's save. */
    await act(async () => { done = view.result.current.submitGuess(noName); await vi.advanceTimersByTimeAsync(1000); });
    view.unmount();
    held.forEach((release) => release());
    await vi.advanceTimersByTimeAsync(3000);
    await done;
    expect(storageSnapshot(), 'no guess was written after he left').toBe(before);
    expect(dailyKeys()).toEqual([]);
    expect(state.toasts).toEqual([]);
  }, 120_000);
});

describe('decodeCollegeKey: null on any doubt, never a row from a damaged file', () => {
  const good = () => [JSON.parse(SEARCH_TEXT), JSON.parse(JUDGE_TEXT)] as [Record<string, unknown>, Record<string, unknown>];
  const col = (j: Record<string, unknown>, k: string) => j[k] as unknown[];

  it('the committed pair decodes to one row per player with the nine keys the judge entry reads', () => {
    const [search, judge] = good();
    const rows = real.decodeCollegeKey([search, judge]);
    expect(rows).not.toBeNull();
    expect(rows!.length).toBe(search.count);
    expect(Object.keys(rows![0]).sort()).toEqual(['best_pick', 'colleges', 'display_name', 'first_round', 'groups', 'heisman_open', 'heisman_year', 'identity_open', 'undrafted']);
    expect(rows![0].display_name).toBe((search.names as string[])[0]);
    const firstWinner = (judge.h as [number, number][])[0];
    expect(rows![firstWinner[0]].heisman_year).toBe(firstWinner[1]);
    const noPick = rows!.find((r) => r.best_pick === null);
    expect(noPick, 'a stored pick of 0 reads back as no pick').toBeTruthy();
  });

  const DAMAGE: [string, (s: Record<string, unknown>, j: Record<string, unknown>) => unknown[] | void][] = [
    ['the files in the wrong order', (s, j) => [j, s]],
    ['no search file', (_s, j) => [null, j]],
    ['no judge file', (s) => [s, null]],
    ['the judge file is an array', (s) => [s, []]],
    ['nothing at all', () => []],
    ['two things that are not files', () => [1, 'x']],
    ['search version 2', (s) => { s.v = 2; }],
    ['judge version 2', (_s, j) => { j.v = 2; }],
    ['the two stamps differ', (_s, j) => { j.stamp = '0000000000000000'; }],
    ['an empty stamp on both', (s, j) => { s.stamp = ''; j.stamp = ''; }],
    ['the two counts differ', (_s, j) => { j.count = (j.count as number) - 1; }],
    ['a count that is not a whole number', (s, j) => { s.count = 35598.5; j.count = 35598.5; }],
    ['one name short', (s) => { col(s, 'names').pop(); }],
    ['a name that is empty', (s) => { col(s, 'names')[7] = ''; }],
    ['a name that is not text', (s) => { col(s, 'names')[7] = 7; }],
    ['fewer rows than the floor', (s, j) => {
      s.count = 100; j.count = 100; s.names = col(s, 'names').slice(0, 100);
      for (const k of ['s', 'g', 'p', 'f']) j[k] = col(j, k).slice(0, 100);
      j.h = [];
    }],
    ['the school column one row short', (_s, j) => { col(j, 's').pop(); }],
    ['the group column one row short', (_s, j) => { col(j, 'g').pop(); }],
    ['the pick column one row short', (_s, j) => { col(j, 'p').pop(); }],
    ['the flag column one row short', (_s, j) => { col(j, 'f').pop(); }],
    ['the flag column missing', (_s, j) => { delete j.f; }],
    ['the school list missing', (_s, j) => { delete j.schools; }],
    ['a school that is not text', (_s, j) => { col(j, 'schools')[3] = 3; }],
    ['a school index past the list', (_s, j) => { col(j, 's')[5] = [99999]; }],
    ['a negative school index', (_s, j) => { col(j, 's')[5] = [-1]; }],
    ['a school index that is text', (_s, j) => { col(j, 's')[5] = ['12']; }],
    ['a school row that is not a list', (_s, j) => { col(j, 's')[5] = 12; }],
    ['a group letter outside the eight', (_s, j) => { col(j, 'g')[5] = 'QX'; }],
    ['a group row that is not text', (_s, j) => { col(j, 'g')[5] = ['Q']; }],
    ['a negative pick', (_s, j) => { col(j, 'p')[5] = -3; }],
    ['a pick that is not whole', (_s, j) => { col(j, 'p')[5] = 1.5; }],
    ['a pick that is text', (_s, j) => { col(j, 'p')[5] = '12'; }],
    ['a flag of 32', (_s, j) => { col(j, 'f')[5] = 32; }],
    ['a negative flag', (_s, j) => { col(j, 'f')[5] = -1; }],
    ['a flag that is not whole', (_s, j) => { col(j, 'f')[5] = 2.5; }],
    ['a flag that says first round both ways', (_s, j) => { col(j, 'f')[5] = 3; }],
    ['a Heisman row past the count', (_s, j) => { col(j, 'h').push([99999, 1999]); }],
    ['a Heisman year that is text', (_s, j) => { col(j, 'h')[0] = [(col(j, 'h')[0] as number[])[0], '1999']; }],
    ['a Heisman pair of three', (_s, j) => { col(j, 'h')[0] = [1, 1999, 0]; }],
    ['the same Heisman row twice', (_s, j) => { col(j, 'h').push(col(j, 'h')[0]); }],
    ['a Heisman list that is not a list', (_s, j) => { j.h = {}; }],
  ];

  it(`every one of ${DAMAGE.length} damaged pairs is null, and none of them throws`, () => {
    const survived: string[] = [];
    for (const [what, damage] of DAMAGE) {
      const [search, judge] = good();
      const files = damage(search, judge) ?? [search, judge];
      let rows: unknown = 'threw';
      expect(() => { rows = real.decodeCollegeKey(files as unknown[]); }, what).not.toThrow();
      if (rows !== null) survived.push(what);
    }
    note(`decoder: ${DAMAGE.length - survived.length} of ${DAMAGE.length} damaged pairs refused`);
    expect(survived).toEqual([]);
  }, 120_000);
});
