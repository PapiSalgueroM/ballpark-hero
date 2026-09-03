import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

interface Deferred<T = never> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
}

function deferred<T = never>(): Deferred<T> {
  let resolve = (_value: T) => undefined;
  let reject = (_reason: Error) => undefined;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const fixtures = vi.hoisted(() => ({
  auth: {
    user: { id: 'account-a' },
    profile: { display_name: 'Account A' },
  } as {
    user: { id: string };
    profile: { display_name: string };
  },
  localToday: 1,
  bPending: null as Deferred<never> | null,
  rankRequests: [] as string[],
  bestScoreResponses: new Map<string, Promise<{
    data: Array<{ game_type: string; best_score: number }>;
  }>>(),
  bestScoreRequests: [] as string[],
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => fixtures.auth,
}));

vi.mock('@/hooks/usePlayerName', () => ({
  usePlayerName: (profile: { display_name?: string } | null) => profile?.display_name ?? null,
}));

vi.mock('@/lib/completions', () => ({
  getLocalTodayCount: () => fixtures.localToday,
}));

vi.mock('@/integrations/supabase/client', () => {
  const completionQuery = () => {
    let playerName = '';
    let todayOnly = false;
    const query: Record<string, unknown> = {};
    query.select = vi.fn(() => query);
    query.eq = vi.fn((field: string, value: string) => {
      if (field === 'player_name') playerName = value;
      if (field === 'completed_on') todayOnly = true;
      return query;
    });
    query.then = (
      resolve: (value: { data: Array<{ game: string }> }) => unknown,
      reject: (reason: unknown) => unknown,
    ) => {
      if (playerName === 'Account B') {
        return fixtures.bPending!.promise.then(resolve, reject);
      }
      const data = todayOnly
        ? [{ game: 'soccer-grid' }, { game: 'footle' }]
        : [{ game: 'soccer-grid' }, { game: 'footle' }, { game: 'squad-deal' }];
      return Promise.resolve({ data }).then(resolve, reject);
    };
    return query;
  };

  const resolvedQuery = (value: unknown) => {
    const query: Record<string, unknown> = {};
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.then = (resolve: (result: unknown) => unknown) => Promise.resolve(value).then(resolve);
    return query;
  };

  const bestScoreQuery = () => {
    let userId = '';
    const query: Record<string, unknown> = {};
    query.select = vi.fn(() => query);
    query.eq = vi.fn((field: string, value: string) => {
      if (field === 'user_id') userId = value;
      return query;
    });
    query.then = (
      resolve: (result: { data: Array<{ game_type: string; best_score: number }> }) => unknown,
      reject: (reason: unknown) => unknown,
    ) => {
      fixtures.bestScoreRequests.push(userId);
      const response = fixtures.bestScoreResponses.get(userId) ?? Promise.resolve({ data: [] });
      return response.then(resolve, reject);
    };
    return query;
  };

  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'game_completions') return completionQuery();
        if (table === 'daily_completions') return resolvedQuery({ count: 12 });
        if (table === 'user_best_scores') return bestScoreQuery();
        return resolvedQuery({ data: [] });
      }),
      rpc: vi.fn((_name: string, args: { p_player: string }) => {
        fixtures.rankRequests.push(args.p_player);
        if (args.p_player === 'Account B') return fixtures.bPending!.promise;
        return Promise.resolve({ data: [{ rank: 486 }] });
      }),
    },
  };
});

vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/game/StreakReminder', () => ({ StreakReminder: () => null }));
vi.mock('@/components/home/PollOfTheDay', () => ({ PollOfTheDay: () => null }));
vi.mock('@/components/auth/AuthModal', () => ({ AuthModal: () => null }));
vi.mock('@/hooks/useMostPlayed', () => ({
  useMostPlayed: () => ({ entries: [], loading: false }),
}));
vi.mock('@/hooks/useStreaks', () => ({
  useStreaks: () => ({ globalCurrentStreak: 0 }),
}));
vi.mock('@/data/gameRegistry', () => ({
  ALL_GAMES: [
    {
      path: '/soccer-grid',
      label: 'Soccer Grid',
      emoji: 'S',
      description: 'Identity race test game',
    },
  ],
  CATEGORIES: [],
  VISIBLE_CATEGORIES: [{
    title: 'Soccer Games',
    emoji: 'S',
    games: [{
      path: '/soccer-grid',
      label: 'Soccer Grid',
      emoji: 'S',
      description: 'Identity race test game',
    }],
  }],
  FEATURED_GAMES: [],
  TOTAL_GAMES: 1,
}));
vi.mock('@/lib/sportHub', () => ({ SPORT_HUBS: [] }));

import Index from '@/pages/Index';

function expectPlayedToday(value: number) {
  expect(screen.getByText((_text, element) => (
    element?.tagName === 'SPAN' && element.textContent === `Played today: ${value}`
  ))).toBeInTheDocument();
}

describe('home personal stat identity isolation', () => {
  beforeEach(() => {
    fixtures.auth = {
      user: { id: 'account-a' },
      profile: { display_name: 'Account A' },
    };
    fixtures.localToday = 1;
    fixtures.bPending = deferred();
    fixtures.rankRequests.length = 0;
    fixtures.bestScoreResponses.clear();
    fixtures.bestScoreRequests.length = 0;
  });

  it('never shows Account A stats while Account B is pending or after its fetch fails', async () => {
    const view = render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expectPlayedToday(2);
      expect(screen.getByText('#486')).toBeInTheDocument();
    });

    fixtures.localToday = 1;
    fixtures.auth = {
      user: { id: 'account-b' },
      profile: { display_name: 'Account B' },
    };
    view.rerender(
      <MemoryRouter>
        <Index />
      </MemoryRouter>,
    );

    expect(fixtures.rankRequests).toContain('Account B');
    expectPlayedToday(1);
    expect(screen.queryByText('#486')).not.toBeInTheDocument();

    await act(async () => {
      fixtures.bPending!.reject(new Error('offline'));
      await Promise.resolve();
    });

    expectPlayedToday(1);
    expect(screen.queryByText('#486')).not.toBeInTheDocument();
  });

  it('keeps Account A personal bests out of Account B after A resolves last', async () => {
    const accountAScores = deferred<{
      data: Array<{ game_type: string; best_score: number }>;
    }>();
    const accountBScores = deferred<{
      data: Array<{ game_type: string; best_score: number }>;
    }>();
    fixtures.bestScoreResponses.set('account-a', accountAScores.promise);
    fixtures.bestScoreResponses.set('account-b', accountBScores.promise);

    const view = render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>,
    );
    await waitFor(() => expect(fixtures.bestScoreRequests).toContain('account-a'));

    fixtures.auth = {
      user: { id: 'account-b' },
      profile: { display_name: 'Account B' },
    };
    view.rerender(
      <MemoryRouter>
        <Index />
      </MemoryRouter>,
    );
    await waitFor(() => expect(fixtures.bestScoreRequests).toContain('account-b'));

    await act(async () => {
      accountBScores.resolve({
        data: [{ game_type: 'soccer-grid', best_score: 22 }],
      });
      await accountBScores.promise;
    });
    expect(screen.getByText('PB: 22')).toBeInTheDocument();

    await act(async () => {
      accountAScores.resolve({
        data: [{ game_type: 'soccer-grid', best_score: 99 }],
      });
      await accountAScores.promise;
    });

    expect(screen.getByText('PB: 22')).toBeInTheDocument();
    expect(screen.queryByText('PB: 99')).not.toBeInTheDocument();
  });
});
