import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { getTodayET } from '@/lib/dateUtils';
import { fetchTransferValuePool, TransferValuePlayer } from '@/lib/fetchTransferValuePool';

export const MAX_GUESSES = 6;
/** Win threshold: guess within this fractional distance of true value. */
export const WIN_THRESHOLD = 0.05;

export interface ValueGuess {
  value: number;            // user's guess in USD
  direction: 'higher' | 'lower' | 'exact'; // true value is X relative to guess
  pctOff: number;           // |guess - true| / true
  isCorrect: boolean;       // within WIN_THRESHOLD
}

export type Mode = 'daily' | 'unlimited';

function evaluate(guess: number, truth: number): ValueGuess {
  const diff = truth - guess;
  const pctOff = Math.abs(diff) / truth;
  const isCorrect = pctOff <= WIN_THRESHOLD;
  return {
    value: guess,
    direction: isCorrect ? 'exact' : diff > 0 ? 'higher' : 'lower',
    pctOff,
    isCorrect,
  };
}

export function useGuessTransferValue() {
  const [mode, setMode] = useState<Mode>('daily');
  const [pool, setPool] = useState<TransferValuePlayer[]>([]);
  const [isLoadingPool, setIsLoadingPool] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchTransferValuePool().then(p => {
      if (cancelled) return;
      setPool(p);
      setIsLoadingPool(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Daily puzzle — date-seeded across full pool
  const {
    puzzle: dailyTarget,
    guesses: dailyGuesses,
    addGuess: addDailyGuess,
    gameStatus: dailyStatus,
    isLoading: dailyLoading,
    puzzleIndex,
    reset: resetDaily,
  } = useDailyPuzzle<TransferValuePlayer, ValueGuess>({
    gameSlug: 'guess-transfer-value',
    puzzles: pool,
    maxGuesses: MAX_GUESSES,
    isWon: (gs) => gs.length > 0 && gs[gs.length - 1].isCorrect,
    deserializeGuesses: (raw) => raw as ValueGuess[],
    getPuzzleId: (p) => p.name,
  });

  // Unlimited mode
  const [unlimitedTarget, setUnlimitedTarget] = useState<TransferValuePlayer | null>(null);
  const [unlimitedGuesses, setUnlimitedGuesses] = useState<ValueGuess[]>([]);
  const [unlimitedStatus, setUnlimitedStatus] = useState<'playing' | 'won' | 'lost'>('playing');

  // Seed an unlimited target once pool is ready
  const seededRef = useRef(false);
  useEffect(() => {
    if (!seededRef.current && pool.length > 0) {
      seededRef.current = true;
      setUnlimitedTarget(pool[Math.floor(Math.random() * pool.length)]);
    }
  }, [pool]);

  const target = mode === 'daily' ? dailyTarget : unlimitedTarget;
  const guesses = mode === 'daily' ? dailyGuesses : unlimitedGuesses;
  const gameStatus = mode === 'daily' ? dailyStatus : unlimitedStatus;

  const todayStr = useRef(getTodayET()).current;

  const makeGuess = useCallback((value: number) => {
    if (!target || gameStatus !== 'playing') return;
    if (!Number.isFinite(value) || value <= 0) return;
    const result = evaluate(value, target.marketValue);
    if (mode === 'daily') {
      addDailyGuess(result);
    } else {
      setUnlimitedGuesses(prev => {
        const next = [...prev, result];
        if (result.isCorrect) setUnlimitedStatus('won');
        else if (next.length >= MAX_GUESSES) setUnlimitedStatus('lost');
        return next;
      });
    }
  }, [target, gameStatus, mode, addDailyGuess]);

  const newUnlimitedPlayer = useCallback(() => {
    if (pool.length === 0) return;
    setUnlimitedTarget(pool[Math.floor(Math.random() * pool.length)]);
    setUnlimitedGuesses([]);
    setUnlimitedStatus('playing');
  }, [pool]);

  const switchMode = useCallback((m: Mode) => setMode(m), []);

  // Daily score: more remaining guesses = better
  const dailyScore = dailyStatus === 'won'
    ? Math.max(100, (MAX_GUESSES - dailyGuesses.length + 1) * 150)
    : 0;

  useGameCompletion('guess-transfer-value', dailyStatus !== 'playing', dailyScore);

  const emojiGrid = useMemo(() => {
    return guesses.map(g => {
      if (g.isCorrect) return '🟩';
      if (g.pctOff <= 0.15) return '🟨';
      if (g.pctOff <= 0.40) return '🟧';
      return '🟥';
    }).join('');
  }, [guesses]);

  return {
    mode,
    switchMode,
    pool,
    isLoading: isLoadingPool || (mode === 'daily' && dailyLoading),
    target,
    guesses,
    gameStatus,
    makeGuess,
    newUnlimitedPlayer,
    resetDaily,
    maxGuesses: MAX_GUESSES,
    todayStr,
    puzzleIndex,
    emojiGrid,
  };
}
