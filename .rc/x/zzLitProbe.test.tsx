/**
 * Round 1303 review (run lens), never committed: THE LIT RULE through the real hook, on the state a ruling on
 * goals-level would light (the switch on and the generated list holding the goal kind alone). The round's own
 * unit file holds the dark rule only, and the browser walk on a staged build holds a LIVE kickoff only. This
 * probe asks what nothing else asks: does a Quick Sim and a fast forward through the hook play goals only.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn() }));
vi.doMock('@/lib/clubManagerVarLive', () => ({ CM_VAR_LIVE: true }));
vi.doMock('@/data/clubManagerVarRates', async () => ({ ...(await vi.importActual<Record<string, unknown>>('@/data/clubManagerVarRates')), CM_VAR_KINDS: ['goal'] }));

const { useClubManager } = await import('@/hooks/useClubManager');
const { playNextEntry } = await import('@/lib/clubManager');
const { simToWeek } = await import('@/lib/clubManagerCalendar');

/* eslint-disable @typescript-eslint/no-explicit-any */
let api: any = null;
function Harness() { const g = useClubManager(); api = g; return <div data-testid="lit-probe" />; }
const FAKE = ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] as any;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const realRandom = Math.random;
function seeded<T>(seed: number, fn: () => T): T {
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = realRandom; }
}
const rows = (report: any, needle: string): number => JSON.stringify(report ?? null).split(needle).length - 1;
const PEN = '"incident":"penalty"', GOAL = '"incident":"goal"';

beforeEach(() => { localStorage.clear(); api = null; });
afterEach(() => { vi.useRealTimers(); Math.random = realRandom; });
async function booted() {
  vi.useFakeTimers({ toFake: FAKE });
  const r = render(<Harness />);
  await act(async () => { vi.advanceTimersByTime(10); });
  act(() => api.chooseClub('Everton'));
  act(() => api.confirmClub());
  expect(api.phase).toBe('hub');
  return r;
}

describe('LIT PROBE: the switch on and the goal kind alone, through the real hook', () => {
  it('a live kick off saves the goal kind and is the match the engine plays when asked for the goal kind', async () => {
    const r = await booted();
    let guard = 0, before: any = null, seed = 0;
    while (api.phase !== 'halftime' && guard++ < 20) { before = clone(api.career); seed = 4100 + guard; act(() => seeded(seed, () => api.play())); }
    expect(api.phase).toBe('halftime');
    expect(api.career.live.varReviews).toBe(true);
    expect(api.career.live.varKinds).toEqual(['goal']);
    const asked = seeded(seed, () => playNextEntry(clone(before), { varReviews: ['goal'] }));
    expect(clone(api.career.live.h1Play)).toEqual(clone(asked.state.live!.h1Play));
    r.unmount();
  }, 180000);

  it('a Quick Sim is the engine asked for the goal kind, on matches where every kind staged would show a penalty by review', async () => {
    const r = await booted();
    let played = 0, chosen = 0, goalRows = 0;
    for (let guard = 0; guard < 40 && played < 8; guard++) {
      const before = clone(api.career);
      let seed = 15200 + guard * 500, found = false;
      for (let k = 0; k < 400 && !found; k++) {
        const all = seeded(seed + k, () => playNextEntry(clone(before), { skipHalftime: true, varReviews: true }));
        if (all.kind === 'match' && rows(all.report, PEN) > 0) { seed += k; found = true; }
      }
      act(() => seeded(seed, () => api.quickPlay()));
      if (api.phase !== 'matchResult') { act(() => api.continueFromReport?.()); continue; }
      const expected = seeded(seed, () => playNextEntry(clone(before), { skipHalftime: true, varReviews: ['goal'] }));
      expect(rows(api.report, PEN), `match ${played + 1} shows a penalty by review`).toBe(0);
      expect(rows(api.report, '"decision":"awarded"'), `match ${played + 1} plays a kick a review gave`).toBe(0);
      expect(clone(api.report), `match ${played + 1} differs from the engine asked for the goal kind`).toEqual(clone(expected.report));
      goalRows += rows(api.report, GOAL);
      played++; if (found) chosen++;
      act(() => api.continueFromReport());
    }
    expect(played).toBeGreaterThanOrEqual(8);
    expect(chosen, 'too few matches a penalty by review would show in, so the case proves nothing').toBeGreaterThanOrEqual(4);
    console.log(`LITPROBE quick: ${played} matches, ${chosen} chosen where every kind shows a penalty by review, ${goalRows} goal review rows`);
    r.unmount();
  }, 280000);

  it('the fast forward is the engine run asked for the goal kind, on a run that differs both from no reviews and from every kind', async () => {
    const r = await booted();
    const before = clone(api.career);
    const target = before.week + 6;
    let seed = 26300, goal: any = null;
    for (; seed < 27300; seed++) {
      goal = seeded(seed, () => simToWeek(clone(before), target, { varReviews: ['goal'] }));
      const plain = seeded(seed, () => simToWeek(clone(before), target));
      const all = seeded(seed, () => simToWeek(clone(before), target, { varReviews: true }));
      const g = JSON.stringify(goal.state.resultLog);
      if (g !== JSON.stringify(plain.state.resultLog) && g !== JSON.stringify(all.state.resultLog)) break;
    }
    expect(seed, 'no seeded run the three asks play three ways, so the case proves nothing').toBeLessThan(27300);
    act(() => seeded(seed, () => api.simToWeek(target)));
    expect(api.career.week).toBe(goal.state.week);
    expect(clone(api.career.resultLog), 'the fast forward is not the engine run asked for the goal kind').toEqual(clone(goal.state.resultLog));
    console.log(`LITPROBE fast forward: seed ${seed}, week ${api.career.week}`);
    r.unmount();
  }, 280000);
});
