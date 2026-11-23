import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { soccerGridPuzzles } from '@/data/soccerGridPuzzles';
import { SoccerGridCell, SoccerGridGameStatus, SoccerGridPuzzle } from '@/types/soccerGrid';
import { supabase } from '@/integrations/supabase/client';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { readPlayedDailyPuzzleId, useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { fetchSoccerGridPuzzles } from '@/lib/fetchSoccerGridPuzzles';
import { toast } from 'sonner';
import { dateSeed, getTodayET } from '@/lib/dateUtils';
import { rarityPercent } from '@/lib/gridRarity';
import {
  SoccerGridDifficulty,
  SoccerGridTimerMode,
  SoccerGridSettings,
  OvertimeCell,
  DEFAULT_SETTINGS,
  filterPoolByDifficulty,
  loadSoccerGridSettings,
  saveSoccerGridSettings,
  loadOvertimeCells,
  saveOvertimeCells,
  loadOvertimeActive,
  saveOvertimeActive,
  loadTimerExpired,
  saveTimerExpired,
  loadTimerStartedAt,
  saveTimerStartedAt,
} from '@/lib/soccerGridDifficulty';

type GridAction =
  | { t: 'ok'; cellIndex: number; playerName: string; rarity: number }
  | { t: 'x' };

const gameSlug = 'soccer-grid';

function sameSettings(first: SoccerGridSettings, second: SoccerGridSettings): boolean {
  return first.difficulty === second.difficulty && first.timerMode === second.timerMode;
}

export function useSoccerGrid() {
  const [puzzlePool, setPuzzlePool] = useState<SoccerGridPuzzle[]>(soccerGridPuzzles);
  const [isLoadingPool, setIsLoadingPool] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchSoccerGridPuzzles().then((pool) => {
      if (cancelled) return;
      if (pool.length > 0) setPuzzlePool(pool);
      setIsLoadingPool(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Today's date (ET), stable for the whole session, used as the key for
  // every settings/timer/overtime localStorage entry below so they always
  // agree with useDailyPuzzle's own per-day storage key.
  const todayStr = useRef(getTodayET()).current;
  const [playedPuzzleId, setPlayedPuzzleId] = useState(() => readPlayedDailyPuzzleId(gameSlug, todayStr));

  // --- Settings: difficulty tier + timer mode, chosen before play starts ---
  // Read synchronously (useState initializer, not an effect) so the very
  // first render already reflects a returning player's saved difficulty.
  // This matters because todaysPuzzle below is derived from settings.difficulty
  //, if settings changed one render late (as an effect would cause), the
  // puzzle-selection memo in useDailyPuzzle would see puzzleIndex flip after
  // mount and wipe an in-progress grid, breaking refresh persistence.
  const [settings, setSettings] = useState<SoccerGridSettings>(
    () => loadSoccerGridSettings(todayStr) ?? DEFAULT_SETTINGS,
  );
  const settingsLoaded = true;

  const setDifficulty = useCallback((difficulty: SoccerGridDifficulty) => {
    setSettings((prev) => {
      if (readPlayedDailyPuzzleId(gameSlug, todayStr) !== null) return prev;
      const next = { ...prev, difficulty };
      saveSoccerGridSettings(todayStr, next);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayStr]);

  const setTimerMode = useCallback((timerMode: SoccerGridTimerMode) => {
    setSettings((prev) => {
      if (readPlayedDailyPuzzleId(gameSlug, todayStr) !== null) return prev;
      const next = { ...prev, timerMode };
      saveSoccerGridSettings(todayStr, next);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayStr]);

  // Difficulty-filtered pool. Falls back internally to the full pool when a
  // tier has too few puzzles (see filterPoolByDifficulty).
  const difficultyPool = useMemo(
    () => filterPoolByDifficulty(puzzlePool, settings.difficulty),
    [puzzlePool, settings.difficulty],
  );

  // Compute today's puzzle from the live pool using the same date-seed formula as
  // useDailyPuzzle. Passed as supabasePuzzle so the selection dynamically reflects
  // the full Supabase pool (including puzzles added in Round 4+), not just the
  // initial 15 in the hardcoded fallback.
  const todaysPuzzle = useMemo(() => {
    if (playedPuzzleId !== null) {
      const played = puzzlePool.find(p => p.id === playedPuzzleId) ?? soccerGridPuzzles.find(p => p.id === playedPuzzleId);
      if (played) return played;
    }
    const seed = dateSeed(todayStr);
    return difficultyPool.length > 0 ? difficultyPool[seed % difficultyPool.length] : null;
  }, [difficultyPool, playedPuzzleId, puzzlePool, todayStr]);

  const {
    puzzle: dailyPuzzle,
    guesses: dailyActions,
    addGuess: addDailyGuess,
    gameStatus: rawDailyStatus,
    isLoading,
  } = useDailyPuzzle<SoccerGridPuzzle, GridAction>({
    gameSlug,
    // soccerGridPuzzles is the stable module-level ref required by useDailyPuzzle's
    // dep array (puzzles is intentionally excluded from its useMemo deps). The actual
    // puzzle selection comes from supabasePuzzle below, this is just the fallback pool.
    puzzles: soccerGridPuzzles,
    supabasePuzzle: todaysPuzzle,
    getPuzzleId: (p) => p.id,
    maxGuesses: 15,
    isWon: (g) => g.filter((a) => a.t === 'ok').length >= 9,
    deserializeGuesses: (raw) => raw as GridAction[],
  });

  const puzzle = dailyPuzzle ?? soccerGridPuzzles[0];

  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [validating, setValidating] = useState(false);
  const [checkingDown, setCheckingDown] = useState(false);
  const [wrongFlash, setWrongFlash] = useState<{ cellIndex: number; playerName: string } | null>(null);

  const correctActions = useMemo(
    () => dailyActions.filter((a): a is { t: 'ok'; cellIndex: number; playerName: string; rarity: number } => a.t === 'ok'),
    [dailyActions],
  );

  const cells = useMemo<SoccerGridCell[]>(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        const ok = correctActions.find((a) => a.cellIndex === i);
        if (ok) return { index: i, playerName: ok.playerName, status: 'correct' as const, rarity: ok.rarity };
        if (wrongFlash?.cellIndex === i)
          return { index: i, playerName: wrongFlash.playerName, status: 'wrong' as const, rarity: null };
        return { index: i, playerName: null, status: 'empty' as const, rarity: null };
      }),
    [correctActions, wrongFlash],
  );

  const correctCount = correctActions.length;
  const guessesLeft = Math.max(0, 15 - dailyActions.length);

  // --- Timer mode ---------------------------------------------------------
  // Unlimited (mode 0) never starts a clock. Timed modes start counting from
  // the first guess (not from page load), on the principle that idle time
  // before you start typing shouldn't cost you. The start
  // epoch is persisted so a mid-timer refresh resumes with the correct
  // remaining time instead of granting a fresh clock. Read synchronously
  // (useState initializer) for the same reason settings is read
  // synchronously above, avoids a one-render-late flip that could race
  // with the win/loss check on refresh.
  const [timerStartedAt, setTimerStartedAtState] = useState<number | null>(
    () => loadTimerStartedAt(todayStr),
  );
  const timerStart = useRef(timerStartedAt);
  const [timerExpired, setTimerExpiredState] = useState<boolean>(
    () => loadTimerExpired(todayStr),
  );
  const [nowTick, setNowTick] = useState(() => Date.now());

  const openPlayedRound = useCallback((id: string) => {
    setPlayedPuzzleId(id);
    if (id !== puzzle.id) setActiveCell(null);
    const stored = loadSoccerGridSettings(todayStr) ?? DEFAULT_SETTINGS;
    setSettings(prev => sameSettings(prev, stored) ? prev : stored);
    timerStart.current = loadTimerStartedAt(todayStr);
    setTimerStartedAtState(timerStart.current);
    setTimerExpiredState(loadTimerExpired(todayStr));
    setNowTick(Date.now());
  }, [puzzle.id, todayStr]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== `${gameSlug}-daily-${todayStr}`) return;
      const id = readPlayedDailyPuzzleId(gameSlug, todayStr);
      if (id !== null) openPlayedRound(id);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [openPlayedRound, todayStr]);

  const canUseBoard = useCallback((playedId: string | null) => {
    if (playedId === null || (playedId === puzzle.id
      && sameSettings(settings, loadSoccerGridSettings(todayStr) ?? DEFAULT_SETTINGS))) return true;
    openPlayedRound(playedId);
    return false;
  }, [openPlayedRound, puzzle.id, settings, todayStr]);

  const recordMainGuess = useCallback((action: GridAction) => {
    const playedId = readPlayedDailyPuzzleId(gameSlug, todayStr);
    if (!canUseBoard(playedId)) return;
    if (playedId === null) {
      // Publish the settings for this counted guess, even if another tab
      // previewed different settings during validation.
      if (!sameSettings(settings, loadSoccerGridSettings(todayStr) ?? DEFAULT_SETTINGS))
        saveSoccerGridSettings(todayStr, settings);
      if (settings.timerMode !== 0 && timerStart.current !== null && timerStart.current !== loadTimerStartedAt(todayStr))
        saveTimerStartedAt(todayStr, timerStart.current);
      if (settings.timerMode !== 0 && loadTimerExpired(todayStr)) saveTimerExpired(todayStr, false);
    }
    addDailyGuess(action);
  }, [addDailyGuess, canUseBoard, settings, todayStr]);

  useEffect(() => {
    if (settings.timerMode === 0 || timerStartedAt === null || timerExpired) return;
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [settings.timerMode, timerStartedAt, timerExpired]);

  const timeLeft = useMemo(() => {
    if (settings.timerMode === 0 || timerStartedAt === null) return null;
    const elapsedSec = Math.floor((nowTick - timerStartedAt) / 1000);
    return Math.max(0, settings.timerMode - elapsedSec);
  }, [settings.timerMode, timerStartedAt, nowTick]);

  const startTimerIfNeeded = useCallback(() => {
    if (settings.timerMode === 0 || timerStart.current !== null) return;
    const now = Date.now();
    timerStart.current = now;
    setNowTick(now);
    saveTimerStartedAt(todayStr, now);
    setTimerStartedAtState(now);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.timerMode, todayStr]);

  useEffect(() => {
    if (timeLeft === 0 && !timerExpired && canUseBoard(readPlayedDailyPuzzleId(gameSlug, todayStr))) {
      saveTimerExpired(todayStr);
      setTimerExpiredState(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, timerExpired]);

  const timeUp = settings.timerMode !== 0 && timerExpired;

  const gameStatus: SoccerGridGameStatus = (rawDailyStatus !== 'playing' || timeUp) ? 'complete' : 'playing';
  const mainRoundComplete = useRef(gameStatus === 'complete');
  mainRoundComplete.current = gameStatus === 'complete';

  const rarityScore = useMemo(() => {
    if (correctActions.length === 0) return null;
    const avg = correctActions.reduce((sum, a) => sum + Math.min(a.rarity, 100), 0) / correctActions.length;
    return Math.round(avg);
  }, [correctActions]);

  // --- Overtime ------------------------------------------------------------
  // After the main game ends (win, out-of-guesses, or time-up), the player
  // may opt into Overtime to keep filling remaining cells. The main
  // correctCount/rarityScore above never include Overtime picks, they stay
  // frozen at whatever they were when the main game ended. Read synchronously
  // for the same refresh-safety reason as settings and the timer above.
  const [overtimeActive, setOvertimeActiveState] = useState<boolean>(
    () => loadOvertimeActive(todayStr),
  );
  const [overtimeCells, setOvertimeCellsState] = useState<OvertimeCell[]>(
    () => loadOvertimeCells(todayStr),
  );

  const startOvertime = useCallback(() => {
    saveOvertimeActive(todayStr, true);
    setOvertimeActiveState(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayStr]);

  const overtimeCorrectCount = overtimeCells.length;

  const getRowCol = useCallback(
    (cellIndex: number) => {
      const row = Math.floor(cellIndex / 3);
      const col = cellIndex % 3;
      return { row, col, rowAttr: puzzle.rows[row], colAttr: puzzle.cols[col] };
    },
    [puzzle],
  );

  const fetchRarity = useCallback(
    async (puzzleId: string, cellIndex: number, playerName: string): Promise<number> => {
      try {
        const { count: totalCount } = await supabase
          .from('soccer_grid_selections')
          .select('*', { count: 'exact', head: true })
          .eq('puzzle_id', puzzleId)
          .eq('cell_index', cellIndex);
        const { count: playerCount } = await supabase
          .from('soccer_grid_selections')
          .select('*', { count: 'exact', head: true })
          .eq('puzzle_id', puzzleId)
          .eq('cell_index', cellIndex)
          .eq('player_name', playerName.toLowerCase());
        return rarityPercent(totalCount ?? 0, playerCount ?? 0);
      } catch {
        return 50;
      }
    },
    [],
  );

  // Cells shown on the board during Overtime: the frozen main cells plus any
  // Overtime fills layered on top, so previously-correct cells stay visibly
  // correct and newly-filled Overtime cells render alongside them.
  const overtimeDisplayCells = useMemo<SoccerGridCell[]>(() => {
    if (!overtimeActive) return cells;
    return cells.map((c) => {
      if (c.status === 'correct') return c;
      const ot = overtimeCells.find((o) => o.cellIndex === c.index);
      if (ot) return { index: c.index, playerName: ot.playerName, status: 'correct' as const, rarity: ot.rarity };
      return c;
    });
  }, [cells, overtimeActive, overtimeCells]);

  const isOvertime = overtimeActive && gameStatus === 'complete';

  const submitGuess = useCallback(
    async (playerName: string) => {
      if (activeCell === null || validating) return;
      const stillOwnsBoard = () => canUseBoard(readPlayedDailyPuzzleId(gameSlug, todayStr));
      if (!stillOwnsBoard()) return;

      // Not in Overtime and the main game has ended, nothing to submit.
      if (gameStatus !== 'playing' && !isOvertime) return;

      const currentCell = isOvertime ? overtimeDisplayCells[activeCell] : cells[activeCell];
      if (currentCell.status === 'correct') return;

      // Timed modes start their clock on the first real submission, not on
      // page load, so idle time before typing never costs the player.
      if (gameStatus === 'playing') startTimerIfNeeded();

      setValidating(true);
      const { rowAttr, colAttr } = getRowCol(activeCell);
      const capturedCell = activeCell;

      try {
        const { data, error } = await supabase.functions.invoke('soccer-grid-validate', {
          body: { playerName, rowAttribute: rowAttr.label, colAttribute: colAttr.label },
        });
        if (error) throw error;
        if (!stillOwnsBoard()) return;
        const isValid = data?.valid === true;
        const displayName = data?.fullName || playerName;

        if (isValid) {
          if (!isOvertime && mainRoundComplete.current) return;
          /* Round 401: measure the crowd BEFORE this row joins it. The
             formula adds the player's own row itself; inserting first counted
             it twice (a first pick read 100 instead of the unicorn 101). */
          const rarity = await fetchRarity(puzzle.id, capturedCell, displayName);
          if ((!isOvertime && mainRoundComplete.current) || !stillOwnsBoard()) return;
          await supabase.from('soccer_grid_selections').insert({
            puzzle_id: puzzle.id,
            cell_index: capturedCell,
            player_name: displayName.toLowerCase(),
          });
          if ((!isOvertime && mainRoundComplete.current) || !stillOwnsBoard()) return;

          if (isOvertime) {
            // Overtime picks never touch dailyActions/correctCount/rarityScore -
            // the main recorded score stays exactly as it was when the main
            // game ended. Tracked in its own localStorage list instead.
            setOvertimeCellsState((prev) => {
              const next = [...prev.filter((o) => o.cellIndex !== capturedCell), { cellIndex: capturedCell, playerName: displayName, rarity }];
              saveOvertimeCells(todayStr, next);
              return next;
            });
          } else {
            recordMainGuess({ t: 'ok', cellIndex: capturedCell, playerName: displayName, rarity });
          }
        } else if (data?.unverified) {
          // The fallback can run out while records and cached answers still work.
          if (data?.exhausted) {
            setCheckingDown(true);
            toast.error('The fallback checker has used its allowance for today. This guess was not counted. You can try another player.');
          } else {
            toast.error("Couldn't verify that answer, please try again.");
          }
        } else {
          if (!isOvertime && mainRoundComplete.current) return;
          setWrongFlash({ cellIndex: capturedCell, playerName });
          setTimeout(() => setWrongFlash(null), 1500);
          // Wrong guesses during Overtime don't cost anything, Overtime has
          // no guess limit, it's purely "keep filling what's left".
          if (!isOvertime) recordMainGuess({ t: 'x' });
        }
      } catch {
        // Network error, don't count the guess
      } finally {
        setValidating(false);
        setActiveCell(null);
      }
    },
    [activeCell, gameStatus, validating, isOvertime, overtimeDisplayCells, cells, puzzle, getRowCol, fetchRarity, recordMainGuess, startTimerIfNeeded, todayStr, canUseBoard],
  );

  // Uses the derived gameStatus (which also accounts for timeUp), not
  // rawDailyStatus directly, so a timed-mode round that ends by the clock
  // running out records a completion the same way running out of guesses
  // or winning does.
  useGameCompletion('soccer-grid', gameStatus === 'complete', correctCount * 100);

  return {
    puzzle, activeCell, setActiveCell, submitGuess,
    validating, gameStatus, guessesLeft, correctCount, rarityScore, getRowCol,
    isLoading, isLoadingPool, checkingDown,
    // Board rendering: overtimeDisplayCells layers Overtime fills on top of
    // the frozen main cells; plain `cells` is the main-game-only view.
    cells: overtimeDisplayCells,
    mainCells: cells,
    // Difficulty + timer settings
    settings, settingsLoaded, setDifficulty, setTimerMode,
    timeLeft, timeUp,
    // Overtime
    overtimeActive, isOvertime, startOvertime, overtimeCells, overtimeCorrectCount,
  };
}
