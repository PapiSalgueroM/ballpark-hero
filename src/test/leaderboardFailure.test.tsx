import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* Round 839: the World Leaderboard drew a failed board as an empty one.
   supabase-js RESOLVES on an HTTP error ({ data: null, error }), so the page
   told every visitor "No scores yet today. Be the first!" while the Today
   board was answering 57014. These cases hold the page to three promises:
   a failed board says so, Try again really asks again (once), and an answer
   from an older filter can neither write rows nor make a window be asked
   for twice. Every RPC is a deferred promise so the test decides the order. */

const mock = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mock.rpc } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ profile: null }) }));
vi.mock('@/lib/completions', () => ({
  getCurrentPlayerName: () => 'Tester',
  publicName: (name: string) => name,
}));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/data/gameRegistry', () => ({
  CATEGORIES: [
    { title: 'Soccer', emoji: 'S', games: [{ path: '/soccer-grid' }, { path: '/footle' }] },
    { title: 'Hockey', emoji: 'H', games: [{ path: '/nhl-grid' }] },
  ],
}));
/* The Radix select needs pointer capture jsdom does not have; a native select
   drives the same onValueChange the page wires up. */
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: ReactNode }) => (
    <select aria-label="Sport" value={value} onChange={e => onValueChange(e.target.value)}>{children}</select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
}));

import Leaderboard from '@/pages/Leaderboard';

interface Call {
  fn: string;
  args: { p_period: string; p_games: string[] | null; p_player?: string };
  resolve: (value: unknown) => void;
}
const calls: Call[] = [];

const EMPTY_TODAY = 'No scores yet today. Be the first!';
const FAILED = 'That board did not load. It is us, not you.';
const SOCCER = ['soccer-grid', 'footle'];

const boardCalls = (period: string, games: string[] | null = null) =>
  calls.filter(c => c.fn === 'global_leaderboard' && c.args.p_period === period
    && JSON.stringify(c.args.p_games) === JSON.stringify(games));
const rankCalls = (period: string, games: string[] | null = null) =>
  calls.filter(c => c.fn === 'global_rank' && c.args.p_period === period
    && JSON.stringify(c.args.p_games) === JSON.stringify(games));
const rows = (...names: string[]) => ({
  data: names.map((player_name, i) => ({ rank: i + 1, player_name, total_points: 100 - i, games_played: 3 })),
  error: null,
});
const mine = { data: [{ rank: 4, total_points: 40, total_players: 90 }], error: null };
const timeout = { data: null, error: { code: '57014', message: 'canceling statement due to statement timeout' } };

/** Settle the given calls and let every continuation and render run. */
async function answer(pairs: [Call | undefined, unknown][]) {
  await act(async () => {
    for (const [call, value] of pairs) {
      if (!call) throw new Error('asked to answer a call that was never made');
      call.resolve(value);
    }
    await new Promise(r => setTimeout(r, 0));
  });
}
async function settle() {
  await act(async () => { await new Promise(r => setTimeout(r, 0)); });
}
const tab = (name: string) => {
  /* Radix activates a tab on mouse down, not on click. */
  act(() => { fireEvent.mouseDown(screen.getByRole('tab', { name })); });
};
const pickSport = (value: string) => {
  act(() => { fireEvent.change(screen.getByLabelText('Sport'), { target: { value } }); });
};
const view = () => render(<MemoryRouter><Leaderboard /></MemoryRouter>);

/** Answer the four mount calls for one filter. */
async function answerEager(games: string[] | null, today: unknown, alltime: unknown) {
  await answer([
    [boardCalls('today', games).at(-1), today],
    [boardCalls('alltime', games).at(-1), alltime],
    [rankCalls('today', games).at(-1), mine],
    [rankCalls('alltime', games).at(-1), mine],
  ]);
}

beforeEach(() => {
  calls.length = 0;
  mock.rpc.mockReset();
  mock.rpc.mockImplementation((fn: string, args: Call['args']) => {
    let resolve!: (value: unknown) => void;
    const promise = new Promise(r => { resolve = r; });
    calls.push({ fn, args, resolve });
    return promise;
  });
});
afterEach(() => { cleanup(); });

describe('World Leaderboard: a failed board is never drawn as an empty one', () => {
  it('1 a { data: null, error } board shows the failed panel and never the empty label', async () => {
    view();
    expect(boardCalls('today')).toHaveLength(1);
    await answerEager(null, timeout, rows('Ana', 'Ben'));
    expect(screen.getByText(FAILED)).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_TODAY)).toBeNull();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('2 a mixed answer fails only the window that failed', async () => {
    view();
    await answerEager(null, timeout, rows('Ana', 'Ben'));
    expect(screen.getByText(FAILED)).toBeInTheDocument();
    const before = calls.length;
    tab('All-Time');
    await settle();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Ben')).toBeInTheDocument();
    expect(screen.queryByText(FAILED)).toBeNull();
    /* All time already loaded on mount, so opening its tab asks for nothing. */
    expect(calls.length).toBe(before);
  });

  it('3 Try again on Today asks exactly once more and draws the rows', async () => {
    view();
    await answerEager(null, timeout, rows('Ana'));
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Try again' })); });
    await settle();
    expect(boardCalls('today')).toHaveLength(2);
    expect(rankCalls('today')).toHaveLength(2);
    await answer([[boardCalls('today')[1], rows('Cleo', 'Dev')], [rankCalls('today')[1], mine]]);
    expect(screen.getByText('Cleo')).toBeInTheDocument();
    expect(screen.queryByText(FAILED)).toBeNull();
    /* Nothing else asks again once the rows are in. */
    tab('7 Days');
    tab('Today');
    await settle();
    expect(boardCalls('today')).toHaveLength(2);
  });

  it('4 a filter change during a retry cannot write stale rows or ask for Today twice', async () => {
    view();
    await answerEager(null, timeout, rows('Ana'));
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Try again' })); });
    await settle();
    expect(boardCalls('today')).toHaveLength(2);
    const staleRetry = boardCalls('today')[1];
    const staleRank = rankCalls('today')[1];

    pickSport('Soccer');
    await settle();
    expect(boardCalls('today', SOCCER)).toHaveLength(1);

    /* The all sports retry lands late, after the filter moved on. */
    await answer([[staleRetry, rows('Stale Sam')], [staleRank, mine]]);
    expect(screen.queryByText('Stale Sam')).toBeNull();

    /* Flapping the tabs must not ask the Soccer Today board a second time
       while the first one is still in the air. */
    tab('7 Days');
    tab('Today');
    await settle();
    expect(boardCalls('today', SOCCER)).toHaveLength(1);

    await answerEager(SOCCER, rows('Sol', 'Teo'), rows('Sol'));
    expect(screen.getByText('Sol')).toBeInTheDocument();
    expect(screen.getByText('Teo')).toBeInTheDocument();
    expect(screen.queryByText('Stale Sam')).toBeNull();
    expect(boardCalls('today', SOCCER)).toHaveLength(1);
  });

  it('5 a filter change while the mount calls are in the air asks each window once', async () => {
    view();
    const oldToday = boardCalls('today')[0];
    const oldAll = boardCalls('alltime')[0];
    const oldRanks = [rankCalls('today')[0], rankCalls('alltime')[0]];
    pickSport('Hockey');
    await settle();
    const HOCKEY = ['nhl-grid'];
    expect(boardCalls('today', HOCKEY)).toHaveLength(1);
    expect(boardCalls('alltime', HOCKEY)).toHaveLength(1);

    /* The all sports mount answers land late. */
    await answer([[oldToday, rows('Old Olga')], [oldAll, rows('Old Olga')], [oldRanks[0], mine], [oldRanks[1], mine]]);
    expect(screen.queryByText('Old Olga')).toBeNull();

    tab('7 Days');
    tab('Today');
    tab('All-Time');
    await settle();
    expect(boardCalls('today', HOCKEY)).toHaveLength(1);
    expect(boardCalls('alltime', HOCKEY)).toHaveLength(1);

    await answerEager(HOCKEY, rows('Hana'), rows('Hana', 'Ivo'));
    expect(screen.getByText('Ivo')).toBeInTheDocument();
    expect(screen.queryByText('Old Olga')).toBeNull();
  });

  it('6 mount asks for Today and All Time once each, and the lazy tabs once each', async () => {
    view();
    await settle();
    expect(boardCalls('today')).toHaveLength(1);
    expect(boardCalls('alltime')).toHaveLength(1);
    expect(rankCalls('today')).toHaveLength(1);
    expect(rankCalls('alltime')).toHaveLength(1);
    expect(boardCalls('week')).toHaveLength(0);
    expect(boardCalls('month')).toHaveLength(0);

    tab('7 Days');
    tab('Today');
    tab('7 Days');
    await settle();
    expect(boardCalls('week')).toHaveLength(1);
    await answer([[boardCalls('week')[0], rows('Wes')], [rankCalls('week')[0], mine]]);
    expect(screen.getByText('Wes')).toBeInTheDocument();

    tab('30 Days');
    await settle();
    expect(boardCalls('month')).toHaveLength(1);
    await answer([[boardCalls('month')[0], { data: [], error: null }], [rankCalls('month')[0], mine]]);
    /* A board that really is empty still says so. */
    expect(screen.getByText('No scores in the last 30 days. Be the first!')).toBeInTheDocument();

    tab('7 Days');
    tab('30 Days');
    await answerEager(null, rows('Ana'), rows('Ana'));
    expect(boardCalls('week')).toHaveLength(1);
    expect(boardCalls('month')).toHaveLength(1);
    expect(boardCalls('today')).toHaveLength(1);
    expect(boardCalls('alltime')).toHaveLength(1);
  });

  it('7 a lazy window that fails says so and Try again asks once more', async () => {
    view();
    tab('30 Days');
    await settle();
    await answer([[boardCalls('month')[0], timeout], [rankCalls('month')[0], mine]]);
    expect(screen.getByText(FAILED)).toBeInTheDocument();
    expect(screen.queryByText('No scores in the last 30 days. Be the first!')).toBeNull();
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Try again' })); });
    await settle();
    expect(boardCalls('month')).toHaveLength(2);
    await answer([[boardCalls('month')[1], rows('Mia')], [rankCalls('month')[1], mine]]);
    expect(screen.getByText('Mia')).toBeInTheDocument();
  });
});
