import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useGuessTheCollege } from '@/hooks/useGuessTheCollege';
import { getTodayET } from '@/lib/dateUtils';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));

const storageKey = () => 'guess-the-college-daily-' + getTodayET();

beforeEach(() => localStorage.clear());

it('counts a first-try Daily win as one correct guess for 1200 points', () => {
  const { result } = renderHook(useGuessTheCollege);
  const answer = result.current.currentCollege!.name;

  act(() => result.current.submitGuess(answer));

  expect(result.current.won).toBe(true);
  expect(result.current.score).toBe(1200);
  expect(result.current.guessHistory).toEqual([answer]);
  expect(result.current.getShareText()).toContain('in 1 try');
});

it('restores the winner after the wrong guess from the existing Daily log', () => {
  const { result, unmount } = renderHook(useGuessTheCollege);
  const answer = result.current.currentCollege!.name;
  const wrong = answer === 'University of Alabama' ? 'University of Michigan' : 'University of Alabama';

  act(() => result.current.submitGuess(wrong));
  act(() => result.current.submitGuess(answer));

  const stored = localStorage.getItem(storageKey());
  expect(JSON.parse(stored!).guesses).toEqual([{ t: 'guess', name: wrong }, { t: 'won' }]);
  expect(result.current.score).toBe(1000);

  unmount();
  const restored = renderHook(useGuessTheCollege);
  expect(restored.result.current.guessHistory).toEqual([wrong, answer]);
  expect(restored.result.current.score).toBe(1000);
  expect(localStorage.getItem(storageKey())).toBe(stored);
});

it('charges points for a skipped clue without counting it as an answer attempt', () => {
  const { result } = renderHook(useGuessTheCollege);
  const answer = result.current.currentCollege!.name;

  act(() => result.current.skipClue());
  act(() => result.current.submitGuess(answer));

  expect(result.current.score).toBe(1000);
  expect(result.current.guessHistory).toEqual([answer]);
});
