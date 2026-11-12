import { cleanup, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import RarityRound from '@/pages/RarityRound';
import { click, mountPage, typeInto } from './dailyReload/harness';

const request = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return {
    supabase: createClient('https://archive-fixture.invalid', 'fixture', {
      global: { fetch: request },
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
});
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/rarityRound', async importOriginal => {
  const real = await importOriginal<typeof import('@/lib/rarityRound')>();
  return {
    ...real,
    pickDailyCategories: () => real.CATEGORIES.filter(category => category.id === 'nationality-netherlands'),
  };
});

const archiveNotice = 'No players found in this archive. Some historical players are missing.';
const retryNotice = 'Could not load players. Try searching again.';
// Test ratings only. No new historical records or prices.
const jordi = {
  player_name: 'Jordi Cruyff',
  name_folded: 'jordi cruyff',
  nationality: 'Netherlands',
  market_value_usd: 20,
  year: 2004,
};
const pool = [
  { player_name: 'Fixture Dutch One', peak_value_usd: 30 },
  { player_name: jordi.player_name, peak_value_usd: 20 },
  { player_name: 'Fixture Dutch Two', peak_value_usd: 10 },
];
const recorded: unknown[] = [];
let searchFailure = false;

const respond = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  searchFailure = false;
  recorded.length = 0;
  request.mockReset().mockImplementation(async (input: string | URL, init?: RequestInit) => {
    const url = new URL(input);
    switch (url.pathname) {
      case '/rest/v1/player_nationality_peaks':
        expect(url.searchParams.get('nationality')).toBe('eq.Netherlands');
        return respond(pool);
      case '/rest/v1/player_market_values': {
        expect(url.searchParams.get('nationality')).toBe('eq.Netherlands');
        if (searchFailure) return respond({ message: 'Fixture search outage' }, 503);
        const query = url.searchParams.get('name_folded')?.slice('ilike.%'.length, -1);
        return respond(query && !jordi.name_folded.includes(query) ? [] : [jordi]);
      }
      case '/rest/v1/rarity_round_guesses':
        if (init?.method === 'POST') recorded.push(JSON.parse(String(init.body)));
        return respond([]);
      default:
        throw new Error('Unexpected Rarity fixture request: ' + url.pathname);
    }
  });
});
afterEach(() => { cleanup(); localStorage.clear(); });

it('explains why Johan can be missing and preserves the scored Jordi answer', async () => {
  const { container } = mountPage(<RarityRound />, '/rarity-round');
  const board = within(container);
  expect(await board.findByText('Name a Dutch footballer')).toBeVisible();
  const input = await board.findByRole('combobox');
  const lock = board.getByRole('button', { name: 'Lock in answer' });

  for (const spelling of ['Johan Cruyff', 'Johan Cruijff', 'Jóhan Cruíjff', 'Johan Cryuff']) {
    await typeInto(input, spelling);
    expect(await board.findByText(archiveNotice)).toHaveAttribute('role', 'status');
    expect(board.queryByRole('option')).toBeNull();
    expect(lock).toBeDisabled();
  }
  expect(recorded).toEqual([]);

  await typeInto(input, 'Cruyff');
  const option = await board.findByRole('option', { name: /Jordi Cruyff/ });
  expect(board.queryByText(archiveNotice)).toBeNull();
  await click(option);
  await click(lock);
  const ranking = await board.findByText('Ranked 2 of 3 by fame in this category');
  expect(within(ranking.parentElement!).getByText('50')).toBeVisible();
  expect(recorded).toEqual([{ category_key: 'nationality-netherlands', answer: 'Jordi Cruyff' }]);
});

it('keeps a failed lookup distinct from an empty archive result', async () => {
  searchFailure = true;
  const { container } = mountPage(<RarityRound />, '/rarity-round');
  const board = within(container);
  await typeInto(await board.findByRole('combobox'), 'Johan Cruyff');
  expect(await board.findByText(retryNotice)).toBeVisible();
  expect(board.queryByText(archiveNotice)).toBeNull();
  expect(recorded).toEqual([]);
});
