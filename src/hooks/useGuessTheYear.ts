import { useState, useCallback } from 'react';
import { GuessTheYearState, POINTS_BY_CLUE } from '@/types/guessTheYear';
import { getDailyGuessTheYearPuzzle } from '@/data/guessTheYearPuzzles';
import { useGameCompletion } from '@/hooks/useGameCompletion';

const MAX_CLUES = 6;
// min is the earliest puzzle year in guessTheYearPuzzles.ts (1972); it must not
// be later than any puzzle's year or that puzzle becomes unwinnable (the guess
// slider can't reach the answer). Bug fix 2026-07-09: was 1980, which made the
// 1972/1973/1976/1979 puzzles impossible to solve.
const YEAR_RANGE = { min: 1972, max: 2026 };

export function useGuessTheYear() {
  const [gameState, setGameState] = useState<GuessTheYearState>(() => ({
    puzzle: getDailyGuessTheYearPuzzle(),
    revealedClues: 1,
    guesses: [],
    gameStatus: 'playing',
    score: 0,
  }));

  const makeGuess = useCallback((year: number) => {
    if (gameState.gameStatus !== 'playing') return;
    if (year < YEAR_RANGE.min || year > YEAR_RANGE.max) return;

    const isCorrect = year === gameState.puzzle.year;
    const newGuesses = [...gameState.guesses, year];

    if (isCorrect) {
      const score = POINTS_BY_CLUE[gameState.revealedClues - 1] || 100;
      setGameState(prev => ({
        ...prev,
        guesses: newGuesses,
        gameStatus: 'won',
        score,
      }));
    } else {
      // Reveal next clue on wrong guess
      const newRevealedClues = Math.min(gameState.revealedClues + 1, MAX_CLUES);
      const isLost = newRevealedClues >= MAX_CLUES && newGuesses.length >= MAX_CLUES;

      setGameState(prev => ({
        ...prev,
        guesses: newGuesses,
        revealedClues: newRevealedClues,
        gameStatus: isLost ? 'lost' : 'playing',
        score: 0,
      }));
    }
  }, [gameState]);

  const revealNextClue = useCallback(() => {
    if (gameState.gameStatus !== 'playing') return;
    if (gameState.revealedClues >= MAX_CLUES) return;

    setGameState(prev => ({
      ...prev,
      revealedClues: prev.revealedClues + 1,
    }));
  }, [gameState]);

  const giveUp = useCallback(() => {
    if (gameState.gameStatus !== 'playing') return;
    setGameState(prev => ({ ...prev, gameStatus: 'lost', score: 0 }));
  }, [gameState]);

  const resetGame = useCallback(() => {
    setGameState({
      puzzle: getDailyGuessTheYearPuzzle(),
      revealedClues: 1,
      guesses: [],
      gameStatus: 'playing',
      score: 0,
    });
  }, []);

  const getHint = useCallback(() => {
    const { year } = gameState.puzzle;
    const decade = Math.floor(year / 10) * 10;
    return `${decade}s`;
  }, [gameState.puzzle]);

  useGameCompletion('guess-the-year', gameState.gameStatus !== 'playing', gameState.score);

  return {
    gameState,
    makeGuess,
    giveUp,
    revealNextClue,
    resetGame,
    getHint,
    maxClues: MAX_CLUES,
    yearRange: YEAR_RANGE,
    pointsForCurrentClue: POINTS_BY_CLUE[gameState.revealedClues - 1] || 100,
  };
}
