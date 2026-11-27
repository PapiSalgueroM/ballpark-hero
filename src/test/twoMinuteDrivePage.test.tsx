import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
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
  const view = render(<TwoMinuteDrive />);
  press(new RegExp('^' + name));
  for (const action of actions) press(action);
  expect(screen.getByRole('heading', { name: result })).toBeVisible();
  expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/two-minute-drive', score);
  view.unmount();
  render(<TwoMinuteDrive />);
  press(new RegExp('^' + name));
  expect(screen.getByRole('heading', { name: result })).toBeVisible();
  press('Replay this drive');
  expect(recordCompletion).toHaveBeenCalledTimes(1);
});
