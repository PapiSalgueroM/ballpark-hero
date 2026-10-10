/**
 * Release AT: VAR ships dark.
 *
 * Round 1181's review rule changes results (measured: the score in 196 of 680 seeded matches, the result
 * in 85) on rates with no source record, so the game does not ask the engine for reviews in this release.
 * The switch is CM_VAR_LIVE in src/lib/clubManagerVarLive.ts and the REAL hook reads it at the two places
 * a match is kicked off: the match button (live and Quick Sim) and the fast forward.
 *
 * This file drives the real hook, as src/test/clubManagerSave.test.tsx does, and holds three things for a
 * managed modern match (a new 2026-27 Premier League career):
 *   1. a live kick off leaves no varReviews key on the saved match;
 *   2. a Quick Sim through the hook is the match the engine plays from the same save and the same seed
 *      when nobody asks for reviews: the whole report, and no review row in it;
 *   3. the fast forward is the engine's run to that week without reviews.
 * The engine without reviews is byte equal to Release AS (54e3820a): 680 of 680 seeded matches, quick and
 * live, and the state after each (remote check rAT-cm-a2, line var2). So 2 and 3 are "the same match as
 * Release AS" by that proof plus this one.
 *
 * NEGATIVE CONTROL: CM_VAR_LIVE_CONTROL=on turns the switch on for this file only. The live kick off case
 * must then fail every time (the key appears), and the other two fail wherever a review moved a match,
 * so vitest exits 1. A green run under the control would mean the hook no longer reads the switch.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  recordStreakDay: vi.fn(),
}));

const CONTROL = process.env.CM_VAR_LIVE_CONTROL === 'on';
if (CONTROL) vi.doMock('@/lib/clubManagerVarLive', () => ({ CM_VAR_LIVE: true }));

const { useClubManager } = await import('@/hooks/useClubManager');
const { playNextEntry } = await import('@/lib/clubManager');
const { simToWeek } = await import('@/lib/clubManagerCalendar');
const { CM_VAR_LIVE } = await import('@/lib/clubManagerVarLive');

/* eslint-disable @typescript-eslint/no-explicit-any */
const CLUB = 'Everton';
let api: any = null;
function Harness() {
  const g = useClubManager();
  api = g;
  return <div data-testid="cm-var-live" />;
}

const FAKE = ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] as any;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const realRandom = Math.random;
function seeded<T>(seed: number, fn: () => T): T {
  let a = seed >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try { return fn(); } finally { Math.random = realRandom; }
}
const reviewRows = (report: any): number => JSON.stringify(report).split('"kind":"var"').length - 1;

beforeEach(() => { localStorage.clear(); api = null; });
afterEach(() => { vi.useRealTimers(); Math.random = realRandom; });

async function booted() {
  vi.useFakeTimers({ toFake: FAKE });
  const r = render(<Harness />);
  await act(async () => { vi.advanceTimersByTime(10); });
  expect(api.phase).toBe('clubSelect');
  act(() => api.chooseClub(CLUB));
  act(() => api.confirmClub());
  expect(api.phase).toBe('hub');
  return r;
}

describe('Club Manager: VAR ships dark', () => {
  it('the switch is off in this release', () => {
    expect(CONTROL ? !CM_VAR_LIVE : CM_VAR_LIVE, 'CM_VAR_LIVE must be false until the VAR round sources its rates').toBe(false);
  });

  it('a live kick off through the hook asks for no review', async () => {
    const r = await booted();
    let guard = 0, before: any = null, seed = 0;
    while (api.phase !== 'halftime' && guard++ < 20) {
      before = clone(api.career); seed = 4100 + guard;
      act(() => seeded(seed, () => api.play()));
    }
    expect(api.phase, 'no match was kicked off').toBe('halftime');
    expect(api.career.live).toBeTruthy();
    /* The save is one the engine WOULD review if asked (a modern era, 2026 or later), so the missing key
       below is the switch's doing and not the era's. */
    const asked = seeded(seed, () => playNextEntry(clone(before), { varReviews: true }));
    expect(asked.kind).toBe('halftime');
    expect(asked.state.live?.varReviews, 'this save is not one the engine reviews, so the case proves nothing').toBe(true);
    expect('varReviews' in api.career.live, 'the saved match carries the review opt in').toBe(false);
    r.unmount();
  }, 180000);

  it('a Quick Sim through the hook is the match the engine plays without reviews', async () => {
    const r = await booted();
    let played = 0;
    for (let guard = 0; guard < 30 && played < 6; guard++) {
      const before = clone(api.career);
      const seed = 5200 + guard;
      act(() => seeded(seed, () => api.quickPlay()));
      if (api.phase !== 'matchResult') { act(() => api.continueFromReport?.()); continue; }
      const expected = seeded(seed, () => playNextEntry(clone(before), { skipHalftime: true }));
      expect(expected.kind).toBe('match');
      expect(reviewRows(api.report), `match ${played + 1} shows a review`).toBe(0);
      expect(clone(api.report), `match ${played + 1} differs from the engine without reviews`).toEqual(clone(expected.report));
      played++;
      act(() => api.continueFromReport());
    }
    expect(played, 'too few matches were played to say anything').toBeGreaterThanOrEqual(6);
    r.unmount();
  }, 240000);

  it('the fast forward is the engine run without reviews', async () => {
    const r = await booted();
    const before = clone(api.career);
    const target = before.week + 6;
    /* Round 1218: on rates taken from real football a review is rare, and a run of six weeks with none in it
       would read the same with the switch on or off. So the run is chosen: the first seed whose run the engine
       WOULD play to other results with reviews asked for. That is what lets this case see the switch. */
    let seed = 6300, expected: any = null;
    for (; seed < 6400; seed++) {
      expected = seeded(seed, () => simToWeek(clone(before), target));
      const reviewed = seeded(seed, () => simToWeek(clone(before), target, { varReviews: true }));
      if (JSON.stringify(reviewed.state.resultLog) !== JSON.stringify(expected.state.resultLog)) break;
    }
    expect(seed, 'no seeded run that reviews would change, so the case proves nothing').toBeLessThan(6400);
    act(() => seeded(seed, () => api.simToWeek(target)));
    expect(api.career.week).toBe(expected.state.week);
    expect(clone(api.career.resultLog), 'the results of the run differ from the engine without reviews').toEqual(clone(expected.state.resultLog));
    expect(JSON.stringify(api.career.resultLog).includes('"kind":"var"')).toBe(false);
    r.unmount();
  }, 240000);
});
