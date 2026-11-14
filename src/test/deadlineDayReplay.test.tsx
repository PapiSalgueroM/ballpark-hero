import { act, cleanup, render, renderHook, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import DeadlineDayBoard from '@/components/deadline-day/DeadlineDayBoard';
import { Result } from '@/components/deadline-day/DeadlineDayViews';
import { useDeadlineDay } from '@/hooks/useDeadlineDay';
import { recordCompletion } from '@/lib/completions';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));

const KEY = 'deadline-day-free';
const open = (action: () => void) => {
  act(action);
  act(() => { vi.advanceTimersByTime(50); });
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(new Date('2026-11-14T16:00:00Z'));
  localStorage.clear();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

it('replays the exact free opening after reload and compares a completed signing to the previous grade', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.52);
  const page = renderHook(useDeadlineDay);
  open(() => page.result.current.startFree('Everton'));
  const first = page.result.current.run!;
  act(page.result.current.finish);
  const grade = page.result.current.run!.grade!;
  expect(grade.score).toBe(0);
  const previousBytes = localStorage.getItem(KEY)!;
  page.unmount();

  const restored = renderHook(useDeadlineDay);
  expect(restored.result.current.freeSaved).toBeNull();
  expect(restored.result.current.lastFreeResult?.score).toBe(0);
  open(restored.result.current.replayFree);
  const replay = restored.result.current.run!;
  expect(replay.setup).toEqual(first.setup);
  expect(replay.needs).toEqual(first.needs);
  expect(replay.targets).toEqual(first.targets);
  expect(replay.sales).toEqual(first.sales);
  expect(replay.startBudget).toBe(first.startBudget);
  expect(replay.actions).toEqual([]);
  expect(localStorage.getItem(KEY)).toBe(previousBytes);
  expect(recordCompletion).toHaveBeenCalledTimes(1);

  act(() => restored.result.current.callClub(0));
  const actions = restored.result.current.run!.actions;
  restored.unmount();
  const resumed = renderHook(useDeadlineDay);
  open(resumed.result.current.resumeFree);
  expect(resumed.result.current.run!.actions).toEqual(actions);
  expect(resumed.result.current.freeComparison?.score).toBe(grade.score);
  act(() => resumed.result.current.bid(0, resumed.result.current.run!.targets[0].neg!.theirAsk));
  const { want } = resumed.result.current.run!.targets[0].neg!.terms!;
  if (resumed.result.current.run!.state.squad.length >= 30) act(() => resumed.result.current.sell(0));
  act(() => resumed.result.current.terms(0, { wage: want.wage, years: want.years, bonus: want.bonus }));
  expect(resumed.result.current.run!.targets[0].status).toBe('signed');
  act(resumed.result.current.finish);
  const second = resumed.result.current.run!.grade!;
  expect(second.filled).toBeGreaterThan(grade.filled);
  expect(second.score).toBeGreaterThan(grade.score);
  expect(resumed.result.current.freeComparison).toEqual({ score: 0, filled: 0, budgetLeft: grade.budgetLeft });
  expect(resumed.result.current.lastFreeResult?.score).toBe(second.score);
  expect(recordCompletion).toHaveBeenCalledTimes(2);

  const receipt = render(<Result run={resumed.result.current.run!} hook={resumed.result.current} />);
  const comparison = within(screen.getByRole('region', { name: 'Previous window comparison' }));
  expect(comparison.getByText(`Score 0 to ${second.score} / 100`)).toBeInTheDocument();
  expect(comparison.getByText(`Needs filled 0 to ${second.filled} of ${second.needs}`)).toBeInTheDocument();
  expect(comparison.getByText(/^Budget left /)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Replay this window' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'New club' })).toBeInTheDocument();
  expect(recordCompletion).toHaveBeenCalledTimes(2);
  receipt.unmount();

  render(<DeadlineDayBoard />);
  expect(screen.getByRole('button', { name: 'Replay the Everton window' })).toBeInTheDocument();
}, 20000);

it('defers to an active free save and leaves the shared Daily and its receipt independent', () => {
  const page = renderHook(useDeadlineDay);
  open(() => page.result.current.startFree('Everton'));
  act(page.result.current.finish);
  const last = page.result.current.lastFreeResult;
  act(page.result.current.backToMenu);
  open(() => page.result.current.startFree('Tottenham'));
  act(() => page.result.current.callClub(0));
  const activeBytes = localStorage.getItem(KEY);
  const active = page.result.current.run;
  const menu = render(<DeadlineDayBoard />);
  expect(screen.getByRole('button', { name: 'Carry on at Tottenham' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Replay the Everton window' })).toBeNull();
  menu.unmount();
  act(page.result.current.backToMenu);
  open(page.result.current.replayFree);
  expect(page.result.current.phase).toBe('menu');
  expect(page.result.current.freeSaved?.setup).toEqual(active!.setup);
  expect(localStorage.getItem(KEY)).toBe(activeBytes);

  open(page.result.current.startDaily);
  act(page.result.current.finish);
  expect(page.result.current.dailyDone).not.toBeNull();
  expect(page.result.current.lastFreeResult).toEqual(last);
  expect(page.result.current.freeComparison).toBeNull();
  expect(localStorage.getItem(KEY)).toBe(activeBytes);
  render(<Result run={page.result.current.run!} hook={page.result.current} />);
  expect(screen.queryByRole('region', { name: 'Previous window comparison' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Replay this window' })).toBeNull();
  act(page.result.current.backToMenu);
  open(page.result.current.resumeFree);
  expect(page.result.current.run?.actions).toEqual(active!.actions);
}, 20000);

it('refuses a saved comparison when the regenerated offering is different', () => {
  const page = renderHook(useDeadlineDay);
  open(() => page.result.current.startFree('Everton'));
  act(page.result.current.finish);
  page.unmount();
  const saved = JSON.parse(localStorage.getItem(KEY)!);
  saved.last.opening = 'different-market';
  const bytes = JSON.stringify(saved);
  localStorage.setItem(KEY, bytes);
  const later = renderHook(useDeadlineDay);
  open(later.result.current.replayFree);
  expect(later.result.current.phase).toBe('menu');
  expect(later.result.current.notice).toContain('This window has changed');
  expect(later.result.current.freeComparison).toBeNull();
  expect(localStorage.getItem(KEY)).toBe(bytes);
  expect(recordCompletion).toHaveBeenCalledTimes(1);
}, 20000);
