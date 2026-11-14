import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getTodayET, dailyIndex } from '@/lib/dateUtils';
import { colleges } from '@/data/colleges';
import { useGuessTheCollege } from '@/hooks/useGuessTheCollege';
import { recordCompletion } from '@/lib/completions';
import GuessTheCollege from '@/pages/GuessTheCollege';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null }) }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'tester' }));
vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));

const powerFour = colleges.filter(college => college.conferenceType === 'power4');
const dailySchool = () => powerFour[dailyIndex(getTodayET(), powerFour.length)];
const key = () => `guess-the-college-daily-${getTodayET()}`;
const trail = () => {
  fireEvent.click(screen.getByText('Clue-by-clue recap', { selector: 'summary' }));
  return within(screen.getByRole('list', { name: 'Clue-by-clue recap' })).getAllByRole('listitem').map(row => row.textContent);
};

async function pickSchool(name: string) {
  const search = await screen.findByRole('textbox', { name: 'Type a college name' });
  fireEvent.change(search, { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: new RegExp('^' + name + '\\s+\\(') }));
}

beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
afterEach(cleanup);

describe('Guess the College settled recap', () => {
  it('shows one attempt on the first clue and pays the original Daily score just once', async () => {
    const college = dailySchool();
    const game = render(<GuessTheCollege />);
    await pickSchool(college.name);
    expect(await screen.findByText('1200 points. Solved on clue 1 in 1 try.')).toBeVisible();
    expect(trail()).toEqual([`Clue 1, Vibe. Correct: ${college.name}`]);
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/guess-the-college', 1200, 'tester', 0);
    const receipt = localStorage.getItem(key());
    game.unmount();
    render(<GuessTheCollege />);
    expect(await screen.findByText('1200 points. Solved on clue 1 in 1 try.')).toBeVisible();
    expect(trail()).toEqual([`Clue 1, Vibe. Correct: ${college.name}`]);
    expect(localStorage.getItem(key())).toBe(receipt);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('reconstructs the solved clue and winning college on an old dated receipt without rewriting it', async () => {
    const prior = JSON.stringify({ v: 1, date: getTodayET(), puzzleIndex: dailyIndex(getTodayET(), powerFour.length),
      guesses: [{ t: 'guess', name: 'Wrong School' }, { t: 'skip' }, { t: 'won' }], gameStatus: 'won' });
    localStorage.setItem(key(), prior);
    render(<GuessTheCollege />);
    expect(await screen.findByText('900 points. Solved on clue 3 in 2 tries.')).toBeVisible();
    expect(trail()).toEqual(['Clue 1, Vibe. Miss: Wrong School', 'Clue 2, Region. Skipped', `Clue 3, School Size. Correct: ${dailySchool().name}`]);
    expect(localStorage.getItem(key())).toBe(prior);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('retains the exact accepted Daily alias after restore and records the Daily score if a mode switch follows the guess', async () => {
    const game = renderHook(() => useGuessTheCollege());
    await waitFor(() => expect(game.result.current.isLoading).toBe(false));
    const alias = game.result.current.currentCollege!.mascot;
    act(() => game.result.current.skipClue());
    act(() => {
      game.result.current.submitGuess(alias);
      game.result.current.setMode('unlimited');
    });
    const receipt = localStorage.getItem(key());
    expect(JSON.parse(receipt!).guesses).toEqual([{ t: 'skip' }, { t: 'won', name: alias }]);
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/guess-the-college', 1000, 'tester', 0);
    game.unmount();
    const replay = renderHook(() => useGuessTheCollege());
    await waitFor(() => expect(replay.result.current.won).toBe(true));
    expect(replay.result.current).toMatchObject({ score: 1000, solvedClue: 2, guessHistory: [alias],
      recap: [{ clue: 1, action: 'skip' }, { clue: 2, action: 'solve', name: alias }] });
    expect(localStorage.getItem(key())).toBe(receipt);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it.each(['unlimited', 'conference'] as const)('tracks skips, misses and the accepted guess in %s without a Daily write', async mode => {
    const { result } = renderHook(() => useGuessTheCollege());
    act(() => result.current.setMode(mode));
    if (mode === 'conference') act(() => result.current.setSelectedConference('SEC'));
    await waitFor(() => expect(result.current.currentCollege).not.toBeNull());
    const college = result.current.currentCollege!;
    act(() => result.current.skipClue());
    act(() => result.current.submitGuess('Wrong School'));
    const alias = college.nicknames[0] ?? college.name;
    act(() => result.current.submitGuess(alias));
    expect(result.current).toMatchObject({ score: 900, won: true, solvedClue: 3, guessHistory: ['Wrong School', alias] });
    expect(result.current.recap).toEqual([
      { clue: 1, action: 'skip' }, { clue: 2, action: 'miss', name: 'Wrong School' }, { clue: 3, action: 'solve', name: alias },
    ]);
    expect(localStorage.getItem(key())).toBeNull();
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('replays the last-clue loss at zero without counting skips as attempts', async () => {
    const { result, unmount } = renderHook(() => useGuessTheCollege());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    for (let i = 0; i < 10; i += 1) act(() => result.current.skipClue());
    act(() => result.current.skipClue());
    expect(result.current).toMatchObject({ gameOver: true, won: false, score: 0, solvedClue: null, guessHistory: [] });
    expect(result.current.recap).toHaveLength(11);
    expect(result.current.recap.at(-1)).toEqual({ clue: 11, action: 'give' });
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/guess-the-college', 0, 'tester', 0);
    unmount();
    const replay = renderHook(() => useGuessTheCollege());
    await waitFor(() => expect(replay.result.current.isLoading).toBe(false));
    expect(replay.result.current.recap.at(-1)).toEqual({ clue: 11, action: 'give' });
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });
});
