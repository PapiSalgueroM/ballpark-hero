import { Component, createElement, type ReactNode } from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CareerPlayer } from '@/types/career';
import type { TransferPathPuzzle } from '@/data/transferPathPuzzles';
import { getTodayET } from '@/lib/dateUtils';
import { consumeRestoredFinish } from '@/lib/restoredFinish';

// Synthetic facts isolate route recovery. The actual graph and daily engine run.
const fixture = vi.hoisted(() => {
  const spell = (club: string) => ({ season: '2020-2021', club, goals: 0, assists: 0, appearances: 1, marketValue: 1 });
  const player = (name: string, clubs: string[]) => ({ name, nationality: 'Fixtureland', position: 'CM', career: clubs.map(spell) });
  return {
    players: [
      player('Alpha', ['Club A', 'Club C']),
      player('Bridge', ['Club A', 'Club B']),
      player('Target', ['Club B']),
      player('Detour', ['Club C', 'Club D']),
      player('Long Bridge', ['Club D', 'Club B']),
      player('Other', ['Club E']),
      player('Other Bridge', ['Club E', 'Club F']),
      player('Other Target', ['Club F']),
    ] as CareerPlayer[],
    puzzles: [{ id: 'recovery-a', playerA: 'Alpha', playerB: 'Target', minSteps: 2, hint: 'Use Club A and Club B.' }] as TransferPathPuzzle[],
    fetchPlayers: vi.fn<() => Promise<CareerPlayer[]>>(async () => []),
    fetchPuzzles: vi.fn<() => Promise<TransferPathPuzzle[]>>(async () => []),
    completion: vi.fn(),
  };
});

vi.mock('@/data/careerPlayers', () => ({ careerPlayers: fixture.players }));
vi.mock('@/data/transferPathPuzzles', () => ({ default: fixture.puzzles }));
vi.mock('@/lib/fetchCareerPlayers', () => ({ fetchCareerPlayers: fixture.fetchPlayers }));
vi.mock('@/lib/fetchTransferPathPuzzles', () => ({ fetchTransferPathPuzzles: fixture.fetchPuzzles }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: fixture.completion }));

const hookPath = process.env.TRANSFER_PATH_HOOK;
const { useTransferPath } = hookPath
  ? await import(/* @vite-ignore */ hookPath)
  : await import('@/hooks/useTransferPath');

type View = ReturnType<typeof useTransferPath>;
type Action = { t: 'step'; player: string; club: string } | { t: 'won' } | { t: 'give' };
type Save = { v: number; date: string; puzzleIndex: number; puzzleId: string; guesses: Action[]; gameStatus: string };
const key = () => `transfer-path-daily-${getTodayET()}`;
const nativeSetItem = Storage.prototype.setItem;
let consoleErrors: unknown[][] = [];

class HookBoundary extends Component<{ children: ReactNode; errors: Error[] }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { this.props.errors.push(error); }
  render() { return this.state.failed ? null : this.props.children; }
}

function mountHook() {
  const view: { current: View | null } = { current: null };
  const errors: Error[] = [];
  function Probe() { view.current = useTransferPath(); return null; }
  const rendered = render(createElement(HookBoundary, { errors, children: createElement(Probe) }));
  return { view, errors, unmount: rendered.unmount };
}

async function settled(mounted: ReturnType<typeof mountHook>) {
  await waitFor(() => expect(mounted.errors.length > 0 || (
    mounted.view.current?.isLoading === false && mounted.view.current?.isLoadingPool === false
  )).toBe(true));
}

function trackWrites(failWon = false) {
  const attempts: Save[] = [];
  const successful: string[] = [];
  let rejected = 0;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, name: string, value: string) {
    if (name === key()) {
      const payload = JSON.parse(value) as Save;
      attempts.push(payload);
      if (failWon && rejected === 0 && payload.gameStatus === 'won' && payload.guesses.some(a => a.t === 'won')) {
        expect(successful).toHaveLength(2);
        const prefix = JSON.parse(successful[1]) as Save;
        expect(prefix.guesses).toEqual([
          { t: 'step', player: 'Bridge', club: 'Club A' },
          { t: 'step', player: 'Target', club: 'Club B' },
        ]);
        rejected += 1;
        throw new DOMException('Fixture quota failure on the won write', 'QuotaExceededError');
      }
      nativeSetItem.call(this, name, value);
      successful.push(value);
      return;
    }
    nativeSetItem.call(this, name, value);
  });
  return { attempts, successful, rejected: () => rejected };
}

function assertCaughtTerminalOnly(mounted: ReturnType<typeof mountHook>) {
  for (const error of mounted.errors) {
    expect(error.name, 'only the terminal fromHere crash is owned').toBe('TypeError');
    expect(error.message, 'only the terminal fromHere crash is owned').toMatch(/(?:reading|read).*['"]club['"]/i);
    expect(error.stack, 'the actual hook must cause the terminal crash').toMatch(/useTransferPath(?:\.control)?\.ts/);
  }
}

function assertRecovered(mounted: ReturnType<typeof mountHook>, raw: string, writes: ReturnType<typeof trackWrites>) {
  assertCaughtTerminalOnly(mounted);
  expect(mounted.errors.length ? 'route-error' : mounted.view.current?.status,
    'interrupted win should restore the won view').toBe('won');
  expect(mounted.view.current!.chain).toEqual(['Alpha', 'Bridge', 'Target']);
  expect(mounted.view.current!.connections).toEqual([null, 'Club A', 'Club B']);
  expect(mounted.view.current!.score).toBe(1000);
  expect(mounted.view.current!.moreHelp).toBeNull();
  expect(mounted.view.current!.stranded).toBe(false);
  expect(mounted.view.current!.ruleLocked).toBe(true);
  expect(fixture.completion.mock.calls.length).toBeGreaterThan(0);
  expect(fixture.completion.mock.calls.every(call => call[0] === 'transfer-path' && call[1] === false && call[2] === 0 && call[3] === 0),
    'recovered view must keep completion arguments raw: false, 0, 0').toBe(true);
  expect(localStorage.getItem(key())).toBe(raw);
  expect(writes.attempts).toHaveLength(3);
  expect(writes.successful).toHaveLength(2);
}

async function interruptedOriginal(writes: ReturnType<typeof trackWrites>) {
  const original = mountHook();
  await settled(original);
  expect(original.errors).toEqual([]);
  act(() => { expect(original.view.current!.addPlayer('Bridge')).toEqual({ ok: true, club: 'Club A' }); });
  expect(original.view.current!.status).toBe('won');
  expect(original.view.current!.chain).toEqual(['Alpha', 'Bridge', 'Target']);
  expect(original.view.current!.connections).toEqual([null, 'Club A', 'Club B']);
  expect(original.view.current!.score).toBe(1000);
  expect(fixture.completion).toHaveBeenLastCalledWith('transfer-path', true, 1000, 1);
  expect(writes.attempts.map(p => p.gameStatus)).toEqual(['playing', 'playing', 'won']);
  expect(writes.attempts[2].guesses).toEqual([...writes.attempts[1].guesses, { t: 'won' }]);
  expect(writes.rejected()).toBe(1);
  expect(writes.successful).toHaveLength(2);
  const raw = localStorage.getItem(key())!;
  expect(raw).toBe(writes.successful[1]);
  expect(JSON.parse(raw)).toEqual({
    v: 1, date: getTodayET(), puzzleIndex: 0, puzzleId: 'recovery-a',
    guesses: [{ t: 'step', player: 'Bridge', club: 'Club A' }, { t: 'step', player: 'Target', club: 'Club B' }],
    gameStatus: 'playing',
  });
  original.unmount();
  fixture.completion.mockClear();
  return raw;
}

beforeEach(() => {
  localStorage.clear();
  consumeRestoredFinish('transfer-path');
  fixture.fetchPlayers.mockReset().mockResolvedValue([]);
  fixture.fetchPuzzles.mockReset().mockResolvedValue([]);
  fixture.completion.mockReset();
  consoleErrors = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => { consoleErrors.push(args); });
});

afterEach(() => {
  cleanup();
  // React logs caught render errors too. Reject every diagnostic except this owned cause.
  for (const args of consoleErrors) {
    const text = args.map(a => a instanceof Error ? `${a.message}\n${a.stack}` : String(a)).join(' ');
    expect(text, 'no unrelated render or setup diagnostics').toMatch(/(?:reading|read).*['"]club['"]|above error occurred in the <Probe>|React will try to recreate this component tree/i);
  }
  vi.restoreAllMocks();
});

describe('Transfer Path interrupted daily win view', () => {
  it('interrupted win: reloads an actual quota-interrupted target prefix', async () => {
    const writes = trackWrites(true);
    const raw = await interruptedOriginal(writes);
    const restored = mountHook();
    await settled(restored);
    assertRecovered(restored, raw, writes);
    restored.unmount();
    fixture.completion.mockClear();
    const again = mountHook();
    await settled(again);
    assertRecovered(again, raw, writes);
    again.unmount();
    fixture.completion.mockClear();
    let resolvePuzzles!: (puzzles: TransferPathPuzzle[]) => void;
    fixture.fetchPuzzles.mockImplementation(() => new Promise(resolve => { resolvePuzzles = resolve; }));
    const rebinding = mountHook();
    await waitFor(() => expect(rebinding.view.current?.isLoading).toBe(false));
    expect(rebinding.errors).toEqual([]);
    expect(rebinding.view.current!.isLoadingPool).toBe(true);
    assertRecovered(rebinding, raw, writes);
    await act(async () => { resolvePuzzles([{ id: 'recovery-b', playerA: 'Other', playerB: 'Other Target', minSteps: 2, hint: 'Club E and Club F.' }]); });
    await settled(rebinding);
    expect(rebinding.errors).toEqual([]);
    expect(rebinding.view.current!.puzzle.id).toBe('recovery-b');
    expect(rebinding.view.current!.chain).toEqual(['Other']);
    expect(rebinding.view.current!.connections).toEqual([null]);
    expect(rebinding.view.current!.status).toBe('building');
    expect(rebinding.view.current!.score).toBe(0);
    expect(fixture.completion.mock.calls.every(call => call[1] === false && call[2] === 0 && call[3] === 0)).toBe(true);
    expect(localStorage.getItem(key())).toBe(raw);
    expect(writes.attempts).toHaveLength(3);
    expect(writes.successful).toHaveLength(2);
  });

  it('interrupted win: adopts an actual accepted target prefix from another tab', async () => {
    const writes = trackWrites(true);
    const observer = mountHook();
    await settled(observer);
    const raw = await interruptedOriginal(writes);
    expect(observer.view.current!.status).toBe('building');
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: key(), newValue: raw, storageArea: localStorage })); });
    await settled(observer);
    assertRecovered(observer, raw, writes);
  });

  it('preservation: healthy auto-target wins keep all three synchronous writes', async () => {
    const writes = trackWrites();
    const mounted = mountHook();
    await settled(mounted);
    act(() => { mounted.view.current!.addPlayer('Bridge'); });
    expect(mounted.errors).toEqual([]);
    expect(writes.attempts.map(p => p.guesses)).toEqual([
      [{ t: 'step', player: 'Bridge', club: 'Club A' }],
      [{ t: 'step', player: 'Bridge', club: 'Club A' }, { t: 'step', player: 'Target', club: 'Club B' }],
      [{ t: 'step', player: 'Bridge', club: 'Club A' }, { t: 'step', player: 'Target', club: 'Club B' }, { t: 'won' }],
    ]);
    expect(writes.attempts.map(p => p.gameStatus)).toEqual(['playing', 'playing', 'won']);
    expect(writes.successful).toHaveLength(3);
    expect(localStorage.getItem(key())).toBe(writes.successful[2]);
    expect(mounted.view.current!.status).toBe('won');
    expect(fixture.completion).toHaveBeenLastCalledWith('transfer-path', true, 1000, 1);
  });

  it('preservation: healthy direct wins keep the target and won writes', async () => {
    fixture.fetchPuzzles.mockResolvedValue([{ id: 'recovery-direct', playerA: 'Bridge', playerB: 'Target', minSteps: 1, hint: 'Club B.' }]);
    const writes = trackWrites();
    const mounted = mountHook();
    await settled(mounted);
    expect(mounted.view.current!.puzzle.id).toBe('recovery-direct');
    act(() => { mounted.view.current!.addPlayer('Target'); });
    expect(writes.attempts.map(p => p.guesses)).toEqual([
      [{ t: 'step', player: 'Target', club: 'Club B' }],
      [{ t: 'step', player: 'Target', club: 'Club B' }, { t: 'won' }],
    ]);
    expect(writes.attempts.map(p => p.gameStatus)).toEqual(['playing', 'won']);
    expect(mounted.view.current!.chain).toEqual(['Bridge', 'Target']);
    expect(fixture.completion).toHaveBeenLastCalledWith('transfer-path', true, 1000, 1);
  });

  it('preservation: an unfinished daily restores its head and live guidance', async () => {
    const writes = trackWrites();
    const original = mountHook();
    await settled(original);
    act(() => { original.view.current!.addPlayer('Detour'); });
    const raw = localStorage.getItem(key());
    original.unmount();
    fixture.completion.mockClear();
    const restored = mountHook();
    await settled(restored);
    expect(restored.errors).toEqual([]);
    expect(restored.view.current!.status).toBe('building');
    expect(restored.view.current!.chain).toEqual(['Alpha', 'Detour']);
    expect(restored.view.current!.connections).toEqual([null, 'Club C']);
    expect(restored.view.current!.score).toBe(0);
    expect(restored.view.current!.hint).toContain('From Detour one more man does it');
    expect(restored.view.current!.moreHelp).not.toBeNull();
    expect(fixture.completion).toHaveBeenLastCalledWith('transfer-path', false, 0, 0);
    expect(writes.attempts).toHaveLength(1);
    expect(localStorage.getItem(key())).toBe(raw);
  });

  it('preservation: surrendered dailies restore a loss and zero score', async () => {
    const writes = trackWrites();
    const original = mountHook();
    await settled(original);
    act(() => { original.view.current!.giveUp(); });
    const raw = localStorage.getItem(key());
    original.unmount();
    fixture.completion.mockClear();
    const restored = mountHook();
    await settled(restored);
    expect(restored.errors).toEqual([]);
    expect(restored.view.current!.status).toBe('gaveup');
    expect(restored.view.current!.score).toBe(0);
    expect(restored.view.current!.revealPath?.map(s => s.player)).toEqual(['Alpha', 'Bridge', 'Target']);
    expect(fixture.completion).toHaveBeenLastCalledWith('transfer-path', true, 0, 0);
    expect(consumeRestoredFinish('transfer-path')).toBe(true);
    expect(writes.attempts).toHaveLength(1);
    expect(JSON.parse(raw!).gameStatus).toBe('lost');
    expect(localStorage.getItem(key())).toBe(raw);
  });

  it('preservation: completed raw-won dailies restore their original finish', async () => {
    const writes = trackWrites();
    const original = mountHook();
    await settled(original);
    act(() => { original.view.current!.addPlayer('Bridge'); });
    const raw = localStorage.getItem(key());
    original.unmount();
    fixture.completion.mockClear();
    const restored = mountHook();
    await settled(restored);
    expect(restored.errors).toEqual([]);
    expect(restored.view.current!.status).toBe('won');
    expect(restored.view.current!.chain).toEqual(['Alpha', 'Bridge', 'Target']);
    expect(fixture.completion).toHaveBeenLastCalledWith('transfer-path', true, 1000, 1);
    expect(consumeRestoredFinish('transfer-path')).toBe(true);
    expect(writes.attempts).toHaveLength(3);
    expect(localStorage.getItem(key())).toBe(raw);
  });

  it('preservation: Unlimited wins and resets leave the daily untouched', async () => {
    const writes = trackWrites();
    const mounted = mountHook();
    await settled(mounted);
    act(() => { mounted.view.current!.switchToUnlimited(); });
    act(() => { mounted.view.current!.addPlayer('Bridge'); });
    expect(mounted.view.current!.mode).toBe('unlimited');
    expect(mounted.view.current!.status).toBe('won');
    expect(mounted.view.current!.score).toBe(1000);
    expect(mounted.view.current!.chain).toEqual(['Alpha', 'Bridge', 'Target']);
    expect(fixture.completion).toHaveBeenLastCalledWith('transfer-path', false, 0, 0);
    act(() => { mounted.view.current!.nextPuzzle(); });
    expect(mounted.view.current!.unlimitedIndex).toBe(1);
    expect(mounted.view.current!.status).toBe('building');
    expect(mounted.view.current!.chain).toEqual(['Alpha']);
    expect(mounted.view.current!.score).toBe(0);
    expect(writes.attempts).toEqual([]);
    expect(localStorage.getItem(key())).toBeNull();
  });

  it('preservation: delayed same-index id rebinding clears the old unfinished chain', async () => {
    let resolvePuzzles!: (puzzles: TransferPathPuzzle[]) => void;
    fixture.fetchPuzzles.mockImplementation(() => new Promise(resolve => { resolvePuzzles = resolve; }));
    const writes = trackWrites();
    const mounted = mountHook();
    await waitFor(() => expect(mounted.view.current?.isLoading).toBe(false));
    expect(mounted.view.current!.isLoadingPool).toBe(true);
    act(() => { mounted.view.current!.addPlayer('Detour'); });
    const raw = localStorage.getItem(key());
    await act(async () => { resolvePuzzles([{ id: 'recovery-b', playerA: 'Other', playerB: 'Other Target', minSteps: 2, hint: 'Club E and Club F.' }]); });
    await settled(mounted);
    expect(mounted.errors).toEqual([]);
    expect(mounted.view.current!.puzzle.id).toBe('recovery-b');
    expect(mounted.view.current!.chain).toEqual(['Other']);
    expect(mounted.view.current!.connections).toEqual([null]);
    expect(mounted.view.current!.status).toBe('building');
    expect(mounted.view.current!.score).toBe(0);
    expect(fixture.completion.mock.calls.every(call => call[1] === false && call[2] === 0 && call[3] === 0)).toBe(true);
    expect(writes.attempts).toHaveLength(1);
    expect(localStorage.getItem(key())).toBe(raw);
  });
});
