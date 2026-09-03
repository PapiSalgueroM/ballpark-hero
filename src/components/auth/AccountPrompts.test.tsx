import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <>{children}</> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/integrations/supabase/client', () => {
  const query: Record<string, unknown> = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.then = () => undefined;

  return {
    supabase: {
      from: vi.fn(() => query),
      rpc: vi.fn(() => new Promise(() => undefined)),
      auth: {
        signInWithOAuth: vi.fn(async () => ({ error: null })),
        resetPasswordForEmail: vi.fn(async () => ({ error: null })),
      },
    },
  };
});

vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/game/StreakReminder', () => ({ StreakReminder: () => null }));
vi.mock('@/components/home/PollOfTheDay', () => ({ PollOfTheDay: () => null }));
vi.mock('@/components/layout/ThemeToggle', () => ({ ThemeToggle: () => null }));
vi.mock('@/hooks/useMostPlayed', () => ({ useMostPlayed: () => ({ entries: [], loading: false }) }));
vi.mock('@/hooks/useStreaks', () => ({ useStreaks: () => ({ globalCurrentStreak: 0 }) }));
vi.mock('@/hooks/useGameNavbarStats', () => ({
  useGameNavbarStats: () => ({
    gamesPlayedToday: 0,
    totalPointsToday: 0,
    dailyRank: null,
    currentStreak: 0,
    totalGames: 0,
    loading: false,
  }),
}));
vi.mock('@/hooks/useDailyLegend', () => ({
  useDailyLegend: () => ({
    showCelebration: false,
    streakDays: 0,
    dismissCelebration: vi.fn(),
  }),
}));

import Index from '@/pages/Index';
import { AuthModal } from '@/components/auth/AuthModal';
import { Header } from '@/components/layout/Header';
import { GameNavbar } from '@/components/game/GameNavbar';
import { GuestScoreBanner } from '@/components/game/GuestScoreBanner';

function renderAt(ui: React.ReactNode, path = '/') {
  return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);
}

function normalizedText(container: HTMLElement): string {
  return (container.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('guest account prompts', () => {
  afterEach(() => cleanup());

  it.each([
    ['home', () => renderAt(<Index />)],
    ['signup modal', () => renderAt(<AuthModal isOpen onClose={vi.fn()} defaultTab="signup" />)],
    ['site header', () => renderAt(<Header />, '/soccer-grid')],
    ['game navbar', () => renderAt(<GameNavbar />, '/soccer-grid')],
    ['score banner', () => renderAt(<GuestScoreBanner score={87} />, '/soccer-grid')],
  ])('%s explains the durable account benefits without erasing guest progress', async (_name, renderPrompt) => {
    const { baseElement } = renderPrompt();
    const text = normalizedText(baseElement);

    expect(text).toMatch(/leaderboard name/i);
    expect(text).toMatch(/streaks/i);
    expect(text).toMatch(/across devices/i);
    expect(text).not.toMatch(/only count once|start counting/i);
  });
});
