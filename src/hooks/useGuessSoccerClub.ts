import { useState, useCallback } from 'react';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import {
  GuessSoccerClubState,
  GameMode,
  POINTS_BY_CLUE,
} from '@/types/guessSoccerClub';
import {
  getDailySoccerClubPuzzle,
  getRandomSoccerClubPuzzle,
  resolvePuzzleByName,
} from '@/data/soccerClubPuzzles';

export const MAX_CLUES = 5;

export function useGuessSoccerClub() {
  const [gameState, setGameState] = useState<GuessSoccerClubState | null>(null);

  const startGame = useCallback((mode: GameMode, leagueFilter?: string) => {
    const puzzle =
      mode === 'daily'
        ? getDailySoccerClubPuzzle()
        : getRandomSoccerClubPuzzle(leagueFilter);

    setGameState({
      puzzle,
      revealedClues: 1,
      guesses: [],
      gameStatus: 'playing',
      score: 0,
      mode,
      leagueFilter,
    });
  }, []);

  const makeGuess = useCallback(
    (input: string) => {
      if (!gameState || gameState.gameStatus !== 'playing') return;

      const resolved = resolvePuzzleByName(input);
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
    },
    [gameState]
  );

  const giveUp = useCallback(() => {
    if (!gameState || gameState.gameStatus !== 'playing') return;
    setGameState(prev => prev ? { ...prev, gameStatus: 'lost', score: 0 } : null);
  }, [gameState]);

  const resetGame = useCallback(() => setGameState(null), []);

  const pointsForCurrentClue =
    gameState ? (POINTS_BY_CLUE[gameState.revealedClues - 1] ?? 0) : POINTS_BY_CLUE[0];

  useGameCompletion('guess-soccer-club', gameState?.gameStatus === 'won' || gameState?.gameStatus === 'lost', gameState?.score ?? 0);

  return {
    gameState,
    startGame,
    makeGuess,
    giveUp,
    resetGame,
    maxClues: MAX_CLUES,
    pointsForCurrentClue,
  };
}
