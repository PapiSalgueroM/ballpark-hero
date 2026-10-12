import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import type { TransferPathState } from '@/hooks/useTransferPath';

/* Board wiring only. The hook, paths and rules are fixtures, with no real
   sports claim. The autocomplete and surrender confirmation render for real. */
const calls = {
  giveUp: vi.fn().mockName('giveUp'),
  switchToUnlimited: vi.fn().mockName('switchToUnlimited'),
  nextPuzzle: vi.fn().mockName('nextPuzzle'),
};
function initialState(): TransferPathState {
  return {
    puzzle: { id: 'fixture-daily', playerA: 'Fixture Start', playerB: 'Fixture Target', minSteps: 2, hint: 'Fixture hint.' },
    chain: ['Fixture Start'], connections: [null], status: 'building', score: 0,
    mode: 'daily', unlimitedIndex: 0, isLoading: false, isLoadingPool: false,
    rule: 'classic', activeRule: 'classic', ruleLocked: false, dailyRuleBlocked: false,
    ruleAvailability: { classic: 1, active: 1, europe: 1 }, optimal: 2,
    hint: 'Fixture hint.', stranded: false,
    moreHelp: { doors: { total: 1, onRoute: 1, byClub: [], intoTotal: 1, into: [] }, lines: ['Fixture help line.'] },
    revealPath: null, setRule: () => {}, addPlayer: () => ({ ok: false, club: null }),
    giveUp: () => {}, switchToUnlimited: () => {}, nextPuzzle: () => {},
    getAllPlayerNames: () => ['Fixture Start', 'Fixture Middle', 'Fixture Target'],
    getPlayerNationality: () => '', getPlayerClubs: () => new Set<string>(),
  };
}
let state = initialState();
const reveal = [
  { player: 'Fixture Start', club: null },
  { player: 'Fixture Middle', club: 'Fixture Club' },
  { player: 'Fixture Target', club: 'Fixture Club' },
];
vi.mock('@/hooks/useTransferPath', () => ({
  useTransferPath: () => {
    const [, refresh] = useState(0);
    const update = () => refresh(n => n + 1);
    const rebuild = () => {
      state = { ...state, status: 'building', score: 0, chain: ['Fixture Start'], connections: [null], revealPath: null };
      update();
    };
    return {
      ...state,
      giveUp: () => { calls.giveUp(); state = { ...state, status: 'gaveup', ruleLocked: true, revealPath: reveal }; update(); },
      switchToUnlimited: () => { calls.switchToUnlimited(); state = { ...state, mode: 'unlimited', ruleLocked: false }; rebuild(); },
      nextPuzzle: () => { calls.nextPuzzle(); state = { ...state, unlimitedIndex: state.unlimitedIndex + 1 }; rebuild(); },
    };
  },
}));
vi.mock('@/lib/playerSearch', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/playerSearch')>(),
  searchPlayers: vi.fn(async () => ({ results: [], error: null })),
}));
vi.mock('@/components/game/GameShell', () => ({
  GameShell: ({ headerExtra, children }: { headerExtra?: ReactNode; children: ReactNode }) => <div>{headerExtra}{children}</div>,
}));
vi.mock('@/components/game/ResultScreen', () => ({ ResultScreen: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({
  default: ({ gameContext }: { gameContext: Record<string, unknown> }) => <pre data-testid="report">{JSON.stringify(gameContext)}</pre>,
}));
const boardPath = process.env.TRANSFER_PATH_BOARD;
const { TransferPathBoard } = boardPath
  ? await import(/* @vite-ignore */ boardPath)
  : await import('@/components/transfer-path/TransferPathBoard');
const report = () => JSON.parse(screen.getByTestId('report').textContent!);

beforeEach(() => { state = initialState(); Object.values(calls).forEach(call => call.mockClear()); });
afterEach(() => cleanup());

async function openSearchAndHelp() {
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'zzzz' } });
  await waitFor(() => expect(report().lastNoMatch).toBe('zzzz'));
  fireEvent.click(screen.getByRole('button', { name: 'Show hint' }));
  fireEvent.click(screen.getByRole('button', { name: 'More help' }));
  expect(screen.getByText('Fixture help line.')).toBeTruthy();
}
function surrender() {
  fireEvent.click(screen.getByRole('button', { name: 'Give up and see a path' }));
  expect(calls.giveUp).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Yes, reveal it' }));
  expect(calls.giveUp).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Here's a path that works")).toBeTruthy();
  expect(screen.queryByRole('combobox')).toBeNull();
}
function expectFreshBoard() {
  expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe('');
  expect(screen.queryByText("Here's a path that works")).toBeNull();
  expect(screen.getByRole('button', { name: 'Show hint' })).toBeTruthy();
  expect(screen.queryByText('Fixture help line.')).toBeNull();
  expect(screen.queryByRole('button', { name: 'More help' })).toBeNull();
  expect(report().lastNoMatch).toBeNull();
  expect(report().chain).toEqual(['Fixture Start']);
  fireEvent.click(screen.getByRole('button', { name: 'Show hint' }));
  expect(screen.getByRole('button', { name: 'More help' })).toBeTruthy();
  expect(screen.queryByText('Fixture help line.')).toBeNull();
}

describe('Transfer Path surrender continuation', () => {
  it.each(['classic', 'active', 'europe'] as const)('daily surrender: enters practice under %s', async rule => {
    state.rule = rule; state.activeRule = rule;
    render(<TransferPathBoard />);
    await openSearchAndHelp();
    surrender();
    expect(screen.queryAllByRole('button', { name: 'Play Unlimited' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Play Unlimited' }));
    expect(calls.switchToUnlimited).toHaveBeenCalledTimes(1);
    expect(calls.nextPuzzle).not.toHaveBeenCalled();
    expect(report().rule).toBe(rule);
    expect(screen.getByText(/Unlimited #1/)).toBeTruthy();
    expectFreshBoard();
  });

  it('preservation: Keep playing cancels surrender without changing the board', async () => {
    render(<TransferPathBoard />);
    await openSearchAndHelp();
    fireEvent.click(screen.getByRole('button', { name: 'Give up and see a path' }));
    expect(screen.getByText('Give up and see the answer?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }));
    expect(calls.giveUp).not.toHaveBeenCalled();
    expect(calls.switchToUnlimited).not.toHaveBeenCalled();
    expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe('zzzz');
    expect(screen.getByText('Fixture help line.')).toBeTruthy();
    expect(report().lastNoMatch).toBe('zzzz');
    expect(screen.queryByText("Here's a path that works")).toBeNull();
  });

  it('preservation: a building daily has guess controls and no practice exit', () => {
    render(<TransferPathBoard />);
    expect(screen.getByRole('combobox')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Give up and see a path' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Play Unlimited' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Next Puzzle' })).toBeNull();
  });

  it('preservation: an unlimited surrender advances with Next Puzzle and clears board state', async () => {
    state.mode = 'unlimited';
    render(<TransferPathBoard />);
    await openSearchAndHelp();
    surrender();
    expect(screen.queryByRole('button', { name: 'Play Unlimited' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Next Puzzle' }));
    expect(calls.nextPuzzle).toHaveBeenCalledTimes(1);
    expect(calls.switchToUnlimited).not.toHaveBeenCalled();
    expect(screen.getByText(/Unlimited #2/)).toBeTruthy();
    expectFreshBoard();
  });

  it('preservation: restored surrender state renders its reveal without guess controls', () => {
    state.status = 'gaveup'; state.revealPath = reveal;
    const view = render(<TransferPathBoard />);
    view.rerender(<TransferPathBoard />);
    expect(screen.getByText("Here's a path that works")).toBeTruthy();
    expect(screen.getByText('Fixture Middle')).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Give up and see a path' })).toBeNull();
    expect(calls.giveUp).not.toHaveBeenCalled();
  });

  it('preservation: the loading boundary exposes neither guesses nor continuation', () => {
    state.isLoadingPool = true;
    render(<TransferPathBoard />);
    expect(screen.getByText(/Loading Transfer Path/)).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Play Unlimited' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Next Puzzle' })).toBeNull();
  });
});
