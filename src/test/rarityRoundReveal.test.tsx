import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { RarityCategory } from '@/lib/rarityRound';
import RarityRound from '@/pages/RarityRound';

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
