import { useState, useCallback, useEffect } from 'react';
import { F1ConstructorPuzzle, F1ConstructorState, MAX_CLUES, POINTS_BY_CLUE } from '@/types/f1Constructor';
import { getDailyF1ConstructorPuzzle, getRandomF1ConstructorPuzzle, resolveF1Constructor } from '@/data/f1Constructors';
import { getTodayET } from '@/lib/dateUtils';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { readDailyRecord, writeDailyRecord } from '@/lib/dailyRecord';
import { markRestoredFinish } from '@/lib/restoredFinish';

const SLUG = 'f1-constructor';

/* ROUND 428: a finished daily vanished on refresh, and Daily Challenge then
   dealt the same constructor fresh with the answer just shown, so every
   replay recorded a second completion and paid the score again. The daily
   board is kept under f1-constructor-daily-<date> and read back fail closed:
   the puzzle is rebuilt from today's seeded pick rather than trusted from
   the store, and any field out of range drops the whole record. */
function restoreDaily(f: Record<string, unknown>, puzzle: F1ConstructorPuzzle): F1ConstructorState | null {
  const { puzzleId, revealedClues, guesses, gameStatus, score } = f;
  if (puzzleId !== puzzle.id) return null;
  if (typeof revealedClues !== 'number' || !Number.isInteger(revealedClues) || revealedClues < 1 || revealedClues > MAX_CLUES) return null;
  if (!Array.isArray(guesses) || !guesses.every(g => typeof g === 'string')) return null;
  if (gameStatus !== 'playing' && gameStatus !== 'won' && gameStatus !== 'lost') return null;
  if (typeof score !== 'number' || !Number.isFinite(score)) return null;
  return { puzzle, revealedClues, guesses: guesses as string[], gameStatus, score, mode: 'daily' };
}

export function useF1Constructor() {
  const [gameState, setGameState] = useState<F1ConstructorState | null>(null);

  const startGame = useCallback((mode: 'daily' | 'unlimited') => {
    const puzzle = mode === 'daily' ? getDailyF1ConstructorPuzzle() : getRandomF1ConstructorPuzzle();
    if (mode === 'daily') {
      const saved = readDailyRecord(SLUG, getTodayET(), f => restoreDaily(f, puzzle));
      if (saved) {
        /* Restored in a handler after mount, so the completion hook is told
           first that this finish is not a new one (Round 399). */
        if (saved.gameStatus !== 'playing') markRestoredFinish(SLUG);
        setGameState(saved);
        return;
      }
    }
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

    const resolved = resolveF1Constructor(input);
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

  const revealHint = useCallback(() => {
    if (!gameState || gameState.gameStatus !== 'playing' || gameState.revealedClues >= MAX_CLUES) return;
    setGameState(prev => prev ? { ...prev, revealedClues: prev.revealedClues + 1 } : null);
  }, [gameState]);

  const giveUp = useCallback(() => {
    if (!gameState || gameState.gameStatus !== 'playing') return;
    setGameState(prev => prev ? { ...prev, gameStatus: 'lost', score: 0 } : null);
  }, [gameState]);

  const resetGame = useCallback(() => setGameState(null), []);

  const pointsForCurrentClue =
    gameState ? (POINTS_BY_CLUE[gameState.revealedClues - 1] ?? 0) : POINTS_BY_CLUE[0];

  useGameCompletion('f1-constructor', gameState?.gameStatus === 'won' || gameState?.gameStatus === 'lost', gameState?.score ?? 0);

  useEffect(() => {
    if (gameState?.mode !== 'daily') return;
    const { puzzle, revealedClues, guesses, gameStatus, score } = gameState;
    writeDailyRecord(SLUG, getTodayET(), { puzzleId: puzzle.id, revealedClues, guesses, gameStatus, score });
  }, [gameState]);

  return { gameState, startGame, makeGuess, giveUp, revealHint, resetGame, maxClues: MAX_CLUES, pointsForCurrentClue };
}
