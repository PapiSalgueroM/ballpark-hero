import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import NbaPage from '@/pages/PerfectSeasonNba';
import { getDailyDateET, loadDailyAttempt, randomSeed } from '@/lib/perfectSeason';
import { buildPlayoffRun, playoffSeedForDaily, simulateSeasonFair } from '@/lib/perfectSeasonExpansion';
import { recordCompletion } from '@/lib/completions';
import { loadNbaPlayoffs } from '@/lib/perfectSeasonNbaPlayoffs';

const fixture = [
  { slot: 'PG', name: 'Rotation Guard', rating: 55, eligible: ['PG', 'SIXTH'] },
  { slot: 'SG', name: 'Rotation Shooter', rating: 79, eligible: ['SG', 'SIXTH'] },
  { slot: 'SF', name: 'Rotation Wing', rating: 79, eligible: ['SF', 'SIXTH'] },
  { slot: 'PF', name: 'Rotation Forward', rating: 79, eligible: ['PF', 'SIXTH'] },
  { slot: 'C', name: 'Rotation Center', rating: 79, eligible: ['C', 'SIXTH'] },
  { slot: 'SIXTH', name: 'Rotation Reserve', rating: 99, eligible: ['PG', 'SIXTH'] },
];
let fixtureRatings: number[];

vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/perfectSeason', async original => {
  const actual = await original<typeof import('@/lib/perfectSeason')>();
  return { ...actual, randomSeed: vi.fn(actual.randomSeed) };
});
vi.mock('@/lib/perfectSeasonExpansion', async original => {
  const actual = await original<typeof import('@/lib/perfectSeasonExpansion')>();
  return { ...actual, simulateSeasonFair: vi.fn(actual.simulateSeasonFair), buildPlayoffRun: vi.fn(actual.buildPlayoffRun) };
});
vi.mock('@/lib/perfectSeasonNba', async original => ({
  ...await original<typeof import('@/lib/perfectSeasonNba')>(),
  fetchTeamSeasonIndex: async () => [{ season: '2000-01', team: 'FXR', teamName: 'Rotation Club' }],
  fetchSquad: async () => ({ squadId: 'rotation-club', teamName: 'Rotation Club', year: 2001,
    players: fixture.map((p, i) => ({ ...p, rating: fixtureRatings[i], playerId: p.slot, detail: 'Generated test stats' })) }),
}));

const tick = (ms = 10) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const loadGame = () => render(<HelmetProvider><MemoryRouter><NbaPage /></MemoryRouter></HelmetProvider>);
async function finishDraft(mode: 'Classic' | 'Hard' | 'Daily') {
  const game = loadGame();
  fireEvent.click(screen.getByText(mode).closest('button')!);
  await tick();
  for (const p of fixture) {
    fireEvent.click(screen.getByRole('button', { name: /^(Spin the wheel|Next spin)$/ }));
    await tick(1600);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(p.name) }));
    const option = screen.queryByRole('button', { name: p.slot });
    if (option) fireEvent.click(option);
    await tick();
  }
  return game;
}

beforeEach(() => {
  fixtureRatings = fixture.map(p => p.rating);
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
  fixtureRatings = [95, 95, 95, 95, 95, 82];
  const game = await finishDraft('Daily');
  expect(screen.queryByRole('region', { name: 'Review rotation' })).toBeNull();
  expect(simulateSeasonFair).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Skip to result' }));
  await tick();
  const result = vi.mocked(simulateSeasonFair).mock.results[0].value;
  expect(result.wins).toBeGreaterThanOrEqual(55);
  expect(screen.queryByRole('region', { name: 'Playoff rotation' })).toBeNull();
  const liveBracket = vi.mocked(buildPlayoffRun).mock.results.slice(-1)[0]?.value;
  expect(liveBracket).toEqual(buildPlayoffRun('nba', result.overall, result.wins,
    playoffSeedForDaily('nba', getDailyDateET()), fixture.map((p, i) => ({ name: p.name, rating: fixtureRatings[i] }))));
  expect(loadDailyAttempt('nba', getDailyDateET())?.sim).toEqual(result);
  const storedDaily = localStorage.getItem(`perfect-season-nba-daily-${getDailyDateET()}`);
  game.unmount();
  loadGame();
  fireEvent.click(screen.getByText('Daily').closest('button')!);
  expect(screen.getByText("Today's daily is done")).toBeVisible();
  expect(vi.mocked(buildPlayoffRun).mock.results.slice(-1)[0]?.value?.rounds).toEqual(liveBracket?.rounds);
  expect(localStorage.getItem(`perfect-season-nba-daily-${getDailyDateET()}`)).toBe(storedDaily);
  expect(loadNbaPlayoffs()).toBeNull();
  expect(recordCompletion).toHaveBeenCalledTimes(1);
});

async function finishQualifyingSeason(mode: 'Classic' | 'Hard', bracketSeed: number) {
  fixtureRatings = [86, 85, 84, 83, 82, 62];
  vi.mocked(randomSeed).mockReturnValueOnce(13).mockReturnValueOnce(bracketSeed);
  const game = await finishDraft(mode);
  fireEvent.click(screen.getByRole('button', { name: 'Simulate season' }));
  fireEvent.click(screen.getByRole('button', { name: 'Skip to result' }));
  await tick();
  expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/perfect-season-nba', 55, null);
  expect(screen.getByText(/Team overall 81 · drafted/)).toBeVisible();
  expect(screen.queryByText('Postseason run')).toBeNull();
  return game;
}

it('saves the 55–27 season before choosing and reopens one playoff outcome after choosing', async () => {
  const game = await finishQualifyingSeason('Classic', 4);
  const awarded = vi.mocked(simulateSeasonFair).mock.results[0].value;
  expect(awarded.games).toHaveLength(82);
  expect(loadNbaPlayoffs()).toMatchObject({ mode: 'classic', sim: awarded, seed: 4, postseason: null });
  const best = localStorage.getItem('perfect-season-nba-best');
  expect(best).toBeTruthy();
  game.unmount();

  const resumed = loadGame();
  fireEvent.click(screen.getByRole('button', { name: /Resume playoffs/ }));
  const choice = screen.getByRole('region', { name: 'Playoff rotation' });
  expect(within(choice).getByRole('heading')).toHaveFocus();
  expect(within(choice).getByText(/Games 1–4.*Games 5–7/)).toBeVisible();
  expect(screen.getByText(/55-27 season/)).toBeVisible();
  fireEvent.click(within(choice).getByRole('button', { name: /Lean on starters/ }));
  expect(screen.getByRole('heading', { name: 'Postseason run' })).toHaveFocus();
  expect(within(screen.getByText('vs Toronto Raptors').parentElement!).getByText('W 4-3')).toBeVisible();
  expect(loadNbaPlayoffs()).toMatchObject({ sim: awarded, postseason: { rotation: 'starters' } });
  expect(screen.queryByRole('button', { name: /Lean on starters/ })).toBeNull();
  expect(buildPlayoffRun).toHaveBeenCalledTimes(1);
  resumed.unmount();

  loadGame();
  fireEvent.click(screen.getByRole('button', { name: /Review saved playoffs/ }));
  expect(within(screen.getByText('vs Toronto Raptors').parentElement!).getByText('W 4-3')).toBeVisible();
  expect(screen.getByText(/55-27 season/)).toBeVisible();
  expect(screen.queryByRole('button', { name: /Standard rotation/ })).toBeNull();
  expect(buildPlayoffRun).toHaveBeenCalledTimes(1);
  expect(simulateSeasonFair).toHaveBeenCalledTimes(1);
  expect(recordCompletion).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem('perfect-season-nba-best')).toBe(best);
  fireEvent.click(screen.getByRole('button', { name: 'Run it back' }));
  await tick();
  expect(screen.getByRole('button', { name: 'Spin the wheel' })).toBeVisible();
});

it.each([
  ['Classic', 4, 'Standard rotation', 'Toronto Raptors', 'L 2-4'],
  ['Hard', 11, 'Lean on starters', 'Miami Heat', 'L 3-4'],
  ['Hard', 11, 'Standard rotation', 'Miami Heat', 'W 4-3'],
] as const)('applies %s seed %i through the selected postseason rotation', async (mode, seed, label, opponent, score) => {
  await finishQualifyingSeason(mode, seed);
  fireEvent.click(screen.getByRole('button', { name: new RegExp(label) }));
  expect(within(screen.getByText(`vs ${opponent}`).parentElement!).getByText(score)).toBeVisible();
  expect(recordCompletion).toHaveBeenCalledTimes(1);
});

it('reopens the first saved outcome when another open page already chose the rotation', async () => {
  const first = await finishQualifyingSeason('Classic', 4);
  const second = loadGame();
  const firstPage = within(first.container);
  const secondPage = within(second.container);
  fireEvent.click(secondPage.getByRole('button', { name: /Resume playoffs/ }));
  fireEvent.click(firstPage.getByRole('button', { name: /Standard rotation/ }));
  fireEvent.click(secondPage.getByRole('button', { name: /Lean on starters/ }));
  expect(secondPage.getByText('Standard rotation')).toBeVisible();
  expect(within(secondPage.getByText('vs Toronto Raptors').parentElement!).getByText('L 2-4')).toBeVisible();
  expect(loadNbaPlayoffs()?.postseason?.rotation).toBe('standard');
  expect(buildPlayoffRun).toHaveBeenCalledTimes(1);
  expect(recordCompletion).toHaveBeenCalledTimes(1);
});
