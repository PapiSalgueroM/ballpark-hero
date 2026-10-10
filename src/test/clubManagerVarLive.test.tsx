/**
 * Round 1218: VAR is switched on. (Release AT shipped it dark, and this file then held the dark rule.)
 *
 * The switch is CM_VAR_LIVE in src/lib/clubManagerVarLive.ts and the REAL hook reads it at the two places
 * a match is kicked off: the match button (live and Quick Sim) and the fast forward. Where a review may
 * happen at all (a modern save, a competition whose row says yes in scripts/data/cmVarCompetitions.json) is
 * the engine's rule and scripts/simCmVar.mjs holds it. This file holds that the game ASKS.
 *
 * It drives the real hook, as src/test/clubManagerSave.test.tsx does, and holds three things for a managed
 * modern match in a covered league (a new 2026-27 Premier League career):
 *   1. a live kick off carries the varReviews key on the saved match;
 *   2. a Quick Sim through the hook is the match the engine plays from the same save and the same seed
 *      when reviews are asked for: the whole report, on matches chosen so that a review shows in them;
 *   3. the fast forward is the engine's run to that week with reviews asked for, on a run chosen so that
 *      reviews change its results.
 *
 * NEGATIVE CONTROL (the dark build of Release AT, kept as a control): CM_VAR_LIVE_CONTROL=off turns the
 * switch off for this file only. All three cases must then fail (no key, no review row, the plain run), so
 * vitest exits 1. A green run under the control would mean the hook no longer reads the switch.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  recordStreakDay: vi.fn(),
}));

const CONTROL = process.env.CM_VAR_LIVE_CONTROL === 'off';
if (CONTROL) vi.doMock('@/lib/clubManagerVarLive', () => ({ CM_VAR_LIVE: false }));

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

describe('Club Manager: VAR is switched on', () => {
  it('the switch is on', () => {
    expect(CONTROL ? !CM_VAR_LIVE : CM_VAR_LIVE, 'CM_VAR_LIVE must be true: Round 1218 switched reviews on').toBe(true);
  });

  it('a live kick off through the hook asks for reviews', async () => {
    const r = await booted();
    let guard = 0, before: any = null, seed = 0;
    while (api.phase !== 'halftime' && guard++ < 20) {
      before = clone(api.career); seed = 4100 + guard;
      act(() => seeded(seed, () => api.play()));
    }
    expect(api.phase, 'no match was kicked off').toBe('halftime');
    expect(api.career.live).toBeTruthy();
    /* The save is one the engine reviews when asked (a modern era, 2026 or later, a league whose row says
       yes) and does not when nobody asks, so the key below is the switch's doing and nothing else's. */
    const asked = seeded(seed, () => playNextEntry(clone(before), { varReviews: true }));
    expect(asked.kind).toBe('halftime');
    expect(asked.state.live?.varReviews, 'this save is not one the engine reviews, so the case proves nothing').toBe(true);
    const plain = seeded(seed, () => playNextEntry(clone(before)));
    expect(plain.kind).toBe('halftime');
    expect(plain.state.live && 'varReviews' in plain.state.live, 'the engine opts in without being asked').toBe(false);
    expect(api.career.live.varReviews, 'the saved match does not carry the review opt in').toBe(true);
    r.unmount();
  }, 180000);

  it('a Quick Sim through the hook is the match the engine plays with reviews asked for', async () => {
    const r = await booted();
    let played = 0, chosen = 0;
    for (let guard = 0; guard < 30 && played < 6; guard++) {
      const before = clone(api.career);
      /* Round 1218 fix (review finding 8): on rates taken from real football about one league match in six has a
         review, and six matches on any six seeds had none in them about four runs in ten, so this case could
         not see the switch. Each match is chosen: the first seed whose match the engine shows a review in when
         asked. A match no seed reviews (a competition without reviews) is played on its plain seed. */
      let seed = 5200 + guard * 500, found = false;
      for (let k = 0; k < 120 && !found; k++) {
        const reviewed = seeded(seed + k, () => playNextEntry(clone(before), { skipHalftime: true, varReviews: true }));
        if (reviewed.kind === 'match' && reviewRows(reviewed.report) > 0) { seed += k; found = true; }
      }
      act(() => seeded(seed, () => api.quickPlay()));
      if (api.phase !== 'matchResult') { act(() => api.continueFromReport?.()); continue; }
      const expected = seeded(seed, () => playNextEntry(clone(before), { skipHalftime: true, varReviews: true }));
      expect(expected.kind).toBe('match');
      if (found) expect(reviewRows(api.report), `match ${played + 1} was chosen for its review and shows none`).toBeGreaterThan(0);
      expect(clone(api.report), `match ${played + 1} differs from the engine with reviews asked for`).toEqual(clone(expected.report));
      played++;
      if (found) chosen++;
      act(() => api.continueFromReport());
    }
    expect(played, 'too few matches were played to say anything').toBeGreaterThanOrEqual(6);
    expect(chosen, 'too few matches that reviews would show in, so the case proves nothing').toBeGreaterThanOrEqual(3);
    r.unmount();
  }, 240000);

  it('the fast forward is the engine run with reviews asked for', async () => {
    const r = await booted();
    const before = clone(api.career);
    const target = before.week + 6;
    /* Round 1218: on rates taken from real football a review is rare, and a run of six weeks with none in it
       would read the same with the switch on or off. So the run is chosen: the first seed whose run the engine
       plays to other results with reviews asked for. That is what lets this case see the switch. */
    let seed = 6300, plain: any = null, expected: any = null;
    for (; seed < 6400; seed++) {
      plain = seeded(seed, () => simToWeek(clone(before), target));
      expected = seeded(seed, () => simToWeek(clone(before), target, { varReviews: true }));
      if (JSON.stringify(expected.state.resultLog) !== JSON.stringify(plain.state.resultLog)) break;
    }
    expect(seed, 'no seeded run that reviews would change, so the case proves nothing').toBeLessThan(6400);
    act(() => seeded(seed, () => api.simToWeek(target)));
    expect(api.career.week).toBe(expected.state.week);
    expect(clone(api.career.resultLog), 'the results of the run differ from the engine with reviews asked for').toEqual(clone(expected.state.resultLog));
    expect(clone(api.career.resultLog), 'the run is the one the engine plays without reviews').not.toEqual(clone(plain.state.resultLog));
    r.unmount();
  }, 240000);
});
