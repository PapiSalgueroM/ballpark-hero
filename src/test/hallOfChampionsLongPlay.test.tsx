/* Round 1548: Hall of Champions keeps a deep museum and pays a hidden tab, in
   the real hook.

   THE BUGS. The loader refused funds over 1e15 (and career admissions over
   1e18), and the price curve walks every long museum past both, so the hook
   started a fresh museum and its five second saver wrote it over the old one.
   And the clock paid a fixed quarter second per interval callback, so a tab
   the browser throttled to a callback a minute earned minutes overnight.

   HOW THIS DRIVES IT. The real hook, the real lib, jsdom's real localStorage;
   only the catalog fetch is replaced (a fixture with the real wing sizes and
   made up names) and the database client is a stub that throws. The interval
   runs on fake timers with the wall clock pinned, so a watched tab is a
   callback every 250ms and a hidden one is one callback a minute with the wall
   clock jumping sixty seconds between them, which is what a throttled tab gets.
   The oracle is the lib's own away rule (applyAway) fed the same gaps.

   The wrapper is scripts/simHallLongPlay.mjs (section 4 and its hook controls);
   run that, not this file alone. */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, cleanup } from '@testing-library/react';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: '',
  SUPABASE_PUBLISHABLE_KEY: '',
  supabase: new Proxy({}, { get() { throw new Error('this test never reaches the database'); } }),
}));
vi.mock('@/lib/hallOfChampions', async importOriginal => {
  const real = await importOriginal<typeof import('@/lib/hallOfChampions')>();
  const sizes: Record<string, number> = { sb: 60, wnba: 29, cfb: 49, nba: 80, cbb: 87, cup: 110, ws: 121, epl: 127, nrl: 117, afl: 129 };
  const rows = new Map(Object.entries(sizes).map(([k, n]) => [k, Array.from({ length: n }, (_, i) => ({ year: 1890 + i, team: `Fixture ${k} ${i + 1}` }))]));
  const wings = real.buildCatalog(rows);
  return { ...real, fetchCatalog: async () => wings };
});

import { useHallOfChampions } from '@/hooks/useHallOfChampions';
import { SAVE_KEY, applyAway, freshState, loadSave, serialize, totalIncome } from '@/lib/hallOfChampions';
import type { HallState } from '@/lib/hallOfChampions';

const EPOCH = 1_800_000_000_000;
const CALLBACK_MS = 250;
const WAKE_MS = 60_000;
const HOUR = 3600 * 1000;
const CAP_MS = 8 * HOUR;
const AWAY_RATE = 0.5;
const TEST_MS = 120_000;

let vnow = 0;
let latest: ReturnType<typeof useHallOfChampions> | null = null;
function Probe() {
  latest = useHallOfChampions();
  return null;
}
const hook = () => {
  if (!latest) throw new Error('the hall hook is not mounted');
  return latest;
};
const state = (): HallState => {
  const s = hook().state;
  if (!s) throw new Error('the museum is not loaded');
  return s;
};

/** Mounts the hook and lets the catalog promise land. */
async function mount() {
  render(<Probe />);
  for (let i = 0; i < 20 && hook().loadState !== 'ready'; i += 1) {
    await act(async () => { await Promise.resolve(); });
  }
  expect(hook().loadState, 'the museum never finished loading').toBe('ready');
}

/** A watched tab: a callback every quarter second. */
function watch(ms: number) {
  for (let i = 0; i < Math.round(ms / CALLBACK_MS); i += 1) {
    act(() => { vnow += CALLBACK_MS; vi.advanceTimersByTime(CALLBACK_MS); });
  }
}

function setVisible(visible: boolean) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (visible ? 'visible' : 'hidden') });
  act(() => { document.dispatchEvent(new Event('visibilitychange')); });
}

/** A hidden tab the browser has throttled: one callback per wake, the wall
 *  clock moving `wake` between them. Stays hidden; setVisible(true) returns. */
function hiddenWakes(n: number, wake = WAKE_MS) {
  setVisible(false);
  for (let i = 0; i < n; i += 1) {
    act(() => { vnow += wake; vi.advanceTimersByTime(CALLBACK_MS); });
  }
}

/** A museum with three wings on the wall and no rush running. */
function midMuseum(): HallState {
  const s = freshState(7);
  s.owned = { sb: 60, wnba: 29, cfb: 20 };
  s.openWings = ['sb', 'wnba', 'cfb'];
  s.funds = 1000;
  s.clock = 5000;
  s.rushUntil = 0;
  s.rushReadyAt = 1e9;
  return s;
}

const clone = (s: HallState): HallState => JSON.parse(JSON.stringify(s));
function measured(line: string) {
  console.log(`HALL| ${line}`);
}
const near = (a: number, b: number) => Math.abs(a / b - 1);
function keptAside(): string[] {
  const out: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i);
    if (k && k.startsWith(`${SAVE_KEY}.broken-`)) out.push(localStorage.getItem(k) ?? '');
  }
  return out;
}

beforeEach(() => {
  vnow = 0;
  latest = null;
  localStorage.clear();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vi.spyOn(Date, 'now').mockImplementation(() => EPOCH + Math.round(vnow));
  setVisible(true);
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Hall of Champions long play', () => {
  it('1 a museum past both old ceilings loads and is written back, not replaced', async () => {
    const deep = midMuseum();
    deep.owned = { sb: 60, wnba: 29, cfb: 49, nba: 80, cbb: 87, cup: 110, ws: 121, epl: 127, nrl: 117, afl: 83 };
    deep.openWings = ['sb', 'wnba', 'cfb', 'nba', 'cbb', 'cup', 'ws', 'epl', 'nrl', 'afl'];
    deep.plaques = ['sb', 'wnba', 'cfb', 'nba', 'cbb', 'cup', 'ws', 'epl', 'nrl'];
    deep.funds = 3.2e16;
    deep.careerEarned = 4.1e18;
    localStorage.setItem(SAVE_KEY, serialize(deep, EPOCH));
    await mount();
    expect(state().funds, 'the deep museum did not load').toBe(3.2e16);
    expect(state().careerEarned).toBe(4.1e18);
    expect(state().owned).toEqual(deep.owned);
    watch(6_000);
    const back = loadSave(localStorage.getItem(SAVE_KEY));
    expect(back, 'the saver wrote something the loader refuses').not.toBeNull();
    expect(back!.state.owned, 'the saver wrote a different museum over the deep one').toEqual(deep.owned);
    expect(back!.state.funds).toBeGreaterThanOrEqual(3.2e16);
    expect(keptAside(), 'a museum that loads was kept aside as refused').toEqual([]);
    measured(`deep: a save holding ${deep.funds.toExponential(2)} funds and ${deep.careerEarned.toExponential(2)} career loaded and was written back with ${back!.state.funds.toExponential(4)}`);
  }, TEST_MS);

  it('2 a tab hidden ten hours is paid by the away rule, stops at the cap and says so on return', async () => {
    localStorage.setItem(SAVE_KEY, serialize(midMuseum(), EPOCH));
    await mount();
    const wings = hook().wings;
    watch(1_000);
    const atHide = clone(state());
    hiddenWakes(600);
    const s = state();
    const oracle = clone(atHide);
    for (let i = 0; i < 600; i += 1) applyAway(wings, oracle, WAKE_MS);
    const owed = totalIncome(wings, atHide, atHide.clock) * AWAY_RATE * (CAP_MS / 1000);
    const paid = s.funds - atHide.funds;
    expect(paid, `ten hidden hours paid ${paid.toFixed(0)}, eight hours at the away rate is ${owed.toFixed(0)}`).toBeGreaterThanOrEqual(owed * 0.999);
    expect(s.funds, 'the hidden tab was paid differently from the away rule given the same gaps').toBe(oracle.funds);
    expect(s.awayMs, 'the absence meter did not stop at the cap').toBe(CAP_MS);
    setVisible(true);
    watch(CALLBACK_MS);
    const welcome = hook().offlineEarned;
    expect(welcome, 'coming back to the page showed no welcome').not.toBeNull();
    expect(near(welcome!, paid), `the welcome said ${welcome}, the hall was paid ${paid}`).toBeLessThan(1e-9);
    expect(state().awayMs, 'watching again left the absence open').toBe(0);
    measured(`hidden: 600 wakes a minute apart paid x${(paid / owed).toFixed(6)} of eight hours at the away rate; meter ${s.awayMs} ms; welcome ${welcome!.toExponential(4)}`);
  }, TEST_MS);

  it('3 three hidden hours and then seven closed are one absence under one eight hour cap', async () => {
    localStorage.setItem(SAVE_KEY, serialize(midMuseum(), EPOCH));
    await mount();
    const wings = hook().wings;
    watch(1_000);
    const atHide = clone(state());
    hiddenWakes(180);
    cleanup();
    latest = null;
    vnow += 7 * HOUR;
    setVisible(true);
    await mount();
    const oracle = clone(atHide);
    for (let i = 0; i < 180; i += 1) applyAway(wings, oracle, WAKE_MS);
    applyAway(wings, oracle, 7 * HOUR);
    const owed = totalIncome(wings, atHide, atHide.clock) * AWAY_RATE * (CAP_MS / 1000);
    const paid = state().funds - atHide.funds;
    expect(near(paid, owed), `three hidden hours and seven closed paid x${(paid / owed).toFixed(4)} of one eight hour absence`).toBeLessThan(1e-6);
    expect(state().funds, 'the reload paid differently from the away rule given the same absence').toBe(oracle.funds);
    measured(`reload: 3 h hidden then 7 h closed paid x${(paid / owed).toFixed(6)} of one eight hour absence`);
  }, TEST_MS);

  it('4 a save the loader refuses is kept aside once before the fresh museum is written', async () => {
    const bad = serialize({ ...midMuseum(), funds: -5 }, EPOCH);
    localStorage.setItem(SAVE_KEY, bad);
    await mount();
    expect(keptAside(), 'the refused save was not kept aside').toEqual([bad]);
    watch(6_000);
    const fresh = loadSave(localStorage.getItem(SAVE_KEY));
    expect(fresh, 'the fresh museum was not saved').not.toBeNull();
    expect(fresh!.state.owned).toEqual({});
    cleanup();
    latest = null;
    localStorage.setItem(SAVE_KEY, bad);
    await mount();
    expect(keptAside(), 'the same refused bytes were kept aside twice').toEqual([bad]);
    measured(`refused: the bytes were kept aside once, ${bad.length} characters`);
  }, TEST_MS);

  it('5 a watched minute is paid at full rate and closes an absence', async () => {
    const s0 = midMuseum();
    s0.awayMs = 3 * HOUR;
    localStorage.setItem(SAVE_KEY, serialize(s0, EPOCH));
    await mount();
    const before = state().funds;
    const income = totalIncome(hook().wings, state(), state().clock);
    watch(60_000);
    const paid = state().funds - before;
    expect(near(paid, income * 60), `a watched minute paid x${(paid / (income * 60)).toFixed(6)} of a minute`).toBeLessThan(1e-9);
    expect(state().awayMs, 'watching left the absence open').toBe(0);
    measured(`watched: 240 callbacks paid x${(paid / (income * 60)).toFixed(9)} of a minute at full rate`);
  }, TEST_MS);

  it('6 half a minute in another tab pays as away time and shows no welcome', async () => {
    localStorage.setItem(SAVE_KEY, serialize(midMuseum(), EPOCH));
    await mount();
    watch(1_000);
    const before = state().funds;
    hiddenWakes(30, 1_000);
    setVisible(true);
    watch(CALLBACK_MS);
    expect(state().funds).toBeGreaterThan(before);
    expect(hook().offlineEarned, 'a glance at another tab raised the welcome').toBeNull();
  }, TEST_MS);
});
