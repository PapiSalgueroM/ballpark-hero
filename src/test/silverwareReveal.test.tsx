/* Fictional boundary rows feed the original board generator and judge.
   The hook, completion handshake and storage stay real. No historical claims. */
import './dailyReload/mocks';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { useSilverwareSort } from '@/hooks/useSilverwareSort';
import SilverwareSort from '@/pages/SilverwareSort';
import { recordCompletion, resetMocks } from './dailyReload/mocks';
import { consumeRestoredFinish } from '@/lib/restoredFinish';
import { getTodayET } from '@/lib/dateUtils';

vi.mock('@/lib/champOrNot', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/champOrNot')>()),
  fetchCompetitionRows: async () => Array.from({ length: 7 }, (_, i) =>
    Array.from({ length: i + 1 }, (_, year) => ({ year, team: `Test Club ${i + 1}` }))).flat(),
}));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));

beforeEach(() => { localStorage.clear(); resetMocks(); consumeRestoredFinish('silverware-sort'); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); consumeRestoredFinish('silverware-sort'); });

async function start(mode: 'daily' | 'unlimited' = 'daily') {
  const view = renderHook(useSilverwareSort);
  await waitFor(() => expect(view.result.current.loadState).toBe('ready'));
  expect(view.result.current.boards).toHaveLength(3);
  if (mode === 'unlimited') act(() => view.result.current.switchMode(mode));
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  return view;
}
type View = Awaited<ReturnType<typeof start>>;
function fill(view: View, indices = [0, 1, 2, 3, 4]) {
  for (const index of indices) act(() => view.result.current.place(index));
}
function submit(view: View) { act(() => view.result.current.submit()); }
function next(view: View) { act(() => view.result.current.advanceReveal()); }
function finishBoard(view: View) { fill(view); submit(view); }
const saved = (day: string) => JSON.parse(localStorage.getItem(`silverware-sort-daily-${day}`)!);

describe('Silverware deliberate reveal', () => {
  it.each(['daily', 'unlimited'] as const)('keeps the %s result readable beyond ten seconds until a deliberate advance', async mode => {
    const view = await start(mode), board = view.result.current.board;
    finishBoard(view);
    act(() => vi.advanceTimersByTime(10000));
    expect(view.result.current.board).toEqual(board);
    expect(view.result.current.revealed).toEqual([true, true, true, true, true]);
    expect(view.result.current.results).toHaveLength(0);
    expect(view.result.current.done).toBe(false);
    next(view);
    expect(view.result.current.boardIdx).toBe(1);
    expect(view.result.current.revealed).toBeNull();
    expect(view.result.current.score).toBe(5);
    expect(view.result.current.results[0]).toMatchObject({ s: 5, f: true });
  });

  it('preserves a wrong first try, locked greens and the second-try score', async () => {
    const view = await start();
    fill(view, [4, 3, 2, 1, 0]); submit(view);
    expect(view.result.current.attempt).toBe(2);
    expect(view.result.current.locked).toEqual([false, false, true, false, false]);
    expect(view.result.current.slots).toEqual([null, null, 2, null, null]);
    expect(view.result.current.revealed).toBeNull();
    fill(view, [0, 1, 3, 4]); submit(view); next(view);
    expect(view.result.current.results).toEqual([{ s: 5, f: false, g: [true, true, true, true, true] }]);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('preserves a wrong final score and blocks duplicate placement or edits during reveal', async () => {
    const view = await start();
    fill(view, [4, 3, 2, 1, 0]); submit(view);
    fill(view, [4, 3, 1, 0]); submit(view);
    const slots = view.result.current.slots;
    act(() => { view.result.current.place(0); view.result.current.unplace(2); view.result.current.submit(); });
    expect(view.result.current.slots).toEqual(slots);
    expect(view.result.current.canSubmit).toBe(false);
    next(view);
    expect(view.result.current.results).toEqual([{ s: 1, f: false, g: [false, false, true, false, false] }]);
  });

  it('saves and books the final daily immediately while its reveal remains readable', async () => {
    const view = await start(), day = view.result.current.today;
    finishBoard(view); next(view); finishBoard(view); next(view); finishBoard(view);
    expect(saved(day).results).toHaveLength(3);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(recordCompletion).toHaveBeenCalledWith('/silverware-sort', 15, expect.anything(), 1);
    act(() => vi.advanceTimersByTime(10000));
    expect(view.result.current.boardIdx).toBe(2);
    expect(view.result.current.revealed).not.toBeNull();
    expect(view.result.current.done).toBe(false);
    next(view);
    expect(view.result.current.done).toBe(true);
    expect(view.result.current.score).toBe(15);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    view.unmount(); vi.useRealTimers();
    const restored = renderHook(useSilverwareSort);
    await waitFor(() => expect(restored.result.current.done).toBe(true));
    expect(restored.result.current.score).toBe(15);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('ignores a repeated advance without erasing the next board arrangement', async () => {
    const view = await start(); finishBoard(view);
    const oldAdvance = view.result.current.advanceReveal;
    next(view);
    act(() => view.result.current.place(3));
    act(() => { oldAdvance(); oldAdvance(); });
    expect(view.result.current.boardIdx).toBe(1);
    expect(view.result.current.slots).toEqual([3, null, null, null, null]);
    expect(view.result.current.results).toHaveLength(1);
  });

  it('clears pending daily advancement across a mode change and restores stored progress', async () => {
    const view = await start(); finishBoard(view);
    const oldAdvance = view.result.current.advanceReveal;
    act(() => view.result.current.switchMode('unlimited'));
    act(() => view.result.current.place(3)); act(() => oldAdvance());
    expect(view.result.current.results).toHaveLength(0);
    expect(view.result.current.slots).toEqual([3, null, null, null, null]);
    act(() => view.result.current.switchMode('daily'));
    expect(view.result.current.boardIdx).toBe(1);
    expect(view.result.current.score).toBe(5);
    expect(view.result.current.revealed).toBeNull();
  });

  it('clears a pending Unlimited result when replayed without saving or recording it', async () => {
    const view = await start('unlimited'); finishBoard(view);
    const oldAdvance = view.result.current.advanceReveal;
    act(() => view.result.current.playAgain());
    act(() => view.result.current.place(3)); act(() => oldAdvance());
    expect(view.result.current.boardIdx).toBe(0);
    expect(view.result.current.slots).toEqual([3, null, null, null, null]);
    expect(recordCompletion).not.toHaveBeenCalled();
    expect(localStorage.getItem(`silverware-sort-daily-${view.result.current.today}`)).toBeNull();
  });

  it('keeps the dealt daily date when the final pick crosses midnight', async () => {
    const view = await start(), day = view.result.current.today;
    finishBoard(view); next(view); finishBoard(view); next(view);
    act(() => vi.setSystemTime(new Date(Date.now() + 86400000)));
    expect(getTodayET()).not.toBe(day);
    finishBoard(view);
    expect(saved(day).results).toHaveLength(3);
    expect(localStorage.getItem(`silverware-sort-daily-${getTodayET()}`)).toBeNull();
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('shows earned rungs and points, focuses manual Next and names the final result action', async () => {
    const view = render(<HelmetProvider><MemoryRouter initialEntries={['/silverware-sort']}><SilverwareSort /></MemoryRouter></HelmetProvider>);
    await screen.findByRole('button', { name: 'Lock it in' });
    const boardView = within(view.container.querySelector('[data-silverware-board]') as HTMLElement);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    for (let board = 0; board < 3; board++) {
      const names = [...view.container.querySelector('[data-silverware-board]')!.querySelectorAll('button')].map(button => button.textContent!).filter(name => /^Test Club/.test(name));
      for (const name of names) fireEvent.click(boardView.getByRole('button', { name }));
      fireEvent.click(boardView.getByRole('button', { name: 'Lock it in' }));
      if (boardView.queryByRole('button', { name: 'Final answer' })) {
        const remaining = [...view.container.querySelectorAll('button')].filter(button => /^Test Club/.test(button.textContent!) && !button.disabled);
        for (const button of remaining) fireEvent.click(button);
        fireEvent.click(boardView.getByRole('button', { name: 'Final answer' }));
      }
      const advance = boardView.getByRole('button', { name: board === 2 ? 'See results' : 'Next board' });
      expect(advance).toBeEnabled(); expect(advance).toHaveFocus();
      expect(boardView.getByRole('status')).toHaveTextContent(/\d of 5 rungs right\. \+\d points\./);
      act(() => vi.advanceTimersByTime(10000)); expect(advance).toBeInTheDocument();
      fireEvent.click(advance);
    }
    expect(screen.getByText(/Rungs Right!/)).toBeInTheDocument();
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });
});
