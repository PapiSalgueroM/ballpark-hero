import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import { UsSeasonCentreOpen } from '@/components/us-career/season/UsSeasonCentreHost';
import { recordActivity } from '@/lib/completions';
import { keyedRng } from '@/lib/keyedRng';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import { settlePendingSaves } from '@/lib/safeStorage';
import type { UsCareerSport } from '@/lib/usCareerSport';
import { declineMarketExtension, openMarketExtension } from '@/lib/usCareerMarket';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));

const WATCH_SPORTS: [string, UsCareerSport][] = [['NBA', NBA_CAREER_SPORT], ['NFL', NFL_CAREER_SPORT], ['MLB', MLB_CAREER_SPORT]];
const SPORTS: [string, UsCareerSport][] = [...WATCH_SPORTS, ['NHL', NHL_CAREER_SPORT]];
const OTHER = 'us-career-stale-play-unrelated';

function seed(sport: UsCareerSport, netWorth?: number) {
  const rng = keyedRng('stale play fixture');
  const pos = sport.create.defaultPos;
  const career = sport.startCareer('Two Tabs', pos, sport.create.archetypes[pos][0], rng, null, 'now');
  career.contractYears = 3;
  if (netWorth !== undefined) career.netWorth = netWorth;
  const teamQuality = sport.rollTeamQuality(null, rng);
  sport.assignRole(career, teamQuality, rng);
  localStorage.setItem(sport.saveKey, JSON.stringify({ c: career, phase: 'season', teamQuality, coach: null }));
  localStorage.setItem(OTHER, 'held');
}

function mount(sport: UsCareerSport) {
  const open = vi.fn();
  const ready = vi.fn(async () => true);
  const view = render(<MemoryRouter><UsSeasonCentreOpen.Provider value={{ open, ready }}>
    <UsCareerBoard sport={sport} />
  </UsSeasonCentreOpen.Provider></MemoryRouter>);
  const board = within(view.container);
  return {
    open, ready,
    play: () => board.getByRole('button', { name: /Play the \d{4} season/ }),
    watch: () => board.getByRole('button', { name: /watch the \d{4} season game by game/ }),
    bank: () => { fireEvent.click(board.getByRole('button', { name: /The Bank/ })); return board; },
  };
}

function refuseCareerWrites(sport: UsCareerSport) {
  const put = Storage.prototype.setItem;
  const writes: string[] = [];
  const refused = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
    if (key === sport.saveKey) {
      writes.push(value);
      throw new DOMException('Full', 'QuotaExceededError');
    }
    put.call(this, key, value);
  });
  return { refused, writes };
}

async function expectHeld(sport: UsCareerSport, current: string | null) {
  expect(localStorage.getItem(sport.saveKey) === current, 'exact newer career bytes remain').toBe(true);
  expect(localStorage.getItem(OTHER)).toBe('held');
  expect(recordActivity).toHaveBeenCalledTimes(1);
  const notice = await screen.findByRole('alertdialog');
  expect(within(notice).getByRole('button', { name: 'Reload' })).toBeEnabled();
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(recordActivity).mockClear();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() })));
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

it.each(SPORTS)('%s stale Play keeps the committed season before activity or simulation', async (_, sport) => {
  seed(sport);
  const a = mount(sport), b = mount(sport);
  vi.spyOn(Math, 'random').mockImplementation(keyedRng('current tab'));
  fireEvent.click(a.play());
  const current = localStorage.getItem(sport.saveKey);
  expect(JSON.parse(current!).c.seasons).toHaveLength(1);

  const draws = vi.spyOn(Math, 'random').mockImplementation(keyedRng('older tab'));
  draws.mockClear();
  fireEvent.click(b.play());
  await expectHeld(sport, current);
  expect(draws).not.toHaveBeenCalled();
  expect(b.open).not.toHaveBeenCalled();
});

it.each(WATCH_SPORTS)('%s Watch opens the current played row and leaves the viewer closed when stale', async (_, sport) => {
  seed(sport);
  const a = mount(sport), b = mount(sport);
  vi.spyOn(Math, 'random').mockImplementation(keyedRng('current watch'));
  await act(async () => { fireEvent.click(a.watch()); });
  const current = localStorage.getItem(sport.saveKey);
  const { c: saved } = JSON.parse(current!);
  expect(saved.seasons).toHaveLength(1);
  expect(a.ready).toHaveBeenCalledTimes(1);
  expect(a.open).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ row: saved.seasons[0] }));

  const draws = vi.spyOn(Math, 'random').mockImplementation(keyedRng('older watch'));
  draws.mockClear();
  await act(async () => { fireEvent.click(b.watch()); });
  await expectHeld(sport, current);
  expect(b.ready).toHaveBeenCalledTimes(1);
  expect(b.open).not.toHaveBeenCalled();
  expect(draws).not.toHaveBeenCalled();
});

it.each(SPORTS)('%s stale Bank savings leaves the newer season and old balances alone', async (_, sport) => {
  seed(sport, 10);
  const a = mount(sport), b = mount(sport);
  const bank = b.bank();
  const saveHalf = bank.getByRole('button', { name: 'Save half' });
  expect(saveHalf).toBeEnabled();
  vi.spyOn(Math, 'random').mockImplementation(keyedRng('current tab'));
  fireEvent.click(a.play());
  const current = localStorage.getItem(sport.saveKey);
  expect(JSON.parse(current!).c.seasons).toHaveLength(1);

  fireEvent.click(saveHalf);
  await expectHeld(sport, current);
  expect(bank.queryByText('Last transaction')).toBeNull();
});

it.each(SPORTS)('%s stale shop preserves another tab’s savings within the same season', async (_, sport) => {
  seed(sport, 10);
  const a = mount(sport), b = mount(sport);
  const savings = a.bank(), shop = b.bank();
  fireEvent.click(shop.getByRole('button', { name: /Shop/ }));
  const item = sport.shopItems.find(item => item.category === 'home')!;
  const buy = shop.getByRole('button', { name: `$${item.cost}M` });
  expect(buy).toBeEnabled();
  fireEvent.click(savings.getByRole('button', { name: 'Save half' }));
  const current = localStorage.getItem(sport.saveKey);
  expect(JSON.parse(current!).c.money.vault).toBe(4.95);
  expect(savings.getByText('Last transaction')).toBeInTheDocument();

  fireEvent.click(buy);
  expect(localStorage.getItem(sport.saveKey) === current, 'exact newer savings bytes remain').toBe(true);
  expect(shop.queryByText('OWNED')).toBeNull();
  expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
});

it('a current Bank tab can purchase and retry a refused savings write without replay', () => {
  const sport = NFL_CAREER_SPORT;
  seed(sport, 10);
  const bank = mount(sport).bank();
  const item = sport.shopItems.find(item => item.category === 'home')!;
  fireEvent.click(bank.getByRole('button', { name: /Shop/ }));
  fireEvent.click(bank.getByRole('button', { name: `$${item.cost}M` }));
  const current = localStorage.getItem(sport.saveKey);
  expect(JSON.parse(current!).c.purchased).toContain(item.id);
  expect(bank.getByText('OWNED')).toBeInTheDocument();

  fireEvent.click(bank.getByRole('button', { name: /Account/ }));
  const { refused, writes } = refuseCareerWrites(sport);
  fireEvent.click(bank.getByRole('button', { name: 'Save half' }));
  expect(localStorage.getItem(sport.saveKey)).toBe(current);
  expect(writes).toHaveLength(1);
  expect(bank.getByText('Last transaction')).toBeInTheDocument();
  refused.mockRestore();

  fireEvent.click(bank.getByRole('button', { name: 'Retry save' }));
  expect(localStorage.getItem(sport.saveKey)).toBe(writes[0]);
  expect(bank.queryByRole('button', { name: 'Retry save' })).toBeNull();
  expect(screen.queryByRole('alertdialog')).toBeNull();
});

it.each(['Retry save', 'queued reload flush'])('%s cannot replace a newer season with a refused Bank write', async trigger => {
  const sport = NBA_CAREER_SPORT;
  seed(sport, 10);
  const a = mount(sport), b = mount(sport);
  const bank = b.bank();
  const initial = localStorage.getItem(sport.saveKey);
  const { refused, writes } = refuseCareerWrites(sport);
  fireEvent.click(bank.getByRole('button', { name: 'Save half' }));
  const retry = bank.getByRole('button', { name: 'Retry save' });
  expect(retry).toBeEnabled();
  expect(writes).toHaveLength(1);
  expect(JSON.parse(writes[0]).c.money.vault).toBe(4.95);
  expect(localStorage.getItem(sport.saveKey)).toBe(initial);
  refused.mockRestore();

  vi.spyOn(Math, 'random').mockImplementation(keyedRng('current tab'));
  fireEvent.click(a.play());
  const current = localStorage.getItem(sport.saveKey);
  expect(JSON.parse(current!).c.seasons).toHaveLength(1);
  if (trigger === 'Retry save') fireEvent.click(retry);
  else act(() => { expect(settlePendingSaves()).toBe(true); });
  await expectHeld(sport, current);
  expect(retry).not.toBeInTheDocument();
});

it.each([false, true])('adopts the market decline for Play only with an unchanged career (diverged: %s)', async diverged => {
  const sport = NBA_CAREER_SPORT;
  seed(sport);
  const disk = JSON.parse(localStorage.getItem(sport.saveKey)!);
  disk.c.contractYears = 1;
  const talk = openMarketExtension(disk.c, sport.slug, sport.buildExtension(disk.c, keyedRng('extension')));
  localStorage.setItem(sport.saveKey, JSON.stringify({ ...disk, phase: 'extension', contractTalk: talk }));
  const view = mount(sport);

  const career = diverged ? { ...disk.c, morale: disk.c.morale - 1 } : disk.c;
  const current = JSON.stringify({ ...disk, c: career, contractTalk: declineMarketExtension(talk) });
  localStorage.setItem(sport.saveKey, current);
  fireEvent.click(screen.getByRole('button', { name: /play the year out/i }));
  expect(localStorage.getItem(sport.saveKey) === current).toBe(true);
  fireEvent.click(view.play());
  if (diverged) {
    expect(localStorage.getItem(sport.saveKey) === current).toBe(true);
    expect(recordActivity).not.toHaveBeenCalled();
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  } else {
    expect(recordActivity).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  }
});
