import './dailyReload/mocks';
import { act, cleanup, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import NflPage from '@/pages/PerfectSeasonNfl';
import { NFL_SLOTS } from '@/lib/perfectSeasonNfl';
import { getDailyDateET, loadBestRecord, loadDailyAttempt, type SimResult, type SpinSquad } from '@/lib/perfectSeason';
import { click, mountPage, type MountedPage } from './dailyReload/harness';
import { recordCompletion, resetMocks } from './dailyReload/mocks';

const simulations = vi.hoisted(() => [] as SimResult[]);
vi.mock('@/lib/perfectSeasonExpansion', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/perfectSeasonExpansion')>();
  return {
    ...actual,
    simulateSeasonFair: (...args: Parameters<typeof actual.simulateSeasonFair>) => {
      const result = actual.simulateSeasonFair(...args);
      simulations.push(result);
      return result;
    },
  };
});
vi.mock('@/lib/perfectSeasonNfl', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/perfectSeasonNfl')>(),
  fetchTeamSeasonIndex: async () => [{ year: 2001, abbr: 'FXR', name: 'Fixture Club' }],
  fetchSquad: async () => ({ ...squad, players: [...squad.players, reserve] }),
}));

const squad: SpinSquad = {
  squadId: 'fixture-squad', teamName: 'Fixture Club', year: 2001,
  players: NFL_SLOTS.map(slot => ({
    playerId: 'fixture-' + slot.key, name: 'Fixture Player ' + slot.key,
    rating: 80, eligible: [slot.key], detail: 'Fictional archive fixture',
  })),
};
const reserve = {
  playerId: 'fixture-reserve', name: 'Fixture Reserve Coach', rating: 15,
  eligible: ['HC'], detail: 'Fictional archive fixture',
};

const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const mount = () => mountPage(<NflPage />, '/perfect-season-nfl');
async function chooseMode(page: MountedPage, name: RegExp) {
  await click(within(page.container).getByRole('button', { name }));
  await tick(10);
}

async function readyForCoach(page: MountedPage) {
  const board = within(page.container);
  for (const [i, player] of squad.players.entries()) {
    await click(board.getByRole('button', { name: i ? /^Next spin$/ : /^Spin the wheel$/ }));
    await tick(1600);
    if (player.eligible.includes('HC')) break;
    await click(board.getByRole('button', { name: new RegExp(player.name + '(?:\\s|$)') }));
    await tick(10);
  }
  return board;
}

async function draft(page: MountedPage) {
  const board = await readyForCoach(page);
  await click(board.getByRole('button', { name: /Fixture Player HC\b/ }));
  await tick(10);
  expect(board.getByRole('button', { name: 'Skip to result' })).toBeVisible();
  expect(page.container.querySelector('[data-season-verdict]')).toBeNull();
  expect(simulations).toHaveLength(1);
  return simulations[0];
}

beforeEach(() => {
  localStorage.clear();
  resetMocks();
  simulations.length = 0;
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-11T17:00:00Z'));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  localStorage.clear();
});

it.each(['reload', 'automatic reveal'] as const)('settles Daily before the reveal and keeps one completion through %s', async ending => {
  const page = mount();
  await chooseMode(page, /^Daily\b/);
  const result = await draft(page);
  const date = getDailyDateET();
  const key = `perfect-season-nfl-daily-${date}`;
  const bytes = localStorage.getItem(key);
  expect(bytes, 'completed Daily survives before the presentation ends').not.toBeNull();
  expect(result.games).toHaveLength(17);
  expect(loadDailyAttempt('nfl', date)).toMatchObject({
    v: 1, date, sim: result, overall: Math.round(result.overall), spins: 8,
    teamNames: Array(8).fill('2001 Fixture Club'),
  });
  expect(loadBestRecord('nfl')).toMatchObject({ date, mode: 'daily', wins: result.wins, losses: result.losses });
  expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/perfect-season-nfl', result.wins, 'Tester');

  if (ending === 'automatic reveal') {
    await tick(4000);
    expect(page.container.querySelector('[data-result-score]')?.textContent).toBe(`${result.wins}-${result.losses}`);
  }
  page.unmount();
  const reloaded = mount();
  await chooseMode(reloaded, /^Daily\b/);

  expect(within(reloaded.container).getByRole('heading', { name: "Today's daily is done" })).toBeVisible();
  expect(within(reloaded.container).queryByRole('button', { name: 'Spin the wheel' })).toBeNull();
  expect(localStorage.getItem(key)).toBe(bytes);
  expect(simulations).toHaveLength(1);
  expect(recordCompletion).toHaveBeenCalledTimes(1);
});

it('keeps Classic settlement at the end of the reveal', async () => {
  const page = mount();
  await chooseMode(page, /^Classic\b/);
  const result = await draft(page);
  expect(loadDailyAttempt('nfl')).toBeNull();
  expect(loadBestRecord('nfl')).toBeNull();
  expect(recordCompletion).not.toHaveBeenCalled();

  await click(within(page.container).getByRole('button', { name: 'Skip to result' }));
  expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/perfect-season-nfl', result.wins, 'Tester');
  expect(loadBestRecord('nfl')).toMatchObject({ mode: 'classic', wins: result.wins, losses: result.losses });
  expect(loadDailyAttempt('nfl')).toBeNull();
});

it.each(['weaker', 'stronger'] as const)('keeps the first Daily when a stale tab drafts a %s coach', async stalePick => {
  const firstPage = mount();
  const stalePage = mount();
  await chooseMode(firstPage, /^Daily\b/);
  await chooseMode(stalePage, /^Daily\b/);
  const first = await readyForCoach(firstPage);
  const stale = await readyForCoach(stalePage);
  const key = `perfect-season-nfl-daily-${getDailyDateET()}`;
  const bestKey = 'perfect-season-nfl-best';
  expect(localStorage.getItem(key)).toBeNull();

  const weaker = /Fixture Reserve Coach\b/;
  const stronger = /Fixture Player HC\b/;
  await click(first.getByRole('button', { name: stalePick === 'stronger' ? weaker : stronger }));
  const bytes = localStorage.getItem(key);
  const best = localStorage.getItem(bestKey);
  expect(bytes).not.toBeNull();
  expect(best).not.toBeNull();
  expect(first.getByRole('button', { name: 'Skip to result' })).toBeVisible();
  expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/perfect-season-nfl', simulations[0].wins, 'Tester');

  await click(stale.getByRole('button', { name: stalePick === 'stronger' ? stronger : weaker }));
  expect(simulations).toHaveLength(2);
  if (stalePick === 'stronger') expect(simulations[1].wins).toBeGreaterThan(simulations[0].wins);
  else expect(simulations[1].wins).toBeLessThan(simulations[0].wins);
  expect(localStorage.getItem(key)).toBe(bytes);
  expect(localStorage.getItem(bestKey)).toBe(best);
  expect(recordCompletion).toHaveBeenCalledTimes(1);
  expect(stale.getByRole('heading', { name: "Today's daily is done" })).toBeVisible();

  const cold = mount();
  await chooseMode(cold, /^Daily\b/);
  expect(within(cold.container).getByRole('heading', { name: "Today's daily is done" })).toBeVisible();
  expect(localStorage.getItem(key)).toBe(bytes);
  expect(recordCompletion).toHaveBeenCalledTimes(1);
}, 15000);
