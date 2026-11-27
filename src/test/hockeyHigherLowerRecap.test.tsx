import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { useHockeyHL } from '@/hooks/useHockeyHL';
import HockeyHigherLower from '@/pages/HockeyHigherLower';
import { hockeyHLPlayers } from '@/data/hockeyHLPlayers';
import { HockeyMissPractice } from '@/components/hockey-hl/HockeyMissPractice';

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
const practiceKey = 'dukb-hockey-hl-unlimited-v1';
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
  it('keeps a correct pick and a miss across mode switches and reload in the middle of a reveal', () => {
    const first = renderHook(useHockeyHL);
    const dailyPair = first.result.current.currentPair;
    act(() => first.result.current.makeGuess('left'));
    const dailyBytes = localStorage.getItem(saveKey);
    act(() => first.result.current.toggleHard());
    const firstPair = first.result.current.currentPair!;
    expect(firstPair[0].careerPoints).not.toBe(firstPair[1].careerPoints);
    act(() => first.result.current.makeGuess(firstPair[0].careerPoints > firstPair[1].careerPoints ? 'left' : 'right'));
    expect(first.result.current.showingResult).toBe(true);
    first.unmount();

    const second = renderHook(useHockeyHL);
    expect(second.result.current.mode).toBe('unlimited');
    expect(second.result.current.hard).toBe(true);
    expect(second.result.current.currentRound).toBe(1);
    expect(second.result.current.totalScore).toBe(10);
    expect(second.result.current.results).toEqual([{ player1: firstPair[0], player2: firstPair[1], correct: true }]);
    const secondPair = second.result.current.currentPair!;
    expect(secondPair[0].careerPoints).not.toBe(secondPair[1].careerPoints);
    act(() => second.result.current.makeGuess(secondPair[0].careerPoints < secondPair[1].careerPoints ? 'left' : 'right'));
    act(() => second.result.current.switchMode('daily'));
    expect(second.result.current.currentPair).not.toEqual(dailyPair);
    expect(localStorage.getItem(saveKey)).toBe(dailyBytes);
    second.unmount();

    const third = renderHook(useHockeyHL);
    expect(third.result.current.mode).toBe('daily');
    act(() => third.result.current.switchMode('unlimited'));
    expect(third.result.current.currentRound).toBe(2);
    expect(third.result.current.totalScore).toBe(10);
    expect(third.result.current.streak).toBe(0);
    expect(third.result.current.results.map(result => result.correct)).toEqual([true, false]);
    expect(third.result.current.results[1]).toEqual({ player1: secondPair[0], player2: secondPair[1], correct: false });
    expect(third.result.current.showingResult).toBe(false);
    expect(localStorage.getItem(saveKey)).toBe(dailyBytes);
    expect(localStorage.getItem(practiceKey)).not.toBeNull();
    expect(record).not.toHaveBeenCalled();
  });

  it('keeps the current practice when Unlimited is already selected and resets only on New run', () => {
    render(<HockeyHigherLower />);
    const unlimited = screen.getByRole('button', { name: 'Unlimited' });
    fireEvent.click(unlimited);
    fireEvent.click(screen.getAllByRole('button', { name: /Higher\?/ })[0]);
    act(() => vi.advanceTimersByTime(2000));
    const resumed = localStorage.getItem(practiceKey);
    expect(JSON.parse(resumed!).answers).toHaveLength(1);
    fireEvent.click(unlimited);
    expect(localStorage.getItem(practiceKey)).toBe(resumed);
    fireEvent.click(screen.getByRole('button', { name: 'New run' }));
    expect(JSON.parse(localStorage.getItem(practiceKey)!).answers).toEqual([]);
    expect(localStorage.getItem(saveKey)).toBeNull();
    expect(record).not.toHaveBeenCalled();
  });

  it('settles two taps in the same reveal only once and explains the streak points', () => {
    const hook = renderHook(useHockeyHL);
    for (let round = 0; round < 3; round++) {
      const [left, right] = hook.result.current.currentPair!;
      const pick = left.careerPoints >= right.careerPoints ? 'left' : 'right';
      const guess = hook.result.current.makeGuess;
      act(() => { guess(pick); guess(pick); });
      act(() => vi.advanceTimersByTime(2000));
      expect(hook.result.current.currentRound).toBe(round + 1);
    }
    expect(hook.result.current.totalScore).toBe(45);
  });

  it('credits either player in a tied matchup and keeps perfect runs out of practice', () => {
    const [first, second] = hockeyHLPlayers;
    const perfect = [{ player1: first, player2: second, correct: true }];
    render(<HockeyMissPractice results={perfect} />);
    expect(screen.queryByText('Practice your misses')).toBeNull();
    for (const side of ['left', 'right'] as const) {
      localStorage.removeItem(saveKey);
      const session = renderHook(useHockeyHL);
      const [a, b] = session.result.current.currentPair!;
      expect(a.careerPoints).not.toBe(b.careerPoints);
      const original = b.careerPoints;
      try {
        b.careerPoints = a.careerPoints;
        act(() => session.result.current.makeGuess(side));
        act(() => vi.advanceTimersByTime(2000));
        expect(session.result.current.totalScore).toBe(10);
        expect(session.result.current.streak).toBe(1);
      } finally {
        b.careerPoints = original;
        session.unmount();
      }
    }
  });

  it('starts on Daily when the old practice seed names a different player pool', () => {
    const first = renderHook(useHockeyHL);
    act(() => first.result.current.switchMode('unlimited'));
    act(() => first.result.current.makeGuess('left'));
    const prior = JSON.parse(localStorage.getItem(practiceKey)!);
    first.unmount();
    prior.pool = -1;
    const suspect = JSON.stringify(prior);
    localStorage.setItem(practiceKey, suspect);
    const second = renderHook(useHockeyHL);
    expect(second.result.current.mode).toBe('daily');
    expect(localStorage.getItem(practiceKey)).toBe(suspect);
    act(() => second.result.current.switchMode('unlimited'));
    expect(second.result.current.currentRound).toBe(0);
    expect(JSON.parse(localStorage.getItem(practiceKey)!).answers).toEqual([]);
  });

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
    const callsBeforeDrill = record.mock.calls.length;
    const book = new Set(expected.flatMap(({ player1, player2 }) => [player1.name, player2.name]));
    const missed = expected.filter(result => !result.correct);
    expect(missed.length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Practice your misses' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Practice your misses' }));
    const fresh = new Set<string>();
    for (const [i, miss] of missed.entries()) {
      const cards = dialog.getAllByRole('button').filter(b => b.textContent !== 'Close');
      expect(cards).toHaveLength(2);
      const players = cards.map(b => hockeyHLPlayers.find(p => b.textContent!.startsWith(p.name))!);
      const challenger = players.filter(p => !book.has(p.name));
      expect(challenger).toHaveLength(1);
      expect(fresh.has(challenger[0].name)).toBe(false);
      fresh.add(challenger[0].name);
      expect(players.filter(p => p === miss.player1 || p === miss.player2)).toHaveLength(1);
      const winningSide = players[0].careerPoints >= players[1].careerPoints ? 0 : 1;
      fireEvent.click(cards[winningSide]);
      fireEvent.click(cards[1 - winningSide]);
      for (const p of players) expect(dialog.getByText(`${p.careerPoints.toLocaleString('en-US')} pts`)).toBeInTheDocument();
      fireEvent.click(dialog.getByRole('button', { name: i === missed.length - 1 ? 'Finish practice' : 'Next matchup' }));
    }
    expect(dialog.getByText(`${missed.length} of ${missed.length} practice matchups correct`)).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Back to results' }));
    expect(record).toHaveBeenCalledTimes(callsBeforeDrill);
    expect(localStorage.getItem(saveKey)).toBe(dailySave);
    if (mode === 'daily') {
      page.unmount();
      render(<HockeyHigherLower />);
      checkRecap();
      expect(record).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem(saveKey)).toBe(dailySave);
    } else {
      expect(localStorage.getItem(practiceKey)).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Play Again' }));
      expect(recap()).toBeNull();
      expect(JSON.parse(localStorage.getItem(practiceKey)!).answers).toEqual([]);
      expect(record).not.toHaveBeenCalled();
    }
  });
});
