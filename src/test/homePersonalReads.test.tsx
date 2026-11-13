// Real homepage and popularity hook, with inert deferred account reads only.
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({
  auth: { user: null, profile: null } as { user: { id: string } | null; profile: { user_id: string; display_name: string } | null },
  localGames: 1, rpc: vi.fn(), from: vi.fn(), load: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mock.auth }));
vi.mock('@/lib/completions', () => ({ getCurrentPlayerName: (p: { display_name?: string } | null) => p?.display_name || 'Guest', getLocalTodayCount: () => mock.localGames }));
vi.mock('@/hooks/useStreaks', () => ({ useStreaks: () => ({ globalCurrentStreak: 3 }) }));
vi.mock('@/integrations/supabase/loadClient', () => ({ loadSupabase: async () => { mock.load(); return { rpc: mock.rpc, from: mock.from }; } }));
vi.mock('@/components/auth/AuthModal', () => ({ AuthModal: () => null }));
vi.mock('@/components/game/StreakReminder', () => ({ StreakReminder: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/home/PollOfTheDay', () => ({ PollOfTheDay: () => <div>Polls are mounted</div> }));
import Index from '@/pages/Index';
import { useGameNavbarStats } from '@/hooks/useGameNavbarStats';

const nearObservers = new Map<Element, { callback: IntersectionObserverCallback; rootMargin?: string }>();
function showIntersection(node: Element, intersecting: boolean) {
  const observed = nearObservers.get(node);
  expect(observed).toBeDefined();
  const rect = node.getBoundingClientRect();
  const entry: IntersectionObserverEntry = { target: node, isIntersecting: intersecting, boundingClientRect: rect,
    intersectionRatio: Number(intersecting), intersectionRect: rect, rootBounds: null, time: 0 };
  const send = () => act(() => observed!.callback([entry], {} as IntersectionObserver));
  send();
  return send;
}

function revealPopularity(view: ReturnType<typeof render>) {
  const section = view.getByRole('heading', { name: 'Most played today' }).closest('section')!;
  return showIntersection(section, true);
}

function deferred() {
  let resolve!: (value: any) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
type Request = { table: string; args?: Record<string, unknown>; filters: [string, unknown, ('gte' | 'lte' | 'lt')?][]; columns?: string; signal?: AbortSignal; reply: ReturnType<typeof deferred> };
const requests: Request[] = [];
let visibility: DocumentVisibilityState;
function builder(table: string, args?: Record<string, unknown>) {
  const request: Request = { table, args, filters: [], reply: deferred() }; requests.push(request);
  const query = {
    select: (columns: string) => { request.columns = columns; return query; },
    eq: (key: string, value: unknown) => { request.filters.push([key, value]); return query; },
    gte: (key: string, value: string) => { request.filters.push([key, value, 'gte']); return query; },
    lte: (key: string, value: string) => { request.filters.push([key, value, 'lte']); return query; },
    lt: (key: string, value: string) => { request.filters.push([key, value, 'lt']); return query; },
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
      data: request.table === 'global_rank' ? [{ rank, total_points: 95 }]
        : request.table === 'user_best_scores' ? [{ game_type: 'nba-stat-line', best_score: best }]
        : games.map(game => ({ game })), count: 0, error: null,
    });
  });
}
type CompletionRow = { player_name: string; completed_on: string; created_at: string; game: string };
async function finishPlayed(rows: CompletionRow[]) {
  await act(async () => {
    for (const request of personal().filter(r => r.table === 'game_completions')) {
      const data = rows.filter(row => request.filters.every(([key, value, operator]) => {
        const cell = row[key as keyof CompletionRow];
        if (operator === 'gte') return Date.parse(cell) >= Date.parse(String(value));
        if (operator === 'lte') return Date.parse(cell) <= Date.parse(String(value));
        if (operator === 'lt') return Date.parse(cell) < Date.parse(String(value));
        return cell === value;
      })).map(({ game }) => ({ game }));
      request.reply.resolve({ data, error: null });
    }
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
  mock.rpc.mockReset(); mock.from.mockReset(); mock.load.mockReset(); nearObservers.clear(); mock.from.mockImplementation(table => builder(table));
  mock.rpc.mockImplementation((table, args) => {
    if (table !== 'most_played_today') return builder(table, args);
    requests.push({ table, args, filters: [], reply: deferred() });
    return Promise.resolve({ data: [{ game: 'soccer-grid', plays: 17 }, { game: 'perfect-season-nba', plays: 12 }, { game: 'transfer-path', plays: 9 }], error: null });
  });
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Offline homepage fixture must not fetch'); }));
  vi.stubGlobal('IntersectionObserver', class {
    private nodes: Element[] = [];
    constructor(private callback: IntersectionObserverCallback, private options?: IntersectionObserverInit) {}
    observe(node: Element) { this.nodes.push(node); nearObservers.set(node, { callback: this.callback, rootMargin: this.options?.rootMargin }); }
    disconnect() { this.nodes.forEach(node => nearObservers.delete(node)); }
  });
});
afterEach(() => { cleanup(); expect(globalThis.fetch).not.toHaveBeenCalled(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('homepage personal read ownership', () => {
  it('preserves useful public popularity for signed out visitors', async () => {
    const view = mount(); await flush();
    expect(view.getByRole('heading', { name: 'Most played today' })).toBeInTheDocument();
    revealPopularity(view); await flush();
    expect(view.getAllByText('Trending')).toHaveLength(3);
    expect(requests.filter(r => r.table === 'most_played_today')).toHaveLength(1);
    expect(mock.rpc).toHaveBeenCalledWith('most_played_today', { p_min: 3, p_limit: 3 });
  });

  it('keeps below-fold popularity usable without loading the account client', async () => {
    const view = mount(); await flush();
    const section = view.getByRole('heading', { name: 'Most played today' }).closest('section')!;
    expect(section.querySelectorAll('ol a')).toHaveLength(3);
    expect(view.queryAllByText('Trending')).toHaveLength(0);
    expect(mock.load).not.toHaveBeenCalled();
    expect(mock.rpc).not.toHaveBeenCalled();
    const queuedIntersection = revealPopularity(view); await flush();
    expect(mock.load).toHaveBeenCalledOnce();
    expect(view.getAllByText('Trending')).toHaveLength(3);
    queuedIntersection(); await flush();
    expect(mock.rpc).toHaveBeenCalledOnce();
  });

  it('loads popularity without an IntersectionObserver implementation', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const view = mount(); await flush();
    expect(view.getAllByText('Trending')).toHaveLength(3);
    expect(mock.rpc).toHaveBeenCalledWith('most_played_today', { p_min: 3, p_limit: 3 });
    await act(async () => { await vi.dynamicImportSettled(); });
    expect(view.getByText('Polls are mounted')).toBeVisible();
  });

  it('keeps the poll placeholder until its section intersects the actual viewport', async () => {
    const view = mount(); await flush();
    const placeholder = view.getByRole('heading', { name: 'Polls of the day' }).closest('section')!;
    const wrapper = placeholder.parentElement!;
    const observed = nearObservers.get(wrapper);
    expect(observed?.rootMargin ?? '0px').toMatch(/^0px(?: 0px){0,3}$/);
    showIntersection(wrapper, false);
    expect(placeholder).toHaveAttribute('aria-busy', 'true');
    expect(placeholder.querySelectorAll('[data-poll-skeleton]')).toHaveLength(2);
    expect(view.queryByText('Polls are mounted')).toBeNull();

    showIntersection(wrapper, true);
    await act(async () => { await vi.dynamicImportSettled(); });
    expect(view.getByText('Polls are mounted')).toBeVisible();
    expect(nearObservers.has(wrapper)).toBe(false);
    expect(mock.load).not.toHaveBeenCalled();
  });

  it('preserves visible signed in rank distinct games local floor and tile bests', async () => {
    signed(); mock.localGames = 4; const view = mount(); await flush(); await finish(); stats(view, 7, 4);
    expect(view.getByText('Days in a row:').parentElement).toHaveTextContent('3');
    expect(requests.find(r => r.table === 'global_rank')!.args).toEqual({ p_player: 'Alpha', p_period: 'alltime', p_games: null });
  });

  it('healthy tile bests appear while rank remains pending', async () => {
    signed(); const view = mount(); await flush(); expect(personal()).toHaveLength(3);
    const best = personal().find(r => r.table === 'user_best_scores')!;
    await act(async () => { best.reply.resolve({ data: [{ game_type: 'nba-stat-line', best_score: 95 }], error: null }); });
    expect(view.getAllByText('PB: 95').length).toBeGreaterThan(0);
    expect(view.queryByText('World rank:')).toBeNull();
    expect(view.getByText('Played today:').parentElement).toHaveTextContent('Played today: 1');
    event('focus'); show('hidden'); show('visible'); expect(personal()).toHaveLength(3);
    await finish(); stats(view, 7, 2, 95);
  });

  it('guests make zero personal reads through focus visibility and idle time', async () => {
    const view = mount(); await flush(); revealPopularity(view); await flush(); event('focus'); show('hidden'); show('visible');
    await act(async () => { await vi.advanceTimersByTimeAsync(15 * 60 * 1000); });
    expect(personal()).toHaveLength(0);
    expect(requests.filter(r => r.table === 'most_played_today')).toHaveLength(1);
  });

  it('hidden eligible accounts defer reads until one foreground batch', async () => {
    signed(); visibility = 'hidden'; const view = mount(); await flush(); event('focus'); expect(personal()).toHaveLength(0);
    show('visible'); await flush(); expect(hero()).toHaveLength(2); expect(personal()).toHaveLength(3);
    await finish(); stats(view, 7, 2);
  });

  it('waits for the matching account profile before reading personal values', async () => {
    mock.auth = { user: { id: 'account-a' }, profile: null }; const view = mount(); await flush(); expect(personal()).toHaveLength(0);
    mock.auth.profile = { user_id: 'account-b', display_name: 'Other' }; view.rerender(tree()); event('focus'); expect(personal()).toHaveLength(0);
    signed(); view.rerender(tree()); await flush(); expect(personal()).toHaveLength(3); await finish(); stats(view, 7, 2);
  });

  it('coalesces in flight events and does not poll completed reads', async () => {
    signed(); const view = mount(); event('focus'); show('hidden'); show('visible'); event('focus'); await flush();
    expect(personal()).toHaveLength(3);
    await finish(); stats(view, 7, 2); show('hidden'); show('visible'); event('focus');
    await act(async () => { await vi.advanceTimersByTimeAsync(15 * 60 * 1000); });
    expect(personal()).toHaveLength(3);
  });

  it('same account and handle clones do not repeat personal reads', async () => {
    signed(); const view = mount(); await flush(); await finish();
    signed(); view.rerender(tree()); event('focus'); await flush(); expect(personal()).toHaveLength(3); stats(view, 7, 2);
  });

  it('late prior account responses cannot overwrite the new visible identity', async () => {
    signed(); const view = mount(); await flush(); const old = [...personal()];
    signed('account-b', 'Beta'); view.rerender(tree()); expect(view.queryByText('World rank:')).toBeNull();
    await flush(); const fresh = personal().filter(r => !old.includes(r)); await finish(fresh, 3, ['footle'], 81); stats(view, 3, 1, 81);
    await finish(old, 99, ['footle', 'ball-iq', 'connections', 'soccer-grid'], 12); stats(view, 3, 1, 81);
  });

  it('same handle account changes reload the correct account bests', async () => {
    signed(); const view = mount(); await flush(); await finish(); const old = [...personal()];
    signed('account-b', 'Alpha'); view.rerender(tree()); expect(view.queryByText('World rank:')).toBeNull();
    await flush(); const fresh = personal().filter(r => !old.includes(r)); expect(fresh).toHaveLength(3);
    expect(fresh.find(r => r.table === 'user_best_scores')!.filters).toEqual([['user_id', 'account-b']]);
    await finish(fresh, 4, ['footle'], 88); stats(view, 4, 1, 88);
  });

  it('renamed handles own their response and discard stale name reads', async () => {
    signed(); const view = mount(); await flush(); const old = [...personal()]; signed('account-a', 'Renamed'); view.rerender(tree());
    await flush(); const fresh = personal().filter(r => !old.includes(r));
    expect(fresh.find(r => r.table === 'global_rank')!.args?.p_player).toBe('Renamed');
    await finish(fresh, 6); await finish(old, 99); stats(view, 6, 2);
  });

  it('failed reads keep local facts and retry only on a later foreground event', async () => {
    signed(); const view = mount(); await flush(); await finish(personal(), 7, [], 72, true);
    expect(view.queryByText('World rank:')).toBeNull(); expect(view.getByText('Played today:').parentElement).toHaveTextContent('Played today: 1');
    await act(async () => { await vi.advanceTimersByTimeAsync(15 * 60 * 1000); }); expect(personal()).toHaveLength(3);
    show('hidden'); show('visible'); await flush(); const fresh = personal().slice(3); expect(fresh).toHaveLength(3);
    await finish(fresh); stats(view, 7, 2);
  });

  it('unmount aborts owned requests and removes foreground listeners', async () => {
    signed(); const view = mount(); await flush(); const old = [...personal()]; expect(old).toHaveLength(3);
    expect(old.every(r => r.signal && !r.signal.aborted)).toBe(true); view.unmount();
    expect(old.every(r => r.signal?.aborted)).toBe(true); event('focus'); show('hidden'); show('visible');
    expect(personal()).toHaveLength(3); await finish(old);
  });

  it('does not query unused traffic counts or unbounded lifetime history', async () => {
    signed(); mount(); await flush(); expect(hero()).toHaveLength(2);
    expect(requests.some(r => r.table === 'daily_completions')).toBe(false);
    expect(requests.filter(r => r.table === 'game_completions').map(r => r.filters)).toEqual([[
      ['player_name', 'Alpha'], ['completed_on', '2026-10-02', 'gte'], ['completed_on', '2026-10-03', 'lte'],
      ['created_at', '2026-10-02T04:00:00.000Z', 'gte'], ['created_at', '2026-10-03T04:00:00.000Z', 'lt'],
    ]]);
  });
});

describe('Eastern daily counts', () => {
  it('counts distinct games across UTC midnight for both Home and the game header', async () => {
    vi.setSystemTime(new Date('2026-11-13T01:30:00Z'));
    signed();
    const view = mount();
    const header = renderHook(useGameNavbarStats);
    await flush();
    const completion = (created_at: string, game: string, player_name = 'Alpha') => ({
      created_at, completed_on: created_at.slice(0, 10), game, player_name,
    });
    await finishPlayed([
      completion('2026-11-12T04:59:59.999Z', 'previous-day'),
      completion('2026-11-12T05:00:00.000Z', 'footle'),
      completion('2026-11-12T20:00:00.000Z', 'ball-iq'),
      completion('2026-11-13T00:01:00.000Z', 'soccer-grid'),
      completion('2026-11-13T00:30:00.000Z', 'soccer-grid'),
      completion('2026-11-13T00:35:00.000Z', 'other-account', 'Beta'),
    ]);
    await finish();
    expect.soft(view.getByText('Played today:').parentElement).toHaveTextContent('Played today: 3');
    expect.soft(header.result.current).toMatchObject({ gamesPlayedToday: 3, totalPointsToday: 95, dailyRank: 7 });
    expect(personal().filter(r => r.table === 'global_rank').map(r => r.args?.p_period)).toEqual(['alltime', 'today']);
  });

  it('resets a loaded Home count on foreground rollover and keeps lifetime stats on a failed read', async () => {
    vi.setSystemTime(new Date('2026-11-13T04:59:59Z'));
    signed(); mock.localGames = 4;
    const view = mount(); await flush(); await finish(); stats(view, 7, 4);

    vi.setSystemTime(new Date('2026-11-13T05:00:00Z'));
    mock.localGames = 1;
    event('focus'); await flush();
    stats(view, 7, 1);
    const fresh = personal().slice(3);
    expect(fresh).toHaveLength(3);
    await finish(fresh, 99, [], 12, true);
    stats(view, 7, 1);
    expect(personal()).toHaveLength(6);
  });

  it('reissues an old Home daily response once even without a foreground event', async () => {
    vi.setSystemTime(new Date('2026-11-13T04:59:59Z'));
    signed(); mock.localGames = 4;
    const view = mount(); await flush(); const old = personal();
    vi.setSystemTime(new Date('2026-11-13T05:00:00Z'));
    mock.localGames = 0;
    await finish(old, 7, ['footle', 'ball-iq', 'soccer-grid']);
    stats(view, 7, 0);
    const fresh = personal().slice(3);
    expect(fresh).toHaveLength(3);
    await finish(fresh, 7, ['footle']);
    stats(view, 7, 1);
  });

  it('clears header daily stats on completion after midnight and rejects an in-flight old day', async () => {
    vi.setSystemTime(new Date('2026-11-13T04:59:58Z'));
    signed(); mock.localGames = 4;
    const { result } = renderHook(useGameNavbarStats);
    await flush(); await finish();
    expect(result.current).toMatchObject({ gamesPlayedToday: 4, dailyRank: 7, totalPointsToday: 95 });
    event('focus'); await flush(); const old = personal().slice(2);
    expect(old).toHaveLength(2);

    vi.setSystemTime(new Date('2026-11-13T05:00:00Z'));
    mock.localGames = 1;
    event('game-completion-saved');
    expect(result.current).toMatchObject({ gamesPlayedToday: 1, dailyRank: null, totalPointsToday: 0, loading: false });
    await finish(old, 99, ['footle', 'ball-iq', 'soccer-grid']);
    expect(result.current).toMatchObject({ gamesPlayedToday: 1, dailyRank: null, totalPointsToday: 0 });
    const fresh = personal().slice(4);
    expect(fresh).toHaveLength(2);
    await act(async () => {
      fresh[0].reply.reject(new Error('Fixture unavailable'));
      fresh[1].reply.resolve({ data: null });
    });
    expect(result.current).toMatchObject({ gamesPlayedToday: 1, dailyRank: null, totalPointsToday: 0, loading: false });
    expect(personal()).toHaveLength(6);
  });
});
