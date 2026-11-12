import './dailyReload/mocks';
import { act, cleanup, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { TeamSeasonEntry } from '@/lib/perfectSeasonNfl';
import NflPage from '@/pages/PerfectSeasonNfl';
import { click, mountPage } from './dailyReload/harness';
import { recordCompletion, resetMocks } from './dailyReload/mocks';

const archive = vi.hoisted(() => ({ index: vi.fn(), squad: vi.fn() }));
vi.mock('@/lib/perfectSeasonNfl', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/perfectSeasonNfl')>(),
  fetchTeamSeasonIndex: archive.index,
  fetchSquad: archive.squad,
}));

const archiveRows = (year: number, count: number): TeamSeasonEntry[] =>
  Array.from({ length: count }, (_, index) => ({
    year, abbr: `F${year}-${index}`, name: `Fixture Club ${year} ${index}`,
  }));
const partial = [...archiveRows(2004, 19), ...archiveRows(2018, 401)];
const recovered = [...partial, ...archiveRows(2005, 1)];
const unavailable = "Couldn't load enough teams for the 2000s wheel.";

const mount = () => within(mountPage(<NflPage />, '/perfect-season-nfl').container);
const spin = async (board: ReturnType<typeof mount>) => {
  await click(board.getByRole('button', { name: 'Spin the wheel' }));
  await act(async () => { await vi.advanceTimersByTimeAsync(1600); });
  expect(board.getByText('You landed on', { exact: true })).toBeVisible();
};

beforeEach(() => {
  localStorage.clear();
  resetMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-11T17:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  archive.index.mockReset().mockResolvedValue(partial);
  archive.squad.mockReset().mockImplementation(async (entry: TeamSeasonEntry) => ({
    squadId: entry.abbr,
    year: entry.year,
    teamName: entry.name,
    players: [{ playerId: 'fixture', name: 'Fixture Quarterback', rating: 80, eligible: ['QB'] }],
  }));
});
afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

it.each(['Classic', 'Hard'])('keeps %s in the chosen decade after retrying a short archive', async mode => {
  archive.index.mockResolvedValueOnce(partial).mockResolvedValueOnce(recovered);
  const board = mount();
  await click(board.getByRole('button', { name: '2000s' }));
  await click(board.getByRole('button', { name: new RegExp('^' + mode) }));
  expect(board.queryByRole('button', { name: 'Spin the wheel' })).toBeNull();
  expect(board.getByText(unavailable)).toBeVisible();
  expect(archive.squad).not.toHaveBeenCalled();

  await click(board.getByRole('button', { name: 'Try again' }));
  await spin(board);
  expect(archive.index).toHaveBeenCalledTimes(2);
  expect(archive.squad).toHaveBeenCalledExactlyOnceWith(recovered.filter(row => row.year < 2010)[10]);
  expect(recordCompletion).not.toHaveBeenCalled();
});

it('lets the player return from an unavailable decade and use the All eras archive', async () => {
  const board = mount();
  await click(board.getByRole('button', { name: '2000s' }));
  await click(board.getByRole('button', { name: /^Classic/ }));
  await click(board.getByRole('button', { name: 'Back to modes' }));
  await click(board.getByRole('button', { name: 'All eras' }));
  await click(board.getByRole('button', { name: /^Classic/ }));
  await spin(board);
  expect(archive.squad).toHaveBeenCalledExactlyOnceWith(partial[210]);
});

it('keeps the existing Daily wheel when the selected Classic decade is unavailable', async () => {
  const unfiltered = mount();
  await click(unfiltered.getByRole('button', { name: /^Daily/ }));
  await spin(unfiltered);
  const expected = archive.squad.mock.calls[0][0];
  cleanup();

  const scoped = mount();
  await click(scoped.getByRole('button', { name: '2000s' }));
  await click(scoped.getByRole('button', { name: /^Daily/ }));
  await spin(scoped);
  expect(archive.squad).toHaveBeenNthCalledWith(2, expected);
  expect(recordCompletion).not.toHaveBeenCalled();
});
