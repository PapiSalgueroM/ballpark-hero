// Real homepage and popularity hook, with inert deferred account reads only.
import { act, cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
  auth: { user: null, profile: null } as { user: { id: string } | null; profile: { user_id: string; display_name: string } | null },
  localGames: 1, rpc: vi.fn(), from: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mock.auth }));
vi.mock('@/lib/completions', () => ({ getCurrentPlayerName: (p: { display_name?: string } | null) => p?.display_name || 'Guest', getLocalTodayCount: () => mock.localGames }));
vi.mock('@/hooks/useStreaks', () => ({ useStreaks: () => ({ globalCurrentStreak: 3 }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mock.rpc, from: mock.from } }));
vi.mock('@/components/auth/AuthModal', () => ({ AuthModal: () => null }));
vi.mock('@/components/game/StreakReminder', () => ({ StreakReminder: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
import Index from '@/pages/Index';

function deferred() {
  let resolve!: (value: any) => void;
  const promise = new Promise<any>(yes => { resolve = yes; });
  return { promise, resolve };
}
type Request = { table: string; args?: Record<string, unknown>; filters: [string, unknown][]; columns?: string; signal?: AbortSignal; reply: ReturnType<typeof deferred> };
const requests: Request[] = [];
let visibility: DocumentVisibilityState;
function builder(table: string, args?: Record<string, unknown>) {
  const request: Request = { table, args, filters: [], reply: deferred() }; requests.push(request);
  const query = {
    select: (columns: string) => { request.columns = columns; return query; },
    eq: (key: string, value: unknown) => { request.filters.push([key, value]); return query; },
    abortSignal: (signal: AbortSignal) => { request.signal = signal; return query; },
    then: (yes: (value: any) => unknown, no?: (error: unknown) => unknown) => request.reply.promise.then(yes, no),
  };
  return query;
}
const personal = () => requests.filter(r => r.table !== 'most_played_today');
const hero = () => personal().filter(r => r.table === 'global_rank' || r.table === 'game_completions');
const tree = () => <MemoryRouter><Index /></MemoryRouter>;
const mount = () => render(tree());
type View = ReturnType<typeof mount>;
function signed(id = 'account-a', name = 'Alpha') { mock.auth = { user: { id }, profile: { user_id: id, display_name: name } }; }
function event(name: string) { act(() => { window.dispatchEvent(new Event(name)); }); }
function show(state: DocumentVisibilityState) { act(() => { visibility = state; document.dispatchEvent(new Event('visibilitychange')); }); }
const flush = async () => { await act(async () => { await Promise.resolve(); }); };
async function finish(batch = personal(), rank = 7, games = ['footle', 'footle', 'ball-iq'], best = 72, error = false) {
  await act(async () => {
    for (const request of batch) request.reply.resolve(error ? { data: null, error: { message: 'Fixture unavailable' } } : {
      data: request.table === 'global_rank' ? [{ rank }]
        : request.table === 'user_best_scores' ? [{ game_type: 'nba-stat-line', best_score: best }]
        : games.map(game => ({ game })), count: 0, error: null,
    });
  });
}
function stats(view: View, rank: number, games: number, best = 72) {
  expect(view.getByText('World rank:').parentElement).toHaveTextContent(`#${rank}`);
  expect(view.getByText('Played today:').parentElement).toHaveTextContent(`Played today: ${games}`);
  expect(view.getAllByText(`PB: ${best}`).length).toBeGreaterThan(0);
}

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-02T23:00:00Z'));
  localStorage.clear(); requests.length = 0; mock.localGames = 1; mock.auth = { user: null, profile: null };
  visibility = 'visible'; Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  mock.rpc.mockReset(); mock.from.mockReset(); mock.from.mockImplementation(table => builder(table));
  mock.rpc.mockImplementation((table, args) => {
    if (table !== 'most_played_today') return builder(table, args);
    requests.push({ table, args, filters: [], reply: deferred() });
    return Promise.resolve({ data: [{ game: 'soccer-grid', plays: 17 }, { game: 'perfect-season-nba', plays: 12 }, { game: 'transfer-path', plays: 9 }], error: null });
  });
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Offline homepage fixture must not fetch'); }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
});
afterEach(() => { cleanup(); expect(globalThis.fetch).not.toHaveBeenCalled(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('homepage personal read ownership', () => {
  it('preserves useful public popularity for signed out visitors', async () => {
    const view = mount(); await flush();
    expect(view.getByRole('heading', { name: 'Most played today' })).toBeInTheDocument();
    expect(view.getAllByText('Trending')).toHaveLength(3);
    expect(requests.filter(r => r.table === 'most_played_today')).toHaveLength(1);
    expect(mock.rpc).toHaveBeenCalledWith('most_played_today', { p_min: 3, p_limit: 3 });
  });

  it('preserves visible signed in rank distinct games local floor and tile bests', async () => {
    signed(); mock.localGames = 4; const view = mount(); await finish(); stats(view, 7, 4);
    expect(view.getByText('Days in a row:').parentElement).toHaveTextContent('3');
    expect(requests.find(r => r.table === 'global_rank')!.args).toEqual({ p_player: 'Alpha', p_period: 'alltime', p_games: null });
  });

  it('guests make zero personal reads through focus visibility and idle time', async () => {
    mount(); await flush(); event('focus'); show('hidden'); show('visible');
    await act(async () => { await vi.advanceTimersByTimeAsync(15 * 60 * 1000); });
    expect(personal()).toHaveLength(0);
    expect(requests.filter(r => r.table === 'most_played_today')).toHaveLength(1);
  });

  it('hidden eligible accounts defer reads until one foreground batch', async () => {
    signed(); visibility = 'hidden'; const view = mount(); await flush(); event('focus'); expect(personal()).toHaveLength(0);
    show('visible'); expect(hero()).toHaveLength(2); expect(personal()).toHaveLength(3);
    await finish(); stats(view, 7, 2);
  });

  it('waits for the matching account profile before reading personal values', async () => {
    mock.auth = { user: { id: 'account-a' }, profile: null }; const view = mount(); await flush(); expect(personal()).toHaveLength(0);
    mock.auth.profile = { user_id: 'account-b', display_name: 'Other' }; view.rerender(tree()); event('focus'); expect(personal()).toHaveLength(0);
    signed(); view.rerender(tree()); expect(personal()).toHaveLength(3); await finish(); stats(view, 7, 2);
  });

  it('coalesces in flight events and does not poll completed reads', async () => {
    signed(); const view = mount(); event('focus'); show('hidden'); show('visible'); event('focus');
    expect(personal()).toHaveLength(3);
    await finish(); stats(view, 7, 2); show('hidden'); show('visible'); event('focus');
    await act(async () => { await vi.advanceTimersByTimeAsync(15 * 60 * 1000); });
    expect(personal()).toHaveLength(3);
  });

  it('same account and handle clones do not repeat personal reads', async () => {
    signed(); const view = mount(); await finish();
    signed(); view.rerender(tree()); event('focus'); await flush(); expect(personal()).toHaveLength(3); stats(view, 7, 2);
  });

  it('late prior account responses cannot overwrite the new visible identity', async () => {
    signed(); const view = mount(), old = [...personal()];
    signed('account-b', 'Beta'); view.rerender(tree()); expect(view.queryByText('World rank:')).toBeNull();
    const fresh = personal().filter(r => !old.includes(r)); await finish(fresh, 3, ['footle'], 81); stats(view, 3, 1, 81);
    await finish(old, 99, ['footle', 'ball-iq', 'connections', 'soccer-grid'], 12); stats(view, 3, 1, 81);
  });

  it('same handle account changes reload the correct account bests', async () => {
    signed(); const view = mount(); await finish(); const old = [...personal()];
    signed('account-b', 'Alpha'); view.rerender(tree()); expect(view.queryByText('World rank:')).toBeNull();
    const fresh = personal().filter(r => !old.includes(r)); expect(fresh).toHaveLength(3);
    expect(fresh.find(r => r.table === 'user_best_scores')!.filters).toEqual([['user_id', 'account-b']]);
    await finish(fresh, 4, ['footle'], 88); stats(view, 4, 1, 88);
  });

  it('renamed handles own their response and discard stale name reads', async () => {
    signed(); const view = mount(), old = [...personal()]; signed('account-a', 'Renamed'); view.rerender(tree());
    const fresh = personal().filter(r => !old.includes(r));
    expect(fresh.find(r => r.table === 'global_rank')!.args?.p_player).toBe('Renamed');
    await finish(fresh, 6); await finish(old, 99); stats(view, 6, 2);
  });

  it('failed reads keep local facts and retry only on a later foreground event', async () => {
    signed(); const view = mount(); await finish(personal(), 7, [], 72, true);
    expect(view.queryByText('World rank:')).toBeNull(); expect(view.getByText('Played today:').parentElement).toHaveTextContent('Played today: 1');
    await act(async () => { await vi.advanceTimersByTimeAsync(15 * 60 * 1000); }); expect(personal()).toHaveLength(3);
    show('hidden'); show('visible'); const fresh = personal().slice(3); expect(fresh).toHaveLength(3);
    await finish(fresh); stats(view, 7, 2);
  });

  it('unmount aborts owned requests and removes foreground listeners', async () => {
    signed(); const view = mount(), old = [...personal()]; expect(old).toHaveLength(3);
    expect(old.every(r => r.signal && !r.signal.aborted)).toBe(true); view.unmount();
    expect(old.every(r => r.signal?.aborted)).toBe(true); event('focus'); show('hidden'); show('visible');
    expect(personal()).toHaveLength(3); await finish(old);
  });

  it('does not query unused traffic counts or unbounded lifetime history', async () => {
    signed(); mount(); expect(hero()).toHaveLength(2);
    expect(requests.some(r => r.table === 'daily_completions')).toBe(false);
    expect(requests.filter(r => r.table === 'game_completions').map(r => r.filters)).toEqual([[['player_name', 'Alpha'], ['completed_on', '2026-10-02']]]);
  });
});
