import { useState, useMemo, useCallback } from 'react';
import { collegeGridPuzzles } from '@/data/collegeGridPuzzles';
import { CellState, FootballGridGameStatus, GridPuzzle } from '@/types/footballGrid';
import { supabase } from '@/integrations/supabase/client';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { toast } from 'sonner';
import { rarityPercent } from '@/lib/gridRarity';

type GridAction =
  | { t: 'ok'; cellIndex: number; playerName: string; rarity: number }
  | { t: 'x' };

export function useCollegeGrid() {
  const {
    puzzle: dailyPuzzle,
    guesses: dailyActions,
    addGuess: addDailyGuess,
    gameStatus: rawDailyStatus,
    isLoading,
  } = useDailyPuzzle<GridPuzzle, GridAction>({
    gameSlug: 'college-grid',
    puzzles: collegeGridPuzzles,
    maxGuesses: 15,
    isWon: (g) => g.filter((a) => a.t === 'ok').length >= 9,
    deserializeGuesses: (raw) => raw as GridAction[],
  });

  const puzzle = dailyPuzzle ?? collegeGridPuzzles[0];

  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [validating, setValidating] = useState(false);
  const [checkingDown, setCheckingDown] = useState(false);
  const [wrongFlash, setWrongFlash] = useState<{ cellIndex: number; playerName: string } | null>(null);

  const correctActions = useMemo(
    () => dailyActions.filter((a): a is { t: 'ok'; cellIndex: number; playerName: string; rarity: number } => a.t === 'ok'),
    [dailyActions],
  );

  const cells = useMemo<CellState[]>(
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
  const gameStatus: FootballGridGameStatus = rawDailyStatus !== 'playing' ? 'complete' : 'playing';

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
          .from('college_grid_selections')
          .select('*', { count: 'exact', head: true })
          .eq('puzzle_id', puzzleId)
          .eq('cell_index', cellIndex);
        const { count: playerCount } = await supabase
          .from('college_grid_selections')
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

  const submitGuess = useCallback(
    async (playerName: string) => {
      if (activeCell === null || gameStatus !== 'playing' || validating) return;
      if (cells[activeCell].status === 'correct') return;

      setValidating(true);
      const { rowAttr, colAttr } = getRowCol(activeCell);
      const capturedCell = activeCell;

      try {
        const { data, error } = await supabase.functions.invoke('college-grid-validate', {
          body: { playerName, rowAttribute: rowAttr.label, colAttribute: colAttr.label },
        });
        if (error) throw error;
        const isValid = data?.valid === true;

        if (isValid) {
          /* Round 401: measure the crowd BEFORE this row joins it. The
             formula adds the player's own row itself; inserting first counted
             it twice (a first pick read 100 instead of the unicorn 101). */
          const rarity = await fetchRarity(puzzle.id, capturedCell, playerName);
          await supabase.from('college_grid_selections').insert({
            puzzle_id: puzzle.id,
            cell_index: capturedCell,
            player_name: playerName.toLowerCase(),
          });
          addDailyGuess({ t: 'ok', cellIndex: capturedCell, playerName, rarity });
        } else if (data?.unverified) {
          /* Round 407: the validator says which it was. A blip is worth a
             retry; the day's allowance is not, and the guess was never
             counted either way. */
          if (data?.exhausted) {
            setCheckingDown(true);
            toast.error('Answer checking has used up its allowance for today. This guess was not counted; your board is saved, come back tomorrow.');
          } else {
            toast.error("Couldn't verify that answer, please try again.");
          }
        } else {
          setWrongFlash({ cellIndex: capturedCell, playerName });
          setTimeout(() => setWrongFlash(null), 1500);
          addDailyGuess({ t: 'x' });
        }
      } catch {
        // Network error, don't count the guess
      } finally {
        setValidating(false);
        setActiveCell(null);
      }
    },
    [activeCell, gameStatus, validating, cells, puzzle, getRowCol, fetchRarity, addDailyGuess],
  );

  useGameCompletion('college-grid', rawDailyStatus !== 'playing', correctCount * 100);

  return {
    puzzle, cells, activeCell, setActiveCell, submitGuess,
    validating, gameStatus, guessesLeft, correctCount, rarityScore, getRowCol, isLoading, checkingDown,
  };
}
