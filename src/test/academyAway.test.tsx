/* Round 581: the academy pays for time away whether the tab was closed or only
   hidden, and the same rule decides both.

   THE BUG. useWonderkidFactory ticked a fixed quarter second per interval
   callback. A browser slows a hidden tab's interval to once a second and then to
   once a minute, so three hidden hours trained the academy for a minute or two,
   and every callback stamped lastSeen, so a reload afterwards could not pay those
   hours either. The rules modal promises: "Away from the game the scouts and
   coaches keep working at half speed for up to 8 hours, and the calendar waits
   for you: nobody ages while you are gone."

   HOW THIS DRIVES IT. The real hook, the real lib, jsdom's real localStorage.
   The interval runs on fake timers and the wall clock is pinned, so a watched
   tab is a callback every 250ms and a hidden one is a single callback a minute
   with the wall clock jumping sixty seconds in between, which is what a
   throttled tab actually receives.

   THE ORACLE is the lib's own away rule, applyAway, fed the same gaps. The hook
   has to land on exactly what the rule says, which is the promise above written
   as code: half speed, eight hours per absence, nobody ages, no Deadline Day.

   The wrapper is scripts/simTycoonLoads.mjs; run that, not this file alone. */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, cleanup } from '@testing-library/react';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn() }));
import { useWonderkidFactory } from '@/hooks/useWonderkidFactory';
import { SAVE_KEY, applyAway, deserialize } from '@/lib/wonderkidFactory';
import type { FactoryState } from '@/lib/wonderkidFactory';
import corpus from './fixtures/tycoonSaves.json';

const EPOCH = 1767225600000;
const CALLBACK_MS = 250;
const WAKE_MS = 60_000;
const HOUR = 3600 * 1000;
const CAP_MS = 8 * HOUR;
const TEST_MS = 120_000;

type Entry = { name: string; key: string; raw: string };
const raw = (name: string) => {
  const e = (corpus as { entries: Entry[] }).entries.find(x => x.key === 'academy' && x.name === name);
  if (!e) throw new Error(`no academy save called ${name}`);
  return e.raw;
};

let vnow = 0;
let latest: ReturnType<typeof useWonderkidFactory> | null = null;
function Probe() {
  latest = useWonderkidFactory();
  return null;
}
const state = (): FactoryState => {
  if (!latest) throw new Error('the academy hook is not mounted');
  return latest.state;
};

function mount() {
  return render(<Probe />);
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
 *  clock moving a whole wake between them. */
function hideFor(ms: number) {
  setVisible(false);
  for (let i = 0; i < Math.round(ms / WAKE_MS); i += 1) {
    /* The wall clock jumps a whole wake and exactly one callback fires, so every
       gap the hook sees is WAKE_MS, the first one included. */
    act(() => { vnow += WAKE_MS; vi.advanceTimersByTime(CALLBACK_MS); });
  }
  setVisible(true);
}

const clone = (s: FactoryState): FactoryState => JSON.parse(JSON.stringify(s));
const kids = (s: FactoryState) => s.prospects.map(k => ({ id: k.id, age: k.age, ageClock: k.ageClock, rating: k.rating }));

function measured(line: string) {
  console.log(`LOADS| ${line}`);
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

describe('Wonderkid Factory away time', () => {
  it('1 watched: a minute of callbacks ages every kid a minute and keeps no absence open', () => {
    localStorage.setItem(SAVE_KEY, raw('midAcademy'));
    mount();
    const before = kids(state());
    watch(60_000);
    const after = kids(state());
    const aged = after[0].ageClock - before[0].ageClock;
    expect(aged, `sixty watched seconds moved the first kid's age clock ${aged}s`).toBeCloseTo(60, 6);
    expect(state().awayMs ?? 0, 'watching left an absence open').toBe(0);
    measured(`watched: 60s of 250ms callbacks aged the first kid ${aged.toFixed(3)}s, absence meter ${state().awayMs ?? 0}`);
  }, TEST_MS);

  it('2 hidden for three hours: exactly the away rule, nobody ages, no Deadline Day', () => {
    localStorage.setItem(SAVE_KEY, raw('midAcademy'));
    mount();
    watch(1_000);
    const atHide = clone(state());
    hideFor(3 * HOUR);
    const s = state();

    const oracle = clone(atHide);
    for (let i = 0; i < 180; i += 1) applyAway(oracle, WAKE_MS);

    expect(s.awayMs, `three hidden hours left the absence meter at ${s.awayMs}ms`).toBe(3 * HOUR);
    for (const was of kids(atHide)) {
      const now = s.prospects.find(k => k.id === was.id);
      expect(now, `kid ${was.id} left while the tab was hidden`).toBeDefined();
      expect(`${now!.age}:${now!.ageClock}`, `kid ${was.id} aged while the tab was hidden`).toBe(`${was.age}:${was.ageClock}`);
    }
    expect(s.deadlineIn, 'the Deadline Day countdown ran while the tab was hidden').toBe(atHide.deadlineIn);
    expect(s.deadlineLeft, 'Deadline Day went live while the tab was hidden').toBe(0);
    expect(JSON.stringify(kids(s)), 'the hidden tab trained the academy differently from the away rule given the same gaps').toBe(JSON.stringify(kids(oracle)));
    const trained = s.prospects.find(k => k.id === atHide.prospects[0].id)!.rating - atHide.prospects[0].rating;
    measured(`hidden 3h: meter ${(s.awayMs! / HOUR).toFixed(3)}h, credited ${(s.awayMs! / HOUR / 2).toFixed(3)}h of training, first kid +${trained.toFixed(2)} rating, ages unchanged, matches applyAway exactly`);
  }, TEST_MS);

  it('3 hidden for twenty hours leaves the same academy as closed for twenty hours', () => {
    localStorage.setItem(SAVE_KEY, raw('midAcademy'));
    const hiddenView = mount();
    watch(1_000);
    hideFor(20 * HOUR);
    const hidden = clone(state());
    hiddenView.unmount();

    localStorage.clear();
    vnow = 0;
    vi.clearAllTimers();
    localStorage.setItem(SAVE_KEY, raw('midAcademy'));
    const closedView = mount();
    watch(1_000);
    closedView.unmount();
    vnow += 20 * HOUR;
    mount();
    const closed = clone(state());

    expect(closed.awayMs, `twenty closed hours credited ${closed.awayMs}ms of absence`).toBe(CAP_MS);
    expect(hidden.awayMs, `twenty hidden hours credited ${hidden.awayMs}ms of absence against ${closed.awayMs}ms closed`).toBe(closed.awayMs);
    /* The outcome, not just the meter (Round 581 review): growth slows toward the
       ceiling, so paying an absence in one giant step used to overpay against the
       same absence paid a wake at a time. */
    const shape = (s: FactoryState) => JSON.stringify({ kids: kids(s), scoutProgress: s.scoutProgress, seed: s.seed, nextId: s.nextId });
    expect(shape(hidden), 'twenty hidden hours and twenty closed hours left different academies').toBe(shape(closed));
    measured(`cap: 20h hidden and 20h closed both credited ${((closed.awayMs ?? 0) / HOUR).toFixed(2)}h and left identical academies (${closed.prospects.length} kids)`);
  }, TEST_MS);

  it('4 closed for twenty hours pays the capped eight on load', () => {
    localStorage.setItem(SAVE_KEY, raw('midAcademy'));
    const view = mount();
    watch(1_000);
    const before = kids(state());
    view.unmount();
    vnow += 20 * HOUR;
    mount();
    const s = state();
    expect(s.awayMs, 'the load path did not credit the eight hour cap').toBe(CAP_MS);
    for (const was of before) {
      const now = s.prospects.find(k => k.id === was.id);
      expect(now && `${now.age}:${now.ageClock}`, `kid ${was.id} aged while the tab was closed`).toBe(`${was.age}:${was.ageClock}`);
    }
    measured(`closed 20h: the load credited ${((s.awayMs ?? 0) / HOUR).toFixed(2)}h of absence, nobody aged`);
  }, TEST_MS);

  it('5 coming back ends the absence and the calendar turns again', () => {
    localStorage.setItem(SAVE_KEY, raw('midAcademy'));
    mount();
    watch(1_000);
    hideFor(HOUR);
    const clockAtReturn = state().prospects[0].ageClock;
    watch(10_000);
    expect(state().awayMs, 'watching again did not close the absence').toBe(0);
    const moved = state().prospects[0].ageClock - clockAtReturn;
    expect(moved, `ten watched seconds after coming back moved the age clock ${moved}s`).toBeGreaterThan(9);
    measured(`return: absence closed, ten watched seconds aged the first kid ${moved.toFixed(2)}s`);
  }, TEST_MS);

  it('6 a save with duplicate kid ids loads with every id unique and nextId above them', () => {
    localStorage.setItem(SAVE_KEY, raw('duplicateIds'));
    mount();
    const ids = state().prospects.map(k => k.id);
    expect(new Set(ids).size, `ids ${ids.join(',')}`).toBe(ids.length);
    expect(Math.max(...ids), `nextId ${state().nextId} is not above every id`).toBeLessThan(state().nextId);
    const rawIds = (deserialize(raw('duplicateIds'), EPOCH)?.prospects ?? []).map(k => k.id);
    expect(rawIds[0], 'the first holder of a shared id lost it').toBe(12);
    measured(`ids: ${ids.join(',')} with nextId ${state().nextId}; the first holder kept 12`);
  }, TEST_MS);

  it('10 a showcase does not multiply away time, and waits for you', () => {
    localStorage.setItem(SAVE_KEY, raw('midAcademy'));
    mount();
    watch(1_000);
    act(() => { latest!.doShowcase(); });
    const atHide = clone(state());
    expect(atHide.showcaseLeft, 'the showcase did not light, so this proves nothing').toBeGreaterThan(0);
    hideFor(10 * 60_000);
    const s = state();
    const oracle = clone(atHide);
    oracle.showcaseLeft = 0;
    for (let i = 0; i < 10; i += 1) applyAway(oracle, WAKE_MS);
    expect(JSON.stringify(kids(s)), 'ten hidden minutes with a showcase lit trained differently from ten hidden minutes without one').toBe(JSON.stringify(kids(oracle)));
    expect(s.showcaseLeft, 'the showcase burned while nobody could see it').toBe(atHide.showcaseLeft);
    measured(`showcase: 10 hidden minutes with x3 lit trained exactly as without it; ${s.showcaseLeft.toFixed(2)}s of showcase still waiting`);
  }, TEST_MS);

  it('11 a hidden tab whose wakes jitter never opens a fresh eight hours', () => {
    localStorage.setItem(SAVE_KEY, raw('midAcademy'));
    mount();
    watch(1_000);
    const before = kids(state());
    setVisible(false);
    /* A throttled tab that is sometimes woken late, so the next wake lands
       700ms after it: a gap short enough to look like somebody watching. */
    for (let i = 0; i < 1200; i += 1) {
      act(() => { vnow += WAKE_MS; vi.advanceTimersByTime(CALLBACK_MS); });
      act(() => { vnow += 700; vi.advanceTimersByTime(CALLBACK_MS); });
    }
    setVisible(true);
    const s = state();
    expect(s.awayMs, `twenty hidden hours with short gaps left the absence meter at ${((s.awayMs ?? 0) / HOUR).toFixed(2)}h`).toBe(CAP_MS);
    for (const was of before) {
      const now = s.prospects.find(k => k.id === was.id);
      expect(now && `${now.age}:${now.ageClock}`, `kid ${was.id} aged during a short gap in a hidden tab`).toBe(`${was.age}:${was.ageClock}`);
    }
    measured(`jitter: 20h hidden with a 700ms gap after every wake credited ${((s.awayMs ?? 0) / HOUR).toFixed(2)}h, nobody aged`);
  }, TEST_MS);

  it('13 fifteen minutes hidden leaves the same academy as fifteen minutes closed, while kids are still growing', () => {
    /* Twenty hours saturates every kid at his ceiling, so it cannot tell one
       giant away step from many small ones. Fifteen minutes can: the review
       measured a closed tab paid in one step at 85 and 80 against 83.5 and 79.3
       for the same absence paid a wake at a time. */
    localStorage.setItem(SAVE_KEY, raw('midAcademy'));
    const hiddenView = mount();
    watch(1_000);
    hideFor(15 * 60_000);
    const hidden = clone(state());
    hiddenView.unmount();

    localStorage.clear();
    vnow = 0;
    vi.clearAllTimers();
    localStorage.setItem(SAVE_KEY, raw('midAcademy'));
    const closedView = mount();
    watch(1_000);
    closedView.unmount();
    vnow += 15 * 60_000;
    mount();
    const closed = clone(state());

    const growing = closed.prospects.filter(k => k.rating < k.potential).length;
    expect(growing, 'every kid had already reached his ceiling, so this cannot tell step sizes apart').toBeGreaterThan(0);
    const ratings = (s: FactoryState) => JSON.stringify(s.prospects.map(k => [k.id, k.rating]));
    expect(ratings(hidden), 'fifteen hidden minutes and fifteen closed minutes trained the academy differently').toBe(ratings(closed));
    measured(`15 minutes: hidden and closed left identical ratings with ${growing} kid(s) still below their ceiling`);
  }, TEST_MS);

  it('12 a watched tab on a slow device keeps the calendar turning', () => {
    localStorage.setItem(SAVE_KEY, raw('midAcademy'));
    mount();
    const before = state().prospects[0].ageClock;
    for (let i = 0; i < 75; i += 1) {
      act(() => { vnow += 800; vi.advanceTimersByTime(CALLBACK_MS); });
    }
    const aged = state().prospects[0].ageClock - before;
    expect(aged, `sixty watched seconds of 800ms callbacks aged the first kid ${aged}s`).toBeCloseTo(60, 6);
    expect(state().awayMs ?? 0, 'a slow but visible page was paid as away').toBe(0);
    measured(`slow device: 60s of 800ms callbacks on a visible page aged the first kid ${aged.toFixed(3)}s, no absence`);
  }, TEST_MS);
});
