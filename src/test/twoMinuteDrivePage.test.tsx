import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ContinueRow } from '@/components/home/ContinueRow';
import TwoMinuteDrive from '@/pages/TwoMinuteDrive';
import { loadGameContent } from '@/data/gameContent/loader';
import { recordCompletion } from '@/lib/completions';
import { searchSite } from '@/lib/siteSearch';

vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn() }));

beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
afterEach(cleanup);
const press = (name: RegExp | string) => fireEvent.click(screen.getByRole('button', { name }));
const direct = () => render(<MemoryRouter><TwoMinuteDrive /></MemoryRouter>);
function fromHome() {
  return render(<MemoryRouter><Routes>
    <Route path="/" element={<ContinueRow />} />
    <Route path="/two-minute-drive" element={<TwoMinuteDrive />} />
  </Routes></MemoryRouter>);
}

it('finds the route from the catalog and loads the football guide with the kick example', async () => {
  for (const phrase of ['two minute drive', 'two minute drill', 'NFL play calling', 'clock management', 'playoff drive']) {
    expect(searchSite(phrase)[0]).toMatchObject({ game: { path: '/two-minute-drive' }, category: 'Pro Football' });
  }
  const guide = await loadGameContent('/two-minute-drive');
  expect(guide?.example?.join(' ')).toContain('54 yards');
});

it.each([
  { name: 'Steal three', actions: [/^Speed out/, /^Deep seam/, 'Call timeout', /^Kick from 54 yards for the win/], score: 100, result: 'Drive won' },
  { name: 'Fourth and short', actions: [/^Draw /, /^Deep seam/, /^Kick from .* for overtime/], score: 50, result: 'Overtime forced' },
  { name: 'Fourth and short', actions: [/^Speed out/], score: 0, result: 'Drive lost' },
])('credits a new $result once and leaves a restored result alone', ({ name, actions, score, result }) => {
  const view = direct();
  press(new RegExp('^' + name));
  for (const action of actions) press(action);
  expect(screen.getByRole('heading', { name: result })).toBeVisible();
  expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/two-minute-drive', score);
  view.unmount();
  direct();
  press(new RegExp('^' + name));
  expect(screen.getByRole('heading', { name: result })).toBeVisible();
  press('Replay this drive');
  expect(recordCompletion).toHaveBeenCalledTimes(1);
});

it('opens the saved field from Home and leaves the standalone entrance on its menu', () => {
  const raw = JSON.stringify({ actions: ['draw'], best: null });
  localStorage.setItem('dukb-two-minute-v1:range', raw);
  const view = direct();
  expect(screen.getByRole('button', { name: /^Steal three/ })).toBeVisible();
  view.unmount();
  fromHome();
  const link = screen.getByRole('link', { name: /Two-Minute Drive.*Steal three.*0:25.*Own 49/ });
  expect(link).toHaveAttribute('href', '/two-minute-drive');
  fireEvent.click(link);
  expect(screen.getByRole('heading', { name: 'Steal three' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Call timeout' })).toBeVisible();
  expect(localStorage.getItem('dukb-two-minute-v1:range')).toBe(raw);
  expect(recordCompletion).not.toHaveBeenCalled();
});

it('lets a player choose a saved playoff leg or a practice without treating old finals and broken saves as active', () => {
  localStorage.setItem('dukb-two-minute-v1:range', JSON.stringify({ actions: ['out'] }));
  localStorage.setItem('dukb-two-minute-v1:pressure', JSON.stringify({ actions: ['draw','seam','draw','seam'] }));
  localStorage.setItem('dukb-two-minute-v1:boundary', 'damaged');
  localStorage.setItem('dukb-two-minute-playoff-v1', JSON.stringify({ draw: 1, legs: [['draw']] }));
  fromHome();
  fireEvent.click(screen.getByRole('link', { name: /Two-Minute Drive.*2 unfinished drives/ }));
  expect(screen.getByRole('heading', { name: 'Choose an unfinished drive' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /^Wild card/ }));
  expect(screen.getByRole('heading', { name: 'Wild card' })).toBeVisible();
  expect(screen.getByText('Drive film (1)')).toBeVisible();
  expect(recordCompletion).not.toHaveBeenCalled();
});
