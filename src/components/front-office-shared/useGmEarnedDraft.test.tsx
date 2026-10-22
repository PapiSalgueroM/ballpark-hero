import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { EARNED_DRAFT_REFUSED, earnedDraftRun, earnedDraftStage, useGmEarnedDraft } from './useGmEarnedDraft';
import type { GmDraftNight, RunStep } from '@/lib/gmEarnedDraft';

/* Round 1540: the night's glue every front office shares (critic 1540 correction 8). */
const night = (seen: boolean): GmDraftNight => ({
  v: 1, year: 2026, seen, made: 0, slots: [],
  order: { v: 1, sport: 'toy', draftYear: 2027, rulesId: 'toy', first: [], later: [], lottery: null, plain: 'no-lottery', level: [] },
});
const step = (overall: number, mine = false): RunStep => ({ overall, team: `C${overall}`, playerName: `Prospect ${overall}`, pos: 'G', grade: 70, mine });
const done = { year: 2027, lines: ['Every pick of the draft is in.'], help: [] };

describe('earnedDraftStage', () => {
  it('lottery until continued, the clock while current, over only once the season has rolled', () => {
    expect(earnedDraftStage(night(false), null, false)).toBe('lottery');
    expect(earnedDraftStage(night(true), null, false)).toBe('clock');
    /* A summer the desk refused: every slot used, the night still current, so still the clock. */
    expect(earnedDraftStage(night(true), done, false)).toBe('clock');
    expect(earnedDraftStage(null, done, true)).toBe('over');
    expect(earnedDraftStage(null, done, false)).toBeNull();
    expect(earnedDraftStage(null, null, true)).toBeNull();
  });
});

describe('earnedDraftRun', () => {
  it('no picks, no card; a run of 59 reads every pick over nine rows', () => {
    expect(earnedDraftRun({ steps: [], onClock: null, done: false })).toBeNull();
    const steps = Array.from({ length: 59 }, (_, i) => step(i + 1));
    const run = earnedDraftRun({ steps, onClock: { overall: 60, round: 2, slot: 30, orig: 'ME', holder: 'ME', kind: 'std' }, done: false })!;
    expect(run.night.picks).toHaveLength(9);
    expect(run.headline).toContain('Picks 1 to 59 are in.');
    expect(run.headline).toContain('You are on the clock at 60.');
  });
});

describe('useGmEarnedDraft', () => {
  it('one press at a time until a render takes it, a refused press leaves the plain line, clear leaves nothing', () => {
    let key = 0;
    const { result, rerender } = renderHook(() => useGmEarnedDraft([key]));
    expect(result.current.seen(night(false))).toBe(true);
    act(() => result.current.opened());
    expect(result.current.lotteryLive).toBe(true);
    expect(result.current.seen(night(false))).toBe(false);
    expect(result.current.seen(night(true))).toBe(true);
    let first = false;
    let second = true;
    act(() => { first = result.current.begin(); second = result.current.begin(); });
    expect([first, second]).toEqual([true, false]);
    key = 1;
    rerender();
    expect(result.current.begin()).toBe(true);
    act(() => result.current.refused());
    expect(result.current.error).toBe(EARNED_DRAFT_REFUSED);
    expect(result.current.begin()).toBe(true);
    act(() => result.current.answered({ steps: [step(1), step(2, true)], onClock: null, done: true }));
    expect(result.current.lotteryLive).toBe(false);
    expect(result.current.error).toBe('');
    expect(result.current.run?.night.picks).toHaveLength(2);
    act(() => result.current.finished(done));
    expect(result.current.stage(null, true)).toBe('over');
    act(() => result.current.clear());
    expect(result.current).toMatchObject({ lotteryLive: false, run: null, done: null, error: '' });
    expect(result.current.stage(null, true)).toBeNull();
    expect(result.current.begin()).toBe(true);
  });
});
