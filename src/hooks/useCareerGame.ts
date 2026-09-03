import { useState, useCallback, useMemo, useEffect } from 'react';
import { CareerPlayer } from '@/types/career';
import { careerPlayers as fallbackPlayers } from '@/data/careerPlayers';
import { fetchCareerPlayers } from '@/lib/fetchCareerPlayers';
import { toast } from 'sonner';
import { ensureAnswerInOptions } from '@/lib/ensureAnswerInOptions';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { dateSeed, getTodayET } from '@/lib/dateUtils';

/** One recorded action in a daily Career Path run. Round 55: this type was
    USED in three places but never actually defined or imported, so the daily
    action pipeline was silently unchecked. Shape recovered from every
    addDailyAction call site in this file. */
export type CareerAction =
  | { t: 'cell'; key: string }
  | { t: 'won' }
  | { t: 'wrong' }
  | { t: 'give' };

const MAX_GUESSES = 8;
const COLS = ['club', 'appearances', 'goals', 'assists', 'marketValue'] as const;

export type CareerGameMode = 'daily' | 'unlimited';

// #78: prominence tiers for unlimited/practice play. Daily mode always draws
// from the full pool (unaffected by this setting). Verified via read-only SQL
// against career_players/career_seasons (151 players): splitting by peak
// per-player market value into thirds gives 51/50/50. Easy is the most
// famous third, Hard the most obscure third, Normal is everyone.
export type CareerDifficulty = 'easy' | 'normal' | 'hard';
const DIFFICULTY_STORAGE_KEY = 'career-quiz-difficulty';

function loadStoredDifficulty(): CareerDifficulty {
  try {
    const raw = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
    if (raw === 'easy' || raw === 'normal' || raw === 'hard') return raw;
  } catch { /* localStorage unavailable, fall back to default */ }
  return 'normal';
}

function peakMarketValue(player: CareerPlayer): number {
  return player.career.reduce((max, s) => Math.max(max, s.marketValue ?? 0), 0);
}

/**
 * Splits the pool into thirds by peak career market value (highest = most
 * prominent). Easy = top third, Hard = bottom third, Normal = full pool.
 * Falls back to the full pool if there are too few players to split sanely
 * (guards the tiny fallbackPlayers array before Supabase data loads).
 */
function buildCareerPool(difficulty: CareerDifficulty, pool: CareerPlayer[]): CareerPlayer[] {
  if (difficulty === 'normal' || pool.length < 9) return pool;
  const sorted = [...pool].sort((a, b) => peakMarketValue(b) - peakMarketValue(a));
  const third = Math.ceil(sorted.length / 3);
  return difficulty === 'easy' ? sorted.slice(0, third) : sorted.slice(sorted.length - third);
}

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

  // #78: unlimited-only difficulty tier, remembered across sessions.
  const [difficulty, setDifficulty] = useState<CareerDifficulty>(loadStoredDifficulty);
  const unlimitedPool = useMemo(
    () => buildCareerPool(difficulty, playerPool),
    [difficulty, playerPool],
  );

  /* ROUND 365: today's player, computed from the pool that is actually loaded.
     useDailyPuzzle leaves `puzzles` out of its selection memo on purpose and
     expects a stable module-level array, taking the real selection through
     supabasePuzzle. playerPool is state: 151 baked players until the fetch
     lands, then 253 live ones. Passing it as `puzzles` meant the memo never
     re-ran, so 102 of the 253, forty percent of the roster, could never be the
     daily. No difficulty filter here, deliberately: difficulty is an unlimited
     only tier (see the note on unlimitedPool above). */
  const todaysPlayer = useMemo(() => {
    const seed = dateSeed(getTodayET());
    return playerPool.length > 0 ? playerPool[seed % playerPool.length] : null;
  }, [playerPool]);

  // ── Daily ──────────────────────────────────────────────────────────────────
  const {
    puzzle: dailyPuzzle,
    guesses: dailyActions,
    addGuess: addDailyAction,
    gameStatus: rawDailyStatus,
    isLoading,
  } = useDailyPuzzle<CareerPlayer, CareerAction>({
    gameSlug: 'career-path',
    puzzles: fallbackPlayers,
    supabasePuzzle: todaysPlayer,
    getPuzzleId: (p) => p.name,
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
  // Initial pick uses the tier-filtered fallback pool so a stored Easy/Hard
  // preference is respected even before the Supabase pool has loaded.
  const [unlimitedPlayer, setUnlimitedPlayer] = useState<CareerPlayer | null>(null);
  const [unlimitedRevealedCells, setUnlimitedRevealedCells] = useState<Set<string>>(new Set());
  const [unlimitedGameStatus, setUnlimitedGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [unlimitedBoxesUsed, setUnlimitedBoxesUsed] = useState(0);
  const [unlimitedGuessesUsed, setUnlimitedGuessesUsed] = useState(0);

  // ── Active (mode-dependent) values ────────────────────────────────────────
  const fallbackUnlimitedPlayer = buildCareerPool(difficulty, fallbackPlayers)[0];
  const targetPlayer = mode === 'daily'
    ? (dailyPuzzle ?? playerPool[0])
    : (unlimitedPlayer ?? fallbackUnlimitedPlayer);
  const revealedCells = mode === 'daily' ? dailyRevealedCells : unlimitedRevealedCells;
  const gameStatus = mode === 'daily' ? dailyGameStatus : unlimitedGameStatus;
  const boxesUsed = mode === 'daily' ? dailyBoxesUsed : unlimitedBoxesUsed;
  const guessesUsed = mode === 'daily' ? dailyGuessesUsed : unlimitedGuessesUsed;

  const switchMode = useCallback((m: CareerGameMode) => {
    if (m === 'unlimited' && unlimitedPlayer === null) {
      const initialPool = buildCareerPool(difficulty, fallbackPlayers);
      setUnlimitedPlayer(initialPool[Math.floor(Math.random() * initialPool.length)]);
    }
    setMode(m);
  }, [difficulty, unlimitedPlayer]);

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
    setUnlimitedPlayer(unlimitedPool[Math.floor(Math.random() * unlimitedPool.length)]);
    setUnlimitedRevealedCells(new Set());
    setUnlimitedGameStatus('playing');
    setUnlimitedBoxesUsed(0);
    setUnlimitedGuessesUsed(0);
  }, [mode, unlimitedPool]);

  // #78: changing tier only applies in unlimited mode and starts a fresh
  // round (mirrors Footle's changeDifficulty convention in useGame.ts).
  const changeDifficulty = useCallback((next: CareerDifficulty) => {
    if (mode === 'daily') return;
    setDifficulty((prev) => {
      if (prev === next) return prev;
      try { localStorage.setItem(DIFFICULTY_STORAGE_KEY, next); } catch { /* ignore */ }
      const nextPool = buildCareerPool(next, playerPool);
      setUnlimitedPlayer(nextPool[Math.floor(Math.random() * nextPool.length)]);
      setUnlimitedRevealedCells(new Set());
      setUnlimitedGameStatus('playing');
      setUnlimitedBoxesUsed(0);
      setUnlimitedGuessesUsed(0);
      return next;
    });
  }, [mode, playerPool]);

  // Autocomplete pool mirrors the active tier in unlimited mode (same
  // convention as Footle's availablePlayers), full pool for daily.
  const playerNames = useMemo(() => {
    const source = mode === 'unlimited' ? unlimitedPool : playerPool;
    return ensureAnswerInOptions(source.map((p) => p.name), targetPlayer.name);
  }, [mode, unlimitedPool, playerPool, targetPlayer]);

  const completionScore = dailyGameStatus === 'won'
    ? Math.max(100, (MAX_GUESSES - dailyGuessesUsed) * 100)
    : 0;
  useGameCompletion('career', rawDailyStatus !== 'playing', completionScore);

  return {
    mode, switchMode,
    difficulty, changeDifficulty,
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
