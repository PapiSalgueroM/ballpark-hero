import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { CareerPlayer } from '@/types/career';
import type { TransferPathPuzzle } from '@/data/transferPathPuzzles';
import type { PlayerEntity, SearchPlayersOptions, SearchPlayersResult } from '@/lib/playerSearch';
import { getTodayET } from '@/lib/dateUtils';
import { consumeRestoredFinish } from '@/lib/restoredFinish';

// Fictional facts isolate selection wiring. Board, search merge, graph and daily engine are real.
const fixture = vi.hoisted(() => {
  const spell = (club: string) => ({ season: '2020-2021', club, goals: 0, assists: 0, appearances: 1, marketValue: 1 });
  const player = (name: string, clubs: string[]) => ({ name, nationality: 'Fixtureland', position: 'CM', career: clubs.map(spell) });
  return {
    players: [
      player('Álpha', ['Club A']), player('Brídge', ['Club A', 'Club B']),
      player('Target', ['Club B']), player('Detour', ['Club A']), player('Outsider', ['Club C']),
    ] as CareerPlayer[],
    puzzles: [{ id: 'local-search-fixture', playerA: 'Álpha', playerB: 'Target', minSteps: 2, hint: 'Club A and Club B.' }] as TransferPathPuzzle[],
    search: vi.fn<(options: SearchPlayersOptions) => Promise<SearchPlayersResult>>(),
    completion: vi.fn(),
  };
});

vi.mock('@/data/careerPlayers', () => ({ careerPlayers: fixture.players }));
vi.mock('@/data/transferPathPuzzles', () => ({ default: fixture.puzzles }));
vi.mock('@/lib/fetchCareerPlayers', () => ({ fetchCareerPlayers: vi.fn(async () => []) }));
vi.mock('@/lib/fetchTransferPathPuzzles', () => ({ fetchTransferPathPuzzles: vi.fn(async () => []) }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: fixture.completion }));
vi.mock('@/lib/playerSearch', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/playerSearch')>();
  return { ...actual, searchPlayers: (options: SearchPlayersOptions) => fixture.search(options) };
});
vi.mock('@/components/game/GameShell', () => ({
  GameShell: ({ headerExtra, children }: { headerExtra?: ReactNode; children: ReactNode }) => <main>{headerExtra}{children}</main>,
}));
vi.mock('@/components/game/ResultScreen', () => ({
  ResultScreen: ({ headline, statLine, funFact, playNext }: { headline: string; statLine?: ReactNode; funFact?: ReactNode; playNext?: ReactNode }) =>
    <section><h2>{headline}</h2>{statLine}<p>{funFact}</p>{playNext}</section>,
}));
vi.mock('@/components/game/ReportQuestion', () => ({
  default: ({ gameContext }: { gameContext: Record<string, unknown> }) => <pre data-testid="report">{JSON.stringify(gameContext)}</pre>,
}));

const { normalizeName } = await import('@/lib/playerSearch');
const boardPath = process.env.TRANSFER_PATH_BOARD;
const { TransferPathBoard } = boardPath
  ? await import(/* @vite-ignore */ boardPath)
  : await import('@/components/transfer-path/TransferPathBoard');
const key = () => `transfer-path-daily-${getTodayET()}`;
const nativeSetItem = Storage.prototype.setItem;
const entity = (name: string, meta: PlayerEntity['meta'] = {}): PlayerEntity => ({
  key: normalizeName(name), name, rawName: name, meta, matchRank: 0, prominence: 1,
});
const context = () => JSON.parse(screen.getByTestId('report').textContent!);
const lastSearch = () => fixture.search.mock.calls[fixture.search.mock.calls.length - 1]![0];

async function mountedBoard() {
  render(<TransferPathBoard />);
  await screen.findByRole('combobox', { name: 'Type a player name...' });
  expect(context().chain).toEqual(['Álpha']);
  expect(context().poolSize).toBe(5);
  expect(localStorage.getItem(key())).toBeNull();
}

async function search(text: string) {
  const previousCalls = fixture.search.mock.calls.length;
  fireEvent.change(screen.getByRole('combobox'), { target: { value: text } });
  await waitFor(() => expect(fixture.search.mock.calls.length).toBeGreaterThan(previousCalls));
  await waitFor(() => expect(screen.queryByText('Finding players...')).toBeNull());
  expect(lastSearch().query).toBe(text);
}

function selectCanonical(name: string) {
  const options = screen.queryAllByRole('option');
  expect(options).toHaveLength(1);
  expect(options[0].querySelector('span.text-sm.font-medium')?.textContent).toBe(name);
  fireEvent.click(options[0]);
}

function assertWin() {
  expect(screen.getByRole('heading', { name: 'Connected!' })).toBeTruthy();
  expect(screen.getByText('1000 pts')).toBeTruthy();
  expect(screen.queryByRole('combobox')).toBeNull();
  expect(context().chain).toEqual(['Álpha', 'Brídge', 'Target']);
  expect(JSON.parse(localStorage.getItem(key())!)).toEqual({
    v: 1, date: getTodayET(), puzzleIndex: 0, puzzleId: 'local-search-fixture',
    guesses: [{ t: 'step', player: 'Brídge', club: 'Club A' }, { t: 'step', player: 'Target', club: 'Club B' }, { t: 'won' }],
    gameStatus: 'won',
  });
  expect(fixture.completion).toHaveBeenLastCalledWith('transfer-path', true, 1000, 1);
}

beforeEach(() => {
  localStorage.clear();
  consumeRestoredFinish('transfer-path');
  fixture.completion.mockReset();
  fixture.search.mockReset().mockImplementation(async options => ({
    results: fixture.players.filter(p => normalizeName(p.name).includes(normalizeName(options.query)) && !options.exclude?.has(normalizeName(p.name)))
      .map(p => entity(p.name, { position: p.position, nationality: p.nationality })),
    error: null,
  }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Transfer Path loaded graph names remain selectable', () => {
  it('local search: offers a canonical graph name after a fulfilled search error', async () => {
    await mountedBoard();
    fixture.search.mockResolvedValue({ results: [], error: 'Fixture search unavailable' });
    await search('bridge');
    expect(screen.queryAllByRole('option')).toHaveLength(1);
    selectCanonical('Brídge');
    assertWin();
    expect(context().lastNoMatch).toBeNull();
  });

  it('local search: offers a canonical graph name after a rejected search', async () => {
    await mountedBoard();
    fixture.search.mockRejectedValue(new Error('Fixture search rejected'));
    await search('bridge');
    expect(screen.queryAllByRole('option')).toHaveLength(1);
    selectCanonical('Brídge');
    assertWin();
    expect(context().lastNoMatch).toBeNull();
  });

  it('local search: offers a canonical graph name after settled empty results', async () => {
    await mountedBoard();
    fixture.search.mockResolvedValue({ results: [], error: null });
    await search('bridge');
    expect(screen.queryAllByRole('option')).toHaveLength(1);
    selectCanonical('Brídge');
    assertWin();
    expect(context().lastNoMatch).toBeNull();
  });

  it('preservation: a healthy remote identity is listed once with its metadata', async () => {
    await mountedBoard();
    await search('bridge');
    const options = screen.queryAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0].querySelector('span.text-sm.font-medium')?.textContent).toBe('Brídge');
    expect(options[0].textContent).toContain('CM');
    expect(options[0].textContent).toContain('Fixtureland');
    expect(context().chain).toEqual(['Álpha']);
    expect(localStorage.getItem(key())).toBeNull();
  });

  it('preservation: an unknown typed name cannot be submitted as a player', async () => {
    await mountedBoard();
    await search('Missing Fixture');
    expect(screen.queryAllByRole('option')).toEqual([]);
    expect(screen.getByText('No player by that name in the Transfer Path pool yet. The pool holds 5 players.')).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
    expect(context().chain).toEqual(['Álpha']);
    expect(context().lastRejected).toBeNull();
    expect(context().lastNoMatch).toBe('Missing Fixture');
    expect(localStorage.getItem(key())).toBeNull();
    expect(fixture.completion).toHaveBeenLastCalledWith('transfer-path', false, 0, 0);
  });

  it('preservation: minChars still waits for two characters before searching', async () => {
    await mountedBoard();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'B' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(250); });
    expect(fixture.search).not.toHaveBeenCalled();
    expect(screen.queryAllByRole('option')).toEqual([]);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Br' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(250); });
    expect(fixture.search).toHaveBeenCalledTimes(1);
    expect(fixture.search.mock.calls[0][0].query).toBe('Br');
    expect(screen.queryAllByRole('option')).toHaveLength(1);
    expect(context().chain).toEqual(['Álpha']);
    expect(localStorage.getItem(key())).toBeNull();
  });

  it('preservation: normalized start played and longer-path target names stay excluded', async () => {
    await mountedBoard();
    for (const query of ['alpha', 'target']) {
      await search(query);
      expect(screen.queryAllByRole('option')).toEqual([]);
      expect(lastSearch().exclude?.has(normalizeName(query))).toBe(true);
    }
    await search('detour');
    selectCanonical('Detour');
    expect(context().chain).toEqual(['Álpha', 'Detour']);
    const raw = localStorage.getItem(key());
    await search('detour');
    expect(screen.queryAllByRole('option')).toEqual([]);
    expect(lastSearch().exclude?.has(normalizeName('Detour'))).toBe(true);
    expect(context().chain).toEqual(['Álpha', 'Detour']);
    expect(localStorage.getItem(key())).toBe(raw);
  });

  it('preservation: a listed nonteammate is rejected by the actual graph', async () => {
    await mountedBoard();
    await search('outsider');
    selectCanonical('Outsider');
    expect(screen.getByText('Outsider was never at the same club as Álpha in the same season')).toBeTruthy();
    expect(context().chain).toEqual(['Álpha']);
    expect(context().lastRejected).toEqual({ name: 'Outsider', after: 'Álpha' });
    expect(localStorage.getItem(key())).toBeNull();
    expect(fixture.completion).toHaveBeenLastCalledWith('transfer-path', false, 0, 0);
  });

  it('preservation: a normal selected win keeps all synchronous daily writes', async () => {
    await mountedBoard();
    const writes: { guesses: unknown[]; gameStatus: string }[] = [];
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, name: string, value: string) {
      if (name === key()) writes.push(JSON.parse(value));
      nativeSetItem.call(this, name, value);
    });
    await search('bridge');
    selectCanonical('Brídge');
    assertWin();
    expect(writes.map(p => p.gameStatus)).toEqual(['playing', 'playing', 'won']);
    expect(writes.map(p => p.guesses)).toEqual([
      [{ t: 'step', player: 'Brídge', club: 'Club A' }],
      [{ t: 'step', player: 'Brídge', club: 'Club A' }, { t: 'step', player: 'Target', club: 'Club B' }],
      [{ t: 'step', player: 'Brídge', club: 'Club A' }, { t: 'step', player: 'Target', club: 'Club B' }, { t: 'won' }],
    ]);
  });
});
