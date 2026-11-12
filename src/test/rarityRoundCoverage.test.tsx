import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RarityRound from '@/pages/RarityRound';

const daily = vi.hoisted(() => ({ id: 'nationality-netherlands', searches: [] as string[] }));

vi.mock('@/lib/rarityRound', async original => {
  const real = await original<typeof import('@/lib/rarityRound')>();
  return { ...real, pickDailyCategories: () => real.CATEGORIES.filter(category => category.id === daily.id) };
});

vi.mock('@/integrations/supabase/client', () => {
  const boundaries = [
    ['Boundary Below Fifty', 49_990_000], ['Boundary Exact Fifty', 50_000_000],
    ['Boundary Below Hundred', 99_990_000], ['Boundary Exact Hundred', 100_000_000],
  ] as const;
  const tables: Record<string, Record<string, string | number>[]> = {
    player_nationality_peaks: [{ player_name: 'Virgil van Dijk', nationality: 'Netherlands', peak_value_usd: 108_000_000 }],
    player_market_values: [{
      player_name: 'Virgil van Dijk', name_folded: 'virgil van dijk', nationality: 'Netherlands',
      market_value_usd: 108_000_000, club: 'Liverpool FC',
    }, ...boundaries.map(([player_name, market_value_usd]) => ({
      player_name, name_folded: player_name.toLowerCase(), market_value_usd, year: 2024,
    })), { player_name: 'Boundary Exact Hundred', name_folded: 'boundary exact hundred', market_value_usd: 49_990_000, year: 2025 }],
    player_peak_values: boundaries.map(([player_name, peak_value_usd]) => ({ player_name, peak_value_usd })),
    ballon_dor: [1971, 1973, 1974].map(year => ({
      player_name: 'Johan Cruyff', nationality: 'Netherlands', rank: 1, award_type: 'Men', year,
    })),
  };
  return {
    supabase: {
      from(table: string) {
        let rows = tables[table] ?? [];
        const builder = {
          select: () => builder,
          order: () => builder,
          limit: () => builder,
          range: () => builder,
          abortSignal: () => builder,
          eq: (column: string, value: string | number) => {
            rows = rows.filter(row => row[column] === value);
            return builder;
          },
          gte: (column: string, value: number) => {
            rows = rows.filter(row => Number(row[column]) >= value);
            return builder;
          },
          in: (column: string, values: (string | number)[]) => {
            rows = rows.filter(row => values.includes(row[column]));
            return builder;
          },
          ilike: (column: string, pattern: string) => {
            daily.searches.push(pattern);
            rows = rows.filter(row => String(row[column]).toLowerCase().includes(pattern.replace(/%/g, '').toLowerCase()));
            return builder;
          },
          then: (resolve: (value: { data: typeof rows; error: null }) => unknown) => resolve({ data: rows, error: null }),
        };
        return builder;
      },
    },
  };
});
vi.mock('@/components/game/GameShell', () => ({
  GameShell: ({ children, headerExtra }: { children: ReactNode; headerExtra: ReactNode }) => <>{headerExtra}{children}</>,
}));
vi.mock('@/components/game/HowToPlayPopover', () => ({
  HowToPlayPopover: ({ children, title }: { children: ReactNode; title: string }) => <section aria-label={title}>{children}</section>,
}));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/ResultScreen', () => ({ ResultScreen: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));

async function start(category: string) {
  daily.id = category;
  render(<RarityRound />);
  return screen.findByPlaceholderText('Search for a player...');
}

const type = (input: HTMLElement, value: string) => fireEvent.change(input, { target: { value } });
const lock = () => screen.getByRole('button', { name: 'Lock in answer' });

afterEach(() => {
  cleanup();
  daily.searches.length = 0;
});

describe('Rarity Round pool coverage', () => {
  it('explains the Dutch market-value pool and accepts its verified Van Dijk control', async () => {
    const input = await start('nationality-netherlands');
    expect(screen.getByText('Name a Dutch footballer')).toBeVisible();
    expect(screen.getByText('Current or former, any club. Choose a player with a recorded market value.')).toBeVisible();
    expect(screen.getByText(/The Ballon d'Or round uses the winners list/)).toBeVisible();
    type(input, 'Johan Cryuff');
    await waitFor(() => expect(daily.searches).toContain('%johan cryuff%'));
    expect(await screen.findByText('No matches in this category’s market-value data.')).toBeVisible();
    expect(lock()).toBeDisabled();
    type(input, 'Johan Cruyff');
    await waitFor(() => expect(daily.searches).toContain('%johan cruyff%'));
    expect(await screen.findByText('No matches in this category’s market-value data.')).toBeVisible();
    expect(lock()).toBeDisabled();

    type(input, 'Virgil van Dijk');
    fireEvent.click(await screen.findByRole('option', { name: /Virgil Van Dijk/i }));
    expect(lock()).toBeEnabled();
    fireEvent.click(lock());
    expect(await screen.findByText('Ranked 1 of 1 by fame in this category')).toBeVisible();
  });

  it.each([
    ['elite-50m', 'Boundary Exact Fifty', ['Boundary Exact Hundred', 'Boundary Below Hundred', 'Boundary Exact Fifty'], 'Ranked 3 of 3 by fame in this category'],
    ['elite-100m', 'Boundary Exact Hundred', ['Boundary Exact Hundred'], 'Ranked 1 of 1 by fame in this category'],
  ] as const)('offers and scores only players meeting the %s peak threshold', async (category, answer, eligible, ranking) => {
    const input = await start(category);
    type(input, 'Boundary');
    await screen.findByRole('option', { name: /Boundary Exact Hundred/ });
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(eligible.length);
    eligible.forEach(name => expect(screen.getByRole('option', { name: new RegExp(name) })).toBeVisible());
    fireEvent.click(screen.getByRole('option', { name: new RegExp(answer) }));
    expect(lock()).toBeEnabled();
    fireEvent.click(lock());
    expect(await screen.findByText(ranking)).toBeVisible();
  });

  it('keeps the Ballon d’Or winners searchable without requiring a valuation', async () => {
    const input = await start('ballon-dor');
    expect(screen.queryByText(/Choose a player with a recorded market value/)).not.toBeInTheDocument();
    type(input, 'Johan Cryuff');
    expect(await screen.findByText('No players found')).toBeVisible();
    expect(lock()).toBeDisabled();
    type(input, 'Johan Cruyff');
    fireEvent.click(await screen.findByRole('option', { name: /Johan Cruyff/ }));
    expect(lock()).toBeEnabled();
    fireEvent.click(lock());
    expect(await screen.findByText('Ranked 1 of 1 by fame in this category')).toBeVisible();
  });
});
