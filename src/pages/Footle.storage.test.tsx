import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import Footle from '@/pages/Footle';

vi.mock('@/hooks/useGame', () => ({
  useGame: () => ({
    mode: 'daily',
    switchMode: vi.fn(),
    dailyTier: 'easy',
    difficulty: 'easy',
    changeDifficulty: vi.fn(),
    guesses: [],
    gameStatus: 'playing',
    makeGuess: vi.fn(),
    giveUp: vi.fn(),
    resetGame: vi.fn(),
    availablePlayers: [],
    guessedPlayerNames: [],
    maxGuesses: 8,
    targetPlayer: null,
    isLoading: false,
    isLoadingPool: false,
  }),
}));

vi.mock('@/components/game/GameShell', () => ({
  GameShell: ({ headerExtra, children }: { headerExtra?: ReactNode; children: ReactNode }) => (
    <main>{headerExtra}{children}</main>
  ),
}));
vi.mock('@/components/game/HowToPlayPopover', () => ({
  HowToPlayPopover: ({ title, open, children }: { title: string; open?: boolean; children: ReactNode }) => (
    open ? <section role="dialog" aria-label={title}>{children}</section> : null
  ),
}));
vi.mock('@/components/game/PlayerSearch', () => ({ PlayerSearch: () => null }));
vi.mock('@/components/game/GameBoard', () => ({ GameBoard: () => null }));
vi.mock('@/components/game/ResultScreen', () => ({ ResultScreen: () => null }));
vi.mock('@/components/game/StatTile', () => ({ StatTile: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/GiveUpButton', () => ({ GiveUpButton: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/game/PostGameStats', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));

const RULES_KEY = 'footle-rules-seen';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('Footle first-visit guide storage', () => {
  it.each(['getter', 'read', 'write'] as const)(
    'shows the guide without a page error when the storage %s is denied',
    async (denial) => {
      const denied = vi.fn(() => {
        throw new DOMException('Storage denied', 'SecurityError');
      });
      if (denial === 'getter') {
        vi.spyOn(window, 'localStorage', 'get').mockImplementation(denied);
      } else if (denial === 'read') {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(denied);
      } else {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(denied);
      }

      const windowError = vi.fn((event: ErrorEvent) => event.preventDefault());
      window.addEventListener('error', windowError);
      try {
        render(<Footle />);
        await waitFor(() => {
          expect(screen.getByRole('dialog', { name: 'How to Play Footle' })).toBeVisible();
        });
        expect(denied).toHaveBeenCalled();
        expect(windowError).not.toHaveBeenCalled();
      } finally {
        window.removeEventListener('error', windowError);
      }
    },
  );

  it('opens and records the guide on a healthy first visit', async () => {
    const write = vi.spyOn(Storage.prototype, 'setItem');

    render(<Footle />);

    expect(await screen.findByRole('dialog', { name: 'How to Play Footle' })).toBeVisible();
    expect(write).toHaveBeenCalledWith(RULES_KEY, '1');
    expect(window.localStorage.getItem(RULES_KEY)).toBe('1');
  });

  it('keeps the guide closed when the healthy saved marker exists', async () => {
    window.localStorage.setItem(RULES_KEY, '1');
    const read = vi.spyOn(Storage.prototype, 'getItem');
    const write = vi.spyOn(Storage.prototype, 'setItem');

    render(<Footle />);

    await waitFor(() => expect(read).toHaveBeenCalledWith(RULES_KEY));
    expect(screen.queryByRole('dialog', { name: 'How to Play Footle' })).not.toBeInTheDocument();
    expect(write).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(RULES_KEY)).toBe('1');
  });
});
