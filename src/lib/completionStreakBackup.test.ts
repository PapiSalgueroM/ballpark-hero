import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StreakState } from '@/lib/streaks';

const fixtures = vi.hoisted(() => {
  const completed: StreakState = {
    version: 1,
    global: { current: 4, longest: 4, lastDate: '2026-09-02' },
    perGame: {
      footle: { current: 2, longest: 3, lastDate: '2026-09-02' },
    },
    loginDates: ['2026-09-01', '2026-09-02'],
    totalPlays: 12,
    totalPoints: 875,
  };
  const stale: StreakState = {
    ...completed,
    global: { current: 3, longest: 3, lastDate: '2026-09-01' },
    perGame: {},
    loginDates: ['2026-09-01'],
    totalPlays: 11,
    totalPoints: 475,
  };
  return {
    completed,
    stale,
    recordStreakCompletion: vi.fn(() => completed),
    recordStreakDayOnly: vi.fn(() => ({ state: completed, changed: true })),
    readStreakState: vi.fn(() => stale),
    profileUpsert: vi.fn(async (_payload: unknown, _options?: unknown) => ({ error: null })),
    scoreInsert: vi.fn(async (_payload: unknown) => ({ error: null })),
    currentUserId: 'user-1',
  };
});

vi.mock('@/lib/streaks', () => ({
  recordGameCompletion: fixtures.recordStreakCompletion,
  recordGameStreakDay: fixtures.recordStreakDayOnly,
  getEtDateString: () => '2026-09-02',
  getStreakState: fixtures.readStreakState,
}));

vi.mock('@/lib/nameModeration', () => ({
  nameModerationError: () => null,
}));

vi.mock('@/integrations/supabase/client', () => {
  const resolved = (value: unknown = { error: null }) => Promise.resolve(value);
  const countedQuery: Record<string, unknown> = {};
  countedQuery.select = vi.fn(() => countedQuery);
  countedQuery.eq = vi.fn(() => countedQuery);
  countedQuery.then = (resolve: (value: unknown) => unknown) => resolved({ count: 1, error: null }).then(resolve);

  const emptySingleQuery: Record<string, unknown> = {};
  emptySingleQuery.select = vi.fn(() => emptySingleQuery);
  emptySingleQuery.eq = vi.fn(() => emptySingleQuery);
  emptySingleQuery.single = vi.fn(async () => ({ data: null, error: null }));

  const table = (name: string) => {
    if (name === 'profiles') return { upsert: fixtures.profileUpsert };
    if (name === 'daily_completions') {
      return {
        insert: vi.fn(() => resolved()),
        select: countedQuery.select,
      };
    }
    if (name === 'user_scores' || name === 'user_best_scores') {
      return {
        insert: vi.fn(() => resolved()),
        update: vi.fn(() => emptySingleQuery),
        select: emptySingleQuery.select,
      };
    }
    if (name === 'user_game_scores') return { insert: fixtures.scoreInsert };
    return { insert: vi.fn(() => resolved()) };
  };

  return {
    supabase: {
      from: vi.fn(table),
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: fixtures.currentUserId } } })),
      },
    },
  };
});

import { recordCompletion, recordStreakDay } from '@/lib/completions';
import { ensureProgressHydration, resetProgressHydration } from '@/lib/progressHydration';

describe('signed-in completion streak backup', () => {
  beforeEach(() => {
    localStorage.clear();
    fixtures.profileUpsert.mockReset();
    fixtures.profileUpsert.mockResolvedValue({ error: null });
    fixtures.recordStreakCompletion.mockReset();
    fixtures.recordStreakCompletion.mockReturnValue(fixtures.completed);
    fixtures.recordStreakDayOnly.mockReset();
    fixtures.recordStreakDayOnly.mockReturnValue({ state: fixtures.completed, changed: true });
    fixtures.readStreakState.mockClear();
    fixtures.scoreInsert.mockClear();
    fixtures.currentUserId = 'user-1';
    resetProgressHydration(null);
  });

  it('backs up the exact completed state even if a profile refresh made the current local read stale', async () => {
    recordCompletion('/footle', 400, 'Tester', 5);

    await waitFor(() => expect(fixtures.profileUpsert).toHaveBeenCalledTimes(1));
    expect(fixtures.recordStreakCompletion).toHaveBeenCalledWith('footle', expect.any(Date), 400);
    expect(fixtures.profileUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        streak_state: fixtures.completed,
      }),
      { onConflict: 'user_id' },
    );
  });

  it('serializes two fast signed-in saves so the newer streak snapshot is persisted last', async () => {
    const newer: StreakState = {
      ...fixtures.completed,
      global: { current: 4, longest: 4, lastDate: '2026-09-02' },
      perGame: {
        ...fixtures.completed.perGame,
        'soccer-grid': { current: 1, longest: 1, lastDate: '2026-09-02' },
      },
      totalPlays: 13,
      totalPoints: 1275,
    };
    fixtures.recordStreakCompletion
      .mockReturnValueOnce(fixtures.completed)
      .mockReturnValueOnce(newer);

    let releaseFirst = () => undefined;
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
    let persisted: StreakState | null = null;
    const savedUsers: string[] = [];
    fixtures.profileUpsert
      .mockImplementationOnce(async (rawPayload: unknown) => {
        const payload = rawPayload as { user_id: string; streak_state: StreakState };
        await firstGate;
        savedUsers.push(payload.user_id);
        persisted = payload.streak_state;
        return { error: null };
      })
      .mockImplementationOnce(async (rawPayload: unknown) => {
        const payload = rawPayload as { user_id: string; streak_state: StreakState };
        savedUsers.push(payload.user_id);
        persisted = payload.streak_state;
        return { error: null };
      });

    fixtures.currentUserId = 'user-a';
    recordCompletion('/footle', 400, 'Tester', 5);
    recordCompletion('/soccer-grid', 400, 'Tester', 5);
    fixtures.currentUserId = 'user-b';

    await waitFor(() => expect(fixtures.profileUpsert).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(fixtures.profileUpsert).toHaveBeenCalledTimes(1);

    releaseFirst();
    await waitFor(() => expect(fixtures.profileUpsert).toHaveBeenCalledTimes(2));
    expect(savedUsers).toEqual(['user-a', 'user-a']);
    expect(persisted).toEqual(newer);
  });

  it('backs up a long simulation streak day once and skips repeated activity on that ET day', async () => {
    fixtures.recordStreakDayOnly
      .mockReturnValueOnce({ state: fixtures.completed, changed: true })
      .mockReturnValueOnce({ state: fixtures.completed, changed: false });

    recordStreakDay('/soccer-career');
    recordStreakDay('/soccer-career');

    await waitFor(() => expect(fixtures.profileUpsert).toHaveBeenCalledTimes(1));
    expect(fixtures.profileUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        streak_state: fixtures.completed,
      }),
      { onConflict: 'user_id' },
    );
  });

  it('keeps a deferred account A completion out of account B local progress', async () => {
    let releaseHydration = (_success: boolean) => undefined;
    const hydrationGate = new Promise<boolean>((resolve) => { releaseHydration = resolve; });
    resetProgressHydration('user-a');
    void ensureProgressHydration('user-a', () => hydrationGate);

    fixtures.currentUserId = 'user-a';
    recordCompletion('/footle', 400, 'Tester', 5);
    resetProgressHydration('user-b');
    fixtures.currentUserId = 'user-b';
    releaseHydration(true);

    await waitFor(() => expect(fixtures.scoreInsert).toHaveBeenCalledTimes(1));
    expect(fixtures.scoreInsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-a' }));
    expect(fixtures.recordStreakCompletion).not.toHaveBeenCalled();
    expect(fixtures.profileUpsert).not.toHaveBeenCalled();
  });

  it('drops a deferred account A streak-day mutation after switching to account B', async () => {
    let releaseHydration = (_success: boolean) => undefined;
    const hydrationGate = new Promise<boolean>((resolve) => { releaseHydration = resolve; });
    resetProgressHydration('user-a');
    void ensureProgressHydration('user-a', () => hydrationGate);

    fixtures.currentUserId = 'user-a';
    recordStreakDay('/soccer-career');
    resetProgressHydration('user-b');
    fixtures.currentUserId = 'user-b';
    releaseHydration(true);

    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(fixtures.recordStreakDayOnly).not.toHaveBeenCalled();
    expect(fixtures.profileUpsert).not.toHaveBeenCalled();
  });
});
