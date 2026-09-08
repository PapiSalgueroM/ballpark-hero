import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameHelp', () => ({ GameHelp: () => null }));
vi.mock('@/components/game/GameShell', () => ({
  GameShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/perfect-lineup/GenericLineupBoard', () => ({ default: () => null }));
vi.mock('@/components/transfer-path/TransferPathBoard', () => ({ TransferPathBoard: () => null }));

const boardState = vi.hoisted(() => ({ value: 'initial' }));
vi.mock('@/components/ufc-chain/CombatChainBoard', () => ({
  CombatChainBoard: () => <div data-testid="board-state">{boardState.value}</div>,
}));
vi.mock('@/components/guess-the-nation/GuessTheNationBoard', () => ({
  GuessTheNationBoard: () => <div data-testid="board-state">{boardState.value}</div>,
}));
vi.mock('@/components/quiz-board/QuizBoard', () => ({
  QuizBoard: () => <div data-testid="board-state">{boardState.value}</div>,
}));
vi.mock('@/components/ball-iq/BallIqBoard', () => ({
  BallIqBoard: () => <div data-testid="board-state">{boardState.value}</div>,
}));
vi.mock('@/components/mystery-box/MysteryBoxBoard', () => ({
  MysteryBoxBoard: () => <div data-testid="board-state">{boardState.value}</div>,
}));

import PerfectLineupNba from '@/pages/PerfectLineupNba';
import PerfectLineupF1 from '@/pages/PerfectLineupF1';
import PerfectLineupNhl from '@/pages/PerfectLineupNhl';
import TransferPath from '@/pages/TransferPath';
import UfcChain from '@/pages/UfcChain';
import GuessTheNation from '@/pages/GuessTheNation';
import QuizBoard from '@/pages/QuizBoard';
import BallIq from '@/pages/BallIq';
import MysteryBox from '@/pages/MysteryBox';

const cases = [
  ['/perfect-lineup-nba', PerfectLineupNba],
  ['/perfect-lineup-f1', PerfectLineupF1],
  ['/perfect-lineup-nhl', PerfectLineupNhl],
  ['/transfer-path', TransferPath],
] as const;

const conditionalCases = [
  ['/ufc-chain', UfcChain],
  ['/guess-the-nation', GuessTheNation],
  ['/quiz-board', QuizBoard],
  ['/ball-iq', BallIq],
  ['/mystery-box', MysteryBox],
] as const;

describe('pages missing the shared ending', () => {
  /* GameSeoContent is intentionally absent here. This pins each page's own
     GameNav caller; the built-page walk checks the one-section integration. */
  it.each(cases)('%s adds its explicit Play Next section', (path, Page) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <Page />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('navigation', { name: 'Play next' })).toHaveLength(1);
  });

  it.each(conditionalCases)('%s owns one Play Next section across board states', (path, Page) => {
    for (const state of ['initial', 'later']) {
      boardState.value = state;
      const view = render(
        <MemoryRouter initialEntries={[path]}>
          <Page />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('board-state')).toHaveTextContent(state);
      expect(screen.getAllByRole('navigation', { name: 'Play next' })).toHaveLength(1);
      view.unmount();
    }
  });
});
