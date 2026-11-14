import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { BudgetBuilderBoard } from '@/components/budget-builder/BudgetBuilderBoard';
import { FORMATIONS } from '@/lib/squadDeal';
import { recordCompletion } from '@/lib/completions';

const readMarket = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from() {
      let year: number;
      return {
        select() { return this; },
        eq(_column: string, value: number) { year = value; return this; },
        order() { return this; },
        limit() { return readMarket(year); },
      };
    },
  },
}));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));

const archive = Array.from({ length: 33 }, (_, index) => ({
  player_name: `Archive fixture ${index}`,
  position: FORMATIONS[0].slots[index % 11].label,
  club: 'Fixture club',
  nationality: 'Fixture country',
  market_value_usd: 5_000_000,
}));
const failure = { data: null, error: { message: 'Fixture unavailable' } };
const today = /Today The 2026 market/;
const winger = /^RW slot 9: empty$/;

beforeEach(() => { vi.clearAllMocks(); });
afterEach(cleanup);

it.each([
  { year: 2007, cause: 'failed read', firstResponse: failure },
  { year: 2015, cause: 'empty read', firstResponse: { data: [], error: null } },
  { year: 2015, cause: 'thin read', firstResponse: { data: archive.slice(0, 32), error: null } },
])('retries the $year market after a $cause without substituting Today players', async ({ year, firstResponse }) => {
  let archiveResponse = firstResponse;
  readMarket.mockImplementation(async requestedYear => requestedYear === 2026 ? failure : archiveResponse);
  render(<BudgetBuilderBoard />);

  fireEvent.click(await screen.findByRole('button', { name: winger }));
  expect(screen.getByRole('button', { name: /^Preview signing Lamine Yamal/ })).toBeVisible();
  const era = new RegExp(`${year} `);
  fireEvent.click(screen.getByRole('button', { name: era }));
  expect(await screen.findByText(`Couldn't load the ${year} market.`)).toBeVisible();
  expect(screen.queryByRole('button', { name: winger })).toBeNull();
  expect(screen.queryByRole('button', { name: /^Play the Final/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: today }));
  await screen.findByRole('button', { name: winger });
  fireEvent.click(screen.getByRole('button', { name: era }));
  expect(screen.getByText(`Couldn't load the ${year} market.`)).toBeVisible();

  archiveResponse = { data: archive, error: null };
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  fireEvent.click(await screen.findByRole('button', { name: winger }));
  expect(screen.queryByRole('button', { name: /^Preview signing Lamine Yamal/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Preview signing Archive fixture 8 for $5M' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm signing' }));
  expect(screen.getByRole('button', { name: 'RW slot 9: Archive fixture 8' })).toBeVisible();
  expect(readMarket.mock.calls).toEqual([[2026], [year], [year]]);
  expect(recordCompletion).not.toHaveBeenCalled();
});

it('can return to the cached Today market while the historic request is pending', async () => {
  let finishArchive!: (response: typeof failure) => void;
  const pending = new Promise<typeof failure>(resolve => { finishArchive = resolve; });
  readMarket.mockImplementation(async year => year === 2026 ? failure : pending);
  render(<BudgetBuilderBoard />);
  await screen.findByRole('button', { name: winger });
  fireEvent.click(screen.getByRole('button', { name: /2007 When 40M/ }));
  expect(screen.getByText('Loading the market…')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: today }));
  await screen.findByRole('button', { name: winger });
  finishArchive(failure);
  fireEvent.click(screen.getByRole('button', { name: winger }));
  expect(screen.getByRole('button', { name: /^Preview signing Lamine Yamal/ })).toBeVisible();
  expect(screen.queryByText("Couldn't load the 2007 market.")).toBeNull();
  expect(readMarket.mock.calls).toEqual([[2026], [2007]]);
});
