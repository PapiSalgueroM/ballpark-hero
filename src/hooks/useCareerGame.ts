import { useState, useCallback, useMemo, useEffect } from 'react';
import { CareerPlayer } from '@/types/career';
import { careerPlayers as fallbackPlayers } from '@/data/careerPlayers';
import { fetchCareerPlayers } from '@/lib/fetchCareerPlayers';
import { toast } from 'sonner';
import { ensureAnswerInOptions } from '@/lib/ensureAnswerInOptions';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';

const MAX_GUESSES = 8;
const COLS = ['club', 'appearances', 'goals', 'assists', 'marketValue'] as const;

export type CareerGameMode = 'daily' | 'unlimited';

type CareerAction =
  | { t: 'cell'; key: string }
  | { t: 'won' }
  | { t: 'wrong' }
  | { t: 'give' };

function getCoverableCells(player: CareerPlayer): string[] {
  const keys: string[] = [];
  player.career.forEach((_, rowIdx) => {
    COLS.forEach((col) => keys.push(`${rowIdx}-${col}`));
  });
  return keys;
}

export function useCareerGame() {
  const [playerPool, setPlayerPool] = useState<CareerPlayer[]>(fallbackPlayers);
  const [isLoadingPool, setIsLoadingPool] = useState(true);
  useEffect(() => {
    let cancelled = false;
    fetchCareerPlayers().then(pool => {
      if (cancelled) return;
      if (pool.length > 0) setPlayerPool(pool);
      setIsLoadingPool(false);
    });
    return () => { cancelled = true; };
  }, []);

  const [mode, setMode] = useState<CareerGameMode>('daily');
  const switchMode = useCallback((m: CareerGameMode) => setMode(m), []);

  // ── Daily ──────────────────────────────────────────────────────────────────
  const {
    puzzle: dailyPuzzle,
    guesses: dailyActions,
    addGuess: addDailyAction,
    gameStatus: rawDailyStatus,
    isLoading,
  } = useDailyPuzzle<CareerPlayer, CareerAction>({
    gameSlug: 'career-path',
    puzzles: playerPool,
    maxGuesses: 999,
    isWon: (g) => g.some((a) => a.t === 'won'),
    isLost: (g) =>
      g.some((a) => a.t === 'give') || g.filter((a) => a.t === 'wrong').length >= MAX_GUESSES,
    deserializeGuesses: (raw) => raw as CareerAction[],
  });

  const dailyRevealedCells = useMemo(
    () => new Set(dailyActions.filter((a): a is { t: 'cell'; key: string } => a.t === 'cell').map((a) => a.key)),
    [dailyActions],
  );
  const dailyWrongCount = dailyActions.filter((a) => a.t === 'wrong').length;
  const dailyHasWon = dailyActions.some((a) => a.t === 'won');
  const dailyGuessesUsed = dailyWrongCount + (dailyHasWon ? 1 : 0);
  const dailyBoxesUsed = dailyRevealedCells.size;

  const dailyGameStatus = useMemo((): 'playing' | 'won' | 'lost' => {
    if (rawDailyStatus === 'won') return 'won';
    if (rawDailyStatus === 'lost') return 'lost';
    return 'playing';
  }, [rawDailyStatus]);

  // ── Unlimited ──────────────────────────────────────────────────────────────
  const [unlimitedPlayer, setUnlimitedPlayer] = useState<CareerPlayer>(
    () => fallbackPlayers[Math.floor(Math.random() * fallbackPlayers.length)],
  );
  const [unlimitedRevealedCells, setUnlimitedRevealedCells] = useState<Set<string>>(new Set());
  const [unlimitedGameStatus, setUnlimitedGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [unlimitedBoxesUsed, setUnlimitedBoxesUsed] = useState(0);
  const [unlimitedGuessesUsed, setUnlimitedGuessesUsed] = useState(0);

  // ── Active (mode-dependent) values ────────────────────────────────────────
  const targetPlayer = mode === 'daily' ? (dailyPuzzle ?? playerPool[0]) : unlimitedPlayer;
  const revealedCells = mode === 'daily' ? dailyRevealedCells : unlimitedRevealedCells;
  const gameStatus = mode === 'daily' ? dailyGameStatus : unlimitedGameStatus;
  const boxesUsed = mode === 'daily' ? dailyBoxesUsed : unlimitedBoxesUsed;
  const guessesUsed = mode === 'daily' ? dailyGuessesUsed : unlimitedGuessesUsed;

  // ── Actions ────────────────────────────────────────────────────────────────
  const revealCell = useCallback((key: string) => {
    if (gameStatus !== 'playing') return;
    if (mode === 'daily') {
      if (dailyRevealedCells.has(key)) return;
      addDailyAction({ t: 'cell', key });
    } else {
      setUnlimitedRevealedCells((prev) => {
        if (prev.has(key)) return prev;
        const next = new Set(prev);
        next.add(key);
        setUnlimitedBoxesUsed((b) => b + 1);
        return next;
      });
    }
  }, [mode, gameStatus, dailyRevealedCells, addDailyAction]);

  const giveHint = useCallback(() => {
    if (gameStatus !== 'playing') return;
    const allCells = getCoverableCells(targetPlayer);
    const unrevealed = allCells.filter((k) => !revealedCells.has(k));
    if (unrevealed.length === 0) return;
    const toReveal = Math.min(4, unrevealed.length);
    const shuffled = [...unrevealed].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, toReveal);

    if (mode === 'daily') {
      chosen.forEach((key) => addDailyAction({ t: 'cell', key }));
    } else {
      setUnlimitedRevealedCells((prev) => {
        const next = new Set(prev);
        chosen.forEach((k) => next.add(k));
        setUnlimitedBoxesUsed((b) => b + chosen.length);
        return next;
      });
    }
  }, [mode, gameStatus, targetPlayer, revealedCells, addDailyAction]);

  const allRevealed = useMemo(() => {
    const allCells = getCoverableCells(targetPlayer);
    return allCells.every((k) => revealedCells.has(k));
  }, [revealedCells, targetPlayer]);

  const makeGuess = useCallback((name: string): boolean => {
    if (gameStatus !== 'playing') return false;

    if (name.toLowerCase().trim() === targetPlayer.name.toLowerCase().trim()) {
      if (mode === 'daily') {
        addDailyAction({ t: 'won' });
      } else {
        setUnlimitedGuessesUsed((c) => c + 1);
        setUnlimitedGameStatus('won');
      }
      return true;
    }

    // Wrong guess
    if (mode === 'daily') {
      const newWrongCount = dailyWrongCount + 1;
      addDailyAction({ t: 'wrong' });
      if (newWrongCount >= MAX_GUESSES) {
        toast.error(`No more guesses! The player was ${targetPlayer.name}`);
      } else {
        toast.error(`❌ Not ${name}. ${MAX_GUESSES - newWrongCount} guess${MAX_GUESSES - newWrongCount === 1 ? '' : 'es'} remaining!`);
      }
    } else {
      const newCount = unlimitedGuessesUsed + 1;
      setUnlimitedGuessesUsed(newCount);
      if (newCount >= MAX_GUESSES) {
        setUnlimitedGameStatus('lost');
        toast.error(`No more guesses! The player was ${targetPlayer.name}`);
      } else {
        toast.error(`❌ Not ${name}. ${MAX_GUESSES - newCount} guess${MAX_GUESSES - newCount === 1 ? '' : 'es'} remaining!`);
      }
    }
    return false;
  }, [mode, gameStatus, targetPlayer, dailyWrongCount, unlimitedGuessesUsed, addDailyAction]);

  const giveUp = useCallback(() => {
    if (gameStatus !== 'playing') return;
    if (mode === 'daily') {
      addDailyAction({ t: 'give' });
    } else {
      setUnlimitedGameStatus('lost');
    }
  }, [mode, gameStatus, addDailyAction]);

  const resetGame = useCallback(() => {
    if (mode !== 'unlimited') return;
    setUnlimitedPlayer(playerPool[Math.floor(Math.random() * playerPool.length)]);
    setUnlimitedRevealedCells(new Set());
    setUnlimitedGameStatus('playing');
    setUnlimitedBoxesUsed(0);
    setUnlimitedGuessesUsed(0);
  }, [mode, playerPool]);

  const playerNames = useMemo(
    () => ensureAnswerInOptions(playerPool.map((p) => p.name), targetPlayer.name),
    [playerPool, targetPlayer],
  );

  const completionScore = dailyGameStatus === 'won'
    ? Math.max(100, (MAX_GUESSES - dailyGuessesUsed) * 100)
    : 0;
  useGameCompletion('career-path', rawDailyStatus !== 'playing', completionScore);

  return {
    mode, switchMode,
    targetPlayer,
    revealedCells,
    revealCell,
    makeGuess,
    giveUp,
    giveHint,
    resetGame,
    gameStatus,
    boxesUsed,
    guessesUsed,
    maxGuesses: MAX_GUESSES,
    playerNames,
    allRevealed,
    isLoading,
    isLoadingPool,
  };
}
