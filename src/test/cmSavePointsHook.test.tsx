/**
 * Round 1513 review (run lens, minor 2): the record half of the hook's
 * postsScore wrapper (seasonPosts) ran in no automated check; only a walk saw
 * it. Here the real hook plays one match on a Medium career three ways: the
 * slot keeps a points record with no mark on the season (the baseline: the
 * ping carries a score), the season a restore landed in, and a season already
 * credited. The last two must ping with no score while the activity still
 * counts. Turning the wrapper's && into || turns the last two red.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { CM_ROSTERS, CM_PARTIAL } from '@/data/clubManagerRosters';
import { activeSlot } from '@/lib/clubManagerSlots';
import { writePointsIndex } from '@/lib/cmSavePointsStore';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  recordStreakDay: vi.fn(),
}));
import { recordActivity } from '@/lib/completions';

const { useClubManager } = await import('@/hooks/useClubManager');

const CLUB: string = Object.keys(CM_ROSTERS).find(k => !CM_PARTIAL.includes(k)) ?? Object.keys(CM_ROSTERS)[0];

beforeEach(() => {
  localStorage.clear();
  vi.mocked(recordActivity).mockClear();
});

async function pingsOfOneMatch(mark: 'none' | 'blocked' | 'credited') {
  const r = renderHook(() => useClubManager());
  await waitFor(() => expect(r.result.current.phase).toBe('clubSelect'));
  act(() => r.result.current.chooseClub(CLUB));
  act(() => r.result.current.confirmClub());
  expect(r.result.current.phase).toBe('hub');
  const season = r.result.current.career!.season;
  expect(writePointsIndex(activeSlot(), {
    v: 1, points: [], credited: mark === 'credited' ? [season] : [], blocked: mark === 'blocked' ? [season] : [],
  })).toBe(true);
  vi.mocked(recordActivity).mockClear();
  for (let i = 0; i < 12 && r.result.current.phase !== 'matchResult'; i += 1) {
    const s = r.result.current;
    if (s.phase === 'halftime') act(() => s.secondHalf());
    else act(() => s.quickPlay());
  }
  expect(r.result.current.phase).toBe('matchResult');
  const calls = vi.mocked(recordActivity).mock.calls.map(c => [...c]);
  r.unmount();
  return calls;
}

describe('the hook asks the points record before a scored ping', () => {
  it('a season with no mark pings its score (the baseline)', async () => {
    const calls = await pingsOfOneMatch('none');
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every(c => c[0] === '/club-manager' && c.length === 2 && typeof c[1] === 'number')).toBe(true);
  });

  it('the season a restore landed in pings with no score, and the activity still counts', async () => {
    const calls = await pingsOfOneMatch('blocked');
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every(c => c[0] === '/club-manager' && c.length === 1)).toBe(true);
  });

  it('a season already credited pings with no score', async () => {
    const calls = await pingsOfOneMatch('credited');
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every(c => c[0] === '/club-manager' && c.length === 1)).toBe(true);
  });
});
