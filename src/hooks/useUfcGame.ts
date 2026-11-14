import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { makeFirstDraw } from '@/lib/firstDraw';
import { UfcFighter, UfcGuessResult } from '@/types/ufc';
import { dailyUfcFighters, uniqueUfcFighters } from '@/data/ufcFighters';
import { compareUfcGuess } from '@/lib/ufcGameLogic';
import { ensureAnswerInList } from '@/lib/ensureAnswerInOptions';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { isUfcLog } from '@/lib/dailySaveShapes';
import { getTodayET } from '@/lib/dateUtils';

const MAX_GUESSES = 8;

export type UfcGameMode = 'daily' | 'unlimited';

function selectRandomFighter(): UfcFighter {
  return uniqueUfcFighters[Math.floor(Math.random() * uniqueUfcFighters.length)];
}

/* Round 421: drawn once per MOUNT, not once per render attempt. A discarded
   render that drew again shifted the prerenderer's seeded generator and
   changed the pick, which made the snapshot disagree with itself. The
   measurement and the reasoning live in src/lib/firstDraw.ts. */
const firstFighter = makeFirstDraw(selectRandomFighter);

export function useUfcGame() {
  // ---- MODE ----------------------------------------------------------------
  const [mode, setMode] = useState<UfcGameMode>('daily');

  // ---- DAILY ---------------------------------------------------------------
  const todayStr = useRef(getTodayET()).current;

  const {
    puzzle: dailyFighter,
    guesses: dailyGuesses,
    addGuess: addDailyGuess,
    gameStatus: dailyStatus,
    forfeit: forfeitDaily,
    isLoading,
    reset: resetDailyHook,
  } = useDailyPuzzle<UfcFighter, UfcGuessResult>({
    gameSlug: 'ufc',
    storageSlug: 'ufc-game',
    puzzles: dailyUfcFighters,
    maxGuesses: MAX_GUESSES,
    isWon: (g) => g.length > 0 && g[g.length - 1].isCorrect,
    deserializeGuesses: (raw) => raw as UfcGuessResult[],
    isValidGuesses: (g) => isUfcLog(g, MAX_GUESSES),
  });

  // ---- UNLIMITED -----------------------------------------------------------
  const [unlimitedFighter, setUnlimitedFighter] = useState<UfcFighter>(firstFighter.get);
  useEffect(firstFighter.release, []);
  const [unlimitedGuesses, setUnlimitedGuesses] = useState<UfcGuessResult[]>([]);
  const [unlimitedStatus, setUnlimitedStatus] = useState<'playing' | 'won' | 'lost'>('playing');

  // ---- ACTIVE VALUES -------------------------------------------------------
  const targetFighter = mode === 'daily' ? dailyFighter : unlimitedFighter;
  const guesses      = mode === 'daily' ? dailyGuesses  : unlimitedGuesses;
  const gameStatus   = mode === 'daily' ? dailyStatus : unlimitedStatus;

  // ---- CALLBACKS -----------------------------------------------------------
  const switchMode = useCallback((newMode: UfcGameMode) => setMode(newMode), []);

  const makeGuess = useCallback((fighter: UfcFighter) => {
    if (gameStatus !== 'playing' || !targetFighter) return;
    const result = compareUfcGuess(fighter, targetFighter, todayStr);

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
  }, [mode, gameStatus, targetFighter, addDailyGuess, todayStr]);

  const giveUp = useCallback(() => {
    if (gameStatus !== 'playing') return;
    if (mode === 'daily') {
      forfeitDaily();
    } else {
      setUnlimitedStatus('lost');
    }
  }, [mode, gameStatus, forfeitDaily]);

  const resetGame = useCallback(() => {
    if (mode === 'daily') {
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
  const dailyScore = dailyStatus === 'won'
    ? Math.max(100, (MAX_GUESSES - dailyGuesses.length) * 100)
    : 0;
  useGameCompletion('ufc', dailyStatus !== 'playing', dailyScore);

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
