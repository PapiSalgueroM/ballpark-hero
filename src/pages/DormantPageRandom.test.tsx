import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/game/GameShell', () => ({
  GameShell: ({ headerExtra, children }: { headerExtra?: ReactNode; children: ReactNode }) => <>{headerExtra}{children}</>,
}));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/ResultScreen', () => ({ ResultScreen: () => null }));
vi.mock('@/components/game/RulesGate', () => ({ RulesGate: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/hooks/useDailyPuzzle', () => ({
  useDailyPuzzle: (options: { puzzles: unknown[] }) => ({
    puzzle: options.puzzles[0],
    guesses: [],
    addGuess: vi.fn(),
    gameStatus: 'playing',
    isLoading: false,
  }),
}));

import RankEm from '@/pages/RankEm';
import GuessTheGolfer from '@/pages/GuessTheGolfer';

const SAMPLE = 0.37;

describe('page-level Unlimited selection', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('Rank Em waits for Unlimited, then keeps the sampled NHL goals round', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(SAMPLE);
    render(<RankEm />);

    expect(random).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Unlimited/ }));
    expect(random).toHaveBeenCalledTimes(2);
    expect(screen.getByText('NHL · career goals')).toBeInTheDocument();
    for (const name of ['Alex Ovechkin', 'Wayne Gretzky', 'Jaromír Jágr', 'Brett Hull', 'Steve Yzerman']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole('button', { name: /Daily/ }));
    fireEvent.click(screen.getByRole('button', { name: /Unlimited/ }));
    expect(random).toHaveBeenCalledTimes(2);
    expect(screen.getByText('NHL · career goals')).toBeInTheDocument();
  });

  it('Guess The Golfer waits for Unlimited, then keeps James Braid on re-entry', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(SAMPLE);
    render(<GuessTheGolfer />);

    expect(random).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Unlimited' }));
    expect(random).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Won majors between 1901 and 1910')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Daily' }));
    fireEvent.click(screen.getByRole('button', { name: 'Unlimited' }));
    expect(random).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Won majors between 1901 and 1910')).toBeInTheDocument();
  });
});
