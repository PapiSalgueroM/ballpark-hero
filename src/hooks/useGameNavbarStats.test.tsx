import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
  auth: { user: null, profile: null } as { user: { id: string } | null; profile: { user_id: string; display_name: string } | null },
  localGames: 0,
  streak: 0,
  rpc: vi.fn(),
  from: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mock.auth }));
vi.mock('@/data/gameRegistry', () => ({ TOTAL_GAMES: 150 }));
vi.mock('@/lib/completions', () => ({
  getCurrentPlayerName: (profile: { display_name?: string } | null) => profile?.display_name || 'Guest',
  getLocalTodayCount: () => mock.localGames,
}));
vi.mock('@/lib/streaks', () => ({ getGlobalCurrentStreak: () => mock.streak }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mock.rpc, from: mock.from } }));
import { useGameNavbarStats } from '@/hooks/useGameNavbarStats';

function deferred() {
  let resolve!: (value: any) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const requests: { rank: ReturnType<typeof deferred>; played: ReturnType<typeof deferred>; filters: [string, string][] }[] = [];
let visibility: DocumentVisibilityState;
function signedIn(id = 'account-a', name = 'Alpha') {
  mock.auth = { user: { id }, profile: { user_id: id, display_name: name } };
}
function event(name: string) { act(() => { window.dispatchEvent(new Event(name)); }); }
function show(state: DocumentVisibilityState) {
  act(() => { visibility = state; document.dispatchEvent(new Event('visibilitychange')); });
}
async function tick(ms: number) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
async function finish(index: number, points = 50, rank = 7, games = ['one', 'one', 'two']) {
  await act(async () => {
    requests[index].rank.resolve({ data: [{ total_points: points, rank }] });
    requests[index].played.resolve({ data: games.map(game => ({ game })) });
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-15T23:00:00Z'));
  mock.auth = { user: null, profile: null };
  mock.localGames = 1; mock.streak = 3;
  mock.rpc.mockReset(); mock.from.mockReset(); requests.length = 0;
  visibility = 'visible';
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  mock.rpc.mockImplementation(() => {
    const request = { rank: deferred(), played: deferred(), filters: [] as [string, string][] };
    requests.push(request);
    return request.rank.promise;
  });
  mock.from.mockImplementation(table => {
    expect(table).toBe('game_completions');
    const request = requests[requests.length - 1];
    const builder = {
      select: (columns: string) => { expect(columns).toBe('game'); return builder; },
      eq: (key: string, value: string) => {
        request.filters.push([key, value]);
        return key === 'completed_on' ? request.played.promise : builder;
      },
    };
    return builder;
  });
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Offline test must not fetch'); }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('navbar remote read eligibility and lifecycle', () => {
  it('1 guests make no remote reads while local completions and streaks update', async () => {
    const { result } = renderHook(useGameNavbarStats);
    event('focus'); show('hidden'); show('visible');
    mock.localGames = 4; mock.streak = 8;
    event('game-completion-saved');
    expect(result.current).toMatchObject({ gamesPlayedToday: 4, currentStreak: 8, totalPointsToday: 0, dailyRank: null, loading: false });
    await tick(180_000);
    expect(mock.rpc, 'guests must never read remote stats').toHaveBeenCalledTimes(0);
    expect(mock.from).toHaveBeenCalledTimes(0);
  });

  it('2 hidden tabs stay local then foreground and visible polling refresh', async () => {
    signedIn(); visibility = 'hidden';
    const { result } = renderHook(useGameNavbarStats);
    event('focus'); mock.localGames = 3; mock.streak = 9; event('game-completion-saved');
    await tick(120_000);
    expect(mock.rpc, 'hidden tabs must never start a remote read').toHaveBeenCalledTimes(0);
    expect(result.current).toMatchObject({ gamesPlayedToday: 3, currentStreak: 9 });
    show('visible');
    expect(mock.rpc, 'foreground must request exactly one fresh read').toHaveBeenCalledTimes(1);
    event('focus');
    expect(mock.rpc, 'focus must not duplicate an in-flight foreground read').toHaveBeenCalledTimes(1);
    expect(mock.rpc).toHaveBeenLastCalledWith('global_rank', { p_player: 'Alpha', p_period: 'today', p_games: null });
    expect(requests[0].filters).toEqual([['player_name', 'Alpha'], ['completed_on', '2026-09-15']]);
    await finish(0);
    expect(result.current).toMatchObject({ totalPointsToday: 50, dailyRank: 7, gamesPlayedToday: 3, loading: false });
    await tick(60_000);
    expect(mock.rpc, 'visible fallback must still poll after one minute').toHaveBeenCalledTimes(2);
    await finish(1, 80);
    show('hidden'); await tick(120_000); event('focus');
    expect(mock.rpc).toHaveBeenCalledTimes(2);
    show('visible');
    expect(mock.rpc).toHaveBeenCalledTimes(3);
  });

  it('3 login waits for its own profile and profile renaming refreshes', async () => {
    const { result, rerender } = renderHook(useGameNavbarStats);
    mock.auth = { user: { id: 'account-a' }, profile: null }; rerender(); event('focus');
    expect(mock.rpc).toHaveBeenCalledTimes(0);
    signedIn(); rerender();
    expect(mock.rpc, 'login must start its visible read').toHaveBeenCalledTimes(1);
    await finish(0, 100, 2);
    mock.auth = { user: { id: 'account-b' }, profile: { user_id: 'account-a', display_name: 'Alpha' } };
    rerender(); event('focus'); await tick(800);
    expect(mock.rpc, 'new account must not use the old profile').toHaveBeenCalledTimes(1);
    expect(result.current).toMatchObject({ totalPointsToday: 0, dailyRank: null });
    signedIn('account-b', 'Beta'); rerender();
    expect(mock.rpc).toHaveBeenCalledTimes(2);
    await finish(1, 30, 20);
    signedIn('account-b', 'Renamed'); rerender();
    expect(mock.rpc, 'profile handle changes must refresh').toHaveBeenCalledTimes(3);
    expect(mock.rpc).toHaveBeenLastCalledWith('global_rank', { p_player: 'Renamed', p_period: 'today', p_games: null });
    await finish(2, 31, 19);
    expect(result.current).toMatchObject({ totalPointsToday: 31, dailyRank: 19 });
  });

  it('4 completion updates local facts immediately and refreshes after the write delay', async () => {
    signedIn(); const { result } = renderHook(useGameNavbarStats);
    await finish(0);
    mock.localGames = 4; mock.streak = 10;
    event('game-completion-saved'); event('game-completion-saved');
    expect(result.current, 'completion must update local facts before network').toMatchObject({ gamesPlayedToday: 4, currentStreak: 10, totalPointsToday: 50 });
    await tick(799); expect(mock.rpc).toHaveBeenCalledTimes(1);
    await tick(1);
    expect(mock.rpc, 'completion must refresh at the existing 800ms delay').toHaveBeenCalledTimes(2);
    await finish(1, 75, 4, ['a', 'a', 'b', 'c', 'd', 'e']);
    expect(result.current).toMatchObject({ totalPointsToday: 75, dailyRank: 4, gamesPlayedToday: 5, currentStreak: 10 });
  });

  it('5 old-account results cannot replace the new identity, including equal handles', async () => {
    signedIn(); const { result, rerender } = renderHook(useGameNavbarStats);
    signedIn('account-b', 'Alpha'); rerender();
    expect(mock.rpc, 'same handle on another account still starts a new generation').toHaveBeenCalledTimes(2);
    await finish(1, 22, 30);
    await finish(0, 999, 1);
    expect(result.current, 'obsolete success must not replace the current account').toMatchObject({ totalPointsToday: 22, dailyRank: 30 });
    mock.auth = { user: null, profile: null }; rerender();
    expect(result.current).toMatchObject({ totalPointsToday: 0, dailyRank: null, gamesPlayedToday: 1, currentStreak: 3 });
  });

  it('6 obsolete failures cannot finish the new request, and current errors keep local truth', async () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    signedIn(); const { result, rerender } = renderHook(useGameNavbarStats);
    signedIn('account-b', 'Beta'); rerender();
    await act(async () => { requests[0].rank.reject(new Error('old failure')); requests[0].played.resolve({ data: [] }); });
    expect(result.current.loading, 'obsolete error must not finish the active account read').toBe(true);
    expect(debug).not.toHaveBeenCalled();
    mock.localGames = 7; mock.streak = 11;
    await act(async () => { requests[1].rank.reject(new Error('current failure')); requests[1].played.resolve({ data: [] }); });
    expect(result.current).toMatchObject({ gamesPlayedToday: 7, currentStreak: 11, loading: false });
    event('focus'); expect(mock.rpc).toHaveBeenCalledTimes(3);
    await finish(2, 42, 12);
    expect(result.current).toMatchObject({ totalPointsToday: 42, dailyRank: 12 });
  });

  it('7 unmount removes timers and listeners, including a queued completion refresh', async () => {
    signedIn(); const { unmount } = renderHook(useGameNavbarStats);
    await finish(0);
    event('game-completion-saved');
    unmount();
    expect(vi.getTimerCount(), 'cleanup must cancel the completion delay and poll').toBe(0);
    const localBefore = mock.localGames;
    event('focus'); show('hidden'); show('visible'); event('game-completion-saved');
    expect(vi.getTimerCount(), 'cleanup must remove completion and foreground listeners').toBe(0);
    await tick(180_000);
    expect(mock.rpc).toHaveBeenCalledTimes(1);
    expect(mock.localGames).toBe(localBefore);
    expect(vi.getTimerCount()).toBe(0);
  });
});
