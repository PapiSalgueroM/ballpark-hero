import { useState, useCallback, useEffect, useMemo } from 'react';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import {
  GuessSoccerClubState,
  GameMode,
  POINTS_BY_CLUE,
  SoccerClubPuzzle,
} from '@/types/guessSoccerClub';
import { soccerClubPuzzles } from '@/data/soccerClubPuzzles';
import { fetchSoccerClubPuzzles } from '@/lib/fetchSoccerClubPuzzles';
import { getTodayET, dateSeed } from '@/lib/dateUtils';

export const MAX_CLUES = 5;

export function useGuessSoccerClub() {
  // ── Pool state (Supabase fetch, falls back to hardcoded soccerClubPuzzles) ──
  const [puzzlePool, setPuzzlePool]       = useState<SoccerClubPuzzle[]>(soccerClubPuzzles);
  const [isLoadingPool, setIsLoadingPool] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchSoccerClubPuzzles().then(pool => {
      if (cancelled) return;
      if (pool.length > 0) setPuzzlePool(pool);
      setIsLoadingPool(false);
    });
    return () => { cancelled = true; };
  }, []);

  // ── allClubNames: flat sorted list of fullName + all aliases, for autocomplete ──
  const allClubNames = useMemo(
    () =>
      Array.from(
        new Set(puzzlePool.flatMap(p => [p.fullName, ...p.commonNames]))
      ).sort(),
    [puzzlePool]
  );

  // ── Hook-internal helpers (closures over puzzlePool, replace module-level imports) ──
  const resolvePuzzleByName = useCallback(
    (input: string): SoccerClubPuzzle | undefined => {
      const lower = input.toLowerCase().trim();
      return puzzlePool.find(
        p =>
          p.fullName.toLowerCase() === lower ||
          p.commonNames.some(alias => alias.toLowerCase() === lower)
      );
    },
    [puzzlePool]
  );

  const getDailyPuzzle = useCallback((): SoccerClubPuzzle => {
    // UTC-safe: all users share same rollover at midnight ET
    const idx = dateSeed(getTodayET()) % puzzlePool.length;
    return puzzlePool[idx];
  }, [puzzlePool]);

  const getRandomPuzzle = useCallback(
    (leagueFilter?: string): SoccerClubPuzzle => {
      let pool = puzzlePool;
      if (leagueFilter) pool = pool.filter(p => p.league === leagueFilter);
      if (!pool.length) pool = puzzlePool;
      return pool[Math.floor(Math.random() * pool.length)];
    },
    [puzzlePool]
  );

  // ── Game state ────────────────────────────────────────────────────────────────
  const [gameState, setGameState] = useState<GuessSoccerClubState | null>(null);

  const startGame = useCallback(
    (mode: GameMode, leagueFilter?: string) => {
      const puzzle = mode === 'daily' ? getDailyPuzzle() : getRandomPuzzle(leagueFilter);
      setGameState({
        puzzle,
        revealedClues: 1,
        guesses: [],
        gameStatus: 'playing',
        score: 0,
        mode,
        leagueFilter,
      });
    },
    [getDailyPuzzle, getRandomPuzzle]
  );

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
    [gameState, resolvePuzzleByName]
  );

  const giveUp = useCallback(() => {
    if (!gameState || gameState.gameStatus !== 'playing') return;
    setGameState(prev => prev ? { ...prev, gameStatus: 'lost', score: 0 } : null);
  }, [gameState]);

  const resetGame = useCallback(() => setGameState(null), []);

  const pointsForCurrentClue =
    gameState ? (POINTS_BY_CLUE[gameState.revealedClues - 1] ?? 0) : POINTS_BY_CLUE[0];

  useGameCompletion(
    'guess-soccer-club',
    gameState?.gameStatus === 'won' || gameState?.gameStatus === 'lost',
    gameState?.score ?? 0
  );

  return {
    gameState,
    startGame,
    makeGuess,
    giveUp,
    resetGame,
    maxClues: MAX_CLUES,
    pointsForCurrentClue,
    allClubNames,
    isLoadingPool,
  };
}
