import { useState, useCallback, useMemo, useEffect } from 'react';
import shirtNumberPuzzles, { type ShirtNumberPuzzle } from '@/data/shirtNumberPuzzles';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { fetchShirtNumberPuzzles } from '@/lib/fetchShirtNumberPuzzles';

// Internal guess record — stores correctness so isWon doesn't need puzzle access
type ShirtGuess = { guess: number; correct: boolean };

export type ShirtNumberMode = 'daily' | 'unlimited';

export interface ShirtNumberState {
  puzzle: ShirtNumberPuzzle | null;
  attempts: number[];
  maxAttempts: number;
  status: 'playing' | 'won' | 'lost';
  score: number;
  hint: 'higher' | 'lower' | null;
  mode: ShirtNumberMode;
  isLoading: boolean;
  isLoadingPool: boolean;
  submitGuess: (n: number) => void;
  switchToUnlimited: () => void;
  nextPuzzle: () => void;
  unlimitedIndex: number;
}

const MAX_ATTEMPTS = 3;
const SCORES = [1000, 600, 200];

export function useShirtNumber(): ShirtNumberState {
  // ---- PUZZLE POOL ----------------------------------------------------------
  // Starts as the hardcoded fallback. Replaced by Supabase data once the async
  // fetch completes. isLoadingPool gates the UI until the pool is ready.
  const [puzzlePool, setPuzzlePool] = useState<ShirtNumberPuzzle[]>(shirtNumberPuzzles);
  const [isLoadingPool, setIsLoadingPool] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchShirtNumberPuzzles().then(pool => {
      if (cancelled) return;
      if (pool.length > 0) setPuzzlePool(pool);
      // On empty result (error path) puzzlePool stays as hardcoded fallback
      setIsLoadingPool(false);
    });
    return () => { cancelled = true; };
  }, []);

  // ---- MODE -----------------------------------------------------------------
  const [mode, setMode] = useState<ShirtNumberMode>('daily');

  // ---- DAILY: useDailyPuzzle -----------------------------------------------
  // Replaces the old custom getDateSeed + localStorage logic.
  // Fixes the UTC-vs-ET timezone bug as a side effect.
  const {
    puzzle: dailyPuzzle,
    guesses: dailyGuesses,
    addGuess: addDailyGuess,
    gameStatus: dailyStatus,
    isLoading: isDailyLoading,
  } = useDailyPuzzle<ShirtNumberPuzzle, ShirtGuess>({
    gameSlug: 'shirt-number',
    puzzles: puzzlePool,
    maxGuesses: MAX_ATTEMPTS,
    isWon: (gs) => gs.some(g => g.correct),
    deserializeGuesses: (raw) => raw as ShirtGuess[],
  });

  // ---- UNLIMITED: local state (not persisted) --------------------------------
  const [unlimitedIndex, setUnlimitedIndex] = useState(0);
  const [unlimitedAttempts, setUnlimitedAttempts] = useState<number[]>([]);
  const [unlimitedStatus, setUnlimitedStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [unlimitedScore, setUnlimitedScore] = useState(0);
  const [unlimitedHint, setUnlimitedHint] = useState<'higher' | 'lower' | null>(null);

  const unlimitedPuzzle = useMemo(() => {
    return puzzlePool[unlimitedIndex % puzzlePool.length];
  }, [unlimitedIndex, puzzlePool]);

  // ---- ACTIVE VALUES (mode-switched) ----------------------------------------
  const puzzle      = mode === 'daily' ? dailyPuzzle   : unlimitedPuzzle;
  const rawGuesses  = mode === 'daily' ? dailyGuesses  : [];
  const status      = mode === 'daily' ? dailyStatus   : unlimitedStatus;
  const isLoading   = mode === 'daily' ? isDailyLoading : false;

  // Expose attempts as number[] to keep ShirtNumberBoard interface unchanged
  const attempts = mode === 'daily'
    ? dailyGuesses.map(g => g.guess)
    : unlimitedAttempts;

  // Hint: derived from last guess vs puzzle.kitNumber
  const hint: 'higher' | 'lower' | null = useMemo(() => {
    if (mode === 'unlimited') return unlimitedHint;
    if (status !== 'playing' || rawGuesses.length === 0) return null;
    const last = rawGuesses[rawGuesses.length - 1];
    if (last.correct) return null;
    return (puzzle?.kitNumber ?? 0) > last.guess ? 'higher' : 'lower';
  }, [mode, status, rawGuesses, puzzle, unlimitedHint]);

  // Score: computed from guess count at completion
  const score = useMemo(() => {
    if (mode === 'unlimited') return unlimitedScore;
    if (status !== 'won') return 0;
    return SCORES[dailyGuesses.length - 1] ?? 200;
  }, [mode, status, dailyGuesses, unlimitedScore]);

  // ---- COMPLETION -----------------------------------------------------------
  const isComplete = status === 'won' || status === 'lost';
  useGameCompletion('shirt-number', isComplete && mode === 'daily', score);

  // ---- CALLBACKS ------------------------------------------------------------

  const submitGuess = useCallback((n: number) => {
    if (status !== 'playing' || !puzzle) return;
    const correct = n === puzzle.kitNumber;

    if (mode === 'daily') {
      addDailyGuess({ guess: n, correct });
    } else {
      const newAttempts = [...unlimitedAttempts, n];
      setUnlimitedAttempts(newAttempts);
      if (correct) {
        const s = SCORES[newAttempts.length - 1] ?? 200;
        setUnlimitedScore(s);
        setUnlimitedStatus('won');
        setUnlimitedHint(null);
      } else if (newAttempts.length >= MAX_ATTEMPTS) {
        setUnlimitedStatus('lost');
        setUnlimitedScore(0);
        setUnlimitedHint(null);
      } else {
        setUnlimitedHint(puzzle.kitNumber > n ? 'higher' : 'lower');
      }
    }
  }, [status, puzzle, mode, addDailyGuess, unlimitedAttempts]);

  const switchToUnlimited = useCallback(() => {
    setMode('unlimited');
    setUnlimitedAttempts([]);
    setUnlimitedStatus('playing');
    setUnlimitedScore(0);
    setUnlimitedHint(null);
    setUnlimitedIndex(0);
  }, []);

  const nextPuzzle = useCallback(() => {
    setUnlimitedIndex(i => i + 1);
    setUnlimitedAttempts([]);
    setUnlimitedStatus('playing');
    setUnlimitedScore(0);
    setUnlimitedHint(null);
  }, []);

  return {
    puzzle,
    attempts,
    maxAttempts: MAX_ATTEMPTS,
    status,
    score,
    hint,
    mode,
    isLoading,
    isLoadingPool,
    submitGuess,
    switchToUnlimited,
    nextPuzzle,
    unlimitedIndex,
  };
}
