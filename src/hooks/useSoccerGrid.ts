import { useState, useEffect, useMemo, useCallback } from 'react';
import { soccerGridPuzzles } from '@/data/soccerGridPuzzles';
import { SoccerGridCell, SoccerGridGameStatus, SoccerGridPuzzle } from '@/types/soccerGrid';
import { supabase } from '@/integrations/supabase/client';
import { useGameCompletion } from '@/hooks/useGameCompletion';

function getDailyIndex(): number {
  const now = new Date();
  const start = new Date('2026-01-01');
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.abs(diffDays) % soccerGridPuzzles.length;
}

export function useSoccerGrid() {
  const puzzle: SoccerGridPuzzle = useMemo(() => soccerGridPuzzles[getDailyIndex()], []);
  const storageKey = `sg-daily-${puzzle.id}`;

  const [cells, setCells] = useState<SoccerGridCell[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return Array.from({ length: 9 }, (_, i) => ({
      index: i, playerName: null, status: 'empty' as const, rarity: null,
    }));
  });

  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [validating, setValidating] = useState(false);
  const [guessesLeft, setGuessesLeft] = useState(() => {
    const saved = localStorage.getItem(`${storageKey}-guesses`);
    return saved ? parseInt(saved, 10) : 15;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(cells));
  }, [cells, storageKey]);

  useEffect(() => {
    localStorage.setItem(`${storageKey}-guesses`, String(guessesLeft));
  }, [guessesLeft, storageKey]);

  const correctCount = cells.filter((c) => c.status === 'correct').length;
  const gameStatus: SoccerGridGameStatus =
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
      const { data, error } = await supabase.functions.invoke('soccer-grid-validate', {
        body: {
          playerName,
          rowAttribute: rowAttr.label,
          colAttribute: colAttr.label,
        },
      });

      if (error) throw error;
      const isValid = data?.valid === true;

      if (isValid) {
        await supabase.from('soccer_grid_selections').insert({
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

  useGameCompletion('soccer-grid', gameStatus === 'complete', correctCount * 100);

  return {
    puzzle, cells, activeCell, setActiveCell, submitGuess,
    validating, gameStatus, guessesLeft, correctCount, rarityScore, getRowCol,
  };
}
