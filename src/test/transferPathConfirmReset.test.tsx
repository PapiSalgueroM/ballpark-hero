import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { CareerPlayer } from '@/types/career';
import type { TransferPathPuzzle } from '@/data/transferPathPuzzles';
import type { PlayerEntity, SearchPlayersOptions, SearchPlayersResult } from '@/lib/playerSearch';
import { getTodayET } from '@/lib/dateUtils';
import { consumeRestoredFinish } from '@/lib/restoredFinish';

// Fictional pools isolate round identity. Board, hook, graph, daily engine and confirmation are real.
const fixture = vi.hoisted(() => {
  const spell = (club: string) => ({ season: '2020-2021', club, goals: 0, assists: 0, appearances: 1, marketValue: 1 });
  const player = (name: string, clubs: string[]) => ({ name, nationality: 'Fixtureland', position: 'CM', career: clubs.map(spell) });
  const players = ['Amber', 'Birch', 'Cedar'].flatMap(stem => [
    player(`${stem} Start`, [`${stem} A`]), player(`${stem} One`, [`${stem} A`, `${stem} B`]),
    player(`${stem} Two`, [`${stem} B`, `${stem} C`]), player(`${stem} Target`, [`${stem} C`]),
  ]) as CareerPlayer[];
  const puzzles = ['Amber', 'Birch', 'Cedar'].map(stem => {
    const hint = { minSteps: 3, hint: `${stem} A to ${stem} C.` };
    return { id: `confirm-${stem.toLowerCase()}`, playerA: `${stem} Start`, playerB: `${stem} Target`, ...hint,
      active: stem === 'Birch' ? null : hint, europe: stem === 'Birch' ? null : hint };
  }) as TransferPathPuzzle[];
  return {
    players, puzzles,
    fetchPuzzles: vi.fn<() => Promise<TransferPathPuzzle[]>>(async () => []),
    search: vi.fn<(options: SearchPlayersOptions) => Promise<SearchPlayersResult>>(),
    completion: vi.fn(),
  };
});

vi.mock('@/data/careerPlayers', () => ({ careerPlayers: fixture.players }));
vi.mock('@/data/transferPathPuzzles', () => ({ default: fixture.puzzles }));
vi.mock('@/lib/fetchCareerPlayers', () => ({ fetchCareerPlayers: vi.fn(async () => []) }));
vi.mock('@/lib/fetchTransferPathPuzzles', () => ({ fetchTransferPathPuzzles: fixture.fetchPuzzles }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: fixture.completion }));
vi.mock('@/lib/dateUtils', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/dateUtils')>(), getTodayET: () => '2026-10-12',
}));
// These are fictional fixture memberships and club countries, not real-person claims.
vi.mock('@/data/transferPathVerifiedActive', async () => {
  const { transferPathIdentityKey } = await vi.importActual<typeof import('@/lib/transferPathIdentity')>('@/lib/transferPathIdentity');
  const keys = fixture.players.filter(p => !p.name.startsWith('Birch')).map(p => transferPathIdentityKey(p.name, p.nationality));
  return { VERIFIED_ACTIVE_IDENTITY_KEYS: keys, VERIFIED_ACTIVE_IDENTITIES: new Set(keys) };
});
vi.mock('@/lib/careerLadder', () => ({ flagForClub: (club: string) => club.startsWith('Birch') ? '🇧🇷' : '🇫🇷' }));
vi.mock('@/lib/playerSearch', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/playerSearch')>();
  return { ...actual, searchPlayers: (options: SearchPlayersOptions) => fixture.search(options) };
});
vi.mock('@/components/game/GameShell', () => ({
  GameShell: ({ headerExtra, children }: { headerExtra?: ReactNode; children: ReactNode }) => <main>{headerExtra}{children}</main>,
}));
vi.mock('@/components/game/ResultScreen', () => ({
  ResultScreen: ({ headline, statLine, playNext, onPlayAgain, playAgainLabel }: {
    headline: string; statLine?: ReactNode; playNext?: ReactNode; onPlayAgain?: () => void; playAgainLabel: string;
  }) => <section><h2>{headline}</h2>{statLine}{playNext}{onPlayAgain && <button onClick={onPlayAgain}>{playAgainLabel}</button>}</section>,
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
const context = () => JSON.parse(screen.getByTestId('report').textContent!);
const yes = () => screen.queryAllByRole('button', { name: 'Yes, reveal it' });
const neutral = () => screen.queryAllByRole('button', { name: 'Give up and see a path' });

async function mountBoard(stem = 'Cedar', chain = [`${stem} Start`]) {
  const mounted = render(<TransferPathBoard />);
  await screen.findByTestId('report');
  expect(context().puzzleId).toBe(`confirm-${stem.toLowerCase()}`);
  expect(context().chain).toEqual(chain);
  return mounted;
}

async function choose(name: string) {
  fireEvent.change(screen.getByRole('combobox'), { target: { value: name } });
  await screen.findByRole('option');
  const offered = screen.queryAllByRole('option');
  expect(offered).toHaveLength(1);
  expect(offered[0].querySelector('span.text-sm.font-medium')?.textContent).toBe(name);
  fireEvent.click(offered[0]);
  await waitFor(() => expect(context().chain).toContain(name));
}

function arm() {
  expect(neutral()).toHaveLength(1);
  fireEvent.click(neutral()[0]);
  expect(yes()).toHaveLength(1);
  expect(screen.queryAllByRole('button', { name: 'Keep playing' })).toHaveLength(1);
}

function assertRound(stem: string, rule: string, index = 0) {
  expect(context().puzzleId).toBe(`confirm-${stem.toLowerCase()}`);
  expect(context().rule).toBe(rule);
  expect(context().chain).toEqual([`${stem} Start`]);
  expect(screen.getByRole('combobox')).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Connected!' })).toBeNull();
  expect(screen.getByText(new RegExp(`Unlimited #${index + 1}`))).toBeTruthy();
}

async function winDaily() {
  await choose('Cedar One');
  expect(context().chain).toEqual(['Cedar Start', 'Cedar One']);
  await choose('Cedar Two');
  expect(screen.getByRole('heading', { name: 'Connected!' })).toBeTruthy();
  expect(screen.getByText('1000 pts')).toBeTruthy();
  expect(context().chain).toEqual(['Cedar Start', 'Cedar One', 'Cedar Two', 'Cedar Target']);
  expect(fixture.completion).toHaveBeenLastCalledWith('transfer-path', true, 1000, 1);
}

async function unlimitedClassic() {
  await mountBoard();
  await winDaily();
  const raw = localStorage.getItem(key())!;
  fireEvent.click(screen.getByRole('button', { name: 'Play Unlimited' }));
  assertRound('Birch', 'classic');
  fixture.completion.mockClear();
  return raw;
}

function dailyFinishHeld(raw: string) {
  expect(localStorage.getItem(key())).toBe(raw);
  expect(fixture.completion.mock.calls.length).toBeGreaterThan(0);
  expect(fixture.completion.mock.calls.every(call => call[0] === 'transfer-path' && call[1] === true && call[2] === 1000 && call[3] === 1)).toBe(true);
}

beforeEach(() => {
  localStorage.clear();
  consumeRestoredFinish('transfer-path');
  fixture.fetchPuzzles.mockReset().mockResolvedValue([]);
  fixture.completion.mockReset();
  fixture.search.mockReset().mockImplementation(async options => ({
    results: fixture.players.filter(p => normalizeName(p.name).includes(normalizeName(options.query)) && !options.exclude?.has(normalizeName(p.name)))
      .map(p => ({ key: normalizeName(p.name), rawName: p.name, name: p.name, meta: {}, matchRank: 0, prominence: 1 } as PlayerEntity)),
    error: null,
  }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Transfer Path confirmation belongs to its current round', () => {
  it('confirm reset: clears pending daily confirmation after an actual rule change', async () => {
    await mountBoard();
    arm();
    fireEvent.click(screen.getByRole('button', { name: 'Active players only' }));
    expect(context().rule).toBe('active');
    expect(context().puzzleId).toBe('confirm-cedar');
    expect(context().chain).toEqual(['Cedar Start']);
    expect(screen.getByRole('button', { name: 'Active players only' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('combobox')).toBeTruthy();
    expect(localStorage.getItem(key())).toBeNull();
    expect(yes()).toHaveLength(0);
    expect(neutral()).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Keep playing' })).toBeNull();
    expect(fixture.completion).toHaveBeenLastCalledWith('transfer-path', false, 0, 0);
  });

  it('confirm reset: clears pending Unlimited confirmation when a rule change replaces the pair', async () => {
    const raw = await unlimitedClassic();
    await choose('Birch One');
    expect(context().chain).toEqual(['Birch Start', 'Birch One']);
    arm();
    fireEvent.click(screen.getByRole('button', { name: 'Active players only' }));
    assertRound('Cedar', 'active');
    expect(localStorage.getItem(key())).toBe(raw);
    expect(yes()).toHaveLength(0);
    expect(neutral()).toHaveLength(1);
    dailyFinishHeld(raw);
  });

  it('confirm reset: clears pending Unlimited confirmation when a rule change keeps the pair', async () => {
    const raw = await unlimitedClassic();
    fireEvent.click(screen.getByRole('button', { name: 'Active players only' }));
    assertRound('Cedar', 'active');
    await choose('Cedar One');
    expect(context().chain).toEqual(['Cedar Start', 'Cedar One']);
    arm();
    fireEvent.click(screen.getByRole('button', { name: 'Europe only' }));
    assertRound('Cedar', 'europe');
    expect(localStorage.getItem(key())).toBe(raw);
    expect(yes()).toHaveLength(0);
    expect(neutral()).toHaveLength(1);
    dailyFinishHeld(raw);
  });

  it('preservation: same-rule noops and blocked daily rules keep confirmation armed', async () => {
    const mounted = await mountBoard();
    arm();
    fireEvent.click(screen.getByRole('button', { name: 'Everyday' }));
    expect(yes()).toHaveLength(1);
    expect(context().rule).toBe('classic');
    expect(localStorage.getItem(key())).toBeNull();
    mounted.unmount();
    fixture.fetchPuzzles.mockResolvedValue([fixture.puzzles[1], fixture.puzzles[0]]);
    await mountBoard('Birch');
    arm();
    fireEvent.click(screen.getByRole('button', { name: 'Active players only' }));
    expect(screen.getByRole('button', { name: 'Active players only' })).toHaveAttribute('aria-pressed', 'true');
    expect(context().rule).toBe('classic');
    expect(context().chain).toEqual(['Birch Start']);
    expect(yes()).toHaveLength(1);
    expect(localStorage.getItem(key())).toBeNull();
    expect(fixture.completion).toHaveBeenLastCalledWith('transfer-path', false, 0, 0);
  });

  it('preservation: Keep playing cancels without changing the daily', async () => {
    await mountBoard();
    arm();
    fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }));
    expect(yes()).toHaveLength(0);
    expect(neutral()).toHaveLength(1);
    expect(context().chain).toEqual(['Cedar Start']);
    expect(screen.getByRole('combobox')).toBeTruthy();
    expect(localStorage.getItem(key())).toBeNull();
    expect(fixture.completion).toHaveBeenLastCalledWith('transfer-path', false, 0, 0);
  });

  it('preservation: a fresh confirmed daily surrender writes one real give action', async () => {
    await mountBoard();
    arm();
    fireEvent.click(yes()[0]);
    expect(screen.getByText("Here's a path that works")).toBeTruthy();
    expect(screen.getByText('Cedar One')).toBeTruthy();
    expect(screen.getByText('Cedar Two')).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(yes()).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem(key())!)).toEqual({
      v: 1, date: getTodayET(), puzzleIndex: 2, puzzleId: 'confirm-cedar', guesses: [{ t: 'give' }], gameStatus: 'lost',
    });
    expect(fixture.completion).toHaveBeenLastCalledWith('transfer-path', true, 0, 0);
  });

  it('preservation: a started daily disables rule changes and keeps its confirmation', async () => {
    await mountBoard();
    await choose('Cedar One');
    const raw = localStorage.getItem(key());
    arm();
    for (const name of ['Everyday', 'Active players only', 'Europe only']) expect(screen.getByRole('button', { name })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Active players only' }));
    expect(context().rule).toBe('classic');
    expect(context().chain).toEqual(['Cedar Start', 'Cedar One']);
    expect(yes()).toHaveLength(1);
    expect(localStorage.getItem(key())).toBe(raw);
    expect(fixture.completion).toHaveBeenLastCalledWith('transfer-path', false, 0, 0);
  });

  it('preservation: ordinary surrender and win Next transitions unmount confirmation', async () => {
    const raw = await unlimitedClassic();
    arm();
    fireEvent.click(yes()[0]);
    expect(screen.getByText("Here's a path that works")).toBeTruthy();
    expect(yes()).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Next Puzzle' }));
    assertRound('Cedar', 'classic', 1);
    expect(neutral()).toHaveLength(1);
    expect(yes()).toHaveLength(0);
    await choose('Cedar One');
    await choose('Cedar Two');
    expect(screen.getByRole('heading', { name: 'Connected!' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next Puzzle' }));
    assertRound('Amber', 'classic', 2);
    expect(neutral()).toHaveLength(1);
    expect(yes()).toHaveLength(0);
    dailyFinishHeld(raw);
  });

  it('preservation: healthy wins keep synchronous writes and exact restored bytes', async () => {
    const mounted = await mountBoard();
    const writes: { guesses: unknown[]; gameStatus: string }[] = [];
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, name: string, value: string) {
      if (name === key()) writes.push(JSON.parse(value));
      nativeSetItem.call(this, name, value);
    });
    await winDaily();
    expect(writes.map(p => p.gameStatus)).toEqual(['playing', 'playing', 'playing', 'won']);
    expect(writes.map(p => p.guesses.length)).toEqual([1, 2, 3, 4]);
    const raw = localStorage.getItem(key())!;
    expect(JSON.parse(raw)).toEqual({
      v: 1, date: getTodayET(), puzzleIndex: 2, puzzleId: 'confirm-cedar',
      guesses: [{ t: 'step', player: 'Cedar One', club: 'Cedar A' }, { t: 'step', player: 'Cedar Two', club: 'Cedar B' },
        { t: 'step', player: 'Cedar Target', club: 'Cedar C' }, { t: 'won' }], gameStatus: 'won',
    });
    mounted.unmount();
    await mountBoard('Cedar', ['Cedar Start', 'Cedar One', 'Cedar Two', 'Cedar Target']);
    expect(screen.getByRole('heading', { name: 'Connected!' })).toBeTruthy();
    expect(screen.getByText('1000 pts')).toBeTruthy();
    expect(consumeRestoredFinish('transfer-path')).toBe(true);
    expect(localStorage.getItem(key())).toBe(raw);
    expect(writes).toHaveLength(4);
  });
});
