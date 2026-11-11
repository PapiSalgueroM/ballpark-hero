import './dailyReload/mocks';
import { act, cleanup, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { SpinSquad } from '@/lib/perfectSeason';
import PerfectSeasonNfl from '@/pages/PerfectSeasonNfl';
import { click, mountPage } from './dailyReload/harness';
import { resetMocks } from './dailyReload/mocks';

vi.mock('@/lib/perfectSeasonNfl', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/perfectSeasonNfl')>(),
  fetchTeamSeasonIndex: async () => [{ year: 2006, abbr: 'FXR', name: 'Fixture Club' }],
  fetchSquad: async () => squad,
}));

const squad: SpinSquad = {
  squadId: 'FXR-2006',
  teamName: 'Fixture Club',
  year: 2006,
  players: [
    { playerId: 'z', name: 'Fixture Pick Zulu', rating: 97, eligible: ['QB'], detail: 'Fixture quarterback' },
    { playerId: 'b', name: 'Fixture Pick Bravo', rating: 83, eligible: ['WR', 'WR2', 'FLEX'], detail: 'Fixture receiver' },
    { playerId: 'a', name: 'Fixture Pick Alpha', rating: 58, eligible: ['QB'], detail: 'Fixture quarterback' },
  ],
};
const ratingOrder = ['Fixture Pick Zulu', 'Fixture Pick Bravo', 'Fixture Pick Alpha'];
const nameOrder = ['Fixture Pick Alpha', 'Fixture Pick Bravo', 'Fixture Pick Zulu'];
const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

beforeEach(() => {
  localStorage.clear();
  resetMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-11T17:00:00Z'));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  localStorage.clear();
});

it.each([
  { mode: 'Hard', order: nameOrder, hidden: true },
  { mode: 'Classic', order: ratingOrder, hidden: false },
  { mode: 'Daily', order: ratingOrder, hidden: false },
])('$mode shows the expected order for the same archived squad', async ({ mode, order, hidden }) => {
  const { container } = mountPage(<PerfectSeasonNfl />, '/perfect-season-nfl');
  const board = within(container);
  await click(board.getByRole('button', { name: new RegExp('^' + mode + '\\b') }));
  await tick(10);
  await click(board.getByRole('button', { name: 'Spin the wheel' }));
  await tick(1600);

  expect(board.getByText('2006 Fixture Club')).toBeVisible();
  const cards = board.getAllByRole('button', { name: /Fixture Pick/ });
  expect(cards.map(card => within(card).getByText(/^Fixture Pick/).textContent)).toEqual(order);
  expect(squad.players.map(player => player.name)).toEqual(ratingOrder);
  for (const player of squad.players) {
    const card = board.getByRole('button', { name: new RegExp(player.name) });
    expect(within(card).getByText(hidden ? '??' : String(player.rating))).toBeVisible();
  }

  await click(board.getByRole('button', { name: /Fixture Pick Alpha/ }));
  expect(board.getByRole('button', { name: 'Next spin' })).toBeVisible();
  expect(within(board.getByRole('complementary')).getByText('Fixture Pick Alpha')).toBeVisible();
});
