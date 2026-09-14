/* Round 583: Stadium Tycoon says what the engine does.

   THREE THINGS THIS HOLDS.
   - Every money floater prints the engine's real change through fmtMoney, the
     way the balance does. Taps and event floaters printed raw numbers, so deep
     into a run a tap read "+$4830000000" beside a balance reading "$4.83B".
   - The rules open themselves before first play, as the academy's always have,
     and stay closed for anyone with a save.
   - A keyboard player can tap: a real button beside the pitch pays one tap.

   HOW. The real hook and lib (the tick is wrapped only to record the events it
   returns, so a floater can be compared with the amount that produced it), the
   real page for the help and the tap button, jsdom's localStorage, and a
   hand-driven animation frame.

   The claims table that ties every number in the guide to the engine, and the
   check that the rules modal types no number, run in node in the wrapper,
   scripts/simTycoonHelp.mjs. Run that, not this file alone. */
import './dailyReload/mocks';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, render, fireEvent } from '@testing-library/react';
import { mountPage } from './dailyReload/harness';
import type { TickEvent } from '@/lib/stadiumTycoon';

const recorded = vi.hoisted(() => ({ events: [] as TickEvent[] }));
vi.mock('@/lib/stadiumTycoon', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/stadiumTycoon')>();
  return {
    ...real,
    tick: (...args: Parameters<typeof real.tick>) => {
      const r = real.tick(...args);
      recorded.events.push(...r.events);
      return r;
    },
  };
});

import { useStadiumTycoon } from '@/hooks/useStadiumTycoon';
import StadiumTycoon from '@/pages/StadiumTycoon';
import {
  TYCOON_SAVE_KEY, TRACKS, STAFF, ACHIEVEMENTS, LEGACY_PERKS, newTycoon, newLeague, serializeTycoon, fmtMoney, tapValue,
} from '@/lib/stadiumTycoon';

const EPOCH = 1767225600000;
const TEST_MS = 120_000;
let vnow = 0;
let frameCb: FrameRequestCallback | null = null;
let latest: ReturnType<typeof useStadiumTycoon> | null = null;
function Probe() {
  latest = useStadiumTycoon();
  return null;
}
const g = () => {
  if (!latest) throw new Error('the Stadium Tycoon hook is not mounted');
  return latest;
};
function frames(n: number, seen?: Set<string>) {
  for (let i = 0; i < n; i += 1) {
    const cb = frameCb;
    if (!cb) return;
    frameCb = null;
    vnow += 16;
    act(() => { cb(vnow); });
    if (seen) for (const f of g().floaters) seen.add(f.text);
  }
}
function measured(line: string) {
  console.log(`HELP| ${line}`);
}

/** A save at a chosen size, built only from values the loader keeps. */
function sizedSave(rep: number, scale: number, extra: Record<string, unknown> = {}) {
  const f = newTycoon(EPOCH);
  const lvl = (max: number) => Math.min(max, Math.round(max * scale));
  return {
    ...f,
    rep,
    fanbase: 90 + Math.round(9000 * scale),
    levels: Object.fromEntries(TRACKS.map(t => [t.id, lvl(t.maxLevel)])),
    staffLevels: Object.fromEntries(STAFF.map(t => [t.id, lvl(t.maxLevel)])),
    ach: ACHIEVEMENTS.slice(0, Math.round(ACHIEVEMENTS.length * scale)).map(a => a.id),
    legacyPerks: Object.fromEntries(LEGACY_PERKS.map(p => [p.id, Math.round(p.costs.length * scale)])),
    bestDivision: Math.round(9 * scale),
    league: newLeague(rep, Math.round(9 * scale), 0),
    savedAt: EPOCH,
    ...extra,
  };
}

beforeEach(() => {
  vnow = 0;
  frameCb = null;
  latest = null;
  recorded.events = [];
  localStorage.clear();
  vi.spyOn(Date, 'now').mockImplementation(() => EPOCH + Math.round(vnow));
  vi.spyOn(performance, 'now').mockImplementation(() => vnow);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frameCb = cb; return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => { frameCb = null; });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Stadium Tycoon tells the truth', () => {
  it('1 every tap floater prints fmtMoney of the money the tap really added, from a dollar to trillions', () => {
    const branches = new Set<string>();
    let taps = 0;
    const mismatches: string[] = [];
    /* The top three are a maxed club with a ten game streak, then Matchday Hype,
       then Hype under a golden frenzy and a crowd surge: the only honest way a
       tap reaches the trillions, measured at 2.7e12 and 9.8e12. */
    const sizes: [number, number, Record<string, unknown>][] = [[0, 0, {}], [0, 0.02, {}], [0, 0.05, {}], [1, 0.1, {}], [2, 0.2, {}], [5, 0.3, {}], [10, 0.45, {}], [20, 0.6, {}], [30, 0.75, {}], [40, 0.9, {}], [50, 1, { streak: 10 }],
      [50, 1, { streak: 10, boostLeftSec: 60, goldenKind: 'frenzy', goldenLeftSec: 30 }], [50, 1, { streak: 10, boostLeftSec: 60, goldenKind: 'tapRush', goldenLeftSec: 30 }]];
    for (const [rep, scale, extra] of sizes) {
      cleanup();
      latest = null;
      localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(sizedSave(rep, scale, extra) as never, EPOCH));
      render(<Probe />);
      for (let i = 0; i < 92; i += 1) {
        const before = g().state.money;
        act(() => { g().doTap(50, 50); });
        const after = g().state.money;
        const text = g().floaters[g().floaters.length - 1]?.text;
        const expected = `+${fmtMoney(after - before)}`;
        taps += 1;
        if (text !== expected && mismatches.length < 5) mismatches.push(`a tap that added ${after - before} printed "${text}", fmtMoney says "${expected}"`);
        const suffix = /([KMBTQ])$/.exec(expected)?.[1] ?? 'plain';
        branches.add(suffix);
      }
    }
    expect(mismatches, mismatches.join('; ')).toEqual([]);
    expect(taps).toBeGreaterThanOrEqual(1000);
    for (const b of ['plain', 'K', 'M', 'B', 'T']) expect(branches.has(b), `no tap landed in the ${b} range of fmtMoney, so that range was not tested`).toBe(true);
    measured(`${taps} taps across ${sizes.length} clubs printed exactly fmtMoney of what they added, covering ${[...branches].join(', ')}`);
  }, TEST_MS);

  it('2 goal, win, milestone and promotion floaters print fmtMoney of the event that paid them', () => {
    const rich = { ...sizedSave(20, 0.6), minute: 80, matchSec: 0, goalsFor: 0, goalsAgainst: 0, claimed: [] };
    localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(rich as never, EPOCH));
    vi.spyOn(Math, 'random').mockImplementation(() => 0.01);
    render(<Probe />);
    const seen = new Set<string>();
    frames(Math.round((6 * 126 * 1000) / 16), seen);
    const paid = recorded.events.filter(e => e.amount !== undefined && ['goal', 'win', 'milestone', 'promoted', 'title'].includes(e.kind));
    expect(paid.length, 'no paying event happened, so nothing was compared').toBeGreaterThan(3);
    const missing: string[] = [];
    for (const e of paid) {
      const money = fmtMoney(e.amount as number);
      const want = e.kind === 'goal' ? `GOAL! +${money}` : e.kind === 'win' ? `FULL TIME WIN +${money}` : e.kind === 'milestone' ? `🏁 ${e.label} +${money}` : `${e.label} +${money}`;
      if (!seen.has(want) && missing.length < 5) missing.push(`${e.kind} paid ${e.amount} and no floater read "${want}"`);
    }
    expect(missing, missing.join('; ')).toEqual([]);
    expect(paid.some(e => (e.amount as number) >= 1e4), 'no event paid ten thousand or more, so the K and larger formats were not compared').toBe(true);
    measured(`${paid.length} paying events (${[...new Set(paid.map(e => e.kind))].join(', ')}) each had a floater printing fmtMoney of its amount`);
  }, TEST_MS);

  it('3 the rules open before first play and close with Let\'s go', () => {
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    act(() => { /* effects */ });
    const rules = document.querySelector('[data-tycoon-rules]');
    expect(rules, 'a player with no save was not shown the rules').not.toBeNull();
    const go = [...document.querySelectorAll('button')].find(b => (b.textContent ?? '').trim() === "Let's go");
    expect(go, 'the rules have no Let\'s go button').toBeDefined();
    act(() => { fireEvent.click(go!); });
    expect(document.querySelector('[data-tycoon-rules]'), 'Let\'s go did not close the rules').toBeNull();
    expect(document.querySelector('[aria-label="Close the rules"]'), 'the close button has no name').toBeNull();
    measured('a fresh visitor saw the rules first, and Let\'s go closed them');
  }, TEST_MS);

  it('4 the rules stay closed for a player who already has a save', () => {
    localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(newTycoon(EPOCH), EPOCH));
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    act(() => { /* effects */ });
    expect(document.querySelector('[data-tycoon-rules]'), 'the rules opened over a returning player\'s game').toBeNull();
    const help = [...document.querySelectorAll('button')].find(b => /How it works/.test(b.textContent ?? ''));
    act(() => { fireEvent.click(help!); });
    expect(document.querySelector('[aria-label="Close the rules"]'), 'the reopened rules have no named close button').not.toBeNull();
    measured('a returning player went straight to the game, and How it works reopens the rules with a named close button');
  }, TEST_MS);

  it('5 the keyboard tap button pays exactly one tap', () => {
    localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(newTycoon(EPOCH), EPOCH));
    mountPage(<StadiumTycoon />, '/stadium-tycoon');
    const key = document.querySelector('[data-tap-key]') as HTMLButtonElement | null;
    expect(key, 'there is no keyboard tap button').not.toBeNull();
    expect(key!.tagName, 'the keyboard tap is not a real button').toBe('BUTTON');
    const before = JSON.parse(localStorage.getItem(TYCOON_SAVE_KEY) as string).totalTaps;
    const quote = key!.textContent ?? '';
    act(() => { key!.focus(); fireEvent.click(key!); });
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    const after = JSON.parse(localStorage.getItem(TYCOON_SAVE_KEY) as string);
    expect(after.totalTaps - before, 'the keyboard tap did not pay exactly one tap').toBe(1);
    expect(quote, 'the button does not say what a tap pays').toContain(fmtMoney(tapValue(newTycoon(EPOCH))));
    measured(`the keyboard tap button ("${quote.trim()}") paid one tap`);
  }, TEST_MS);
});
