import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ManagerHotSeatBoard from '@/components/manager-hot-seat/ManagerHotSeatBoard';
import { recordCompletion } from '@/lib/completions';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));

const key = 'manager-hot-seat-daily-2026-11-11';

beforeEach(() => {
  localStorage.clear();
  vi.mocked(recordCompletion).mockClear();
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(new Date('2026-11-11T17:00:00Z'));
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  localStorage.clear();
});

function openTab() {
  const { container } = render(<MemoryRouter><ManagerHotSeatBoard /></MemoryRouter>);
  return within(container);
}

function openDaily(tab: ReturnType<typeof openTab>) {
  fireEvent.click(tab.getByRole('button', { name: "Take today's job" }));
  act(() => { vi.advanceTimersByTime(50); });
}

it('keeps the first finished Daily when other open tabs try to start or play it', () => {
  const first = openTab();
  const playing = openTab();
  const menu = openTab();

  for (const tab of [first, playing]) openDaily(tab);
  for (const tab of [first, playing]) {
    fireEvent.click(tab.getByRole('button', { name: 'Take the job' }));
    const press = tab.queryByTestId('hot-seat-press');
    if (press) fireEvent.click(within(press).getAllByRole('button')[0]);
    expect(tab.getByRole('button', { name: 'Kick off' })).toBeEnabled();
  }

  for (let step = 0; step < 30 && !first.queryByTestId('hot-seat-verdict'); step++) {
    const press = first.queryByTestId('hot-seat-press');
    const next = first.queryByRole('button', { name: 'Next match' });
    const button = press
      ? within(press).getAllByRole('button')[0]
      : next ?? first.getByRole('button', { name: 'Kick off' });
    fireEvent.click(button);
  }

  expect(first.getByTestId('hot-seat-verdict')).toBeVisible();
  const completed = localStorage.getItem(key);
  expect(JSON.parse(completed ?? 'null')).toMatchObject({ done: true });

  openDaily(menu);
  fireEvent.click(playing.getByRole('button', { name: 'Kick off' }));

  expect(localStorage.getItem(key)).toBe(completed);
  expect(menu.getByTestId('hot-seat-daily-done')).toBeVisible();
  expect(playing.getByTestId('hot-seat-daily-done')).toBeVisible();
  expect(recordCompletion).toHaveBeenCalledTimes(1);
}, 120_000);

it('opens the current unfinished Daily from a tab that still shows a fresh start', () => {
  const first = openTab();
  const menu = openTab();
  openDaily(first);
  fireEvent.click(first.getByRole('button', { name: 'Take the job' }));
  const press = first.queryByTestId('hot-seat-press');
  if (press) fireEvent.click(within(press).getAllByRole('button')[0]);
  fireEvent.click(first.getByRole('button', { name: 'Kick off' }));
  const saved = localStorage.getItem(key);
  expect(JSON.parse(saved ?? 'null')).toMatchObject({ done: false });
  expect(JSON.parse(saved ?? 'null').actions).toContainEqual({ t: 'match', m: 'balanced', talk: null });

  openDaily(menu);

  expect(menu.getByTestId('hot-seat-match')).toBeVisible();
  expect(localStorage.getItem(key)).toBe(saved);
  expect(recordCompletion).not.toHaveBeenCalled();
}, 120_000);
