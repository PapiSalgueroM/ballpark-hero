import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { useHockeyHL } from '@/hooks/useHockeyHL';
import HockeyHigherLower from '@/pages/HockeyHigherLower';

const record = vi.hoisted(() => vi.fn());
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: record, getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/components/game/GameShell', () => ({
  GameShell: ({ children, headerExtra }: { children: ReactNode; headerExtra: ReactNode }) => <main>{headerExtra}{children}</main>,
}));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/PostGameStats', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/game/ResultScreen', () => ({
  ResultScreen: ({ headline, onPlayAgain }: { headline: string; onPlayAgain?: () => void }) => (
    <><h2>{headline}</h2>{onPlayAgain && <button onClick={onPlayAgain}>Play Again</button>}</>
  ),
}));

const saveKey = 'hockey-hl-daily-2026-10-01';
const recap = () => screen.queryByText('Review matchups', { selector: 'summary' });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-01T16:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(.01234);
  localStorage.clear();
  localStorage.setItem('hkhl-rules-seen', '1');
  record.mockReset();
});
afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Hockey Higher or Lower matchups after play', () => {
  it.each(['daily', 'unlimited'] as const)('shows the exact completed %s matchups', mode => {
    const oracle = renderHook(useHockeyHL);
    if (mode === 'unlimited') act(() => oracle.result.current.switchMode('unlimited'));
    const lastAnswer = 9;
    for (let round = 0; round <= lastAnswer; round++) {
      const [left, right] = oracle.result.current.currentPair!;
      act(() => oracle.result.current.makeGuess(round % 2 === 0 ? 'left' : 'right'));
      act(() => vi.advanceTimersByTime(2000));
      expect(oracle.result.current.results[round].player1).toBe(left);
      expect(oracle.result.current.results[round].player2).toBe(right);
    }
    const expected = oracle.result.current.results;
    const dailySave = localStorage.getItem(saveKey);
    oracle.unmount();
    localStorage.removeItem(saveKey);
    record.mockReset();

    const page = render(<HockeyHigherLower />);
    if (mode === 'unlimited') fireEvent.click(screen.getByRole('button', { name: 'Unlimited' }));
    expect(recap()).toBeNull();
    for (let round = 0; round <= lastAnswer; round++) {
      const pick = round % 2 === 0 ? expected[round].player1 : expected[round].player2;
      fireEvent.click(screen.getByRole('button', { name: new RegExp(pick.name, 'i') }));
      expect(recap()).toBeNull();
      act(() => vi.advanceTimersByTime(2000));
    }

    const checkRecap = () => {
      const summary = screen.getByText('Review matchups', { selector: 'summary' });
      const details = summary.closest('details')!;
      expect(details).not.toHaveAttribute('open');
      details.open = true;
      const rows = within(details).getAllByRole('listitem');
      expect(rows).toHaveLength(10);
      for (const [round, row] of rows.entries()) {
        const result = expected[round];
        expect(row).toHaveTextContent(result.correct ? 'Correct' : 'Missed');
        for (const player of [result.player1, result.player2]) {
          expect(row).toHaveTextContent(player.name);
          expect(row).toHaveTextContent(new Intl.NumberFormat('en-US').format(player.careerPoints) + ' pts');
          expect(row).toHaveTextContent(player.lastSeason === 'unverified' ? 'season not confirmed' : 'through ' + player.lastSeason);
        }
      }
    };
    checkRecap();
    expect(localStorage.getItem(saveKey)).toBe(dailySave);
    if (mode === 'daily') {
      page.unmount();
      render(<HockeyHigherLower />);
      checkRecap();
      expect(record).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem(saveKey)).toBe(dailySave);
    } else {
      fireEvent.click(screen.getByRole('button', { name: 'Play Again' }));
      expect(recap()).toBeNull();
      expect(record).not.toHaveBeenCalled();
    }
  });
});
