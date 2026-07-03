import { useState, useCallback } from 'react';
import { getRandomConnect4Board } from '@/data/nbaConnect4Boards';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { normalizeName } from '@/lib/playerSearch';
import type {
  Connect4Team,
  Connect4Grid,
  Connect4Phase,
  Connect4Board,
  Connect4WinInfo,
} from '@/types/nbaConnect4';

const ROWS = 6;
const COLS = 7;

function createEmptyGrid(): Connect4Grid {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function checkWin(grid: Connect4Grid, team: Connect4Team): [number, number][] | null {
  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if (
        grid[r][c]?.team === team &&
        grid[r][c + 1]?.team === team &&
        grid[r][c + 2]?.team === team &&
        grid[r][c + 3]?.team === team
      ) {
        return [[r, c], [r, c + 1], [r, c + 2], [r, c + 3]];
      }
    }
  }
  // Vertical
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c < COLS; c++) {
      if (
        grid[r][c]?.team === team &&
        grid[r + 1][c]?.team === team &&
        grid[r + 2][c]?.team === team &&
        grid[r + 3][c]?.team === team
      ) {
        return [[r, c], [r + 1, c], [r + 2, c], [r + 3, c]];
      }
    }
  }
  // Diagonal down-right
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if (
        grid[r][c]?.team === team &&
        grid[r + 1][c + 1]?.team === team &&
        grid[r + 2][c + 2]?.team === team &&
        grid[r + 3][c + 3]?.team === team
      ) {
        return [[r, c], [r + 1, c + 1], [r + 2, c + 2], [r + 3, c + 3]];
      }
    }
  }
  // Diagonal down-left
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 3; c < COLS; c++) {
      if (
        grid[r][c]?.team === team &&
        grid[r + 1][c - 1]?.team === team &&
        grid[r + 2][c - 2]?.team === team &&
        grid[r + 3][c - 3]?.team === team
      ) {
        return [[r, c], [r + 1, c - 1], [r + 2, c - 2], [r + 3, c - 3]];
      }
    }
  }
  return null;
}

function getLowestEmptyRow(grid: Connect4Grid, col: number): number | null {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (!grid[r][col]) return r;
  }
  return null;
}

export function useNbaConnect4() {
  const [board, setBoard] = useState<Connect4Board>(getRandomConnect4Board);
  const [grid, setGrid] = useState<Connect4Grid>(createEmptyGrid);
  const [currentTeam, setCurrentTeam] = useState<Connect4Team>('red');
  const [phase, setPhase] = useState<Connect4Phase>('playing');
  const [winInfo, setWinInfo] = useState<Connect4WinInfo | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedCol, setSelectedCol] = useState<number | null>(null);
  const [usedPlayers, setUsedPlayers] = useState<Set<string>>(new Set());

  // Get the target row for a column (where the piece would land)
  const getTargetRow = useCallback(
    (col: number) => getLowestEmptyRow(grid, col),
    [grid]
  );

  const selectColumn = useCallback(
    (col: number) => {
      if (phase !== 'playing') return;
      const row = getLowestEmptyRow(grid, col);
      if (row === null) return; // column full
      setSelectedCol(col);
      setValidationError(null);
    },
    [grid, phase]
  );

  const submitPlayer = useCallback(
    async (playerName: string) => {
      if (selectedCol === null || phase !== 'playing') return;
      const targetRow = getLowestEmptyRow(grid, selectedCol);
      if (targetRow === null) return;

      const trimmed = playerName.trim();
      const normalized = normalizeName(trimmed);

      // Check duplicate
      if (usedPlayers.has(normalized)) {
        setValidationError(`${trimmed} has already been used!`);
        return;
      }

      setIsValidating(true);
      setValidationError(null);

      const colAttr = board.columnAttributes[selectedCol];
      const rowAttr = board.rowAttributes[targetRow];

      let displayName = trimmed;

      try {
        const resp = await fetch(
          `${"https://flawuiqbvjobmkfkauhw.supabase.co"}/functions/v1/nba-connect4-validate`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsYXd1aXFidmpvYm1rZmthdWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTUwNzYsImV4cCI6MjA5MTQzMTA3Nn0.L8xWIXikPIaXC0XOL-FLOuPQb6idws2NdliARxBgk_Y"}`,
            },
            body: JSON.stringify({
              playerName: trimmed,
              columnAttribute: colAttr,
              rowAttribute: rowAttr,
            }),
          }
        );

        const result = await resp.json();

        if (!result.valid) {
          setValidationError(
            result.reason || `${trimmed} doesn't match both "${colAttr}" and "${rowAttr}"`
          );
          setIsValidating(false);
          return;
        }

        // Use the full proper name from AI if available
        if (result.fullName) displayName = result.fullName;
      } catch {
        // Allow on error
      }

      // Re-check duplicate against the resolved display name too, in case the
      // fact-check normalized/corrected it to a name already on the board.
      const normalizedDisplayName = normalizeName(displayName);
      if (usedPlayers.has(normalizedDisplayName)) {
        setValidationError(`${displayName} has already been used!`);
        setIsValidating(false);
        return;
      }

      // Place the piece
      const newGrid = grid.map((row) => [...row]);
      newGrid[targetRow][selectedCol] = { team: currentTeam, playerName: displayName };
      setGrid(newGrid);
      setUsedPlayers((prev) => new Set(prev).add(normalizedDisplayName));

      // Check win
      const winCells = checkWin(newGrid, currentTeam);
      if (winCells) {
        setWinInfo({ winner: currentTeam, cells: winCells });
        setPhase('won');
      } else {
        const isFull = newGrid.every((row) => row.every((cell) => cell !== null));
        if (isFull) {
          setPhase('draw');
        } else {
          setCurrentTeam((t) => (t === 'red' ? 'blue' : 'red'));
        }
      }

      setSelectedCol(null);
      setIsValidating(false);
      setValidationError(null);
    },
    [selectedCol, grid, currentTeam, phase, board, usedPlayers]
  );

  const skipTurn = useCallback(() => {
    if (phase !== 'playing') return;
    setCurrentTeam((t) => (t === 'red' ? 'blue' : 'red'));
    setSelectedCol(null);
    setValidationError(null);
  }, [phase]);

  const resetGame = useCallback(() => {
    setBoard(getRandomConnect4Board());
    setGrid(createEmptyGrid());
    setCurrentTeam('red');
    setPhase('playing');
    setWinInfo(null);
    setIsValidating(false);
    setValidationError(null);
    setSelectedCol(null);
    setUsedPlayers(new Set());
  }, []);

  useGameCompletion('nba-connect4', phase === 'won' || phase === 'draw', phase === 'won' ? 500 : 200);

  return {
    board,
    grid,
    currentTeam,
    phase,
    winInfo,
    isValidating,
    validationError,
    selectedCol,
    usedPlayers,
    getTargetRow,
    selectColumn,
    submitPlayer,
    skipTurn,
    resetGame,
  };
}
