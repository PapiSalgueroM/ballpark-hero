import type { ReactNode } from 'react';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Footle from '@/pages/Footle';
import { compareGuess } from '@/lib/gameLogic';
import type { Player } from '@/types/game';
import type { useGame } from '@/hooks/useGame';

const fixture = vi.hoisted(() => ({ game: null as ReturnType<typeof useGame> | null }));
vi.mock('@/hooks/useGame', () => ({ useGame: () => fixture.game, footleScore: () => 0, FOOTLE_SCORE_BUCKETS: [] }));
vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ headerExtra, children }: { headerExtra: ReactNode; children: ReactNode }) => <main>{headerExtra}{children}</main> }));
vi.mock('@/components/game/HowToPlayPopover', () => ({ HowToPlayPopover: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/game/PostGameStats', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));

const targets: Record<'daily' | 'unlimited', Player> = {
  daily: { name: 'Fixture Daily Forward', club: 'Fixture Club', nationality: 'Norway', league: 'Other', goals: 3, assists: 1, position: 'ST', kitNumber: null, age: 22, marketValue: 216, difficulty: 'easy' },
  unlimited: { name: 'Fixture Unlimited Defender', club: 'Fixture Club', nationality: 'Argentina', league: 'Other', goals: 3, assists: 1, position: 'CB', kitNumber: null, age: 22, marketValue: 54, difficulty: 'easy' },
};

function state(mode: 'daily' | 'unlimited', gameStatus: 'playing' | 'won' | 'lost'): ReturnType<typeof useGame> {
  const targetPlayer = targets[mode];
  const guessPlayers = Array.from({ length: gameStatus === 'playing' ? 1 : 8 }, (_, index) =>
    gameStatus === 'won' && index === 7 ? targetPlayer : { ...targetPlayer, name: `Fixture guess ${index}` });
  const guesses = guessPlayers.map(guess => compareGuess(guess, targetPlayer));
  return {
    mode, gameStatus, targetPlayer, guesses, dailyTier: 'easy', difficulty: 'easy', maxGuesses: 8,
    switchMode: vi.fn(), changeDifficulty: vi.fn(), makeGuess: vi.fn(), giveUp: vi.fn(), resetGame: vi.fn(),
    availablePlayers: [targetPlayer], guessedPlayerNames: guesses.map(guess => guess.playerName), isLoading: false, isLoadingPool: false,
    practiceRun: null, practiceSaveFailed: false, practiceComplete: false, practiceReady: false,
    startPractice: vi.fn(), advancePractice: vi.fn(), examplePlayer: undefined,
    unlimitedSession: { v: 1, active: mode === 'unlimited', tier: 'easy', decks: { easy: {
      pool: [targetPlayer, ...guessPlayers.filter(player => player.name !== targetPlayer.name)],
      seen: [targetPlayer.name.toLowerCase()],
      current: { target: targetPlayer.name, guesses: guesses.map(guess => guess.playerName), status: gameStatus },
    } } },
    unlimitedSaveFailed: false, unlimitedRemaining: 8, unlimitedPaused: false, reshuffleUnlimited: vi.fn(),
  };
}

beforeEach(() => { localStorage.clear(); localStorage.setItem('footle-rules-seen', '1'); vi.clearAllMocks(); });
afterEach(() => cleanup());

describe('Footle result currency follows the stored USD value', () => {
  it.each([
    ['daily', 'won', '$216M'], ['daily', 'lost', '$216M'],
    ['unlimited', 'won', '$54M'], ['unlimited', 'lost', '$54M'],
  ] as const)('%s %s result retains %s and matches its guess tiles', (mode, outcome, amount) => {
    fixture.game = state(mode, outcome);
    const original = JSON.stringify(fixture.game.targetPlayer);
    const view = render(<Footle />);
    const result = view.getByRole('status');
    expect(result).toHaveTextContent(outcome === 'won' ? 'Correct!' : 'Game Over');
    expect(result).toHaveTextContent(`valued at ${amount}.`);
    expect(result).not.toHaveTextContent('€');
    const history = within(view.getByRole('group', { name: 'Guess history' })).getAllByRole('button');
    expect(history).toHaveLength(8);
    for (const button of history) {
      fireEvent.click(button);
      const clueDesk = view.container.querySelector('[data-footle-clue-desk]') as HTMLElement;
      expect(clueDesk.querySelector('[data-clue="marketValue"] dd')).toHaveTextContent(amount);
      expect(within(clueDesk).getAllByText(amount)).toHaveLength(1);
    }
    expect(JSON.stringify(fixture.game.targetPlayer)).toBe(original);
    expect(within(result).queryByRole('button', { name: 'Play Again' })).toBeNull();
    if (mode === 'daily') expect(within(result).queryByRole('button', { name: 'Next puzzle' })).toBeNull();
    else expect(within(result).getByRole('button', { name: 'Next puzzle' })).toBeEnabled();
  });

  it('keeps the answer value concealed during play while the original USD guess tile stays visible', () => {
    fixture.game = state('daily', 'playing');
    const view = render(<Footle />);
    expect(view.getByText('$216M')).toBeVisible();
    expect(view.queryByRole('status')).toBeNull();
    expect(view.queryByText(/valued at/)).toBeNull();
    expect(fixture.game.targetPlayer?.marketValue).toBe(216);
  });
});
