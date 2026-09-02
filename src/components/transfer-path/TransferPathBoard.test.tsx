import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const transferMocks = vi.hoisted(() => ({
  addPlayer: vi.fn<(name: string) => { ok: boolean; club: string | null; reason?: 'duplicate' }>(),
  nextPuzzle: vi.fn(),
  switchToUnlimited: vi.fn(),
  state: {
    status: 'building' as 'building' | 'won' | 'gaveup',
    mode: 'daily' as 'daily' | 'unlimited',
  },
}));

vi.mock('@/hooks/useTransferPath', () => ({
  useTransferPath: () => ({
    puzzle: { id: 'test-path', playerA: 'Alpha', playerB: 'Target', minSteps: 2, hint: 'Use Bridge.' },
    chain: ['Alpha'],
    connections: [null],
    status: transferMocks.state.status,
    score: 0,
    mode: transferMocks.state.mode,
    unlimitedIndex: 0,
    addPlayer: transferMocks.addPlayer,
    giveUp: vi.fn(),
    revealPath: null,
    switchToUnlimited: transferMocks.switchToUnlimited,
    nextPuzzle: transferMocks.nextPuzzle,
    getAllPlayerNames: () => ['Rejected Player', 'Bridge'],
    getPlayerNationality: () => 'Testland',
    isLoadingPool: false,
    isLoading: false,
  }),
}));

vi.mock('@/components/game/GameShell', () => ({
  GameShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/components/FlagImg', () => ({ FlagImg: () => null }));
vi.mock('@/components/game/ResultScreen', () => ({
  ResultScreen: ({
    onPlayAgain,
    playNext,
  }: {
    onPlayAgain?: () => void;
    playNext?: ReactNode;
  }) => (
    <div>
      {onPlayAgain && <button onClick={onPlayAgain}>Next Puzzle</button>}
      {playNext}
    </div>
  ),
}));
vi.mock('@/components/game/GiveUpButton', () => ({ GiveUpButton: () => null }));
vi.mock('@/components/game/HowToPlayPopover', () => ({
  HowToPlayPopover: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/game/PlayerAutocomplete', () => ({
  PlayerAutocomplete: ({ onSelect }: { onSelect: (entity: { name: string }) => void }) => (
    <div>
      <button onClick={() => onSelect({ name: 'Rejected Player' })}>Try rejected player</button>
      <button onClick={() => onSelect({ name: 'Bridge' })}>Try valid player</button>
    </div>
  ),
}));
vi.mock('@/components/game/ReportQuestion', () => ({
  default: ({ gameContext }: { gameContext: unknown }) => (
    <output data-testid="report-context">{JSON.stringify(gameContext)}</output>
  ),
}));

import { TransferPathBoard } from '@/components/transfer-path/TransferPathBoard';

beforeEach(() => {
  transferMocks.addPlayer.mockReset();
  transferMocks.addPlayer.mockImplementation((name: string) => (
    name === 'Rejected Player'
      ? { ok: false, club: null }
      : { ok: true, club: 'Club A' }
  ));
  transferMocks.nextPuzzle.mockClear();
  transferMocks.switchToUnlimited.mockClear();
  transferMocks.state.status = 'building';
  transferMocks.state.mode = 'daily';
});

describe('Transfer Path report context', () => {
  it('clears an old rejected link after a later guess succeeds', () => {
    render(<TransferPathBoard />);

    fireEvent.click(screen.getByRole('button', { name: 'Try rejected player' }));
    expect(JSON.parse(screen.getByTestId('report-context').textContent ?? '')).toMatchObject({
      lastRejected: { name: 'Rejected Player', after: 'Alpha' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Try valid player' }));
    expect(JSON.parse(screen.getByTestId('report-context').textContent ?? '')).toMatchObject({
      lastRejected: null,
    });
  });

  it('clears an old rejected link when switching from the daily to unlimited puzzle', () => {
    const view = render(<TransferPathBoard />);

    fireEvent.click(screen.getByRole('button', { name: 'Try rejected player' }));
    expect(JSON.parse(screen.getByTestId('report-context').textContent ?? '')).toMatchObject({
      lastRejected: { name: 'Rejected Player', after: 'Alpha' },
    });

    transferMocks.state.status = 'won';
    view.rerender(<TransferPathBoard />);
    fireEvent.click(screen.getByRole('button', { name: 'Play Unlimited' }));

    expect(transferMocks.switchToUnlimited).toHaveBeenCalledTimes(1);
    expect(JSON.parse(screen.getByTestId('report-context').textContent ?? '')).toMatchObject({
      lastRejected: null,
    });
  });

  it('clears an old rejected link before the next unlimited puzzle', () => {
    transferMocks.state.mode = 'unlimited';
    const view = render(<TransferPathBoard />);

    fireEvent.click(screen.getByRole('button', { name: 'Try rejected player' }));
    transferMocks.state.status = 'won';
    view.rerender(<TransferPathBoard />);
    fireEvent.click(screen.getByRole('button', { name: 'Next Puzzle' }));

    expect(transferMocks.nextPuzzle).toHaveBeenCalledTimes(1);
    expect(JSON.parse(screen.getByTestId('report-context').textContent ?? '')).toMatchObject({
      lastRejected: null,
    });
  });
});
