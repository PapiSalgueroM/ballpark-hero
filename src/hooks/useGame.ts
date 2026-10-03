import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Player, Difficulty, GuessResult } from '@/types/game';
import { players } from '@/data/players';
import { compareGuess } from '@/lib/gameLogic';
import { ensureAnswerInList } from '@/lib/ensureAnswerInOptions';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { isFootleLog } from '@/lib/dailySaveShapes';
import { getTodayET, getDailyTier, dailyIndex } from '@/lib/dateUtils';
import { fetchFootlePlayerPool } from '@/lib/fetchFootlePlayerPool';
import { createPracticeRun, FOOTLE_PRACTICE_KEY, giveUpPractice, guessPractice, loadPracticeRun, nextPractice, practiceCandidates, practiceFinished, type FootlePracticeRun } from '@/lib/footlePracticeRun';

const MAX_GUESSES = 8;

/* Round 644: the one Footle score. The daily record and the page's score
   distribution panel both read it, because the panel used to be handed its
   own formula (1000 down 125 a guess) while the record held this one (700
   down 100 a guess), so it placed you with a number nobody else's row was
   ever measured in. */
export function footleScore(won: boolean, guessCount: number): number {
  return won ? Math.max(100, (MAX_GUESSES - guessCount) * 100) : 0;
}

/** Round 644: the score panel's rows on the scale footleScore records, 700
    for a first guess down to 100, and 0 for a miss. */
export const FOOTLE_SCORE_BUCKETS = [
  { label: '700', min: 700, max: 700 },
  { label: '500-600', min: 500, max: 699 },
  { label: '300-400', min: 300, max: 499 },
  { label: '100-200', min: 100, max: 299 },
  { label: '0', min: 0, max: 99 },
];

export type FootleMode = 'daily' | 'unlimited' | 'practice';

// ---------------------------------------------------------------------------
// Module-level helpers (stable references, not recreated on render)
// ---------------------------------------------------------------------------

function buildPool(tier: Difficulty, pool: Player[]): Player[] {
  if (tier === 'easy') return pool.filter(p => p.difficulty === 'easy');
  if (tier === 'hard') return pool.filter(p => p.difficulty === 'easy' || p.difficulty === 'hard');
  return pool; // insane: all players
}

/**
 * Target pools are tier-PURE (owner: "insane should be a nobody, not Messi").
 * The daily/unlimited ANSWER comes from exactly the chosen tier; the guess
 * list stays broad so players can still probe with anyone they want.
 */
function buildTargetPool(tier: Difficulty, pool: Player[]): Player[] {
  const pure = pool.filter(p => p.difficulty === tier);
  return pure.length > 0 ? pure : buildPool(tier, pool);
}

function selectRandomPlayer(diff: Difficulty, pool: Player[]): Player {
  const filtered = buildTargetPool(diff, pool);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGame() {
  // ---- MODE ----------------------------------------------------------------
  const [practiceRun, setPracticeRun] = useState(loadPracticeRun);
  const practiceRef = useRef(practiceRun);
  const [practiceSaveFailed, setPracticeSaveFailed] = useState(false);
  const [mode, setMode] = useState<FootleMode>(() => practiceRun?.active ? 'practice' : 'daily');
  const savePractice = useCallback((run: FootlePracticeRun) => {
    if (run === practiceRef.current) return;
    practiceRef.current = run;
    setPracticeRun(run);
    try {
      localStorage.setItem(FOOTLE_PRACTICE_KEY, JSON.stringify(run));
      setPracticeSaveFailed(false);
    } catch { setPracticeSaveFailed(true); }
  }, []);

  // ---- PLAYER POOL ---------------------------------------------------------
  // Starts as the hardcoded fallback (players.ts). Replaced by Supabase data
  // once the async fetch completes. isLoadingPool gates the UI so the user
  // cannot interact until the correct pool is ready.
  const [playerPool, setPlayerPool] = useState<Player[]>(players);
  const [isLoadingPool, setIsLoadingPool] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchFootlePlayerPool().then(pool => {
      if (cancelled) return;
      if (pool.length > 0) {
        setPlayerPool(pool);
      }
      // On empty result (error path), playerPool stays as players.ts fallback
      setIsLoadingPool(false);
    });
    return () => { cancelled = true; };
  }, []);

  // ---- DAILY: tier + pool (computed once on mount from today's ET date) ----
  // todayStr/dailyTier are captured once via ref, matching useDailyPuzzle's
  // todayStr-on-mount semantics. dailyPool re-derives when playerPool updates
  // (which happens exactly once, before the user can interact).
  const todayStr = useRef(getTodayET()).current;
  const dailyTier = useRef(getDailyTier(todayStr)).current;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dailyPool = useMemo(() => buildTargetPool(dailyTier, playerPool), [dailyTier, playerPool]);

  /* ROUND 384: today's target, computed from the pool that actually loaded.
     useDailyPuzzle leaves `puzzles` out of its selection memo on purpose and
     takes the real selection through supabasePuzzle. dailyPool is derived
     from state (the 748 entry file until the fetch lands, the live pool
     after), so passing it as `puzzles` meant the memo ran once against the
     file and never again: every daily answer came from the file, and 1,173
     of the 1,200 live insane-tier players could never be the daily. Same
     walk as the hook's own (dailyIndex), so "every player once before any
     twice" still holds, now over the live pool. */
  const todaysTarget = useMemo(
    () => (dailyPool.length > 0 ? dailyPool[dailyIndex(todayStr, dailyPool.length)] : null),
    [dailyPool, todayStr],
  );

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
    // The module level file is only the index space for the saved board;
    // the answer itself is todaysTarget above.
    puzzles: players,
    supabasePuzzle: todaysTarget,
    getPuzzleId: (p) => p.name,
    maxGuesses: MAX_GUESSES,
    // Win: the most recent guess is correct
    isWon: (g) => g.length > 0 && g[g.length - 1].isCorrect,
    // Guesses are plain objects, safe to cast after JSON.parse
    deserializeGuesses: (raw) => raw as GuessResult[],
    isValidGuesses: (g) => isFootleLog(g, MAX_GUESSES),
  });

  // Forfeit overrides the hook's status to 'lost' without needing useDailyPuzzle
  // to know about it. The localStorage entry is written manually in giveUp() so
  // that on refresh the hook restores the correct 'lost' state.
  const effectiveDailyStatus: 'playing' | 'won' | 'lost' = forfeited ? 'lost' : rawDailyStatus;

  // First selection waits for the same resolved pool as the daily.
  const [difficulty, setDifficultyState] = useState<Difficulty>('easy');
  const [practiceDifficulty, setPracticeDifficulty] = useState<Difficulty>(() => practiceRun?.tier ?? 'easy');
  const [unlimitedTarget, setUnlimitedTarget] = useState<Player | null>(null);
  const [unlimitedGuesses, setUnlimitedGuesses] = useState<GuessResult[]>([]);
  const [unlimitedStatus, setUnlimitedStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  useEffect(() => {
    if (!isLoadingPool && !unlimitedTarget) setUnlimitedTarget(selectRandomPlayer(difficulty, playerPool));
  }, [isLoadingPool, unlimitedTarget, difficulty, playerPool]);
  const practiceRound = practiceRun?.rounds[practiceRun.index];
  const practiceTarget = practiceRun?.pool.find(player => player.name === practiceRun.targets[practiceRun.index]) ?? null;
  const practiceGuesses = useMemo(() => practiceRun && practiceTarget
    ? practiceRun.rounds[practiceRun.index].guesses.map(name => compareGuess(practiceRun.pool.find(player => player.name === name)!, practiceTarget))
    : [], [practiceRun, practiceTarget]);

  // ---- ACTIVE VALUES (mode-switched) ---------------------------------------
  const targetPlayer = mode === 'practice' ? practiceTarget : mode === 'daily' ? dailyTarget : unlimitedTarget;
  const guesses      = mode === 'practice' ? practiceGuesses : mode === 'daily' ? dailyGuesses : unlimitedGuesses;
  const gameStatus   = mode === 'practice' ? practiceRound?.status ?? 'playing' : mode === 'daily' ? effectiveDailyStatus : unlimitedStatus;

  // ---- CALLBACKS -----------------------------------------------------------

  const switchMode = useCallback((newMode: FootleMode) => {
    setMode(newMode);
    const run = practiceRef.current;
    if (run && run.active !== (newMode === 'practice')) savePractice({ ...run, active: newMode === 'practice' });
  }, [savePractice]);

  const startPractice = useCallback(() => {
    if (isLoadingPool || !dailyTarget) return;
    const current = practiceRef.current;
    if (current && !practiceFinished(current)) return;
    const run = createPracticeRun(playerPool, practiceDifficulty, dailyTarget.name);
    if (run) { savePractice(run); setMode('practice'); }
  }, [isLoadingPool, dailyTarget, playerPool, practiceDifficulty, savePractice]);

  const advancePractice = useCallback(() => {
    const run = practiceRef.current;
    if (run) savePractice(nextPractice(run));
  }, [savePractice]);

  const makeGuess = useCallback((player: Player) => {
    if (mode === 'practice') {
      const run = practiceRef.current;
      if (run) savePractice(guessPractice(run, player.name));
      return;
    }
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
  }, [mode, gameStatus, targetPlayer, addDailyGuess, savePractice]);

  const giveUp = useCallback(() => {
    if (mode === 'practice') {
      const run = practiceRef.current;
      if (run) savePractice(giveUpPractice(run));
      return;
    }
    if (gameStatus !== 'playing') return;

    if (mode === 'daily') {
      // Persist the forfeited state to localStorage using useDailyPuzzle's
      // schema (v:1) so that on refresh the hook reads 'lost' and restores
      // correctly. This is the only coupling point with useDailyPuzzle's
      // internal storage format, if the schema version bumps, update here too.
      try {
        const storageKey = `footle-daily-${todayStr}`;
        localStorage.setItem(storageKey, JSON.stringify({
          v: 1,
          date: todayStr,
          puzzleIndex: dailyPuzzleIndex,
          guesses: dailyGuesses,
          gameStatus: 'lost',
        }));
      } catch { /* quota or private browsing, silently skip */ }
      setForfeited(true);
    } else {
      setUnlimitedStatus('lost');
    }
  }, [mode, gameStatus, todayStr, dailyPuzzleIndex, dailyGuesses, savePractice]);

  const resetGame = useCallback(() => {
    if (mode === 'practice' || isLoadingPool) return;
    if (mode === 'daily') {
      setForfeited(false);
      resetDailyHook();
    } else {
      setUnlimitedTarget(selectRandomPlayer(difficulty, playerPool));
      setUnlimitedGuesses([]);
      setUnlimitedStatus('playing');
    }
  }, [mode, difficulty, playerPool, resetDailyHook, isLoadingPool]);

  const changeDifficulty = useCallback((newDiff: Difficulty) => {
    // Daily difficulty is locked; practice and Unlimited keep separate tiers.
    if (mode === 'daily' || isLoadingPool) return;
    if (mode === 'practice') {
      if (!practiceRef.current || practiceFinished(practiceRef.current)) setPracticeDifficulty(newDiff);
      return;
    }
    if (newDiff === difficulty) return;
    setDifficultyState(newDiff);
    setUnlimitedTarget(selectRandomPlayer(newDiff, playerPool));
    setUnlimitedGuesses([]);
    setUnlimitedStatus('playing');
  }, [mode, difficulty, playerPool, isLoadingPool]);

  // ---- AUTOCOMPLETE --------------------------------------------------------

  const availablePlayers = useMemo(() => {
    if (mode === 'practice' && practiceRun) return practiceRun.pool;
    // Guessing is always open to the FULL pool (owner: "every player should
    // be able to be guessed"), only the secret answer is tier-restricted.
    if (mode === 'daily') {
      // Guard for the one-tick isLoading window before dailyTarget resolves
      if (!dailyTarget) return playerPool;
      return ensureAnswerInList(playerPool, dailyTarget.name, p => p.name, dailyTarget);
    }
    return unlimitedTarget ? ensureAnswerInList(playerPool, unlimitedTarget.name, p => p.name, unlimitedTarget) : playerPool;
  }, [mode, playerPool, dailyTarget, unlimitedTarget, practiceRun]);

  const examplePlayer = playerPool.find(player => player.name !== dailyTarget?.name
    && player.name !== unlimitedTarget?.name && !practiceRun?.targets.includes(player.name));

  const guessedPlayerNames = useMemo(() => guesses.map(g => g.playerName), [guesses]);

  // ---- COMPLETION ----------------------------------------------------------

  // Score for Supabase (daily mode only)
  const dailyScore = footleScore(effectiveDailyStatus === 'won', dailyGuesses.length);

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
    difficulty: mode === 'practice' ? practiceDifficulty : difficulty,
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
    isLoading: mode === 'daily' ? isLoading : mode === 'unlimited' && !unlimitedTarget,
    isLoadingPool,
    practiceRun,
    practiceSaveFailed,
    startPractice,
    advancePractice,
    practiceComplete: practiceRun ? practiceFinished(practiceRun) : false,
    practiceReady: !isLoadingPool && !!dailyTarget && practiceCandidates(playerPool, practiceDifficulty, dailyTarget.name).length >= 5,
    examplePlayer,
  };
}
