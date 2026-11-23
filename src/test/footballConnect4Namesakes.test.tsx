import { useState, type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import FootballConnect4 from '@/pages/FootballConnect4';
import { FOOTBALL_CONNECT4_BOARDS } from '@/types/footballConnect4';

const archived = vi.hoisted(() => ({ oldMoves: [] as unknown[] }));

vi.mock('@/hooks/useDailyPuzzle', () => ({
  useDailyPuzzle: () => {
    const [guesses, setGuesses] = useState(archived.oldMoves);
    return {
      puzzle: FOOTBALL_CONNECT4_BOARDS[1], guesses, gameStatus: 'playing', isLoading: false,
      addGuess: (move: unknown) => setGuesses(previous => [...previous, move]),
    };
  },
}));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion() {} }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameShell', () => ({
  GameShell: ({ children, headerExtra }: { children: ReactNode; headerExtra: ReactNode }) => <>{headerExtra}{children}</>,
}));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));

vi.mock('@/lib/playerSearch', async importOriginal => {
  const search = await importOriginal<typeof import('@/lib/playerSearch')>();
  const marketRows = [
    { player_name: 'Nico González', club: 'Juventus FC', nationality: 'Argentina', market_value_usd: 30_000_000, year: 2025 },
    { player_name: 'Vitinha', club: 'Paris Saint-Germain', nationality: 'Portugal', market_value_usd: 151_200_000, year: 2026 },
    { player_name: 'Vitinha', club: 'Genoa CFC', nationality: 'Portugal', market_value_usd: 9_000_000, year: 2026 },
    { player_name: 'Alexander Isak', club: 'Liverpool FC', nationality: 'Sweden', market_value_usd: 120_000_000, year: 2026 },
  ];
  return {
    ...search,
    searchPlayers: async ({ source, query, exclude }: Parameters<typeof search.searchPlayers>[0]) => ({
      results: search.dedupeAndRank([marketRows], source, search.normalizeName(query), { exclude, limit: 10 }),
      error: null,
    }),
  };
});

afterEach(() => {
  cleanup();
  archived.oldMoves = [];
  vi.unstubAllGlobals();
});

function enter(query: string) {
  const input = screen.getByRole('combobox', { name: /enter soccer player name/i });
  fireEvent.change(input, { target: { value: query } });
}

it('submits the two Nico club choices separately and leaves a wrong square open', async () => {
  const validate = vi.fn(async (_url: string, { body }: { body: string }) => {
    const { playerName, columnAttribute } = JSON.parse(body);
    const valid = playerName === 'Nicolás Iván González' && columnAttribute === 'Argentine';
    return Response.json({ valid, fullName: playerName, reason: valid ? '' : 'This player did not play for Atlético.' });
  });
  vi.stubGlobal('fetch', validate);
  render(<FootballConnect4 />);
  fireEvent.click(screen.getByRole('button', { name: 'Spanish' }));
  enter('Nicolás González');
  const spanish = await screen.findByRole('option', { name: /Nicolás González Iglesias/i });
  expect(screen.getByRole('option', { name: /Nicolás Iván González/i })).toBeTruthy();
  expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(2);
  fireEvent.click(spanish);
  await screen.findByText('This player did not play for Atlético.');
  expect(JSON.parse(validate.mock.calls[0][1].body)).toEqual({
    playerName: 'Nicolás González Iglesias', rowAttribute: 'Played for Atletico Madrid', columnAttribute: 'Spanish',
  });
  expect(screen.getByRole('button', { name: 'Empty square, Played for Atletico Madrid and Spanish' })).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Argentine' }));
  enter('Nico González');
  fireEvent.click(await screen.findByRole('option', { name: /Nicolás Iván González/i }));
  await screen.findByRole('button', { name: 'Nicolás Iván González, Played for Atletico Madrid and Argentine' });
  expect(JSON.parse(validate.mock.calls[1][1].body).playerName).toBe('Nicolás Iván González');

  fireEvent.click(screen.getByRole('button', { name: 'Spanish' }));
  enter('Nico González');
  await screen.findByRole('option', { name: /Nicolás González Iglesias/i });
  expect(screen.queryByRole('option', { name: /Nicolás Iván González/i })).toBeNull();
});

it('displays distinct Vitinhas and keeps ordinary remote results selectable', async () => {
  render(<FootballConnect4 />);
  fireEvent.click(screen.getByRole('button', { name: 'Portuguese' }));
  enter('Vitinha');
  await screen.findByRole('option', { name: /Vítor Machado Ferreira.*Paris Saint-Germain/i });
  expect(screen.getByRole('option', { name: /Vítor Manuel Carvalho Oliveira.*Genoa CFC/i })).toBeTruthy();
  expect(screen.getByRole('option', { name: /Josenaldo Vitor Santos.*CD Feirense/i })).toBeTruthy();
  expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(3);
  enter('Isak');
  await screen.findByRole('option', { name: /Alexander Isak/i });
  expect(screen.queryByRole('option', { name: /Vitinha/i })).toBeNull();
});

it('keeps a legacy ambiguous move and avoids offering it again on the same board', async () => {
  archived.oldMoves = [{ t: 'move', col: 4, row: 5, team: 'blue', playerName: 'Vitinha' }];
  render(<FootballConnect4 />);
  expect(screen.getByRole('button', { name: 'Vitinha, Played for Atletico Madrid and Portuguese' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Portuguese' }));
  enter('Vitinha');
  await waitFor(() => expect(screen.getByText('No players found')).toBeTruthy());
  expect(screen.queryByRole('option')).toBeNull();
});
