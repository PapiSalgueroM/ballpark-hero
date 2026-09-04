import { useState, useCallback, useEffect, useRef } from 'react';
import { GuessTheYearState, POINTS_BY_CLUE, YearPuzzle } from '@/types/guessTheYear';
import { getDailyGuessTheYearPuzzle } from '@/data/guessTheYearPuzzles';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { getTodayET } from '@/lib/dateUtils';
import { readDailyRecord, writeDailyRecord } from '@/lib/dailyRecord';

const MAX_CLUES = 6;
// min is the earliest puzzle year in guessTheYearPuzzles.ts (1972); it must not
// be later than any puzzle's year or that puzzle becomes unwinnable (the guess
// slider can't reach the answer). Bug fix 2026-07-09: was 1980, which made the
// 1972/1973/1976/1979 puzzles impossible to solve.
const YEAR_RANGE = { min: 1972, max: 2026 };
const SLUG = 'guess-the-year';

type SavedProgress = Omit<GuessTheYearState, 'puzzle'>;

/* Round 428: the day's board, kept in localStorage and restored inside the
   useState initializer below, so a finished daily is finished on the very
   first render (no completion mark needed, the recorder sees no transition)
   and a refresh can no longer deal the same puzzle again with the answer
   known. Fail closed on shape, not just on parse: sweepSaves feeds this key
   garbage, and a revealedClues outside 1..MAX_CLUES would index
   POINTS_BY_CLUE to undefined and print NaN pts. The saved year has to match
   today's puzzle, so a record written against a different puzzle list is
   dropped rather than trusted. */
function loadDaily(today: string, puzzle: YearPuzzle): SavedProgress | null {
  return readDailyRecord<SavedProgress>(SLUG, today, f => {
    const { year, revealedClues, guesses, gameStatus, score } = f;
    if (year !== puzzle.year) return null;
    if (typeof revealedClues !== 'number' || !Number.isInteger(revealedClues) || revealedClues < 1 || revealedClues > MAX_CLUES) return null;
    if (!Array.isArray(guesses) || guesses.length > MAX_CLUES || !guesses.every(g => Number.isInteger(g))) return null;
    if (gameStatus !== 'playing' && gameStatus !== 'won' && gameStatus !== 'lost') return null;
    if (typeof score !== 'number' || !Number.isFinite(score)) return null;
    return { revealedClues, guesses: guesses as number[], gameStatus, score };
  });
}

export function useGuessTheYear() {
  const todayStr = useRef(getTodayET()).current;
  const [gameState, setGameState] = useState<GuessTheYearState>(() => {
    const puzzle = getDailyGuessTheYearPuzzle();
    const saved = loadDaily(todayStr, puzzle);
    return {
      puzzle,
      revealedClues: saved?.revealedClues ?? 1,
      guesses: saved?.guesses ?? [],
      gameStatus: saved?.gameStatus ?? 'playing',
      score: saved?.score ?? 0,
    };
  });

  useEffect(() => {
    writeDailyRecord(SLUG, todayStr, {
      year: gameState.puzzle.year,
      revealedClues: gameState.revealedClues,
      guesses: gameState.guesses,
      gameStatus: gameState.gameStatus,
      score: gameState.score,
    });
  }, [gameState, todayStr]);

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
    getHint,
    maxClues: MAX_CLUES,
    yearRange: YEAR_RANGE,
    pointsForCurrentClue: POINTS_BY_CLUE[gameState.revealedClues - 1] || 100,
  };
}
