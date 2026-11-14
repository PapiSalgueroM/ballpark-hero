import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { RarityCategory } from '@/lib/rarityRound';
import RarityRound from '@/pages/RarityRound';
import { getTodayET } from '@/lib/dateUtils';

const remote = vi.hoisted(() => ({
  reads: [] as { category: string; reply: (answers: string[]) => void }[],
  inserts: [] as { category_key: string; answer: string }[],
  completion: vi.fn(),
  daily: [] as RarityCategory[],
  unlimited: [] as RarityCategory[],
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from(table: string) {
      if (table !== 'rarity_round_guesses') throw new Error('Unexpected fixture table: ' + table);
      return {
        insert: async (row: (typeof remote.inserts)[number]) => {
          remote.inserts.push(row);
          return { error: null };
        },
        select: () => ({
          eq: (_column: string, category: string) => ({
            order: () => ({
              limit: () => new Promise(resolve => {
                remote.reads.push({ category, reply: answers => resolve({ data: answers.map(answer => ({ answer })) }) });
              }),
            }),
          }),
        }),
      };
    },
  },
}));
vi.mock('@/lib/rarityRound', async original => ({
  ...await original<typeof import('@/lib/rarityRound')>(),
  pickDailyCategories: () => remote.daily,
  pickRandomCategories: () => remote.unlimited,
}));
vi.mock('@/components/game/GameShell', () => ({
  GameShell: ({ children, headerExtra }: { children: ReactNode; headerExtra: ReactNode }) => <>{headerExtra}{children}</>,
}));
vi.mock('@/components/game/HowToPlayPopover', () => ({ HowToPlayPopover: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: remote.completion }));

function category(id: string): RarityCategory {
  const pool = [
    { name: 'Fixture Famous', key: 'fixture famous', prominence: 100, rank: 1 },
    { name: 'Fixture Rare', key: 'fixture rare', prominence: 10, rank: 2 },
  ];
  return {
    id, prompt: id, hint: '', fetchPool: async () => pool,
    sourceConfig: {
      table: 'fixture', nameColumn: 'name',
      local: async query => pool.filter(p => p.key.includes(query)).map(p => ({ name: p.name })),
    },
  };
}

async function answer(name: string) {
  fireEvent.change(await screen.findByRole('combobox'), { target: { value: name } });
  fireEvent.click(await screen.findByRole('option', { name }));
  fireEvent.click(screen.getByRole('button', { name: 'Lock in answer' }));
}

beforeEach(() => {
  localStorage.clear();
  remote.reads.length = 0;
  remote.inserts.length = 0;
  remote.completion.mockClear();
  remote.daily = [category('Daily first'), category('Daily next')];
  remote.unlimited = [category('Unlimited first')];
});
afterEach(cleanup);

it.each([
  { transition: 'Next round', next: 'Daily next', oldFirst: true },
  { transition: 'Next round', next: 'Daily next', oldFirst: false },
  { transition: 'Unlimited', next: 'Unlimited first', oldFirst: false },
  { transition: 'Crowd Says', next: 'Daily first', oldFirst: false },
])('keeps the current crowd panel after $transition (old response first: $oldFirst)', async ({ transition, next, oldFirst }) => {
  render(<RarityRound />);
  await answer('Fixture Famous');
  await waitFor(() => expect(remote.reads).toHaveLength(1));
  fireEvent.click(screen.getByRole('button', { name: new RegExp(transition) }));
  await answer('Fixture Rare');
  await waitFor(() => expect(remote.reads.map(read => read.category)).toEqual(['Daily first', next]));
  expect(screen.getByText('Ranked 2 of 2 by fame in this category')).toBeVisible();
  expect(screen.queryByText(/What everyone else picked/)).toBeNull();

  const releaseOld = () => act(async () => { remote.reads[0].reply(['Fixture Rare']); });
  if (oldFirst) {
    await releaseOld();
    expect(screen.queryByText(/What everyone else picked/)).toBeNull();
  }
  await act(async () => { remote.reads[1].reply(['Fixture Famous', ' fixture famous ', 'Fixture Unlisted']); });
  if (!oldFirst) await releaseOld();

  const panel = within(screen.getByText(/What everyone else picked/).parentElement!);
  expect(panel.getByText('1. Fixture Famous')).toBeVisible();
  expect(panel.getByText('2 picks')).toBeVisible();
  expect(panel.queryByText(/Fixture Rare|Fixture Unlisted/)).toBeNull();
  expect(remote.inserts).toEqual([
    { category_key: 'Daily first', answer: 'Fixture Famous' },
    { category_key: next, answer: 'Fixture Rare' },
  ]);
  expect(remote.completion.mock.calls.every(([, done]) => done === false)).toBe(true);
});

it('restores the last answered Daily round or the next open slot without another crowd vote', async () => {
  const first = render(<RarityRound />);
  await answer('Fixture Rare');
  expect(screen.getByText('Ranked 2 of 2 by fame in this category')).toBeVisible();
  first.unmount();
  const resumed = render(<RarityRound />);
  expect(await screen.findByText('Ranked 2 of 2 by fame in this category')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Lock in answer' })).toBeNull();
  expect(remote.inserts).toEqual([{ category_key: 'Daily first', answer: 'Fixture Rare' }]);
  fireEvent.click(screen.getByRole('button', { name: 'Next round' }));
  expect(await screen.findByText('Daily next', { exact: true })).toBeVisible();
  resumed.unmount();

  render(<RarityRound />);
  expect(await screen.findByText('Round 2 of 2')).toBeVisible();
  await answer('Fixture Famous');
  fireEvent.click(screen.getByRole('button', { name: 'See final score' }));
  expect(await screen.findByRole('heading', { name: 'You scored 100 of 200' })).toBeVisible();
  expect(remote.completion).toHaveBeenLastCalledWith('rarity-round', true, 100, 2);
  cleanup();
  remote.completion.mockClear();
  render(<RarityRound />);
  expect(await screen.findByRole('heading', { name: 'You scored 100 of 200' })).toBeVisible();
  expect(remote.inserts).toHaveLength(2);
  expect(remote.completion.mock.calls.every(([, done]) => !done)).toBe(true);
});

it('keeps Daily Rarity and Crowd Says independent across mode switches and leaves Unlimited fresh', async () => {
  render(<RarityRound />);
  await answer('Fixture Famous');
  fireEvent.click(screen.getByRole('button', { name: /Crowd Says/ }));
  await answer('Fixture Rare');
  fireEvent.click(screen.getByRole('button', { name: /Rarity Round/ }));
  expect(await screen.findByText('Ranked 1 of 2 by fame in this category')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /Crowd Says/ }));
  expect(await screen.findByText('Ranked 2 of 2 by fame in this category')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /Unlimited/ }));
  expect(await screen.findByText('Unlimited first', { exact: true })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /Daily/ }));
  expect(await screen.findByText('Ranked 2 of 2 by fame in this category')).toBeVisible();
  expect(remote.inserts).toHaveLength(2);
});

it('keeps a settled round when a second tab tries to vote on the old prompt', async () => {
  const first = render(<RarityRound />);
  const second = render(<RarityRound />);
  const prepare = async (board: HTMLElement, name: string) => {
    const view = within(board);
    fireEvent.change(await view.findByRole('combobox'), { target: { value: name } });
    fireEvent.click(await view.findByRole('option', { name }));
    return view.getByRole('button', { name: 'Lock in answer' });
  };
  const a = await prepare(first.container, 'Fixture Famous');
  const b = await prepare(second.container, 'Fixture Rare');
  fireEvent.click(a);
  fireEvent.click(b);
  expect(await within(second.container).findByText('Ranked 1 of 2 by fame in this category')).toBeVisible();
  expect(remote.inserts).toEqual([{ category_key: 'Daily first', answer: 'Fixture Famous' }]);
});

it('an open Daily stays on its Eastern date when another tab starts a different day', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  try {
    vi.setSystemTime(new Date('2026-11-14T04:59:50Z'));
    const yesterday = getTodayET();
    const first = render(<RarityRound />);
    await answer('Fixture Rare');
    const firstBoard = within(first.container);

    vi.setSystemTime(new Date('2026-11-14T05:00:10Z'));
    const today = getTodayET();
    expect(yesterday).not.toBe(today);
    const second = render(<RarityRound />);
    const secondBoard = within(second.container);
    fireEvent.change(await secondBoard.findByRole('combobox'), { target: { value: 'Fixture Famous' } });
    fireEvent.click(await secondBoard.findByRole('option', { name: 'Fixture Famous' }));
    fireEvent.click(secondBoard.getByRole('button', { name: 'Lock in answer' }));
    expect(secondBoard.getByText('Ranked 1 of 2 by fame in this category')).toBeVisible();
    expect(localStorage.getItem(`rarity-round-daily-${yesterday}-rarity`)).toBeNull();
    const todayKey = `rarity-round-daily-${today}-rarity`;
    const todayReceipt = localStorage.getItem(todayKey)!;
    expect(JSON.parse(todayReceipt)).toMatchObject({ date: today,
      results: [{ answerName: 'Fixture Famous' }] });
    fireEvent.click(firstBoard.getByRole('button', { name: 'Next round' }));
    expect(await firstBoard.findByText('Round 2 of 2')).toBeVisible();
    expect(firstBoard.getByText(new RegExp(yesterday))).toBeVisible();
    expect(localStorage.getItem(todayKey)).toBe(todayReceipt);
    first.unmount();
    second.unmount();
    expect(remote.inserts).toHaveLength(2);
  } finally {
    vi.useRealTimers();
  }
});

it('keeps the earned rank if its pool changes and retries the next category after a failed read', async () => {
  const first = render(<RarityRound />);
  await answer('Fixture Rare');
  const finishedCategory = remote.daily[0];
  const pool = await finishedCategory.fetchPool();
  const changedPool = vi.fn(async () => [pool[0]]);
  const nextPool = vi.fn(remote.daily[1].fetchPool).mockRejectedValueOnce(new Error('offline'));
  remote.daily = [{ ...finishedCategory, fetchPool: changedPool }, { ...remote.daily[1], fetchPool: nextPool }];
  first.unmount();
  render(<RarityRound />);
  expect(await screen.findByText('Ranked 2 of 2 by fame in this category')).toBeVisible();
  expect(changedPool).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Next round' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('combobox')).toBeVisible();
  expect(screen.getByText('Round 2 of 2')).toBeVisible();
  expect(nextPool).toHaveBeenCalledTimes(2);
  expect(remote.inserts).toHaveLength(1);
});

it.each(['corrupt payload', 'wrong date', 'changed categories'])('starts fresh and replaces a Daily receipt with %s', async kind => {
  const key = `rarity-round-daily-${getTodayET()}-rarity`;
  const receipt = { v: 1, mode: 'rarity', date: kind === 'wrong date' ? '2000-01-01' : getTodayET(), phase: 'revealed',
    categories: [kind === 'changed categories' ? 'Old first' : 'Daily first', 'Daily next'],
    results: [{ categoryId: 'Daily first', prompt: 'Daily first', answerName: 'Fixture Famous', rank: 1, poolSize: 2, points: 100 }] };
  localStorage.setItem(key, kind === 'corrupt payload' ? 'no JSON' : JSON.stringify(receipt));
  render(<RarityRound />);
  await answer('Fixture Rare');
  expect(screen.getByText('Ranked 2 of 2 by fame in this category')).toBeVisible();
  expect(JSON.parse(localStorage.getItem(key)!)).toMatchObject({ date: getTodayET(), categories: ['Daily first', 'Daily next'],
    results: [{ answerName: 'Fixture Rare', rank: 2, poolSize: 2, points: 0 }] });
  expect(remote.inserts).toHaveLength(1);
});
