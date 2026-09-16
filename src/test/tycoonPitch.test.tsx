/* Round 583 part two: the pitch plays the engine's match and nothing else.

   THE RISK. The old pitch reshuffled ten dots and a ball on a 1900ms timer that
   knew nothing about the goals, so what you watched was a screensaver beside a
   scoreboard. A replay layer can fail the same way while looking busier: a ball
   that runs at a goal on its own timer, a goal replayed twice or never, a burst
   of stale replays when you come back from another room, or motion for somebody
   who asked for less.

   HOW. The real page, hook and lib (the tick is wrapped only to record what it
   returns), jsdom's localStorage, frames every 200ms (the hook's own tick), fake
   timers advanced in step, and a seeded Math.random. The ball carries the replay
   it is showing (data-ball-at, data-replay-id, data-replay-minute), which is what
   the tests read.

   The wrapper is scripts/simTycoonPitch.mjs; run that, not this file alone. */
import './dailyReload/mocks';
import { resetMocks } from './dailyReload/mocks';
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent } from '@testing-library/react';
import { mountPage } from './dailyReload/harness';
import type { TickEvent, TycoonState } from '@/lib/stadiumTycoon';

const recorded = vi.hoisted(() => ({ events: [] as TickEvent[], last: null as TycoonState | null }));
vi.mock('@/lib/stadiumTycoon', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/stadiumTycoon')>();
  return {
    ...real,
    tick: (...args: Parameters<typeof real.tick>) => {
      const r = real.tick(...args);
      recorded.events.push(...r.events);
      recorded.last = r.state;
      return r;
    },
  };
});

import StadiumTycoon from '@/pages/StadiumTycoon';
import { loadGameContent } from '@/data/gameContent/loader';
import { TYCOON_SAVE_KEY, newTycoon, serializeTycoon, ACHIEVEMENTS } from '@/lib/stadiumTycoon';

const FRAME_MS = 200;
const EPOCH = 1767225600000;
const MATCH_SEC = 126;
const TEST_MS = 300_000;

let vnow = 0;
let frameSeq = 0;
const frames = new Map<number, FrameRequestCallback>();

function seededRandom(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Seen = { id: string; at: string; minute: number; frame: number; landed: boolean };
/** What the ball showed, and the frame each goal was committed on. */
type Log = { seen: Map<string, Seen>; commits: number[]; n: number };
const newLog = (): Log => ({ seen: new Map(), commits: [], n: 0 });
/** Advance in 200ms frames and write down every replay the ball shows. */
function play(ms: number, log?: Log) {
  const n = Math.round(ms / FRAME_MS);
  for (let i = 0; i < n; i += 1) {
    const k = recorded.events.length;
    act(() => {
      vnow += FRAME_MS;
      vi.advanceTimersByTime(FRAME_MS);
      const due = [...frames.values()];
      frames.clear();
      for (const cb of due) cb(vnow);
    });
    if (!log) continue;
    log.n += 1;
    for (const e of recorded.events.slice(k)) if (e.kind === 'goal' || e.kind === 'conceded') log.commits.push(log.n);
    sample(log);
  }
}
function sample(log: Log) {
  const ball = document.querySelector('[data-ball]');
  const id = ball?.getAttribute('data-replay-id');
  if (!ball || !id || log.seen.has(id)) return;
  log.seen.set(id, {
    id, at: ball.getAttribute('data-ball-at') ?? '', minute: Number(ball.getAttribute('data-replay-minute')), frame: log.n,
    landed: ball.classList.contains('st-ball-landed'),
  });
}
const shownOf = (log: Log) => [...log.seen.values()].sort((a, b) => Number(a.id) - Number(b.id));
/** Frames from each goal's commit to the ball first showing it. */
const lagsOf = (log: Log) => shownOf(log).map((r, i) => r.frame - (log.commits[i] ?? Infinity));

function mountWith(state: TycoonState) {
  localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(state, EPOCH));
  mountPage(<StadiumTycoon />, '/stadium-tycoon');
}
const scoringClub = () => { const f = newTycoon(EPOCH); return { ...f, levels: { ...f.levels, squad: 5 } }; };
const goalsOf = (events: TickEvent[]) => events
  .filter(e => e.kind === 'goal' || e.kind === 'conceded')
  .map(e => `${e.kind === 'goal' ? 'for' : 'against'} ${e.minute}'`);
function measured(line: string) {
  console.log(`PITCH| ${line}`);
}
function pitch() {
  const el = document.querySelector('div.cursor-pointer.select-none.group');
  if (!el) throw new Error('no pitch on the Stadium tab');
  return el;
}

// Resolve the real guide before the synchronous match loop can starve the module loader.
beforeAll(async () => { expect(await loadGameContent('/stadium-tycoon')).not.toBeNull(); });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vnow = 0;
  frames.clear();
  recorded.events = [];
  recorded.last = null;
  localStorage.clear();
  resetMocks();
  vi.spyOn(Date, 'now').mockImplementation(() => EPOCH + Math.round(vnow));
  vi.spyOn(performance, 'now').mockImplementation(() => vnow);
  vi.spyOn(Math, 'random').mockImplementation(seededRandom(583));
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frameSeq += 1; frames.set(frameSeq, cb); return frameSeq; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id); });
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('the pitch plays the engine\'s match', () => {
  it('1 over 30 matches every goal the engine commits is replayed once, at its end, stamped with its minute', () => {
    mountWith(scoringClub());
    const log = newLog();
    play(30 * MATCH_SEC * 1000 + 2000, log);
    const committed = goalsOf(recorded.events);
    const shown = shownOf(log).map(r => `${r.at} ${r.minute}'`);
    const matches = recorded.last?.totalMatches ?? 0;
    expect(matches, 'the rig did not play 30 matches').toBeGreaterThanOrEqual(30);
    expect(committed.length, 'no goals were committed, so there was nothing to replay').toBeGreaterThan(60);
    const firstDiff = committed.findIndex((g, i) => shown[i] !== g);
    expect(shown.length, `the engine committed ${committed.length} goals and the ball replayed ${shown.length}`).toBe(committed.length);
    expect(firstDiff, firstDiff < 0 ? '' : `goal ${firstDiff + 1}: the engine committed ${committed[firstDiff]} and the ball showed ${shown[firstDiff]}`).toBe(-1);
    const both = new Set(committed.map(g => g.split(' ')[0]));
    expect(both.size, 'only one side scored, so the replay was never asked to pick an end').toBe(2);
    const lags = lagsOf(log);
    const worst = Math.max(...lags);
    /* A replay runs 1.3s, 7 frames at this cadence, and a third goal in the queue
       cuts the older ones short, so no goal can wait longer than one replay. The
       fence is one frame over that bound. */
    expect(worst, `a goal waited ${worst} frames for its replay`).toBeLessThanOrEqual(8);
    const ball = document.querySelector('[data-ball]');
    expect(ball?.getAttribute('data-ball-at'), 'the ball is still in a net two seconds after the last goal').toBe('play');
    measured(`${matches} matches: ${committed.length} goals committed (${committed.filter(g => g.startsWith('for')).length} yours, ${committed.filter(g => g.startsWith('against')).length} theirs), ${shown.length} replayed one for one by end and minute; ${lags.filter(l => l === 0).length} on the frame they were scored, the longest wait ${worst} frames`);
  }, TEST_MS);

  it('2 goals scored while you are in another room are on the scoreboard when you come back, and never replayed late', async () => {
    mountWith(scoringClub());
    play(20 * 1000);
    const tab = (room: string) => document.querySelector(`[data-room="${room}"]`) as HTMLElement;
    await act(async () => { fireEvent.click(tab('league')); });
    const before = recorded.events.length;
    play(3 * MATCH_SEC * 1000);
    const away = goalsOf(recorded.events.slice(before));
    expect(away.length, 'nobody scored while the League tab was showing, so there was no backlog to test').toBeGreaterThan(3);
    expect(document.querySelector('[data-ball]'), 'the pitch rendered under the League tab').toBeNull();
    await act(async () => { fireEvent.click(tab('stadium')); });
    const back = recorded.events.length;
    const log = newLog();
    sample(log);
    const board = document.querySelector('[data-tycoon-pitch]')?.textContent ?? '';
    const last = recorded.last as TycoonState;
    expect(board, 'the scoreboard does not show the score the engine is holding').toContain(`YOU ${last.goalsFor}`);
    play(MATCH_SEC * 1000, log);
    const after = goalsOf(recorded.events.slice(back));
    const shown = shownOf(log).map(r => `${r.at} ${r.minute}'`);
    expect(shown, `coming back replayed ${shown.length} goals for the ${after.length} scored after the return`).toEqual(after);
    measured(`${away.length} goals while the League tab showed, 0 replayed on return; the scoreboard read YOU ${last.goalsFor}; the ${after.length} goals after the return replayed one for one`);
  }, TEST_MS);

  it('3 under reduced motion no replay runs and no spark or pop is drawn, while the score and the floaters still land', () => {
    const real = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: /prefers-reduced-motion:\s*reduce/.test(query),
      media: query, onchange: null,
      addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    try {
      mountWith(scoringClub());
      let moved = 0;
      let floaters = 0;
      const n = Math.round((5 * MATCH_SEC * 1000) / FRAME_MS);
      for (let i = 0; i < n; i += 1) {
        play(FRAME_MS);
        if (document.querySelector('[data-ball]')?.getAttribute('data-ball-at') !== 'play') moved += 1;
        floaters = Math.max(floaters, document.querySelectorAll('.st-float').length);
      }
      for (let i = 0; i < 8; i += 1) { act(() => { fireEvent.click(pitch(), { clientX: 10, clientY: 10 }); }); play(FRAME_MS); }
      const goals = goalsOf(recorded.events).length;
      expect(goals, 'nobody scored, so there was nothing to hold still').toBeGreaterThan(5);
      expect(moved, `the ball left play on ${moved} frames under reduced motion`).toBe(0);
      expect(document.querySelectorAll('.st-spark').length, 'sparks were drawn under reduced motion').toBe(0);
      expect(document.querySelector('.st-pop-a, .st-pop-b'), 'the pitch popped under reduced motion').toBeNull();
      expect(floaters, 'no floater landed under reduced motion, so the money went unannounced').toBeGreaterThan(0);
      measured(`reduced motion: ${goals} goals over 5 matches, the ball never left play, 0 sparks and no pop after 8 taps, up to ${floaters} floaters on screen`);
    } finally {
      window.matchMedia = real;
    }
  }, TEST_MS);

  it('4 a tap pops the pitch and throws six sparks, and the taps chip counts and then clears', () => {
    mountWith(scoringClub());
    for (let i = 0; i < 12; i += 1) {
      act(() => { fireEvent.click(pitch(), { clientX: 20, clientY: 20 }); });
      act(() => { vi.advanceTimersByTime(100); });
    }
    const chip = document.querySelector('[data-tap-run]');
    expect(chip?.textContent?.trim(), 'the chip does not read 12 taps after 12 taps').toBe('12 taps');
    expect(/x\s*\d|\d\s*x/i.test(chip?.textContent ?? ''), 'the chip reads like a multiplier').toBe(false);
    expect(document.querySelectorAll('.st-spark').length, 'a tap did not throw six sparks').toBe(6);
    expect(document.querySelector('[data-tycoon-pitch]')?.className ?? '', 'the pitch did not pop').toMatch(/st-pop-[ab]/);
    act(() => { vi.advanceTimersByTime(1399); });
    expect(document.querySelector('[data-tap-run]'), 'the chip cleared before a second and a half idle').not.toBeNull();
    act(() => { vi.advanceTimersByTime(2); });
    expect(document.querySelector('[data-tap-run]'), 'the chip is still there after a second and a half idle').toBeNull();
    const players = document.querySelectorAll('[data-tycoon-pitch] .st-drift').length;
    expect(players, 'the pitch does not carry 22 players').toBe(22);
    measured(`12 taps: the chip read "${chip?.textContent?.trim()}", 6 sparks, the pitch popped, the chip cleared at 1.5s idle; ${players} players on the pitch`);
  }, TEST_MS);

  it('5 the office is five tiles, one panel at a time, Upgrades first', () => {
    const f = newTycoon(EPOCH);
    mountWith({ ...f, legacyPoints: 4, ach: ACHIEVEMENTS.slice(0, 3).map(a => a.id) });
    const tiles = [...document.querySelectorAll('[data-tile]')] as HTMLElement[];
    const titles = tiles.map(t => t.textContent ?? '');
    for (const want of ['Upgrades', 'Payroll', 'Badges', 'Legacy', 'Records']) {
      expect(titles.some(t => t.includes(want)), `no ${want} tile`).toBe(true);
    }
    expect(tiles.length, 'the office is not five tiles').toBe(5);
    const has = (text: string) => [...document.querySelectorAll('button')].some(b => (b.textContent ?? '').includes(text));
    expect(has('Ticket Office'), 'Upgrades is not the panel open on arrival').toBe(true);
    expect(has('Turnstile Steward'), 'the payroll shows before its tile is opened').toBe(false);
    const open = (title: string) => act(() => { fireEvent.click(tiles.find(t => (t.textContent ?? '').includes(title)) as HTMLElement); });
    open('Payroll');
    expect(has('Turnstile Steward') && !has('Ticket Office'), 'Payroll did not replace Upgrades').toBe(true);
    open('Legacy');
    expect(document.querySelector('[data-legacy-board] [data-perk="sway"]'), 'the Legacy tile did not open the boardroom').not.toBeNull();
    expect(tiles.find(t => t.hasAttribute('data-legacy-drawer'))?.textContent ?? '', 'the Legacy tile does not carry the balance').toContain('4 pts');
    open('Badges');
    expect(document.body.textContent ?? '', 'the Badges tile did not open the badges').toContain(`3 of ${ACHIEVEMENTS.length} earned`);
    open('Records');
    expect(document.body.textContent ?? '', 'the Records tile did not open the records').toContain('Career goals');
    measured('five tiles: Upgrades open on arrival, and Payroll, Legacy, Badges and Records each replaced it with their own panel');
  }, TEST_MS);

  it('6 in a goal storm the older replays land on their final frame, so the pitch never falls behind the match', () => {
    mountWith(scoringClub());
    /* Every roll lands: both sides score every minute, far faster than a replay runs. */
    vi.mocked(Math.random).mockImplementation(() => 0.001);
    const log = newLog();
    play(2 * MATCH_SEC * 1000, log);
    /* Then nobody scores, and the queue gets five seconds to drain: the last two
       replays run in full, 2.6s, after the older ones land. */
    vi.mocked(Math.random).mockImplementation(() => 0.999);
    play(5000, log);
    const committed = goalsOf(recorded.events);
    const shown = shownOf(log);
    const landed = shown.filter(r => r.landed).length;
    const lags = lagsOf(log);
    const worst = Math.max(...lags);
    expect(committed.length, 'the storm did not happen').toBeGreaterThan(100);
    expect(shown.map(r => `${r.at} ${r.minute}'`), 'the storm lost or reordered a replay').toEqual(committed);
    /* Measured: 179 of 358 land in this storm, so a third keeps daylight under it
       while a queue that never cuts short (0) still fails. */
    expect(landed, 'too few replays landed on their final frame, so the queue was not cut short').toBeGreaterThan(committed.length / 3);
    /* Three seconds: two goals a minute arrive every 1.4s and a landing takes 0.25s. */
    expect(worst, `a goal waited ${worst} frames for its replay, so the pitch fell behind the match`).toBeLessThanOrEqual(15);
    expect(document.querySelector('[data-ball]')?.getAttribute('data-ball-at'), 'the ball is still in a net after the storm').toBe('play');
    measured(`goal storm: ${committed.length} goals in 2 matches, all shown in order, ${landed} landed on their final frame, the longest wait ${worst} frames`);
  }, TEST_MS);
});
