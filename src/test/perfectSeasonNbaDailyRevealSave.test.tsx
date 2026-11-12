import './dailyReload/mocks';
import { act, cleanup, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import NbaPage from '@/pages/PerfectSeasonNba';
import { NBA_SLOTS } from '@/lib/perfectSeasonNba';
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
vi.mock('@/lib/perfectSeasonNba', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/perfectSeasonNba')>(),
  fetchTeamSeasonIndex: async () => [{ season: '2000-01', team: 'FXR', teamName: 'Fixture Club' }],
  fetchSquad: async () => ({ ...squad, players: [...squad.players, reserve] }),
}));

const squad: SpinSquad = {
  squadId: 'fixture-squad', teamName: 'Fixture Club', year: 2001,
  players: NBA_SLOTS.map(slot => ({
    playerId: 'fixture-' + slot.key, name: 'Fixture Hooper ' + slot.key,
    rating: 80, eligible: [slot.key], detail: 'Fictional archive fixture',
  })),
};
const reserve = {
  playerId: 'fixture-reserve', name: 'Fixture Reserve', rating: 52,
  eligible: ['SIXTH'], detail: 'Fictional archive fixture',
};

const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const mount = () => mountPage(<NbaPage />, '/perfect-season-nba');
async function chooseDaily(page: MountedPage) {
  await click(within(page.container).getByRole('button', { name: /^Daily\b/ }));
  await tick(10);
}

beforeEach(() => {
  localStorage.clear();
  resetMocks();
  simulations.length = 0;
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-09T22:00:00Z'));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  localStorage.clear();
});

it.each(['reload', 'automatic reveal'] as const)('settles Daily before the reveal and keeps one completion through %s', async ending => {
  const page = mount();
  const board = within(page.container);
  await chooseDaily(page);
  for (const [i, player] of squad.players.entries()) {
    await click(board.getByRole('button', { name: i ? /^Next spin$/ : /^Spin the wheel$/ }));
    await tick(1600);
    await click(board.getByRole('button', { name: new RegExp(player.name + '(?:\\s|$)') }));
    await tick(10);
  }

  expect(board.getByRole('button', { name: 'Skip to result' })).toBeVisible();
  expect(page.container.querySelector('[data-season-verdict]')).toBeNull();
  const date = getDailyDateET();
  const key = `perfect-season-nba-daily-${date}`;
  const bytes = localStorage.getItem(key);
  expect(bytes, 'completed Daily survives before the presentation ends').not.toBeNull();
  expect(simulations).toHaveLength(1);
  const result = simulations[0];
  expect(result.games).toHaveLength(82);
  expect(loadDailyAttempt('nba', date)).toMatchObject({
    v: 1, date, sim: result, overall: Math.round(result.overall), spins: 6,
    teamNames: Array(6).fill('2000-01 Fixture Club'),
  });
  expect(loadBestRecord('nba')).toMatchObject({ date, mode: 'daily', wins: result.wins, losses: result.losses });
  expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/perfect-season-nba', result.wins, 'Tester');

  if (ending === 'automatic reveal') {
    await tick(3000);
    expect(page.container.querySelector('[data-result-score]')?.textContent).toBe(`${result.wins}-${result.losses}`);
  }
  page.unmount();
  const reloaded = mount();
  await chooseDaily(reloaded);

  expect(within(reloaded.container).getByRole('heading', { name: "Today's daily is done" })).toBeVisible();
  expect(within(reloaded.container).queryByRole('button', { name: 'Spin the wheel' })).toBeNull();
  expect(localStorage.getItem(key)).toBe(bytes);
  expect(simulations).toHaveLength(1);
  expect(recordCompletion).toHaveBeenCalledTimes(1);
});

it('keeps the first Daily result and best when another active tab picks a better sixth man', async () => {
  async function readyForSixth(page: MountedPage) {
    await chooseDaily(page);
    const board = within(page.container);
    for (const [i, player] of squad.players.entries()) {
      await click(board.getByRole('button', { name: i ? /^Next spin$/ : /^Spin the wheel$/ }));
      await tick(1600);
      if (i < squad.players.length - 1) {
        await click(board.getByRole('button', { name: new RegExp(player.name + '(?:\\s|$)') }));
        await tick(10);
      }
    }
    return board;
  }

  const first = await readyForSixth(mount());
  const second = await readyForSixth(mount());
  const key = `perfect-season-nba-daily-${getDailyDateET()}`;
  const bestKey = 'perfect-season-nba-best';
  expect(localStorage.getItem(key)).toBeNull();

  await click(first.getByRole('button', { name: /Fixture Reserve\b/ }));
  const saved = localStorage.getItem(key);
  const best = localStorage.getItem(bestKey);
  expect(saved).not.toBeNull();
  expect(best).not.toBeNull();
  expect(first.getByRole('button', { name: 'Skip to result' })).toBeVisible();
  expect(recordCompletion).toHaveBeenCalledTimes(1);

  await click(second.getByRole('button', { name: /Fixture Hooper SIXTH\b/ }));
  expect(simulations[1].wins).toBeGreaterThan(simulations[0].wins);
  expect(localStorage.getItem(key)).toBe(saved);
  expect(localStorage.getItem(bestKey)).toBe(best);
  expect(recordCompletion).toHaveBeenCalledTimes(1);
  expect(second.getByRole('heading', { name: "Today's daily is done" })).toBeVisible();

  const cold = mount();
  await chooseDaily(cold);
  expect(within(cold.container).getByRole('heading', { name: "Today's daily is done" })).toBeVisible();
  expect(localStorage.getItem(key)).toBe(saved);
  expect(recordCompletion).toHaveBeenCalledTimes(1);
}, 15000);
