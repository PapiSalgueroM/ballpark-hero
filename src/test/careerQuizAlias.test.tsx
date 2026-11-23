import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { careerPlayers } from '@/data/careerPlayers';
import { useCareerGame } from '@/hooks/useCareerGame';
import { getTodayET } from '@/lib/dateUtils';
import { fetchCareerPlayers } from '@/lib/fetchCareerPlayers';
import type { CareerPlayer } from '@/types/career';

vi.mock('@/lib/fetchCareerPlayers', () => ({ fetchCareerPlayers: vi.fn() }));
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));

const keeper = (name: string) => careerPlayers.find(player => player.name === name)!;
const alisson = keeper('Alisson');
const becker = keeper('Alisson Becker');
const dailyKey = () => `career-path-daily-${getTodayET()}`;

async function openQuiz(pool: CareerPlayer[]) {
  vi.mocked(fetchCareerPlayers).mockResolvedValue(pool);
  const quiz = renderHook(useCareerGame);
  await waitFor(() => expect(quiz.result.current.isLoadingPool).toBe(false));
  return quiz;
}

beforeEach(() => localStorage.clear());

describe('Career Quiz Alisson guesses', () => {
  it.each([
    { target: { ...alisson, id: 'a0000001-0000-0000-0000-000000000040' }, guess: '  ALISSON BECKER  ' },
    { target: { ...becker, id: 'a0000001-0000-0000-0000-000000000066' }, guess: '  alisson  ' },
  ])('accepts "$guess" and saves the original daily puzzle ID for $target.name', async ({ target, guess }) => {
    const quiz = await openQuiz([target]);
    expect(quiz.result.current.targetPlayer.name).toBe(target.name);

    act(() => expect(quiz.result.current.makeGuess(guess)).toBe(true));
    expect(quiz.result.current.gameStatus).toBe('won');
    expect(quiz.result.current.guessesUsed).toBe(1);
    const raw = localStorage.getItem(dailyKey());
    expect(JSON.parse(raw!)).toMatchObject({ v: 1, puzzleId: target.name, guesses: [{ t: 'won' }], gameStatus: 'won' });

    quiz.unmount();
    const restored = await openQuiz([target]);
    expect(restored.result.current.gameStatus).toBe('won');
    expect(localStorage.getItem(dailyKey())).toBe(raw);
  });

  it.each([
    { target: alisson, guess: 'Alisson Becker' },
    { target: becker, guess: 'Alisson' },
  ])('accepts "$guess" in unlimited play for $target.name', async ({ target, guess }) => {
    const { result } = await openQuiz([target]);
    act(() => result.current.switchMode('unlimited'));
    act(() => result.current.resetGame());
    const before = localStorage.getItem(dailyKey());
    expect(result.current.targetPlayer.name).toBe(target.name);

    act(() => expect(result.current.makeGuess(guess)).toBe(true));
    expect(result.current.gameStatus).toBe('won');
    expect(result.current.guessesUsed).toBe(1);
    expect(localStorage.getItem(dailyKey())).toBe(before);
  });

  it('rejects a different live player with the alternate name', async () => {
    const other = { ...becker, id: 'fixture-namesake' };
    const { result } = await openQuiz([alisson, other]);
    act(() => result.current.switchMode('unlimited'));
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      act(() => result.current.resetGame());
    } finally {
      random.mockRestore();
    }
    expect(result.current.targetPlayer.name).toBe('Alisson');

    act(() => expect(result.current.makeGuess('Alisson Becker')).toBe(false));
    expect(result.current.gameStatus).toBe('playing');
    expect(result.current.guessesUsed).toBe(1);
    act(() => expect(result.current.makeGuess('  ALISSON ')).toBe(true));
    expect(result.current.gameStatus).toBe('won');
  });
});
