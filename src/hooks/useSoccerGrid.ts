import { useState, useMemo, useCallback, useEffect } from 'react';
import { soccerGridPuzzles } from '@/data/soccerGridPuzzles';
import { SoccerGridCell, SoccerGridGameStatus, SoccerGridPuzzle } from '@/types/soccerGrid';
import { supabase } from '@/integrations/supabase/client';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { fetchSoccerGridPuzzles } from '@/lib/fetchSoccerGridPuzzles';
import { dateSeed, getTodayET } from '@/lib/dateUtils';

type GridAction =
  | { t: 'ok'; cellIndex: number; playerName: string; rarity: number }
  | { t: 'x' };

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

  // Compute today's puzzle from the live pool using the same date-seed formula as
  // useDailyPuzzle. Passed as supabasePuzzle so the selection dynamically reflects
  // the full Supabase pool (including puzzles added in Round 4+), not just the
  // initial 15 in the hardcoded fallback.
  const todaysPuzzle = useMemo(() => {
    const seed = dateSeed(getTodayET());
    return puzzlePool.length > 0 ? puzzlePool[seed % puzzlePool.length] : null;
  }, [puzzlePool]);

  const {
    puzzle: dailyPuzzle,
    guesses: dailyActions,
    addGuess: addDailyGuess,
    gameStatus: rawDailyStatus,
    isLoading,
  } = useDailyPuzzle<SoccerGridPuzzle, GridAction>({
    gameSlug: 'soccer-grid',
    // soccerGridPuzzles is the stable module-level ref required by useDailyPuzzle's
    // dep array (puzzles is intentionally excluded from its useMemo deps). The actual
    // puzzle selection comes from supabasePuzzle below — this is just the fallback pool.
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
  const gameStatus: SoccerGridGameStatus = rawDailyStatus !== 'playing' ? 'complete' : 'playing';

  const rarityScore = useMemo(() => {
    if (correctActions.length === 0) return null;
    const avg = correctActions.reduce((sum, a) => sum + Math.min(a.rarity, 100), 0) / correctActions.length;
    return Math.round(avg);
  }, [correctActions]);

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
        if (!totalCount) return 101; // unicorn — first pick for this cell
        const total = totalCount + 1;
        const player = (playerCount ?? 0) + 1;
        return Math.round((player / total) * 100);
      } catch {
        return 50;
      }
    },
    [],
  );

  const submitGuess = useCallback(
    async (playerName: string) => {
      if (activeCell === null || gameStatus !== 'playing' || validating) return;
      if (cells[activeCell].status === 'correct') return;

      setValidating(true);
      const { rowAttr, colAttr } = getRowCol(activeCell);
      const capturedCell = activeCell;

      try {
        const { data, error } = await supabase.functions.invoke('soccer-grid-validate', {
          body: { playerName, rowAttribute: rowAttr.label, colAttribute: colAttr.label },
        });
        if (error) throw error;
        const isValid = data?.valid === true;
        const displayName = data?.fullName || playerName;

        if (isValid) {
          await supabase.from('soccer_grid_selections').insert({
            puzzle_id: puzzle.id,
            cell_index: capturedCell,
            player_name: displayName.toLowerCase(),
          });
          const rarity = await fetchRarity(puzzle.id, capturedCell, displayName);
          addDailyGuess({ t: 'ok', cellIndex: capturedCell, playerName: displayName, rarity });
        } else {
          setWrongFlash({ cellIndex: capturedCell, playerName });
          setTimeout(() => setWrongFlash(null), 1500);
          addDailyGuess({ t: 'x' });
        }
      } catch {
        // Network error — don't count the guess
      } finally {
        setValidating(false);
        setActiveCell(null);
      }
    },
    [activeCell, gameStatus, validating, cells, puzzle, getRowCol, fetchRarity, addDailyGuess],
  );

  useGameCompletion('soccer-grid', rawDailyStatus !== 'playing', correctCount * 100);

  return {
    puzzle, cells, activeCell, setActiveCell, submitGuess,
    validating, gameStatus, guessesLeft, correctCount, rarityScore, getRowCol,
    isLoading, isLoadingPool,
  };
}
