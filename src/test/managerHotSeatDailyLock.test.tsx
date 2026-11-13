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

const freeKey = 'manager-hot-seat-free';
type Tab = ReturnType<typeof openTab>;

function previewClub(tab: Tab, club: string) {
  fireEvent.click(tab.getByRole('button', { name: 'Pick a club' }));
  const random = vi.spyOn(Math, 'random').mockReturnValue(805857686 / 4294967296);
  fireEvent.click(tab.getByRole('button', { name: club }));
  random.mockRestore();
  act(() => { vi.advanceTimersByTime(50); });
}

function resumeFree(tab: Tab, club: string) {
  fireEvent.click(tab.getByRole('button', { name: 'Carry on at ' + club }));
  act(() => { vi.advanceTimersByTime(50); });
}

function nextFreeAction(tab: Tab, aggressive = false) {
  const press = tab.queryByTestId('hot-seat-press');
  if (press) {
    const options = within(press).getAllByRole('button');
    fireEvent.click(aggressive ? options[options.length - 1] : options[0]);
  } else {
    if (aggressive) fireEvent.click(tab.getByRole('button', { name: 'Attacking' }));
    fireEvent.click(tab.getByRole('button', { name: 'Kick off' }));
  }
}

it('keeps the newer Free Play save when an old tab takes a different job', () => {
  const old = openTab();
  previewClub(old, 'Aston Villa');

  const current = openTab();
  previewClub(current, 'Arsenal');
  fireEvent.click(current.getByRole('button', { name: 'Take the job' }));
  nextFreeAction(current);
  const saved = localStorage.getItem(freeKey);
  expect(JSON.parse(saved ?? 'null')).toMatchObject({ club: 'Arsenal' });

  fireEvent.click(old.getByRole('button', { name: 'Take the job' }));
  expect(localStorage.getItem(freeKey)).toBe(saved);
  expect(old.getByRole('alert')).toHaveTextContent('Free Play save changed in another tab');
  expect(old.getByRole('button', { name: 'Reload Free Play' })).toBeVisible();

  openDaily(old);
  fireEvent.click(old.getByRole('button', { name: 'Take the job' }));
  expect(old.getByTestId('hot-seat-match')).toBeVisible();
  expect(localStorage.getItem(freeKey)).toBe(saved);
}, 120_000);

it('keeps the newer Free Play actions when an old tab plays from the same save', () => {
  const current = openTab();
  previewClub(current, 'Arsenal');
  fireEvent.click(current.getByRole('button', { name: 'Take the job' }));
  nextFreeAction(current);
  fireEvent.click(current.getByRole('button', { name: 'Menu' }));
  const initial = localStorage.getItem(freeKey);

  const old = openTab();
  for (const tab of [current, old]) resumeFree(tab, 'Arsenal');
  nextFreeAction(current);
  const saved = localStorage.getItem(freeKey);
  expect(saved).not.toBe(initial);

  nextFreeAction(old, true);
  expect(localStorage.getItem(freeKey)).toBe(saved);
  expect(old.getByRole('button', { name: 'Reload Free Play' })).toBeVisible();

  const restored = openTab();
  resumeFree(restored, 'Arsenal');
  expect(restored.getByTestId('hot-seat-match')).toBeVisible();
  expect(localStorage.getItem(freeKey)).toBe(saved);
}, 120_000);
