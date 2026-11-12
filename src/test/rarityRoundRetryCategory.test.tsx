import './dailyReload/mocks';
import { cleanup, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { PoolEntry, RarityCategory } from '@/lib/rarityRound';
import RarityRound from '@/pages/RarityRound';
import { click, mountPage, typeInto } from './dailyReload/harness';
import { recordCompletion, resetMocks } from './dailyReload/mocks';

const selectors = vi.hoisted(() => ({
  categories: [] as RarityCategory[],
  daily: vi.fn(),
  unlimited: vi.fn(),
}));
vi.mock('@/lib/rarityRound', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/rarityRound')>(),
  CATEGORIES: selectors.categories,
  pickDailyCategories: selectors.daily,
  pickRandomCategories: selectors.unlimited,
}));

function category(label: string) {
  const pool: PoolEntry[] = [
    { name: 'Fixture Famous', key: 'fixture famous', prominence: 100, rank: 1 },
    { name: 'Fixture Rare', key: 'fixture rare', prominence: 10, rank: 2 },
  ];
  const fetchPool = vi.fn<() => Promise<PoolEntry[]>>().mockResolvedValue(pool);
  return {
    id: label, prompt: label, hint: '', fetchPool,
    sourceConfig: {
      table: 'fixture', nameColumn: 'name',
      local: async (query: string) => pool.filter(player => player.key.includes(query)).map(player => ({ name: player.name })),
    },
  } satisfies RarityCategory;
}

const mount = () => within(mountPage(<RarityRound />, '/rarity-round').container);
type Board = ReturnType<typeof mount>;

async function answer(board: Board, name: string) {
  await typeInto(await board.findByRole('combobox'), name);
  await click(await board.findByRole('option', { name }));
  await click(board.getByRole('button', { name: 'Lock in answer' }));
}

async function finish(board: Board, categories: RarityCategory[]) {
  for (let index = 1; index < categories.length; index += 1) {
    expect(await board.findByText(categories[index].prompt)).toBeVisible();
    await answer(board, 'Fixture Rare');
    await click(board.getByRole('button', { name: index === categories.length - 1 ? 'See final score' : 'Next round' }));
  }
  expect(await board.findByText('You scored 400 of 500')).toBeVisible();
  expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/rarity-round', 400, 'Tester', 5);
}

beforeEach(() => {
  resetMocks();
  selectors.categories.length = 0;
  selectors.daily.mockReset();
  selectors.unlimited.mockReset();
});
afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.clear(); });

it.each(['Rarity Round', 'Crowd Says'])('holds the Daily deal and caption through midnight in %s', async mode => {
  const real = await vi.importActual<typeof import('@/lib/rarityRound')>('@/lib/rarityRound');
  const categories = Array.from({ length: 9 }, (_, index) => category('Seeded Fixture ' + index));
  selectors.categories.push(...categories);
  selectors.daily.mockImplementation(real.pickDailyCategories);
  selectors.unlimited.mockReturnValue([category('Unlimited Fixture')]);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-12T05:00:30Z'));
  const nextDeal = real.pickDailyCategories(categories);
  vi.setSystemTime(new Date('2026-11-12T04:59:30Z'));
  const originalDeal = real.pickDailyCategories(categories);
  expect(originalDeal[0].id).not.toBe(nextDeal[0].id);
  const board = mount();
  if (mode === 'Crowd Says') await click(board.getByRole('button', { name: /Crowd Says/ }));
  expect(await board.findByText(originalDeal[0].prompt)).toBeVisible();
  expect(board.getByText("Today's categories, 2026-11-11. Same 5 for everyone.")).toBeVisible();

  vi.setSystemTime(new Date('2026-11-12T05:00:30Z'));
  await answer(board, 'Fixture Famous');
  await click(board.getByRole('button', { name: 'Next round' }));
  expect(await board.findByText(originalDeal[1].prompt)).toBeVisible();
  expect(board.getByText(/^Today's categories/)).toHaveTextContent("Today's categories, 2026-11-11. Same 5 for everyone.");
  expect(board.getByText(/score so far: 100/)).toBeVisible();

  await click(board.getByRole('button', { name: /Unlimited/ }));
  expect(await board.findByText('Unlimited Fixture')).toBeVisible();
  expect(board.queryByText(/Today's categories/)).toBeNull();
  await click(board.getByRole('button', { name: /^📅 Daily$/ }));
  expect(await board.findByText(nextDeal[0].prompt)).toBeVisible();
  expect(board.getByText("Today's categories, 2026-11-12. Same 5 for everyone.")).toBeVisible();
  expect(board.queryByText(/score so far/)).toBeNull();
  expect(recordCompletion).not.toHaveBeenCalled();
});

it('retries a later Daily pool in place through repeated failures and keeps the first answer', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-12T04:59:30Z'));
  const categories = Array.from({ length: 5 }, (_, index) => category('Daily Fixture ' + (index + 1)));
  selectors.daily.mockReturnValue(categories);
  categories[1].fetchPool.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
  const board = mount();
  await answer(board, 'Fixture Famous');
  await click(board.getByRole('button', { name: 'Next round' }));

  vi.setSystemTime(new Date('2026-11-12T05:00:30Z'));
  for (let attempt = 0; attempt < 2; attempt += 1) {
    expect(recordCompletion).not.toHaveBeenCalled();
    await click(await board.findByRole('button', { name: 'Try again' }));
  }
  expect(await board.findByText('Round 2 of 5')).toBeVisible();
  expect(board.getByText(/^Today's categories/)).toHaveTextContent("Today's categories, 2026-11-11. Same 5 for everyone.");
  expect(board.getByText(/score so far: 100/)).toBeVisible();
  expect(categories[0].fetchPool).toHaveBeenCalledTimes(1);
  expect(categories[1].fetchPool).toHaveBeenCalledTimes(3);
  expect(selectors.daily).toHaveBeenCalledTimes(1);
  await finish(board, categories);
});

it('keeps an Unlimited draw after a rejected pool instead of dealing different categories', async () => {
  selectors.daily.mockReturnValue([category('Opening Daily Fixture')]);
  const categories = Array.from({ length: 5 }, (_, index) => category('Unlimited Fixture ' + (index + 1)));
  selectors.unlimited.mockReturnValueOnce(categories).mockReturnValue([category('Different Unlimited Fixture')]);
  categories[1].fetchPool.mockRejectedValueOnce(new Error('Fixture outage'));
  const board = mount();
  await click(await board.findByRole('button', { name: /Unlimited/ }));
  expect(await board.findByText(categories[0].prompt)).toBeVisible();
  await answer(board, 'Fixture Famous');
  await click(board.getByRole('button', { name: 'Next round' }));
  await click(await board.findByRole('button', { name: 'Try again' }));

  expect(await board.findByText('Round 2 of 5')).toBeVisible();
  expect(board.getByText(/score so far: 100/)).toBeVisible();
  expect(categories[0].fetchPool).toHaveBeenCalledTimes(1);
  expect(categories[1].fetchPool).toHaveBeenCalledTimes(2);
  expect(selectors.unlimited).toHaveBeenCalledTimes(1);
  await finish(board, categories);
});
