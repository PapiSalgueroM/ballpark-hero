import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import MlbFrontOfficeBoard from '@/components/mlb-front-office/MlbFrontOfficeBoard';
import { recordActivity } from '@/lib/completions';
import { initMlbLeague, MLB_ROUNDS } from '@/lib/mlbFrontOffice';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: vi.fn() }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const KEY = 'mlb-front-office-save-v1';
const OTHER = 'mlb-front-office-stale-tab-unrelated';

function mount(round = 1) {
  let seed = 73;
  const league = initMlbLeague(() => {
    seed = seed * 16807 % 2147483647;
    return (seed - 1) / 2147483646;
  });
  league.round = round;
  const save = { league, myTeam: 'LAD', phase: 'hub', titles: 0, seasonsPlayed: 0,
    draftClass: null, picksLeft: 0 };
  const raw = JSON.stringify(save);
  localStorage.setItem(KEY, raw);
  localStorage.setItem(OTHER, 'held');
  render(<MlbFrontOfficeBoard />);
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`Play Round ${round} of ${MLB_ROUNDS}`) }));
  const newer = JSON.stringify({ ...save, league: { ...league, round: Math.min(round + 2, MLB_ROUNDS),
    teams: { ...league.teams, LAD: { ...league.teams.LAD, wins: 1 } } } });
  return { raw, newer };
}

async function expectReload(newer: string) {
  expect(localStorage.getItem(KEY) === newer, 'exact newer franchise bytes remain').toBe(true);
  expect(localStorage.getItem(OTHER)).toBe('held');
  expect(await screen.findByRole('alertdialog')).toHaveTextContent('Reload to carry on');
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(recordActivity).mockClear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

it.each([
  [1, 'Play Round 1'],
  [MLB_ROUNDS, 'Final stretch + October'],
  [1, 'Abandon franchise and restart'],
] as const)('blocks stale Round %i %s before simulation or deletion', async (round, name) => {
  const { newer } = mount(round);
  const button = screen.getByRole('button', { name });
  expect(button).toBeEnabled();
  localStorage.setItem(KEY, newer);
  const random = vi.spyOn(Math, 'random');
  fireEvent.click(button);
  await expectReload(newer);
  expect(random).not.toHaveBeenCalled();
  expect(recordActivity).not.toHaveBeenCalled();
});

it('blocks stale Retry after another tab commits a newer round', async () => {
  const { raw, newer } = mount();
  const write = Storage.prototype.setItem;
  let refuse = true;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, bytes) {
    if (key === KEY && refuse) {
      refuse = false;
      throw new DOMException('Fixture quota refusal', 'QuotaExceededError');
    }
    write.call(this, key, bytes);
  });
  fireEvent.click(screen.getByRole('button', { name: 'Play Round 1' }));
  const retry = screen.getByRole('button', { name: 'Retry save' });
  expect(localStorage.getItem(KEY)).toBe(raw);
  expect(screen.queryByRole('alertdialog')).toBeNull();
  write.call(localStorage, KEY, newer);
  fireEvent.click(retry);
  await expectReload(newer);
});

it('checks franchise storage events without blocking unrelated updates', async () => {
  const { newer } = mount();
  fireEvent(window, new StorageEvent('storage', { key: null }));
  expect(screen.queryByRole('alertdialog')).toBeNull();

  localStorage.setItem(KEY, newer);
  fireEvent(window, new StorageEvent('storage', { key: OTHER }));
  expect(screen.queryByRole('alertdialog')).toBeNull();
  fireEvent(window, new StorageEvent('storage', { key: KEY }));
  await expectReload(newer);
});

it.each([null, '{'])('keeps the other tab’s new franchise from an older picker or recovery screen (%s)', async oldSave => {
  const { newer } = mount();
  cleanup();
  if (oldSave === null) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, oldSave);
  render(<MlbFrontOfficeBoard />);
  const action = screen.getByRole('button', {
    name: oldSave === null ? /Los Angeles Dodgers/ : 'Delete this save and choose a team',
  });
  localStorage.setItem(KEY, newer);
  fireEvent.click(action);
  await expectReload(newer);
});
