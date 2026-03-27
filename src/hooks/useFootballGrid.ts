import { useState, useEffect, useMemo, useCallback } from 'react';
import { footballGridPuzzles } from '@/data/footballGridPuzzles';
import { CellState, FootballGridGameStatus, GridPuzzle } from '@/types/footballGrid';
import { supabase } from '@/integrations/supabase/client';
import { useGameCompletion } from '@/hooks/useGameCompletion';

export function useFootballGrid() {
  const puzzle: GridPuzzle = useMemo(() => footballGridPuzzles[Math.floor(Math.random() * footballGridPuzzles.length)], []);

  const [cells, setCells] = useState<CellState[]>(() =>
    Array.from({ length: 9 }, (_, i) => ({
      index: i,
      playerName: null,
      status: 'empty' as const,
      rarity: null,
    }))
  );

  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [validating, setValidating] = useState(false);
  const [guessesLeft, setGuessesLeft] = useState(15);

  const correctCount = cells.filter((c) => c.status === 'correct').length;
  const gameStatus: FootballGridGameStatus =
    correctCount === 9 || guessesLeft <= 0 ? 'complete' : 'playing';

  const rarityScore = useMemo(() => {
    const correctCells = cells.filter((c) => c.status === 'correct' && c.rarity !== null);
    if (correctCells.length === 0) return null;
    const avg = correctCells.reduce((sum, c) => sum + (c.rarity ?? 0), 0) / correctCells.length;
    return Math.round(avg);
  }, [cells]);

  const getRowCol = (cellIndex: number) => {
    const row = Math.floor(cellIndex / 3);
    const col = cellIndex % 3;
    return { row, col, rowAttr: puzzle.rows[row], colAttr: puzzle.cols[col] };
  };

  const fetchRarity = useCallback(async (puzzleId: string, cellIndex: number, playerName: string): Promise<number> => {
    try {
      const { count: totalCount } = await supabase
        .from('football_grid_selections')
        .select('*', { count: 'exact', head: true })
        .eq('puzzle_id', puzzleId)
        .eq('cell_index', cellIndex);

      const { count: playerCount } = await supabase
        .from('football_grid_selections')
        .select('*', { count: 'exact', head: true })
        .eq('puzzle_id', puzzleId)
        .eq('cell_index', cellIndex)
        .eq('player_name', playerName.toLowerCase());

      const total = (totalCount ?? 0) + 1;
      const player = (playerCount ?? 0) + 1;
      return Math.round((player / total) * 100);
    } catch {
      return 50;
    }
  }, []);

  const submitGuess = useCallback(async (playerName: string) => {
    if (activeCell === null || gameStatus !== 'playing' || validating) return;
    if (cells[activeCell].status === 'correct') return;

    setValidating(true);
    const { rowAttr, colAttr } = getRowCol(activeCell);

    try {
      const { data, error } = await supabase.functions.invoke('football-grid-validate', {
        body: {
          playerName,
          rowAttribute: rowAttr.label,
          colAttribute: colAttr.label,
        },
      });

      if (error) throw error;
      const isValid = data?.valid === true;

      if (isValid) {
        await supabase.from('football_grid_selections').insert({
          puzzle_id: puzzle.id,
          cell_index: activeCell,
          player_name: playerName.toLowerCase(),
        });

        const rarity = await fetchRarity(puzzle.id, activeCell, playerName);

        setCells((prev) =>
          prev.map((c, i) =>
            i === activeCell ? { ...c, playerName, status: 'correct', rarity } : c
          )
        );
      } else {
        setCells((prev) =>
          prev.map((c, i) =>
            i === activeCell ? { ...c, playerName, status: 'wrong' } : c
          )
        );
        setTimeout(() => {
          setCells((prev) =>
            prev.map((c, i) =>
              i === activeCell && c.status === 'wrong' ? { ...c, playerName: null, status: 'empty' } : c
            )
          );
        }, 1500);
      }

      setGuessesLeft((g) => g - 1);
    } catch {
      // On error, don't count the guess
    } finally {
      setValidating(false);
      setActiveCell(null);
    }
  }, [activeCell, gameStatus, validating, cells, puzzle.id, fetchRarity]);

  useGameCompletion('football-grid', gameStatus === 'complete', correctCount * 100);

  return {
    puzzle,
    cells,
    activeCell,
    setActiveCell,
    submitGuess,
    validating,
    gameStatus,
    guessesLeft,
    correctCount,
    rarityScore,
    getRowCol,
  };
}
