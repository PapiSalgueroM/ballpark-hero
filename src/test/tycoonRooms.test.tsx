/* Round 580: Stadium Tycoon gets an Academy tab, and neither room may stop while
   the other one is on screen.

   THE RISK. Putting two idle games on one page with tabs is easy to get subtly
   wrong in a way no screenshot shows. If the stadium's hook lived inside the
   Stadium room, opening the Academy would unmount it: the match clock would stop,
   the save would be written, and coming back would pay the gap as "away" money at
   half rate while the match itself stood still. If the academy panel unmounted
   under the Stadium tab, the kids would stop ageing and Deadline Day would stop
   coming round. Either one is a game quietly running slower for anyone who uses
   both tabs, which is the whole point of the merge.

   HOW THIS DRIVES IT. The real page, both real hooks, both real libs and jsdom's
   real localStorage. Only the network is stubbed (./dailyReload/mocks). Frames
   arrive every 16ms the way a browser hands them out, the academy's 250ms
   interval runs on fake timers that advance in the same 16ms steps, and the wall
   clock, performance.now and Math.random are all pinned so a run is reproducible.
   Round 424's lesson applies: the tycoon clock bug only existed at the real
   frame cadence.

   THE SIGNALS.
   - The stadium's match clock, in seconds: (matches x 90 + minute) x 1.4 plus
     the banked seconds. No random roll touches it, so an extra draw anywhere on
     the page cannot move it, which is why it is the measure rather than money.
   - The academy's own save, byte for byte against the standalone Wonderkid
     Factory page given the same seconds.

   The wrapper is scripts/simTycoonRooms.mjs; run that, not this file alone. Its
   negative controls point this suite at broken copies of the page. */
import './dailyReload/mocks';
import { recordCompletion, resetMocks } from './dailyReload/mocks';
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent } from '@testing-library/react';
import { mountPage } from './dailyReload/harness';
import StadiumTycoon from '@/pages/StadiumTycoon';
import WonderkidFactory from '@/pages/WonderkidFactory';
import { TYCOON_SAVE_KEY, newLeague, leagueShape } from '@/lib/stadiumTycoon';
import { SAVE_KEY as ACADEMY_SAVE_KEY } from '@/lib/wonderkidFactory';
import corpus from './fixtures/tycoonSaves.json';

const FRAME_MS = 16;
const EPOCH = 1767225600000;
/** One tick's worth of play the loop has not banked yet, plus one frame. */
const RESIDUE_SEC = 0.216;
/* The loop credits play in ticks of at least 0.2s, so at any instant it can owe
   under 0.216s. Two sessions given the same frames should agree exactly; 0.5s is
   a little over twice the structural bound. */
const MARGIN_SEC = 0.5;
const TEST_MS = 120_000;

type Entry = { name: string; key: 'stadium' | 'academy'; raw: string; loaded: string | null };
const entries = (corpus as { entries: Entry[] }).entries;
function save(key: Entry['key'], name: string): Entry {
  const e = entries.find(x => x.key === key && x.name === name);
  if (!e) throw new Error(`no ${key} save called ${name} in the corpus`);
  return e;
}

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

/** A clean rig: empty storage, the clock at zero, the same random stream. */
function resetRig() {
  cleanup();
  vi.clearAllTimers();
  vnow = 0;
  frames.clear();
  localStorage.clear();
  resetMocks();
  vi.mocked(Math.random).mockImplementation(seededRandom(20260914));
}

/** Advance `ms` in 16ms steps: the wall clock, the timers, and a frame for
 *  whoever asked for one. The clock moves even when nobody asked. */
function step(ms: number) {
  const n = Math.round(ms / FRAME_MS);
  for (let i = 0; i < n; i += 1) {
    act(() => {
      vnow += FRAME_MS;
      vi.advanceTimersByTime(FRAME_MS);
      const due = [...frames.values()];
      frames.clear();
      for (const cb of due) cb(vnow);
    });
  }
}

/** Let a lazy panel resolve without letting any time pass. */
async function settle() {
  for (let i = 0; i < 10; i += 1) {
    await act(async () => { await new Promise(r => setImmediate(r)); });
  }
}

async function openTab(room: 'stadium' | 'academy' | 'league') {
  const tab = document.querySelector(`[data-room="${room}"]`);
  if (!tab) throw new Error(`no ${room} tab on the page`);
  await act(async () => { fireEvent.click(tab); });
  await settle();
  await act(async () => { await vi.dynamicImportSettled(); });
  if (room === 'academy' && !document.querySelector('[data-academy-panel]')) {
    throw new Error('the Academy tab opened but the academy panel never rendered');
  }
}

/** Both hooks save on pagehide, so this reads the true state of either room. */
function read(key: string): string | null {
  act(() => { window.dispatchEvent(new Event('pagehide')); });
  return localStorage.getItem(key);
}

function clockSec(raw: string | null): number {
  if (!raw) throw new Error('no stadium save to read the clock from');
  const s = JSON.parse(raw);
  return ((s.totalMatches ?? 0) * 90 + s.minute) * 1.4 + (s.matchSec ?? 0);
}

function accent(room: 'stadium' | 'academy'): string | null {
  return document.querySelector(`[data-room="${room}"]`)?.getAttribute('data-accent') ?? null;
}

function measured(line: string) {
  console.log(`ROOMS| ${line}`);
}

beforeAll(async () => {
  /* Loaded once up front so the Academy tab's lazy import is a cached module. */
  await import('@/components/tycoon/AcademyPanel');
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vi.spyOn(Date, 'now').mockImplementation(() => EPOCH + Math.round(vnow));
  vi.spyOn(performance, 'now').mockImplementation(() => vnow);
  vi.spyOn(Math, 'random').mockImplementation(seededRandom(20260914));
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frameSeq += 1; frames.set(frameSeq, cb); return frameSeq; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id); });
  resetRig();
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Stadium Tycoon rooms', () => {
  it('1 rig alive: the Stadium tab alone runs the real clock and starts no academy', () => {
    const fresh = save('stadium', 'fresh');
    localStorage.setItem(TYCOON_SAVE_KEY, fresh.raw);
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    const before = clockSec(fresh.loaded);
    step(90_000);
    const gained = clockSec(read(TYCOON_SAVE_KEY)) - before;
    expect(gained, `90s of 16ms frames moved the match clock ${gained.toFixed(3)}s, so this rig is not driving the real loop`).toBeGreaterThan(90 - RESIDUE_SEC);
    expect(gained, `90s of 16ms frames moved the match clock ${gained.toFixed(3)}s`).toBeLessThanOrEqual(90 + RESIDUE_SEC);
    expect(document.querySelector('[data-academy-panel]'), 'an academy panel rendered before anyone opened the Academy tab').toBeNull();
    expect(localStorage.getItem(ACADEMY_SAVE_KEY), 'an academy save was written by a page where nobody opened the Academy').toBeNull();
    measured(`rig: 90s on the Stadium tab moved the match clock ${gained.toFixed(3)}s; no academy panel, no academy save`);
  }, TEST_MS);

  it('2 the stadium never stops while you are in the Academy', async () => {
    const mid = save('stadium', 'midGame');

    localStorage.setItem(TYCOON_SAVE_KEY, mid.raw);
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    step(60_000);
    await openTab('academy');
    step(60_000);
    await openTab('stadium');
    step(60_000);
    const session = clockSec(read(TYCOON_SAVE_KEY)) - clockSec(mid.loaded);

    resetRig();
    localStorage.setItem(TYCOON_SAVE_KEY, mid.raw);
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    step(180_000);
    const baseline = clockSec(read(TYCOON_SAVE_KEY)) - clockSec(mid.loaded);

    const drift = Math.abs(session - baseline);
    expect(baseline, `the baseline itself moved the clock ${baseline.toFixed(3)}s in 180s, so the rig is broken`).toBeGreaterThan(180 - RESIDUE_SEC);
    expect(drift, `60s Stadium, 60s Academy, 60s Stadium moved the match clock ${session.toFixed(3)}s against ${baseline.toFixed(3)}s for 180s on the Stadium tab: the stadium lost ${drift.toFixed(3)}s while the Academy was open`).toBeLessThanOrEqual(MARGIN_SEC);
    measured(`continuity: Stadium, Academy, Stadium moved the clock ${session.toFixed(3)}s; 180s straight moved it ${baseline.toFixed(3)}s; drift ${drift.toFixed(3)}s, margin ${MARGIN_SEC}s`);
  }, TEST_MS);

  it('3 the Academy tab is the same academy as the Wonderkid Factory page', async () => {
    const mid = save('academy', 'midAcademy');

    localStorage.setItem(ACADEMY_SAVE_KEY, mid.raw);
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    await openTab('academy');
    step(60_000);
    const merged = read(ACADEMY_SAVE_KEY);

    resetRig();
    localStorage.setItem(ACADEMY_SAVE_KEY, mid.raw);
    mountPage(<WonderkidFactory />, '/wonderkid-factory');
    step(60_000);
    const standalone = read(ACADEMY_SAVE_KEY);

    expect(merged, 'the Academy tab wrote no academy save').not.toBeNull();
    expect(merged === mid.raw, 'sixty seconds on the Academy tab changed nothing in the academy, so this proves nothing').toBe(false);
    expect(merged, 'sixty seconds on the Academy tab and sixty on the Wonderkid Factory page left different academies').toBe(standalone);
    measured(`parity: 60s on the Academy tab and 60s on /wonderkid-factory wrote byte identical saves (${(merged ?? '').length} bytes)`);
  }, TEST_MS);

  it('4 the academy keeps its watched clock under the Stadium tab once opened', async () => {
    const mid = save('academy', 'midAcademy');
    const agedBefore = JSON.parse(mid.loaded as string).prospects[0].ageClock;

    localStorage.setItem(ACADEMY_SAVE_KEY, mid.raw);
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    await openTab('academy');
    step(60_000);
    await openTab('stadium');
    step(120_000);
    await openTab('academy');
    const merged = read(ACADEMY_SAVE_KEY);

    resetRig();
    localStorage.setItem(ACADEMY_SAVE_KEY, mid.raw);
    mountPage(<WonderkidFactory />, '/wonderkid-factory');
    step(180_000);
    const standalone = read(ACADEMY_SAVE_KEY);

    expect(merged, 'an academy opened, left under the Stadium tab for two minutes and reopened is not the academy that was watched for three').toBe(standalone);
    const aged = (JSON.parse(merged as string).prospects[0].ageClock - agedBefore);
    measured(`watched clock: the first kid's age clock moved ${aged.toFixed(2)}s over 180s, 120 of them with the Stadium tab showing; save identical to the standalone page`);
  }, TEST_MS);

  it('5 each room marks its own game once per sitting, with no score', async () => {
    const fresh = save('stadium', 'fresh');
    localStorage.setItem(TYCOON_SAVE_KEY, fresh.raw);
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    const pitch = document.querySelector('.cursor-pointer.select-none.group');
    if (!pitch) throw new Error('no pitch on the Stadium tab');
    await act(async () => { fireEvent.click(pitch); });
    expect(vi.mocked(recordCompletion).mock.calls, 'the first tap on the pitch did not mark the tycoon exactly once').toEqual([['/stadium-tycoon']]);
    await act(async () => { fireEvent.click(pitch); });
    expect(vi.mocked(recordCompletion).mock.calls, 'a second tap marked the tycoon again').toEqual([['/stadium-tycoon']]);

    resetRig();
    localStorage.setItem(ACADEMY_SAVE_KEY, save('academy', 'midAcademy').raw);
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    await openTab('academy');
    const sell = () => [...document.querySelectorAll('button')].find(b => /^Sell for/.test((b.textContent ?? '').trim()));
    const first = sell();
    if (!first) throw new Error('no kid to sell on the Academy tab');
    await act(async () => { fireEvent.click(first); });
    expect(vi.mocked(recordCompletion).mock.calls, 'a sale on the Academy tab did not mark the academy exactly once').toEqual([['/wonderkid-factory']]);
    const second = sell();
    if (!second) throw new Error('no second kid to sell');
    await act(async () => { fireEvent.click(second); });
    expect(vi.mocked(recordCompletion).mock.calls, 'a second sale marked the academy again').toEqual([['/wonderkid-factory']]);
    measured('marks: one tap marked /stadium-tycoon once, one sale on the Academy tab marked /wonderkid-factory once, neither carried a score');
  }, TEST_MS);

  it('6 a kid about to walk lights the Academy tab while you are at the ground', async () => {
    const mid = save('academy', 'midAcademy');
    const leftBefore = JSON.parse(mid.loaded as string).leftFree;
    localStorage.setItem(ACADEMY_SAVE_KEY, mid.raw);
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    await openTab('academy');
    step(1_000);
    await openTab('stadium');
    step(4_000);
    const at5 = accent('academy');
    step(7_000);
    const at12 = accent('academy');
    step(63_000);
    const at75 = accent('academy');
    const leftAfter = JSON.parse(read(ACADEMY_SAVE_KEY) as string).leftFree;

    expect(at5, 'the Academy tab was lit at 5s, when the 23 year old still had 65 seconds and nothing else in the academy needed you').toBe('false');
    expect(at12, 'the Academy tab stayed dark at 12s with a kid 58 seconds from walking out on a free').toBe('true');
    expect(leftAfter - leftBefore, 'the kid never walked, so the accent going dark again proves nothing').toBe(1);
    expect(at75, 'the Academy tab stayed lit after the kid had already gone').toBe('false');
    measured(`accent: Academy tab ${at5} at 5s, ${at12} at 12s, ${at75} at 75s after the kid walked (leftFree +${leftAfter - leftBefore})`);
  }, TEST_MS);

  it('7 a promotion earned while you are in the Academy waits for you', async () => {
    const base = JSON.parse(save('stadium', 'fresh').loaded as string);
    /* Round 582: promotion is by winning the league, so the fixture is the last
       matchday of the bottom league with the club four wins clear. */
    const lg = newLeague(0, 0, 0);
    const last = leagueShape(0).matchdays - 1;
    /* A table that adds up, or the loader rightly refuses it: the club beat four
       rivals 1 to 0, and every other match was a goalless draw. */
    const clubs = lg.clubs.map((c, i) => (i === 0
      ? { ...c, w: last, gf: last, pts: 3 * last }
      : i <= last ? { ...c, l: 1, d: last - 1, ga: 1, pts: last - 1 } : { ...c, d: last, pts: last }));
    localStorage.setItem(TYCOON_SAVE_KEY, JSON.stringify({ ...base, minute: 89, matchSec: 0, goalsFor: 3, goalsAgainst: 0, league: { ...lg, matchday: last, clubs }, savedAt: EPOCH }));
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    await openTab('academy');
    const lit: string[] = [];
    step(4_000);
    for (let t = 4; t <= 14; t += 1) {
      lit.push(accent('stadium') ?? 'missing');
      if (t < 14) step(1_000);
    }
    await openTab('stadium');
    const cardOnReturn = document.querySelector('[data-promotion-card]') !== null;
    step(5_000);
    const cardLater = document.querySelector('[data-promotion-card]') !== null;

    expect(lit.every(v => v === 'true'), `the Stadium tab's accent read ${lit.join(',')} from 4s to 14s, past the card's four second timer`).toBe(true);
    expect(cardOnReturn, 'the promotion earned while the Academy was open was gone by the time the player came back').toBe(true);
    expect(cardLater, 'the promotion card never came down after the player had seen it for five seconds').toBe(false);
    measured(`unseen promotion: Stadium tab lit for all ${lit.length} samples from 4s to 14s; card waiting on return, gone 5s later`);
  }, TEST_MS);

  it('8 the League tab shows the table, and a picked club name survives a reload', async () => {
    /* Round 582 review: nothing rendered the League room, the name picker or its
       persistence. */
    localStorage.setItem(TYCOON_SAVE_KEY, save('stadium', 'fresh').raw);
    const first = mountPage(<StadiumTycoon />, '/stadium-tycoon');
    await openTab('league');
    const room = document.querySelector('[data-league-room]');
    expect(room, 'the League tab opened no league room').not.toBeNull();
    const rows = room!.querySelectorAll('[data-goals]').length;
    expect(rows, `the league table showed ${rows} rows`).toBe(leagueShape(0).clubs);
    const picker = document.querySelector('[data-club-name-pick]');
    expect(picker, 'a club with no name was not offered one').not.toBeNull();
    const choices = [...picker!.querySelectorAll('button')];
    expect(choices.length, 'the picker should offer three names and a keep').toBe(4);
    const picked = (choices[0].textContent ?? '').trim();
    await act(async () => { fireEvent.click(choices[0]); });
    const saved = JSON.parse(read(TYCOON_SAVE_KEY) as string);
    expect(saved.clubName, 'the picked name was not saved').toBe(picked);
    expect(document.querySelector('[data-club-name-pick]'), 'the picker stayed after a name was picked').toBeNull();
    first.unmount();

    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    await openTab('league');
    expect(document.querySelector('[data-club-name-pick]'), 'the picker came back after a reload').toBeNull();
    expect(document.querySelector('[data-league-room]')?.textContent ?? '', 'the picked name is not in the reloaded table').toContain(picked);
    measured(`league tab: ${rows} rows, three names offered, "${picked}" picked, saved and still there after a reload`);
  }, TEST_MS);
});
