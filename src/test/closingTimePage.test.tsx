import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ContinueRow } from '@/components/home/ContinueRow';
import NbaClosingTime from '@/components/nba-my-career/NbaClosingTime';
import { loadGameContent } from '@/data/gameContent/loader';
import { CLOSING_KEY } from '@/lib/nbaClosingTime';
import { recordCompletion } from '@/lib/completions';
import { searchSite } from '@/lib/siteSearch';
import ClosingTime from '@/pages/ClosingTime';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn() }));
const originalLocks = Object.getOwnPropertyDescriptor(navigator, 'locks');
const setLocks = (value: unknown) => Object.defineProperty(navigator, 'locks', { configurable: true, value });
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  setLocks({ request: (_key: string, held: () => void) => { held(); return Promise.resolve(); } });
});
afterEach(() => {
  cleanup();
  if (originalLocks) Object.defineProperty(navigator, 'locks', originalLocks);
  else Reflect.deleteProperty(navigator, 'locks');
});
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const direct = () => render(<MemoryRouter><ClosingTime /></MemoryRouter>);
const firstTwo = ['rim','shoot','deny-rim','corner','shoot','deny-corner','hold','next','deny-corner','hold','next','foul'];

it('launches from the search catalog with a basketball guide and a linked career practice entry', async () => {
  expect(searchSite('Closing Time')[0]).toMatchObject({ game: { path: '/closing-time' }, category: 'Pro Basketball' });
  expect((await loadGameContent('/closing-time'))?.introLinks).toContainEqual(expect.objectContaining({ to: '/nba-my-career' }));
  const careerGuide = await loadGameContent('/nba-my-career');
  expect(careerGuide?.intro[5]).toContain('Closing Time');
  expect(careerGuide?.introLinks).toContainEqual(expect.objectContaining({ to: '/closing-time' }));
});

it('opens a real possession from Home and shares the next ball and clock with the career room', () => {
  const raw = JSON.stringify(firstTwo);
  localStorage.setItem(CLOSING_KEY, raw);
  render(<MemoryRouter><Routes><Route path="/" element={<ContinueRow />} /><Route path="/closing-time" element={<ClosingTime />} /></Routes></MemoryRouter>);
  const link = screen.getByRole('link', { name: /Closing Time.*One timeout left.*101-103.*0:05/ });
  expect(link).toHaveAttribute('href', '/closing-time');
  fireEvent.click(link);
  expect(localStorage.getItem(CLOSING_KEY)).toBe(raw);
  click('Advance with timeout');
  cleanup();
  render(<NbaClosingTime />);
  click('Closing Time');
  click('Resume closing set');
  expect(screen.getByText('Q4 0:05')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Advance with timeout' })).toBeDisabled();
  click('Pass to corner');
  cleanup();
  direct();
  click('Resume closing set');
  expect(screen.getByText('Q4 0:03')).toBeVisible();
  click('Shoot from corner');
  click('Protect the rim');
  expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/closing-time', 100);
  cleanup();
  direct();
  click('Open set results');
  expect(screen.getByText(/104-103/)).toBeVisible();
  expect(recordCompletion).toHaveBeenCalledTimes(1);
  cleanup();
  render(<MemoryRouter><ContinueRow /></MemoryRouter>);
  expect(screen.queryByRole('link', { name: /Closing Time/ })).toBeNull();
});

it('records the percentage actually earned and leaves malformed saves and career-only completions off the scoreboard', () => {
  localStorage.setItem(CLOSING_KEY, '["next"]');
  render(<MemoryRouter><ContinueRow /></MemoryRouter>);
  expect(screen.queryByRole('link', { name: /Closing Time/ })).toBeNull();
  cleanup();
  localStorage.setItem(CLOSING_KEY, JSON.stringify(firstTwo));
  direct();
  click('Resume closing set');
  click('Pass to corner');
  expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/closing-time', 67);
  cleanup();
  vi.clearAllMocks();
  localStorage.setItem(CLOSING_KEY, JSON.stringify(firstTwo));
  render(<NbaClosingTime />);
  click('Closing Time');
  click('Resume closing set');
  click('Pass to corner');
  expect(recordCompletion).not.toHaveBeenCalled();
});

it('serializes two simultaneous final possessions and credits exactly once inside the winning lock', () => {
  const pending: (() => void)[] = [];
  let locked = false;
  const key = JSON.stringify([...firstTwo, 'timeout', 'corner', 'shoot']);
  localStorage.setItem(CLOSING_KEY, key);
  setLocks({ request: (name: string, callback: () => void) => {
    expect(name).toBe(CLOSING_KEY);
    pending.push(() => { locked = true; callback(); locked = false; });
    return Promise.resolve();
  } });
  vi.mocked(recordCompletion).mockImplementationOnce(() => expect(locked).toBe(true));
  const a = direct(), b = direct();
  for (const view of [a, b]) {
    fireEvent.click(within(view.container).getByRole('button', { name: 'Resume closing set' }));
    fireEvent.click(within(view.container).getByRole('button', { name: 'Protect the rim' }));
  }
  expect(pending).toHaveLength(2);
  expect(localStorage.getItem(CLOSING_KEY)).toBe(key);
  expect(recordCompletion).not.toHaveBeenCalled();
  act(() => { pending[0](); pending[1](); });
  expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/closing-time', 100);
  expect(JSON.parse(localStorage.getItem(CLOSING_KEY)!)).toEqual([...JSON.parse(key), 'deny-rim']);
  expect(within(b.container).getByText(/changed in another tab/)).toBeVisible();
});

it('keeps a local final when a lock or a durable write is unavailable', async () => {
  for (const reason of ['missing', 'refused', 'full']) {
    const key = JSON.stringify([...firstTwo, 'timeout', 'corner', 'shoot']);
    localStorage.setItem(CLOSING_KEY, key);
    if (reason === 'missing') setLocks(undefined);
    if (reason === 'refused') setLocks({ request: () => Promise.reject(new Error('Blocked')) });
    if (reason === 'full') setLocks({ request: (_name: string, callback: () => void) => { callback(); return Promise.resolve(); } });
    const refusal = reason === 'full' ? vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Full'); }) : null;
    direct();
    click('Resume closing set');
    await act(async () => { click('Protect the rim'); });
    expect(screen.getByText('3 of 3 won in regulation.')).toBeVisible();
    expect(recordCompletion).not.toHaveBeenCalled();
    if (refusal) {
      expect(screen.getByText(/could not save it/)).toBeVisible();
      refusal.mockRestore();
    } else expect(screen.getByText(/result is saved on this device/)).toBeVisible();
    cleanup();
  }
});
