import './dailyReload/mocks';
import { cleanup, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { players } from '@/data/players';
import { buildDraft, dailyDraftSeed, runGauntlet, saveDailyRun } from '@/lib/gauntletDraft';
import GauntletDraft from '@/pages/GauntletDraft';
import { click, mountPage } from './dailyReload/harness';
import { recordCompletion, resetMocks, setPoolFixture, setTableFixture } from './dailyReload/mocks';

const date = '2026-11-11';
const key = `gauntlet-draft-daily-${date}`;
const mount = () => within(mountPage(<GauntletDraft />, '/gauntlet-draft').container);
const seedSavedDaily = () => {
  const draft = buildDraft(players, dailyDraftSeed(date));
  saveDailyRun(date, runGauntlet(draft.picks.map(pick => pick.choices[0])));
  return localStorage.getItem(key);
};

beforeEach(async () => {
  localStorage.clear();
  resetMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${date}T17:00:00Z`));
  const { fetchSquadPool } = await vi.importActual<typeof import('@/lib/squadDeal')>('@/lib/squadDeal');
  setPoolFixture('squad', fetchSquadPool);
  setTableFixture('player_market_values', () => { throw new Error('Fixture feed unavailable'); });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  localStorage.clear();
});

it('offers to retry a fresh Daily while the offline pool still deals Unlimited', async () => {
  const view = mount();
  const daily = await view.findByRole('button', { name: /^Daily gauntlet/ });
  expect(daily).toHaveTextContent('The player feed is unavailable. Tap to retry.');
  await click(view.getByRole('button', { name: /^Unlimited/ }));
  expect(view.getByText(/^Pick 1 of 11/)).toBeVisible();
  expect(localStorage.getItem(key)).toBeNull();
  expect(recordCompletion).not.toHaveBeenCalled();
});

it('opens a previously saved Daily from the offline mode menu without posting again', async () => {
  const bytes = seedSavedDaily();
  const view = mount();
  const daily = await view.findByRole('button', { name: /^Daily gauntlet/ });
  expect(daily).toHaveTextContent("Today's draft is done.");
  await click(daily);
  expect(view.getByRole('button', { name: 'Back to modes' })).toBeVisible();
  expect(localStorage.getItem(key)).toBe(bytes);
  expect(recordCompletion).not.toHaveBeenCalled();
});

it('uses the first saved Daily read if another tab removes the record during the click', async () => {
  seedSavedDaily();
  const view = mount();
  const daily = await view.findByRole('button', { name: /^Daily gauntlet/ });
  const getItem = Storage.prototype.getItem;
  const reads = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, name: string) {
    const saved = getItem.call(this, name);
    if (name === key) this.removeItem(key);
    return saved;
  });
  await click(daily);
  expect(view.getByRole('button', { name: 'Back to modes' })).toBeVisible();
  expect(reads.mock.calls.filter(([name]) => name === key)).toHaveLength(1);
  expect(recordCompletion).not.toHaveBeenCalled();
});

it('keeps a short official feed on the existing pool error screen', async () => {
  setTableFixture('player_market_values', players.slice(0, 60).map(p => ({
    player_name: p.name, position: p.position, age: p.age, nationality: p.nationality,
    club: p.club, market_value_usd: p.marketValue * 1_000_000,
  })));
  const view = mount();
  expect(await view.findByText("Couldn't load the player pool right now.")).toBeVisible();
  expect(view.queryByRole('button', { name: /^Unlimited/ })).toBeNull();
  expect(view.queryByRole('button', { name: /^Daily gauntlet/ })).toBeNull();
});
