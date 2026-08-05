import { useState, useMemo, useCallback, useRef } from 'react';
import { UfcFighter, UfcGuessResult } from '@/types/ufc';
import { uniqueUfcFighters } from '@/data/ufcFighters';
import { compareUfcGuess } from '@/lib/ufcGameLogic';
import { ensureAnswerInList } from '@/lib/ensureAnswerInOptions';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { getTodayET } from '@/lib/dateUtils';

const MAX_GUESSES = 8;

export type UfcGameMode = 'daily' | 'unlimited';

function selectRandomFighter(): UfcFighter {
  return uniqueUfcFighters[Math.floor(Math.random() * uniqueUfcFighters.length)];
}

export function useUfcGame() {
  // ---- MODE ----------------------------------------------------------------
  const [mode, setMode] = useState<UfcGameMode>('daily');

  // ---- DAILY ---------------------------------------------------------------
  const todayStr = useRef(getTodayET()).current;
  const [forfeited, setForfeited] = useState(false);

  const {
    puzzle: dailyFighter,
    guesses: dailyGuesses,
    addGuess: addDailyGuess,
    gameStatus: rawDailyStatus,
    isLoading,
    puzzleIndex: dailyPuzzleIndex,
    reset: resetDailyHook,
  } = useDailyPuzzle<UfcFighter, UfcGuessResult>({
    gameSlug: 'ufc-game',
    puzzles: uniqueUfcFighters,
    maxGuesses: MAX_GUESSES,
    isWon: (g) => g.length > 0 && g[g.length - 1].isCorrect,
    deserializeGuesses: (raw) => raw as UfcGuessResult[],
  });

  const effectiveDailyStatus: 'playing' | 'won' | 'lost' = forfeited ? 'lost' : rawDailyStatus;

  // ---- UNLIMITED -----------------------------------------------------------
  const [unlimitedFighter, setUnlimitedFighter] = useState<UfcFighter>(selectRandomFighter);
  const [unlimitedGuesses, setUnlimitedGuesses] = useState<UfcGuessResult[]>([]);
  const [unlimitedStatus, setUnlimitedStatus] = useState<'playing' | 'won' | 'lost'>('playing');

  // ---- ACTIVE VALUES -------------------------------------------------------
  const targetFighter = mode === 'daily' ? dailyFighter : unlimitedFighter;
  const guesses      = mode === 'daily' ? dailyGuesses  : unlimitedGuesses;
  const gameStatus   = mode === 'daily' ? effectiveDailyStatus : unlimitedStatus;

  // ---- CALLBACKS -----------------------------------------------------------
  const switchMode = useCallback((newMode: UfcGameMode) => setMode(newMode), []);

  const makeGuess = useCallback((fighter: UfcFighter) => {
    if (gameStatus !== 'playing' || !targetFighter) return;
    const result = compareUfcGuess(fighter, targetFighter);

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
  }, [mode, gameStatus, targetFighter, addDailyGuess]);

  const giveUp = useCallback(() => {
    if (gameStatus !== 'playing') return;
    if (mode === 'daily') {
      try {
        localStorage.setItem(`ufc-game-daily-${todayStr}`, JSON.stringify({
          v: 1, date: todayStr, puzzleIndex: dailyPuzzleIndex,
          guesses: dailyGuesses, gameStatus: 'lost',
        }));
      } catch { /* quota / private browsing */ }
      setForfeited(true);
    } else {
      setUnlimitedStatus('lost');
    }
  }, [mode, gameStatus, todayStr, dailyPuzzleIndex, dailyGuesses]);

  const resetGame = useCallback(() => {
    if (mode === 'daily') {
      setForfeited(false);
      resetDailyHook();
    } else {
      setUnlimitedFighter(selectRandomFighter());
      setUnlimitedGuesses([]);
      setUnlimitedStatus('playing');
    }
  }, [mode, resetDailyHook]);

  // ---- AUTOCOMPLETE --------------------------------------------------------
  const guessedFighterNames = useMemo(() => guesses.map(g => g.fighterName), [guesses]);

  const fighters = useMemo(() => {
    const fighter = mode === 'daily' ? dailyFighter : unlimitedFighter;
    if (!fighter) return uniqueUfcFighters;
    return ensureAnswerInList(uniqueUfcFighters, fighter.name, f => f.name, fighter);
  }, [mode, dailyFighter, unlimitedFighter]);

  // ---- COMPLETION ----------------------------------------------------------
  const dailyScore = effectiveDailyStatus === 'won'
    ? Math.max(100, (MAX_GUESSES - dailyGuesses.length) * 100)
    : 0;
  useGameCompletion('ufc', effectiveDailyStatus !== 'playing', dailyScore);

  return {
    mode,
    switchMode,
    targetFighter,
    guesses,
    gameStatus,
    makeGuess,
    giveUp,
    resetGame,
    fighters,
    guessedFighterNames,
    maxGuesses: MAX_GUESSES,
    isLoading: mode === 'daily' ? isLoading : false,
  };
}
