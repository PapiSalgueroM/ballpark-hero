import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import NbaPage from '@/pages/PerfectSeasonNba';
import { getDailyDateET, loadDailyAttempt } from '@/lib/perfectSeason';
import { simulateSeasonFair } from '@/lib/perfectSeasonExpansion';
import { recordCompletion } from '@/lib/completions';

const fixture = [
  { slot: 'PG', name: 'Rotation Guard', rating: 55, eligible: ['PG', 'SIXTH'] },
  { slot: 'SG', name: 'Rotation Shooter', rating: 79, eligible: ['SG', 'SIXTH'] },
  { slot: 'SF', name: 'Rotation Wing', rating: 79, eligible: ['SF', 'SIXTH'] },
  { slot: 'PF', name: 'Rotation Forward', rating: 79, eligible: ['PF', 'SIXTH'] },
  { slot: 'C', name: 'Rotation Center', rating: 79, eligible: ['C', 'SIXTH'] },
  { slot: 'SIXTH', name: 'Rotation Reserve', rating: 99, eligible: ['PG', 'SIXTH'] },
];

vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/perfectSeasonExpansion', async original => {
  const actual = await original<typeof import('@/lib/perfectSeasonExpansion')>();
  return { ...actual, simulateSeasonFair: vi.fn(actual.simulateSeasonFair) };
});
vi.mock('@/lib/perfectSeasonNba', async original => ({
  ...await original<typeof import('@/lib/perfectSeasonNba')>(),
  fetchTeamSeasonIndex: async () => [{ season: '2000-01', team: 'FXR', teamName: 'Rotation Club' }],
  fetchSquad: async () => ({ squadId: 'rotation-club', teamName: 'Rotation Club', year: 2001,
    players: fixture.map(p => ({ ...p, playerId: p.slot, detail: 'Generated test stats' })) }),
}));

const tick = (ms = 10) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
async function finishDraft(mode: 'Classic' | 'Hard' | 'Daily') {
  render(<HelmetProvider><MemoryRouter><NbaPage /></MemoryRouter></HelmetProvider>);
  fireEvent.click(screen.getByText(mode).closest('button')!);
  await tick();
  for (const p of fixture) {
    fireEvent.click(screen.getByRole('button', { name: /^(Spin the wheel|Next spin)$/ }));
    await tick(1600);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(p.name) }));
    const option = screen.queryByRole('button', { name: p.slot, exact: true });
    if (option) fireEvent.click(option);
    await tick();
  }
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-14T12:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

it('puts a stronger eligible reserve into the actual season input and reverses the swap safely', async () => {
  await finishDraft('Classic');
  const review = screen.getByRole('region', { name: 'Review rotation' });
  expect(simulateSeasonFair).not.toHaveBeenCalled();
  const swap = within(review).getByRole('button', { name: /Swap with Point Guard/ });
  expect(within(review).getByRole('button', { name: /Swap with Shooting Guard/ })).toBeDisabled();
  expect(within(review).getByText('78 OVR')).toBeVisible();
  fireEvent.click(swap);
  expect(within(review).getByText('79 OVR')).toBeVisible();
  fireEvent.click(swap);
  expect(within(review).getByText('78 OVR')).toBeVisible();
  fireEvent.click(swap);
  fireEvent.click(within(review).getByRole('button', { name: 'Simulate season' }));
  await tick();
  expect(simulateSeasonFair).toHaveBeenCalledExactlyOnceWith('nba', (99 + 4 * 79 + 55 * 0.8) / 5.8, 82, 2 ** 29);
  fireEvent.click(screen.getByRole('button', { name: 'Skip to result' }));
  await tick();
  const result = vi.mocked(simulateSeasonFair).mock.results[0].value;
  expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/perfect-season-nba', result.wins, null);
});

it('keeps Hard ratings hidden during rotation review and simulates the original lineup on confirmation', async () => {
  await finishDraft('Hard');
  const review = screen.getByRole('region', { name: 'Review rotation' });
  expect(within(review).queryByText(/\b(?:55|78|79|99)\b/)).toBeNull();
  expect(within(review).queryByText('Generated test stats')).toBeNull();
  expect(within(review).getAllByText('??')).toHaveLength(6);
  fireEvent.click(within(review).getByRole('button', { name: 'Simulate season' }));
  expect(simulateSeasonFair).toHaveBeenCalledExactlyOnceWith('nba', (55 + 4 * 79 + 99 * 0.8) / 5.8, 82, 2 ** 29);
});

it('starts Daily immediately and writes its existing dated receipt', async () => {
  await finishDraft('Daily');
  expect(screen.queryByRole('region', { name: 'Review rotation' })).toBeNull();
  expect(simulateSeasonFair).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Skip to result' }));
  await tick();
  const result = vi.mocked(simulateSeasonFair).mock.results[0].value;
  expect(loadDailyAttempt('nba', getDailyDateET())?.sim).toEqual(result);
  expect(recordCompletion).toHaveBeenCalledTimes(1);
});
