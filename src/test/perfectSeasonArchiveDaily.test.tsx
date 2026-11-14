import './dailyReload/mocks';
import { act, cleanup, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDailyDateET, loadDailyAttempt, makeDailyPicker, simulateSeason, teamOverall } from '@/lib/perfectSeason';
import { MLB_GAMES, MLB_SLOTS } from '@/lib/perfectSeasonMlb';
import { NHL_GAMES, NHL_SLOTS } from '@/lib/perfectSeasonNhl';
import PerfectSeasonMlb from '@/pages/PerfectSeasonMlb';
import PerfectSeasonNhl from '@/pages/PerfectSeasonNhl';
import { click, mountPage, type MountedPage } from './dailyReload/harness';
import { recordCompletion, resetMocks } from './dailyReload/mocks';
import { nhlDailyDraftKey } from '@/lib/nhlPerfectSeasonDraft';

vi.mock('@/lib/perfectSeasonMlb', async original => {
  const real = await original<typeof import('@/lib/perfectSeasonMlb')>();
  return {
    ...real,
    fetchTeamSeasonIndex: async () => [{ yearid: 2001, teamid: 'FXR', name: 'Fixture Club', w: 82, l: 80 }],
    fetchSquad: async () => fixtureSquad(real.MLB_SLOTS),
  };
});

vi.mock('@/lib/perfectSeasonNhl', async original => {
  const real = await original<typeof import('@/lib/perfectSeasonNhl')>();
  return {
    ...real,
    fetchTeamEraIndex: async () => [{ abbr: 'FXR', teamName: 'Fixture Club', draftMatch: 'Fixture', eraStart: 2000, eraEnd: 2009, eraLabel: '2000s' }],
    fetchSquad: async () => ({ ...fixtureSquad(real.NHL_SLOTS), squadId: 'FXR-2000', teamName: 'Fixture Club (2000s)', year: 2000 }),
  };
});

function fixtureSquad(slots: typeof MLB_SLOTS) {
  const players = slots.map(({ key }) => ({
    playerId: key, name: `Fixture ${key}`, rating: 85, eligible: [key], detail: 'Archive fixture',
  }));
  const reserve = { ...players[players.length - 1], playerId: 'reserve', name: 'Fixture Reserve', rating: 50 };
  return { squadId: 'fixture', teamName: 'Fixture Club', year: 2001, players: [...players, reserve] };
}

const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const beforeMidnight = new Date('2026-11-13T04:59:59Z');
const afterMidnight = new Date('2026-11-13T05:00:01Z');

beforeEach(() => {
  localStorage.clear();
  resetMocks();
  vi.useFakeTimers();
  vi.setSystemTime(beforeMidnight);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  localStorage.clear();
});

describe.each([
  { sport: 'nhl', Page: PerfectSeasonNhl, slots: NHL_SLOTS, games: NHL_GAMES },
  { sport: 'mlb', Page: PerfectSeasonMlb, slots: MLB_SLOTS, games: MLB_GAMES },
])('$sport Perfect Season', ({ sport, Page, slots, games }) => {
  const path = `/perfect-season-${sport}`;
  const mount = () => mountPage(<Page />, path);
  const players = fixtureSquad(slots).players.slice(0, -1);
  const lastPlayer = players[players.length - 1];

  async function chooseMode(page: MountedPage, mode: 'Daily' | 'Classic' = 'Daily') {
    const board = within(page.container);
    await click(board.getByRole('button', { name: new RegExp(`^${mode}\\b`) }));
    await tick(10);
    return board;
  }

  async function reachLastPick(board: ReturnType<typeof within>) {
    for (const [i, player] of players.entries()) {
      await click(board.getByRole('button', { name: i ? 'Next spin' : 'Spin the wheel' }));
      await tick(1);
      if (player !== lastPlayer) await pick(board, player.name);
    }
  }

  async function pick(board: ReturnType<typeof within>, name: string) {
    await click(board.getByRole('button', { name: new RegExp(`${name}(?:\\s|$)`) }));
  }

  it('saves the exact mounted-date run before the reveal and keeps it on reload', async () => {
    const page = mount();
    const date = getDailyDateET();
    vi.setSystemTime(afterMidnight);
    const board = await chooseMode(page);
    await reachLastPick(board);
    await pick(board, lastPlayer.name);
    expect(board.getByRole('button', { name: 'Skip to result' })).toBeVisible();

    const picker = makeDailyPicker(sport, date);
    for (const slot of slots) picker(1);
    const overall = teamOverall(slots, Object.fromEntries(players.map(p => [p.playerId, p])));
    const expected = simulateSeason(overall, games, picker(2 ** 31));
    const key = `${path.slice(1)}-daily-${date}`;
    const stored = localStorage.getItem(key);
    expect(loadDailyAttempt(sport, date)).toMatchObject({ date, sim: expected, spins: slots.length });
    expect(loadDailyAttempt(sport, getDailyDateET())).toBeNull();
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith(path, expected.wins, 'Tester');
    page.unmount();

    vi.setSystemTime(beforeMidnight);
    const reload = await chooseMode(mount());
    expect(reload.getByRole('heading', { name: "Today's daily is done" })).toBeVisible();
    expect(localStorage.getItem(key)).toBe(stored);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('preserves the first result and records one completion when a stale tab finishes later', async () => {
    const first = await chooseMode(mount());
    const second = await chooseMode(mount());
    await reachLastPick(first);
    if (sport === 'mlb') await reachLastPick(second);
    const key = `${path.slice(1)}-daily-${getDailyDateET()}`;
    const bestKey = `${path.slice(1)}-best`;

    await pick(first, 'Fixture Reserve');
    await click(first.getByRole('button', { name: 'Skip to result' }));
    await tick(1);
    const stored = localStorage.getItem(key);
    const best = localStorage.getItem(bestKey);
    expect(stored).not.toBeNull();
    expect(best).not.toBeNull();

    if (sport === 'mlb') await pick(second, lastPlayer.name);
    else await click(second.getByRole('button', { name: 'Spin the wheel' }));
    await tick(games * 30 + 100);
    expect(localStorage.getItem(key)).toBe(stored);
    expect(localStorage.getItem(bestKey)).toBe(best);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(second.getByRole('heading', { name: "Today's daily is done" })).toBeVisible();
  });

  it('keeps Classic result timing and does not create a Daily lock', async () => {
    const board = await chooseMode(mount(), 'Classic');
    await reachLastPick(board);
    await pick(board, lastPlayer.name);
    expect(board.getByRole('button', { name: 'Skip to result' })).toBeVisible();
    expect(recordCompletion).not.toHaveBeenCalled();
    await tick(games * 30 + 100);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(loadDailyAttempt(sport, getDailyDateET())).toBeNull();
  });
});

it('NHL resumes the exact Daily lineup, spent reroll and next random draw before scoring once', async () => {
  const path = '/perfect-season-nhl';
  const mount = () => mountPage(<PerfectSeasonNhl />, path);
  const open = async (page: MountedPage) => {
    const board = within(page.container);
    await click(board.getByRole('button', { name: /^Daily\b/ }));
    await tick(10);
    return board;
  };
  const date = getDailyDateET();
  let page = mount();
  let board = await open(page);
  await click(board.getByRole('button', { name: 'Spin the wheel' }));
  await click(board.getByRole('button', { name: 'Reroll (2 left)' }));
  await click(board.getByRole('button', { name: /Fixture C\b/ }));
  await click(board.getByRole('button', { name: 'Next spin' }));
  expect(board.getByRole('button', { name: 'Reroll (1 left)' })).toBeVisible();
  page.unmount();

  page = mount(); board = await open(page);
  expect(within(board.getByRole('complementary')).queryByText('Fixture C')).toBeVisible();
  expect(board.getByRole('button', { name: 'Reroll (1 left)' })).toBeVisible();
  expect(recordCompletion).not.toHaveBeenCalled();
  for (const [index, { key }] of NHL_SLOTS.slice(1).entries()) {
    if (index > 0) await click(board.getByRole('button', { name: 'Next spin' }));
    await click(board.getByRole('button', { name: new RegExp(`Fixture ${key}\\b`) }));
  }
  const players = fixtureSquad(NHL_SLOTS).players.slice(0, NHL_SLOTS.length);
  const overall = teamOverall(NHL_SLOTS, Object.fromEntries(players.map(p => [p.playerId, p])));
  const picker = makeDailyPicker('nhl', date);
  for (let i = 0; i < 7; i++) picker(1);
  const expected = simulateSeason(overall, NHL_GAMES, picker(2 ** 31));
  expect(loadDailyAttempt('nhl', date)).toMatchObject({ date, sim: expected, spins: 7 });
  expect(recordCompletion).toHaveBeenCalledExactlyOnceWith(path, expected.wins, 'Tester');
  page.unmount();
  board = await open(mount());
  expect(board.getByRole('heading', { name: "Today's daily is done" })).toBeVisible();
  expect(recordCompletion).toHaveBeenCalledTimes(1);
});

it('NHL rejects mismatched Daily wheel bytes and always prefers a finished attempt', async () => {
  const path = '/perfect-season-nhl', date = getDailyDateET(), key = nhlDailyDraftKey(date);
  const open = async () => {
    const board = within(mountPage(<PerfectSeasonNhl />, path).container);
    await click(board.getByRole('button', { name: /^Daily\b/ }));
    await tick(2);
    return board;
  };
  const bytes = JSON.stringify({ v: 1, wheel: 'A different wheel' });
  localStorage.setItem(key, bytes);
  let board = await open();
  expect(board.getByText(/Couldn't reopen the saved Daily draft/)).toBeVisible();
  expect(board.queryByRole('button', { name: 'Spin the wheel' })).toBeNull();
  expect(localStorage.getItem(key)).toBe(bytes);
  expect(recordCompletion).not.toHaveBeenCalled();
  cleanup();
  const finalKey = `perfect-season-nhl-daily-${date}`;
  const final = JSON.stringify({ v: 1, date, sim: simulateSeason(70, NHL_GAMES, 42), overall: 70, spins: 6, teamNames: [] });
  localStorage.setItem(finalKey, final);
  board = await open();
  expect(board.getByRole('heading', { name: "Today's daily is done" })).toBeVisible();
  expect(localStorage.getItem(finalKey)).toBe(final);
  expect(recordCompletion).not.toHaveBeenCalled();
});

it('NHL holds a terminal result on a denied save and a retry records it only once', async () => {
  const path = '/perfect-season-nhl', date = getDailyDateET();
  const board = within(mountPage(<PerfectSeasonNhl />, path).container);
  await click(board.getByRole('button', { name: /^Daily\b/ }));
  await tick(2);
  const set = Storage.prototype.setItem;
  const fail = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(key, value) {
    if (key === `perfect-season-nhl-daily-${date}`) throw new Error('Terminal fixture');
    set.call(this, key, value);
  });
  for (const [i, { key }] of NHL_SLOTS.entries()) {
    await click(board.getByRole('button', { name: i ? 'Next spin' : 'Spin the wheel' }));
    await click(board.getByRole('button', { name: new RegExp(`Fixture ${key}\\b`) }));
  }
  expect(loadDailyAttempt('nhl', date)).toBeNull();
  expect(localStorage.getItem(nhlDailyDraftKey(date))).toBeTruthy();
  expect(recordCompletion).not.toHaveBeenCalled();
  fail.mockRestore();
  await click(board.getByRole('button', { name: 'Skip to result' }));
  await tick(2);
  expect(loadDailyAttempt('nhl', date)).toBeNull();
  await click(board.getByRole('button', { name: 'Retry save' }));
  expect(loadDailyAttempt('nhl', date)).toBeTruthy();
  expect(localStorage.getItem(nhlDailyDraftKey(date))).toBeNull();
  expect(recordCompletion).toHaveBeenCalledTimes(1);
});
