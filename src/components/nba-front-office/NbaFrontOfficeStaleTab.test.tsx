import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import NbaFrontOfficeBoard from '@/components/nba-front-office/NbaFrontOfficeBoard';
import { recordActivity } from '@/lib/completions';
import { initNbaLeague } from '@/lib/nbaFrontOffice';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: vi.fn() }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const KEY = 'nba-front-office-save-v1';

function openFranchise() {
  vi.mocked(recordActivity).mockClear();
  let seed = 73;
  const league = initNbaLeague(() => {
    seed = seed * 16807 % 2147483647;
    return (seed - 1) / 2147483646;
  });
  const save = { league, myTeam: 'BOS', phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 };
  const raw = JSON.stringify(save);
  localStorage.setItem(KEY, raw);
  render(<NbaFrontOfficeBoard />);
  fireEvent.click(screen.getByRole('button', { name: /Play Round 1 of 20/ }));
  return { raw, newer: JSON.stringify({ ...save, league: { ...league, round: 3 } }) };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.removeItem(KEY);
});

it.each(['Play Round 1', 'Abandon franchise and restart'])(
  'refuses stale %s before replacing a newer save',
  async name => {
    const { newer } = openFranchise();
    localStorage.setItem(KEY, newer);
    fireEvent.click(screen.getByRole('button', { name }));

    expect(localStorage.getItem(KEY) === newer, 'kept the exact newer save').toBe(true);
    expect(recordActivity).not.toHaveBeenCalled();
    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Reload to carry on');
  },
);

it('refuses to retry pending bytes once another tab has saved', async () => {
  const { raw, newer } = openFranchise();
  const write = Storage.prototype.setItem;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
    throw new DOMException('Fixture save refused', 'QuotaExceededError');
  });
  fireEvent.click(screen.getByRole('button', { name: 'Play Round 1' }));
  expect(localStorage.getItem(KEY)).toBe(raw);
  expect(screen.queryByRole('alertdialog')).toBeNull();
  write.call(localStorage, KEY, newer);
  fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));

  expect(localStorage.getItem(KEY) === newer, 'kept the exact newer save').toBe(true);
  expect(await screen.findByRole('alertdialog')).toHaveTextContent('Reload to carry on');
});

it('shows the reload prompt when another tab commits a franchise update', async () => {
  const { newer } = openFranchise();
  localStorage.setItem(KEY, newer);
  fireEvent(window, new StorageEvent('storage', { key: KEY, newValue: newer }));

  expect(await screen.findByRole('alertdialog')).toHaveTextContent('Reload to carry on');
  expect(localStorage.getItem(KEY)).toBe(newer);
});
