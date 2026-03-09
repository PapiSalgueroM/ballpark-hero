import { useState, useCallback } from 'react';
import { F1DriverState, MAX_CLUES, POINTS_BY_CLUE } from '@/types/f1Driver';
import { getDailyF1Puzzle, getRandomF1Puzzle, resolveF1Driver } from '@/data/f1Drivers';

export function useF1Driver() {
  const [gameState, setGameState] = useState<F1DriverState | null>(null);

  const startGame = useCallback((mode: 'daily' | 'unlimited') => {
    const puzzle = mode === 'daily' ? getDailyF1Puzzle() : getRandomF1Puzzle();
    setGameState({
      puzzle,
      revealedClues: 1,
      guesses: [],
      gameStatus: 'playing',
      score: 0,
      mode,
    });
  }, []);

  const makeGuess = useCallback((input: string) => {
    if (!gameState || gameState.gameStatus !== 'playing') return;

    const resolved = resolveF1Driver(input);
    const isCorrect = resolved?.id === gameState.puzzle.id;
    const newGuesses = [...gameState.guesses, input];

    if (isCorrect) {
      const score = POINTS_BY_CLUE[gameState.revealedClues - 1] ?? 0;
      setGameState(prev =>
        prev ? { ...prev, guesses: newGuesses, gameStatus: 'won', score } : null
      );
    } else {
      const newRevealed = gameState.revealedClues + 1;
      const isLost = newRevealed > MAX_CLUES;
      setGameState(prev =>
        prev
          ? {
              ...prev,
              guesses: newGuesses,
              revealedClues: Math.min(newRevealed, MAX_CLUES),
              gameStatus: isLost ? 'lost' : 'playing',
              score: 0,
            }
          : null
      );
    }
  }, [gameState]);

  const resetGame = useCallback(() => setGameState(null), []);

  const pointsForCurrentClue =
    gameState ? (POINTS_BY_CLUE[gameState.revealedClues - 1] ?? 0) : POINTS_BY_CLUE[0];

  return { gameState, startGame, makeGuess, resetGame, maxClues: MAX_CLUES, pointsForCurrentClue };
}
