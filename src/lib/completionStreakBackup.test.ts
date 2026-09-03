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
    completionInsert: vi.fn(async (_payload: unknown) => ({ error: null })),
    currentUserId: 'user-1',
    userReadGate: null as Promise<void> | null,
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
    if (name === 'game_completions') return { insert: fixtures.completionInsert };
    return { insert: vi.fn(() => resolved()) };
  };

  return {
    supabase: {
      from: vi.fn(table),
      auth: {
        getUser: vi.fn(async () => {
          if (fixtures.userReadGate) await fixtures.userReadGate;
          return { data: { user: { id: fixtures.currentUserId } } };
        }),
      },
    },
  };
});

import { getLocalTodayCount, recordActivity, recordCompletion, recordStreakDay } from '@/lib/completions';
import { ensureProgressHydration, resetProgressHydration } from '@/lib/progressHydration';

describe('signed-in completion streak backup', () => {
  beforeEach(async () => {
    localStorage.clear();
    fixtures.profileUpsert.mockReset();
    fixtures.profileUpsert.mockResolvedValue({ error: null });
    fixtures.recordStreakCompletion.mockReset();
    fixtures.recordStreakCompletion.mockReturnValue(fixtures.completed);
    fixtures.recordStreakDayOnly.mockReset();
    fixtures.recordStreakDayOnly.mockReturnValue({ state: fixtures.completed, changed: true });
    fixtures.readStreakState.mockClear();
    fixtures.scoreInsert.mockClear();
    fixtures.completionInsert.mockClear();
    fixtures.currentUserId = 'user-1';
    fixtures.userReadGate = null;
    resetProgressHydration('user-1');
    await ensureProgressHydration('user-1', async () => true);
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
    resetProgressHydration('user-a');
    await ensureProgressHydration('user-a', async () => true);
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

  it('keeps a completion attributed to Account A when auth resolves after switching to Account B', async () => {
    let releaseUserRead = () => undefined;
    fixtures.userReadGate = new Promise<void>((resolve) => { releaseUserRead = resolve; });
    fixtures.currentUserId = 'user-a';
    resetProgressHydration('user-a');
    await ensureProgressHydration('user-a', async () => true);

    recordCompletion('/footle', 400, 'Tester', 5);
    fixtures.currentUserId = 'user-b';
    resetProgressHydration('user-b');
    releaseUserRead();

    await waitFor(() => expect(fixtures.scoreInsert).toHaveBeenCalledTimes(1));
    expect(fixtures.scoreInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-a' }),
    );
    expect(fixtures.scoreInsert).not.toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-b' }),
    );
  });

  it('keeps a streak day attributed to Account A when auth resolves after switching to Account B', async () => {
    let releaseUserRead = () => undefined;
    fixtures.userReadGate = new Promise<void>((resolve) => { releaseUserRead = resolve; });
    fixtures.currentUserId = 'user-a';
    resetProgressHydration('user-a');
    await ensureProgressHydration('user-a', async () => true);

    recordStreakDay('/soccer-career');
    fixtures.currentUserId = 'user-b';
    resetProgressHydration('user-b');
    releaseUserRead();

    await waitFor(() => expect(fixtures.profileUpsert).toHaveBeenCalledTimes(1));
    expect(fixtures.profileUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-a',
        streak_state: fixtures.completed,
      }),
      { onConflict: 'user_id' },
    );
    expect(fixtures.profileUpsert).not.toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-b' }),
      expect.anything(),
    );
  });

  it('waits for the signed-in display name before writing the public completion row', async () => {
    let releaseHydration = (_success: boolean) => undefined;
    const hydrationGate = new Promise<boolean>((resolve) => { releaseHydration = resolve; });
    fixtures.currentUserId = 'user-a';
    resetProgressHydration('user-a');
    void ensureProgressHydration('user-a', () => hydrationGate);

    recordCompletion('/footle', 400, undefined, 5);

    expect(fixtures.completionInsert).not.toHaveBeenCalled();
    expect(getLocalTodayCount()).toBe(1);

    localStorage.setItem('dukb-display-name-identity-v1', 'user-a');
    localStorage.setItem('dukb-display-name', 'Account A');
    localStorage.setItem('dukb-display-name-scoped-v1:user-a', 'Account A');
    releaseHydration(true);

    await waitFor(() => expect(fixtures.completionInsert).toHaveBeenCalledTimes(1));
    expect(fixtures.completionInsert).toHaveBeenCalledWith(expect.objectContaining({
      game: 'footle',
      player_name: 'Account A',
    }));
  });

  it('uses the captured account name when another tab changes the active display cache', async () => {
    localStorage.setItem('dukb-display-name-identity-v1', 'user-1');
    localStorage.setItem('dukb-display-name', 'Account A');
    localStorage.setItem('dukb-display-name-scoped-v1:user-1', 'Account A');

    /* Another tab signs into Account B before this tab receives the auth
       event. The completion still belongs to the captured user-1 hydration. */
    localStorage.setItem('dukb-display-name-identity-v1', 'user-2');
    localStorage.setItem('dukb-display-name', 'Account B');
    localStorage.setItem('dukb-display-name-scoped-v1:user-2', 'Account B');

    recordCompletion('/footle', 400, undefined, 5);

    await waitFor(() => expect(fixtures.completionInsert).toHaveBeenCalledTimes(1));
    expect(fixtures.completionInsert).toHaveBeenCalledWith(expect.objectContaining({
      game: 'footle',
      player_name: 'Account A',
    }));
  });

  it('waits for the signed-in display name before writing a public activity row', async () => {
    let releaseHydration = (_success: boolean) => undefined;
    const hydrationGate = new Promise<boolean>((resolve) => { releaseHydration = resolve; });
    fixtures.currentUserId = 'user-a';
    resetProgressHydration('user-a');
    void ensureProgressHydration('user-a', () => hydrationGate);

    recordActivity('/soccer-career', 120);

    expect(fixtures.completionInsert).not.toHaveBeenCalled();
    expect(getLocalTodayCount()).toBe(1);

    localStorage.setItem('dukb-display-name-identity-v1', 'user-a');
    localStorage.setItem('dukb-display-name', 'Account A');
    localStorage.setItem('dukb-display-name-scoped-v1:user-a', 'Account A');
    releaseHydration(true);

    await waitFor(() => expect(fixtures.completionInsert).toHaveBeenCalledTimes(1));
    expect(fixtures.completionInsert).toHaveBeenCalledWith(expect.objectContaining({
      game: 'soccer-career',
      score: 120,
      player_name: 'Account A',
    }));
  });

  it('drops a pending public completion row when the signed-in identity changes', async () => {
    let releaseHydration = (_success: boolean) => undefined;
    const hydrationGate = new Promise<boolean>((resolve) => { releaseHydration = resolve; });
    fixtures.currentUserId = 'user-a';
    resetProgressHydration('user-a');
    void ensureProgressHydration('user-a', () => hydrationGate);

    recordCompletion('/footle', 400, undefined, 5);
    fixtures.currentUserId = 'user-b';
    resetProgressHydration('user-b');
    localStorage.setItem('dukb-display-name', 'Account B');
    releaseHydration(true);

    await hydrationGate;
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(fixtures.completionInsert).not.toHaveBeenCalled();
    expect(getLocalTodayCount()).toBe(1);
  });

  it('skips a signed-in public completion when hydration cannot establish a display name', async () => {
    let releaseHydration = (_success: boolean) => undefined;
    const hydrationGate = new Promise<boolean>((resolve) => { releaseHydration = resolve; });
    fixtures.currentUserId = 'user-a';
    resetProgressHydration('user-a');
    void ensureProgressHydration('user-a', () => hydrationGate);

    recordCompletion('/footle', 400, undefined, 5);
    releaseHydration(true);

    await hydrationGate;
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(fixtures.completionInsert).not.toHaveBeenCalled();
    expect(getLocalTodayCount()).toBe(1);
  });
});
