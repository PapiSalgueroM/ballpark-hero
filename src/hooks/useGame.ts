import { useState, useMemo, useCallback, useRef } from 'react';
import { Player, Difficulty, GuessResult } from '@/types/game';
import { players } from '@/data/players';
import { compareGuess } from '@/lib/gameLogic';
import { ensureAnswerInList } from '@/lib/ensureAnswerInOptions';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { getTodayET, getDailyTier } from '@/lib/dateUtils';

const MAX_GUESSES = 8;

export type FootleMode = 'daily' | 'unlimited';

// ---------------------------------------------------------------------------
// Module-level helpers (stable references — not recreated on render)
// ---------------------------------------------------------------------------

function buildPool(tier: Difficulty): Player[] {
  if (tier === 'easy') return players.filter(p => p.difficulty === 'easy');
  if (tier === 'hard') return players.filter(p => p.difficulty === 'easy' || p.difficulty === 'hard');
  return players; // insane: all players
}

function selectRandomPlayer(diff: Difficulty): Player {
  const pool = buildPool(diff);
  return pool[Math.floor(Math.random() * pool.length)];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGame() {
  // ---- MODE ----------------------------------------------------------------
  const [mode, setMode] = useState<FootleMode>('daily');

  // ---- DAILY: tier + pool (computed once on mount from today's ET date) ----
  // Refs ensure these never change during a session, matching useDailyPuzzle's
  // todayStr-on-mount semantics (see Known Behavior in design spec).
  const todayStr = useRef(getTodayET()).current;
  const dailyTier = useRef(getDailyTier(todayStr)).current;
  const dailyPool = useRef(buildPool(dailyTier)).current;

  // ---- DAILY: useDailyPuzzle -----------------------------------------------
  // Always called unconditionally (React rules). Values are only used when
  // mode === 'daily'; unlimited mode reads its own separate state below.

  const [forfeited, setForfeited] = useState(false);

  const {
    puzzle: dailyTarget,
    guesses: dailyGuesses,
    addGuess: addDailyGuess,
    gameStatus: rawDailyStatus,
    isLoading,
    puzzleIndex: dailyPuzzleIndex,
    reset: resetDailyHook,
  } = useDailyPuzzle<Player, GuessResult>({
    gameSlug: 'footle',
    puzzles: dailyPool,
    maxGuesses: MAX_GUESSES,
    // Win: the most recent guess is correct
    isWon: (g) => g.length > 0 && g[g.length - 1].isCorrect,
    // Guesses are plain objects — safe to cast after JSON.parse
    deserializeGuesses: (raw) => raw as GuessResult[],
  });

  // Forfeit overrides the hook's status to 'lost' without needing useDailyPuzzle
  // to know about it. The localStorage entry is written manually in giveUp() so
  // that on refresh the hook restores the correct 'lost' state.
  const effectiveDailyStatus: 'playing' | 'won' | 'lost' = forfeited ? 'lost' : rawDailyStatus;

  // ---- UNLIMITED: original Math.random() logic (unchanged) -----------------
  const [difficulty, setDifficultyState] = useState<Difficulty>('easy');
  const [unlimitedTarget, setUnlimitedTarget] = useState<Player>(() => selectRandomPlayer('easy'));
  const [unlimitedGuesses, setUnlimitedGuesses] = useState<GuessResult[]>([]);
  const [unlimitedStatus, setUnlimitedStatus] = useState<'playing' | 'won' | 'lost'>('playing');

  // ---- ACTIVE VALUES (mode-switched) ---------------------------------------
  const targetPlayer = mode === 'daily' ? dailyTarget : unlimitedTarget;
  const guesses      = mode === 'daily' ? dailyGuesses : unlimitedGuesses;
  const gameStatus   = mode === 'daily' ? effectiveDailyStatus : unlimitedStatus;

  // ---- CALLBACKS -----------------------------------------------------------

  const switchMode = useCallback((newMode: FootleMode) => {
    setMode(newMode);
  }, []);

  const makeGuess = useCallback((player: Player) => {
    if (gameStatus !== 'playing' || !targetPlayer) return;
    const result = compareGuess(player, targetPlayer);

    if (mode === 'daily') {
      addDailyGuess(result);
    } else {
      setUnlimitedGuesses(prev => {
        const next = [...prev, result];
        if (result.isCorrect) {
          setUnlimitedStatus('won');
        } else if (next.length >= MAX_GUESSES) {
          setUnlimitedStatus('lost');
        }
        return next;
      });
    }
  }, [mode, gameStatus, targetPlayer, addDailyGuess]);

  const giveUp = useCallback(() => {
    if (gameStatus !== 'playing') return;

    if (mode === 'daily') {
      // Persist the forfeited state to localStorage using useDailyPuzzle's
      // schema (v:1) so that on refresh the hook reads 'lost' and restores
      // correctly. This is the only coupling point with useDailyPuzzle's
      // internal storage format — if the schema version bumps, update here too.
      try {
        const storageKey = `footle-daily-${todayStr}`;
        localStorage.setItem(storageKey, JSON.stringify({
          v: 1,
          date: todayStr,
          puzzleIndex: dailyPuzzleIndex,
          guesses: dailyGuesses,
          gameStatus: 'lost',
        }));
      } catch { /* quota or private browsing — silently skip */ }
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
      setUnlimitedTarget(selectRandomPlayer(difficulty));
      setUnlimitedGuesses([]);
      setUnlimitedStatus('playing');
    }
  }, [mode, difficulty, resetDailyHook]);

  const changeDifficulty = useCallback((newDiff: Difficulty) => {
    // Difficulty selection only applies in unlimited mode — daily tier is locked
    if (mode === 'daily') return;
    if (newDiff === difficulty) return;
    setDifficultyState(newDiff);
    setUnlimitedTarget(selectRandomPlayer(newDiff));
    setUnlimitedGuesses([]);
    setUnlimitedStatus('playing');
  }, [mode, difficulty]);

  // ---- AUTOCOMPLETE --------------------------------------------------------

  const availablePlayers = useMemo(() => {
    if (mode === 'daily') {
      // Guard for the one-tick isLoading window before dailyTarget resolves
      if (!dailyTarget) return dailyPool;
      return ensureAnswerInList(dailyPool, dailyTarget.name, p => p.name, dailyTarget);
    }
    const pool = buildPool(difficulty);
    return ensureAnswerInList(pool, unlimitedTarget.name, p => p.name, unlimitedTarget);
  }, [mode, difficulty, dailyPool, dailyTarget, unlimitedTarget]);

  const guessedPlayerNames = useMemo(() => guesses.map(g => g.playerName), [guesses]);

  // ---- COMPLETION ----------------------------------------------------------

  // Score for Supabase (daily mode only)
  const dailyScore = effectiveDailyStatus === 'won'
    ? Math.max(100, (MAX_GUESSES - dailyGuesses.length) * 100)
    : 0;

  // useGameCompletion is always called with daily state regardless of current
  // mode. This prevents its internal savedRef from resetting if the user
  // switches to unlimited mid-session after completing the daily puzzle.
  // Unlimited completions are intentionally not recorded.
  useGameCompletion('footle', effectiveDailyStatus !== 'playing', dailyScore);

  // ---- RETURN --------------------------------------------------------------

  return {
    mode,
    switchMode,
    dailyTier,            // today's deterministic tier ('easy' | 'hard' | 'insane')
    difficulty,           // user-selected tier for unlimited mode
    changeDifficulty,
    targetPlayer,
    guesses,
    gameStatus,
    makeGuess,
    giveUp,
    resetGame,
    availablePlayers,
    guessedPlayerNames,
    maxGuesses: MAX_GUESSES,
    isLoading: mode === 'daily' ? isLoading : false,
  };
}
