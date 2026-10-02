// Fictional criteria and reveal pools exercise real page placement and line scoring.
import './dailyReload/mocks';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import PlayerBingo from '@/pages/PlayerBingo';
import { layoutGrid, countCompletedLines, type BingoCriterion, type BingoPlayer } from '@/lib/playerBingo';
import { recordCompletion, resetMocks } from './dailyReload/mocks';

const boundary = vi.hoisted(() => ({ deck: [] as BingoPlayer[], criteria: [] as BingoCriterion[] }));
vi.mock('@/lib/playerBingo', async importOriginal => {
  const real = await importOriginal<typeof import('@/lib/playerBingo')>();
  boundary.criteria = Array.from({ length: 24 }, (_, i) => ({
    id: `fixture-${i}`, kind: 'nationality', label: `Fixture tile ${i}`, icon: 'T',
    support: [], test: player => !player.name.includes('Nonmatch'),
  }));
  return { ...real,
    fetchBingoData: async () => ({
      pool: boundary.deck, clubHistory: new Map(), clubYears: new Map(), seasonStats: new Map(),
      worldCupAll: new Set(), worldCup2022: new Set(), wcWinners: new Set(), ballonDor: new Set(),
    }),
    buildCriteria: () => boundary.criteria,
    generateBoard: () => boundary.criteria,
    buildDeck: () => boundary.deck,
  };
});
vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ children, headerExtra }: { children: React.ReactNode; headerExtra: React.ReactNode }) => <main>{headerExtra}{children}</main> }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: ({ score }: { score: string }) => <div data-fixture-share={score} /> }));

const player = (name: string): BingoPlayer => ({ name, nationality: 'Fixture', position: 'Fixture', club: 'Fixture', value: 0, age: 0, year: 0 });
beforeEach(() => {
  localStorage.clear(); resetMocks();
  boundary.deck = Array.from({ length: 40 }, (_, i) => player(`Fictional Reveal ${i}`));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

async function start() {
  const view = render(<HelmetProvider><MemoryRouter initialEntries={['/player-bingo']}><PlayerBingo /></MemoryRouter></HelmetProvider>);
  await waitFor(() => expect(view.getByTitle('Fixture tile 0')).toBeEnabled());
  return view;
}
type View = Awaited<ReturnType<typeof start>>;
function place(view: View, cell: number) {
  const criterion = layoutGrid(boundary.criteria)[cell];
  if (!criterion) throw new Error('The free center is not a placement');
  fireEvent.click(view.getByTitle(criterion.label));
}
function rowFive(view: View) {
  for (const cell of [20, 21, 22, 23, 24]) place(view, cell);
  expect(view.getByRole('button', { name: 'Keep playing this board' })).toBeEnabled();
}
function continueRun(view: View) { fireEvent.click(view.getByRole('button', { name: 'Keep playing this board' })); }
function giveUp(view: View) {
  fireEvent.click(view.getByRole('button', { name: 'Give up' }));
  fireEvent.click(view.getByRole('button', { name: 'Yes, reveal it' }));
}
function score(view: View) { return view.getByText('Score', { exact: false }).parentElement!.textContent!; }
function flash(view: View) { return view.getByText(/Line \d+ complete!/); }
function intersection(view: View) {
  rowFive(view); continueRun(view);
  for (const cell of [1, 2, 3, 4, 5, 10, 15]) place(view, cell);
  expect(score(view)).toContain('Score 100');
  place(view, 0);
}

describe('Player Bingo earned line feedback', () => {
  it('announces one added line as 100 while the actual total moves 100 to 200', async () => {
    const view = await start(); rowFive(view); continueRun(view);
    for (const cell of [0, 1, 2, 3]) place(view, cell);
    expect(score(view)).toContain('Score 100');
    place(view, 4);
    expect(score(view)).toContain('Score 200');
    expect(flash(view)).toHaveTextContent('Line 2 complete! +100 bonus');
    expect(recordCompletion).not.toHaveBeenCalled();
    giveUp(view);
    expect(view.container.querySelector('[data-fixture-share]')).toHaveAttribute('data-fixture-share', '2/12 lines · 200 pts');
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/player-bingo', 200, 'Tester');
  });

  it('announces two intersection lines as 200 while the actual total moves 100 to 300', async () => {
    const view = await start();
    const before = new Set([20, 21, 22, 23, 24, 1, 2, 3, 4, 5, 10, 15]);
    expect(countCompletedLines(before)).toBe(1);
    expect(countCompletedLines(new Set([...before, 0]))).toBe(3);
    intersection(view);
    expect(score(view)).toContain('Score 300');
    expect(flash(view)).toHaveTextContent('Line 3 complete! +200 bonus');
    expect(recordCompletion).not.toHaveBeenCalled();
    giveUp(view);
    expect(view.container.querySelector('[data-fixture-share]')).toHaveAttribute('data-fixture-share', '3/12 lines · 300 pts');
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/player-bingo', 300, 'Tester');
  });

  it('preserves the first line choice banked 100 share and once-only completion', async () => {
    const view = await start();
    expect(layoutGrid(boundary.criteria)).toHaveLength(25);
    expect(layoutGrid(boundary.criteria)[12]).toBeNull();
    rowFive(view);
    expect(score(view)).toContain('Score 100');
    expect(view.queryByText(/Line \d+ complete!/)).toBeNull();
    expect(recordCompletion).not.toHaveBeenCalled();
    expect(view.getByTitle('Fixture tile 0')).toBeDisabled();
    fireEvent.click(view.getByRole('button', { name: 'Bank the win' }));
    expect(view.container.querySelector('[data-fixture-share]')).toHaveAttribute('data-fixture-share', '1/12 lines · 100 pts');
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/player-bingo', 100, 'Tester');
    view.rerender(<HelmetProvider><MemoryRouter><PlayerBingo /></MemoryRouter></HelmetProvider>);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('preserves full blackout 1700 and original share and completion', async () => {
    const view = await start(); rowFive(view); continueRun(view);
    for (let cell = 0; cell < 20; cell++) if (cell !== 12) place(view, cell);
    expect(view.getByRole('heading', { name: 'BLACKOUT!' })).toBeVisible();
    expect(view.container.querySelector('[data-fixture-share]')).toHaveAttribute('data-fixture-share', '12/12 lines · 1700 pts');
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/player-bingo', 1700, 'Tester');
  });

  it('announces earned feedback then clears after 1800ms with static reduced-motion binding', async () => {
    const view = await start(); vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    intersection(view);
    const notice = flash(view);
    expect(notice).toHaveAttribute('role', 'status');
    expect(notice).toHaveClass('motion-safe:animate-in', 'motion-safe:duration-300');
    expect(notice).not.toHaveClass('animate-in');
    act(() => { vi.advanceTimersByTime(1799); });
    expect(notice).toBeInTheDocument(); expect(score(view)).toContain('Score 300');
    act(() => { vi.advanceTimersByTime(1); });
    expect(notice).not.toBeInTheDocument(); expect(score(view)).toContain('Score 300');
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('preserves wrong placement skip and final deck exhaustion accounting', async () => {
    boundary.deck = [player('Fictional Nonmatch'), ...boundary.deck.slice(0, 11)];
    const view = await start();
    place(view, 0);
    expect(view.getByLabelText('1 of 3 strikes used')).toBeInTheDocument();
    expect(view.getByTitle('Fixture tile 0')).toBeEnabled();
    fireEvent.click(view.getByRole('button', { name: 'Skip player' }));
    rowFive(view); continueRun(view);
    for (const cell of [0, 1, 2, 3, 4]) place(view, cell);
    expect(view.getByRole('heading', { name: 'BINGO!' })).toBeVisible();
    expect(view.getByText('You saw all 12 players we had.')).toBeVisible();
    expect(view.container.querySelector('[data-fixture-share]')).toHaveAttribute('data-fixture-share', '2/12 lines · 200 pts');
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/player-bingo', 200, 'Tester');
  });

  it('clears pending feedback on replay and unmount without changing banked points', async () => {
    const view = await start(); vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    intersection(view); giveUp(view);
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/player-bingo', 300, 'Tester');
    fireEvent.click(view.getByRole('button', { name: 'New board' }));
    expect(view.queryByText(/Line \d+ complete!/)).toBeNull();
    expect(score(view)).toContain('Score 0');
    act(() => { vi.advanceTimersByTime(1800); });
    expect(view.getByTitle('Fixture tile 0')).toBeEnabled();
    intersection(view);
    expect(flash(view)).toBeInTheDocument();
    view.unmount();
    act(() => { vi.advanceTimersByTime(1800); });
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });
});
