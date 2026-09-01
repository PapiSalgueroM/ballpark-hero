/**
 * A Club Manager match is activity; a finished season is the completion.
 *
 * Round 392. recordCompletion fans out to three pipelines: the anonymous
 * game_completions row, the local streak record, and for a signed in player
 * the whole save (user_game_scores, daily_completions, user_scores points,
 * user_best_scores). Round 157 put a recordCompletion after every played
 * match so the header moved mid season, and Round 300's fan out silently
 * upgraded that into a full completion per match. Round 301 caught the same
 * thing in the eight other sims and moved them to recordActivity, but its
 * comment believed Club Manager only fired at season end, so it was left as
 * it was. Measured 2026-09-01: 10,254 club-manager completion rows from 83
 * players in one day, and the top of the points table held 80,246 of its
 * 87,800 from 1,586 Club Manager rows, each one the running season score
 * added again.
 *
 * This is a hook test because the defect is which helper the hook calls at
 * which moment. It renders the real hook, plays a real season through it
 * with the completions module mocked, and asserts the shape: a match is an
 * activity ping, a season end is exactly one completion.
 *
 * scripts/simActivityNotCompletion.mjs runs this file and carries the
 * negative control: CM_HOOK points the test at a copy of the hook with the
 * match pings put back to recordCompletion, and both tests must then fail.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { CM_ROSTERS, CM_PARTIAL } from '@/data/clubManagerRosters';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
}));
import { recordCompletion, recordActivity } from '@/lib/completions';

const hookPath = process.env.CM_HOOK;
const { useClubManager } = hookPath
  ? await import(/* @vite-ignore */ hookPath)
  : await import('@/hooks/useClubManager');

/* A club with a full roster, so the season is a real one and a sacking
   does not come before ten matches. */
const CLUB: string = Object.keys(CM_ROSTERS).find(k => !CM_PARTIAL.includes(k)) ?? Object.keys(CM_ROSTERS)[0];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rendered = { current: any };

async function startedCareer(): Promise<Rendered> {
  const rendered = renderHook(() => useClubManager());
  await waitFor(() => expect(rendered.result.current.phase).toBe('clubSelect'));
  act(() => rendered.result.current.chooseClub(CLUB));
  act(() => rendered.result.current.confirmClub());
  expect(rendered.result.current.phase).toBe('hub');
  return rendered.result;
}

/** One step of a season through the hook's own actions. False once it is over. */
function step(result: Rendered): boolean {
  const s = result.current;
  if (s.phase === 'seasonEnd' || s.phase === 'sacked') return false;
  if (s.phase === 'matchResult') act(() => s.continueFromReport());
  else if (s.phase === 'halftime') act(() => s.secondHalf());
  else act(() => s.quickPlay());
  return true;
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(recordCompletion).mockClear();
  vi.mocked(recordActivity).mockClear();
});

describe('Club Manager completion shape', () => {
  it('a played match records activity and not a completion', async () => {
    const result = await startedCareer();
    for (let i = 0; i < 12 && result.current.phase !== 'matchResult'; i += 1) step(result);
    expect(result.current.phase).toBe('matchResult');
    expect(recordActivity).toHaveBeenCalledWith('/club-manager', expect.any(Number));
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('a finished season records exactly one completion', async () => {
    const result = await startedCareer();
    let guard = 0;
    while (step(result) && guard < 800) guard += 1;
    expect(['seasonEnd', 'sacked']).toContain(result.current.phase);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(recordCompletion).toHaveBeenCalledWith('/club-manager', expect.any(Number));
    expect(vi.mocked(recordActivity).mock.calls.length).toBeGreaterThanOrEqual(10);
  });
});
