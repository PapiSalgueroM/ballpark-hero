import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { recordCompletion } from '@/lib/completions';
import { getDailyDateET, loadDailyAttempt, type SpinSquad } from '@/lib/perfectSeason';
import { fetchSquad, fetchTeamSeasonIndex, NFL_SLOTS } from '@/lib/perfectSeasonNfl';
import PerfectSeasonNfl from '@/pages/PerfectSeasonNfl';

vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'Fixture Guest' }));
vi.mock('@/lib/perfectSeasonNfl', async original => ({
  ...await original<typeof import('@/lib/perfectSeasonNfl')>(),
  fetchTeamSeasonIndex: vi.fn(),
  fetchSquad: vi.fn(),
}));

const archive = [{ year: 2020, abbr: 'TST', name: 'Fixture Team' }];
const squad: SpinSquad = {
  squadId: 'fixture-team', year: 2020, teamName: 'Fixture Team',
  players: NFL_SLOTS.map(({ key }) => ({ playerId: key, name: 'Fixture Player ' + key, rating: 85, eligible: [key], detail: 'Test fixture' })),
};
const tick = (ms = 10) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const click = async (name: string | RegExp, ms = 10) => { fireEvent.click(button(name)); await tick(ms); };

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-14T17:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
  vi.mocked(fetchTeamSeasonIndex).mockReset().mockResolvedValue(archive);
  vi.mocked(fetchSquad).mockReset().mockResolvedValue(squad);
  vi.mocked(recordCompletion).mockClear();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

it('retries initial Daily archive load before making any team requests', async () => {
  vi.mocked(fetchTeamSeasonIndex).mockResolvedValueOnce(null);
  render(<PerfectSeasonNfl />);
  await click(/^Daily/);
  expect(screen.getByText("Couldn't reach the football archives.")).toBeVisible();
  expect(fetchSquad).not.toHaveBeenCalled();
  await click('Try again');
  expect(button('Spin the wheel')).toBeVisible();
  expect(vi.mocked(fetchTeamSeasonIndex).mock.calls).toEqual([[{ oldWheel: false }], [{ oldWheel: false }]]);
  for (const [index, { key }] of NFL_SLOTS.entries()) {
    await click(index === 0 ? 'Spin the wheel' : 'Next spin', 1600);
    await click(new RegExp('Fixture Player ' + key + '(?:\\s|$)'));
  }
  await click('Skip to result');
  expect(screen.getByText('Final record', { exact: true })).toBeVisible();
  const attempt = loadDailyAttempt('nfl', getDailyDateET());
  expect(attempt?.spins).toBe(8);
  expect(attempt?.sim.games).toHaveLength(17);
  expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/perfect-season-nfl', attempt?.sim.wins, 'Fixture Guest');
});

it('keeps a picked quarterback through next-spin and repeated reroll failures', async () => {
  render(<PerfectSeasonNfl />);
  await click(/^Classic/);
  await click('Spin the wheel', 1600);
  await click(/Fixture Player QB/);
  expect(within(screen.getByRole('complementary')).getByText('Fixture Player QB')).toBeVisible();

  vi.mocked(fetchSquad).mockResolvedValue(null);
  await click('Next spin');
  expect(fetchSquad).toHaveBeenCalledTimes(7);
  expect(screen.getByText("Couldn't reach the football archives.")).toBeVisible();
  vi.mocked(fetchSquad).mockResolvedValue(squad);
  await click('Try again', 1600);
  expect(button('Reroll (2 left)')).toBeEnabled();
  expect(within(screen.getByRole('complementary')).getByText('Fixture Player QB')).toBeVisible();

  const exhaustedSquad = { ...squad, players: squad.players.filter(player => player.eligible.includes('QB')) };
  vi.mocked(fetchSquad).mockResolvedValue(exhaustedSquad);
  await click('Reroll (2 left)');
  expect(fetchSquad).toHaveBeenCalledTimes(14);
  vi.mocked(fetchSquad).mockResolvedValue(null);
  await click('Try again');
  expect(fetchSquad).toHaveBeenCalledTimes(20);
  expect(screen.getByText("Couldn't reach the football archives.")).toBeVisible();
  vi.mocked(fetchSquad).mockResolvedValue(squad);
  const retry = button('Try again');
  await act(async () => { fireEvent.click(retry); fireEvent.click(retry); });
  await tick(1600);
  expect(fetchSquad).toHaveBeenCalledTimes(21);
  expect(button('Reroll (1 left)')).toBeEnabled();
  expect(within(screen.getByRole('complementary')).getByText('Fixture Player QB')).toBeVisible();
  expect(screen.getByText('7 slots to fill')).toBeVisible();
  expect(fetchTeamSeasonIndex).toHaveBeenCalledTimes(1);
  expect(recordCompletion).not.toHaveBeenCalled();
});
