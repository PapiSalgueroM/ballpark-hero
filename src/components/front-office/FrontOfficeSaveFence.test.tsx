import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import FrontOfficeBoard from '@/components/front-office/FrontOfficeBoard';
import { recordActivity } from '@/lib/completions';
import { initLeague } from '@/lib/frontOffice';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: vi.fn() }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const KEY = 'front-office-save-v1';
const OTHER = 'front-office-stale-fixture-unrelated';

function mount() {
  let seed = 573;
  const league = initLeague(() => {
    seed = seed * 16807 % 2147483647;
    return (seed - 1) / 2147483646;
  });
  const raw = JSON.stringify({ league, myTeam: 'KC', phase: 'hub', titles: 0,
    seasonsPlayed: 0, draftClass: null, picksLeft: 0 });
  localStorage.setItem(KEY, raw);
  localStorage.setItem(OTHER, 'held');
  render(<FrontOfficeBoard />);
  return {
    raw,
    moveOtherTab() {
      const newer = JSON.stringify({ ...JSON.parse(raw), league: { ...league, week: 3 } });
      localStorage.setItem(KEY, newer);
      return newer;
    },
  };
}

function weekPanel() {
  fireEvent.click(screen.getByRole('button', { name: /This week/ }));
}

async function expectReload(newer: string) {
  expect(localStorage.getItem(KEY) === newer, 'exact newer franchise bytes remain').toBe(true);
  expect(localStorage.getItem(OTHER)).toBe('held');
  const reload = await screen.findByRole('button', { name: 'Reload' });
  expect(reload).toBeEnabled();
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

it.each(['Play Week 1', 'Watch Week 1'])('blocks stale %s before simulation or activity', async name => {
  const save = mount();
  weekPanel();
  const button = screen.getByRole('button', { name });
  expect(button).toBeEnabled();
  const newer = save.moveOtherTab();
  const random = vi.spyOn(Math, 'random').mockReturnValue(0.4);
  fireEvent.click(button);
  expect(localStorage.getItem(KEY) === newer, 'exact newer franchise bytes remain').toBe(true);
  expect(random).not.toHaveBeenCalled();
  expect(recordActivity).not.toHaveBeenCalled();
  await expectReload(newer);
});

it('blocks a pending Retry after another tab commits a newer week', async () => {
  const save = mount();
  weekPanel();
  const write = Storage.prototype.setItem;
  let refuse = true;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, bytes) {
    if (key === KEY && refuse) {
      refuse = false;
      throw new DOMException('Fixture quota refusal', 'QuotaExceededError');
    }
    write.call(this, key, bytes);
  });
  fireEvent.click(screen.getByRole('button', { name: 'Play Week 1' }));
  expect(screen.getByRole('button', { name: 'Play Week 2' })).toBeEnabled();
  const retry = screen.getByRole('button', { name: 'Retry save' });
  expect(localStorage.getItem(KEY)).toBe(save.raw);
  const newer = save.moveOtherTab();
  fireEvent.click(retry);
  await expectReload(newer);
});

it('leaves the newer franchise stored when an old tab tries to abandon it', async () => {
  const save = mount();
  const abandon = screen.getByRole('button', { name: 'Abandon franchise and restart' });
  const newer = save.moveOtherTab();
  fireEvent.click(abandon);
  await expectReload(newer);
});

it('checks committed franchise changes and treats a clear event with equal bytes as current', async () => {
  const save = mount();
  fireEvent(window, new StorageEvent('storage', { key: null }));
  expect(screen.queryByRole('alertdialog')).toBeNull();

  const newer = save.moveOtherTab();
  fireEvent(window, new StorageEvent('storage', { key: OTHER }));
  expect(screen.queryByRole('alertdialog')).toBeNull();
  fireEvent(window, new StorageEvent('storage', { key: KEY }));
  await expectReload(newer);
});

it('adopts each successful write and still allows play and reset after transient read refusals', () => {
  mount();
  weekPanel();
  const read = Storage.prototype.getItem;
  let refuse = false;
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key) {
    if (key === KEY && refuse) {
      refuse = false;
      throw new DOMException('Fixture transient read refusal', 'SecurityError');
    }
    return read.call(this, key);
  });

  const play = screen.getByRole('button', { name: 'Play Week 1' });
  refuse = true;
  fireEvent.click(play);
  expect(JSON.parse(localStorage.getItem(KEY)!).league.week).toBe(2);
  fireEvent.click(screen.getByRole('button', { name: 'Play Week 2' }));
  expect(JSON.parse(localStorage.getItem(KEY)!).league.week).toBe(3);
  const abandon = screen.getByRole('button', { name: 'Abandon franchise and restart' });
  refuse = true;
  fireEvent.click(abandon);
  expect(localStorage.getItem(KEY)).toBeNull();
  expect(localStorage.getItem(OTHER)).toBe('held');
  expect(screen.getByText('Take over a front office')).toBeInTheDocument();
  expect(screen.queryByRole('alertdialog')).toBeNull();
});
