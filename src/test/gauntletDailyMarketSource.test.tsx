import './dailyReload/mocks';
import { cleanup, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { players } from '@/data/players';
import { buildDraft, dailyDraftSeed, loadDailyDraft, runGauntlet, saveDailyDraft, saveDailyRun } from '@/lib/gauntletDraft';
import { fetchSquadPool } from '@/lib/squadDeal';
import GauntletDraft from '@/pages/GauntletDraft';
import { click, mountPage } from './dailyReload/harness';
import { recordCompletion, resetMocks, setPoolFixture, setTableFixture } from './dailyReload/mocks';

const date = '2026-11-11';
const key = `gauntlet-draft-daily-${date}`;
const dailyButton = /^Daily gauntlet/;
const offline = () => { throw new Error('Fixture feed unavailable'); };
const officialRows = players.map((p, index) => ({
  player_name: 'Official fixture ' + index, position: p.position, age: p.age, nationality: p.nationality,
  club: p.club, market_value_usd: p.marketValue * 1_000_000,
}));
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
  const actual = await vi.importActual<typeof import('@/lib/squadDeal')>('@/lib/squadDeal');
  setPoolFixture('squad', actual.fetchSquadPool);
  setTableFixture('player_market_values', offline);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  localStorage.clear();
});

it('offers to retry a fresh Daily while the offline pool still deals Unlimited', async () => {
  const view = mount();
  const daily = await view.findByRole('button', { name: dailyButton });
  expect(daily).toHaveTextContent('The player feed is unavailable.');
  await click(view.getByRole('button', { name: /^Unlimited/ }));
  expect(view.getByText(/^Pick 1 of 11/)).toBeVisible();
  expect(localStorage.getItem(key)).toBeNull();
  expect(recordCompletion).not.toHaveBeenCalled();
});

it('retries in place and starts a fresh Daily from the official feed on its mounted date', async () => {
  vi.setSystemTime(new Date('2026-11-12T04:59:30Z'));
  const view = mount();
  await view.findByRole('button', { name: dailyButton });
  let reads = 0;
  setTableFixture('player_market_values', () => { reads++; return officialRows; });
  vi.setSystemTime(new Date('2026-11-12T05:00:30Z'));

  await click(view.getByRole('button', { name: dailyButton }));
  expect(reads).toBe(1);
  expect(view.queryByText(/^Pick 1 of 11/)).toBeNull();
  expect(localStorage.getItem(key)).toBeNull();
  await click(await view.findByRole('button', { name: dailyButton }));
  expect(view.getByText(/^Pick 1 of 11/)).toBeVisible();
  const official = await fetchSquadPool('current');
  const first = buildDraft(official, dailyDraftSeed(date)).picks[0].choices[0];
  await click(view.getByText(first.name, { exact: true }).closest('button')!);
  expect(loadDailyDraft(date)?.kept).toEqual([first.name]);
  expect(localStorage.getItem('gauntlet-draft-daily-2026-11-12')).toBeNull();
  expect(recordCompletion).not.toHaveBeenCalled();
});

it('resumes an exact matching old fallback partial without making another request', async () => {
  const draft = buildDraft(players, dailyDraftSeed(date));
  saveDailyDraft(date, draft, [draft.picks[0].choices[0]]);
  const before = localStorage.getItem(key);
  let reads = 0;
  setTableFixture('player_market_values', () => { reads++; return offline(); });
  const view = mount();
  await click(await view.findByRole('button', { name: dailyButton }));
  expect(view.getByText(/^Pick 2 of 11/)).toBeVisible();
  expect(localStorage.getItem(key)).toBe(before);
  expect(reads).toBe(1);
  expect(recordCompletion).not.toHaveBeenCalled();
});

it('retries when fallback cannot match an official partial and preserves its first pick', async () => {
  setTableFixture('player_market_values', officialRows);
  const official = await fetchSquadPool('current');
  const draft = buildDraft(official, dailyDraftSeed(date));
  saveDailyDraft(date, draft, [draft.picks[0].choices[0]]);
  const before = localStorage.getItem(key);
  setTableFixture('player_market_values', offline);
  const view = mount();
  await view.findByRole('button', { name: dailyButton });
  let reads = 0;
  setTableFixture('player_market_values', () => { reads++; return officialRows; });
  await click(view.getByRole('button', { name: dailyButton }));
  expect(reads).toBe(1);
  expect(view.queryByText(/^Pick \d+ of 11/)).toBeNull();
  expect(localStorage.getItem(key)).toBe(before);

  await click(await view.findByRole('button', { name: dailyButton }));
  expect(view.getByText(/^Pick 2 of 11/)).toBeVisible();
  expect(localStorage.getItem(key)).toBe(before);
  expect(reads).toBe(1);
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
