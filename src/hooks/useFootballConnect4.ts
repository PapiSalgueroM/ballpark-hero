import { useState, useCallback } from 'react';
import {
  Board,
  Team,
  GamePhase,
  ROWS,
  COLS,
  FOOTBALL_CONNECT4_BOARDS,
  FootballConnect4Board,
} from '@/types/footballConnect4';

function createEmptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function getRandomBoard(): FootballConnect4Board {
  return FOOTBALL_CONNECT4_BOARDS[Math.floor(Math.random() * FOOTBALL_CONNECT4_BOARDS.length)];
}

function checkWin(board: Board, row: number, col: number, team: Team): boolean {
  const directions = [
    [0, 1],  // horizontal
    [1, 0],  // vertical
    [1, 1],  // diagonal down-right
    [1, -1], // diagonal down-left
  ];

  for (const [dr, dc] of directions) {
    let count = 1;
    // Forward
    for (let i = 1; i < 4; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break;
      if (board[r][c]?.team !== team) break;
      count++;
    }
    // Backward
    for (let i = 1; i < 4; i++) {
      const r = row - dr * i;
      const c = col - dc * i;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break;
      if (board[r][c]?.team !== team) break;
      count++;
    }
    if (count >= 4) return true;
  }
  return false;
}

function getLowestEmptyRow(board: Board, col: number): number {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (!board[row][col]) return row;
  }
  return -1; // column full
}

export function useFootballConnect4() {
  const [boardConfig, setBoardConfig] = useState<FootballConnect4Board>(getRandomBoard);
  const [board, setBoard] = useState<Board>(createEmptyBoard);
  const [currentTurn, setCurrentTurn] = useState<Team>('blue');
  const [phase, setPhase] = useState<GamePhase>('playing');
  const [winner, setWinner] = useState<Team | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [targetRow, setTargetRow] = useState<number | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [usedPlayers, setUsedPlayers] = useState<Set<string>>(new Set());
  const [isDraw, setIsDraw] = useState(false);

  const selectColumn = useCallback(
    (col: number) => {
      if (phase !== 'playing' || isValidating) return;
      const row = getLowestEmptyRow(board, col);
      if (row === -1) {
        setValidationError('This column is full!');
        return;
      }
      setSelectedColumn(col);
      setTargetRow(row);
      setValidationError(null);
    },
    [phase, board, isValidating]
  );

  const cancelSelection = useCallback(() => {
    setSelectedColumn(null);
    setTargetRow(null);
    setValidationError(null);
  }, []);

  const submitPlayer = useCallback(
    async (playerName: string) => {
      if (phase !== 'playing' || selectedColumn === null || targetRow === null) return;

      const trimmed = playerName.trim();
      if (!trimmed) return;

      if (usedPlayers.has(trimmed.toLowerCase())) {
        setValidationError(`${trimmed} has already been used!`);
        return;
      }

      setIsValidating(true);
      setValidationError(null);

      const colAttr = boardConfig.columnAttributes[selectedColumn];
      const rowAttr = boardConfig.rowAttributes[targetRow];

      try {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/football-connect4-validate`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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
          setValidationError(result.reason || 'Player does not match both attributes.');
          setIsValidating(false);
          return;
        }

        const displayName = result.fullName || trimmed;

        if (usedPlayers.has(displayName.toLowerCase())) {
          setValidationError(`${displayName} has already been used!`);
          setIsValidating(false);
          return;
        }

        // Place the piece
        const newBoard = board.map((r) => [...r]);
        newBoard[targetRow][selectedColumn] = { team: currentTurn, playerName: displayName };
        setBoard(newBoard);
        setUsedPlayers((prev) => new Set(prev).add(displayName.toLowerCase()));

        // Check win
        if (checkWin(newBoard, targetRow, selectedColumn, currentTurn)) {
          setPhase('won');
          setWinner(currentTurn);
        } else {
          // Check draw
          const isFull = newBoard[0].every((cell) => cell !== null);
          if (isFull) {
            setPhase('won');
            setIsDraw(true);
          } else {
            setCurrentTurn(currentTurn === 'blue' ? 'red' : 'blue');
          }
        }

        setSelectedColumn(null);
        setTargetRow(null);
      } catch {
        setValidationError('Network error — please try again.');
      }

      setIsValidating(false);
    },
    [phase, selectedColumn, targetRow, board, currentTurn, boardConfig, usedPlayers]
  );

  const skipTurn = useCallback(() => {
    if (phase !== 'playing') return;
    setCurrentTurn(currentTurn === 'blue' ? 'red' : 'blue');
    setSelectedColumn(null);
    setTargetRow(null);
    setValidationError(null);
  }, [phase, currentTurn]);

  const resetGame = useCallback(() => {
    setBoardConfig(getRandomBoard());
    setBoard(createEmptyBoard());
    setCurrentTurn('blue');
    setPhase('playing');
    setWinner(null);
    setSelectedColumn(null);
    setTargetRow(null);
    setIsValidating(false);
    setValidationError(null);
    setUsedPlayers(new Set());
    setIsDraw(false);
  }, []);

  const getShareText = useCallback(() => {
    const grid = board
      .map((row) =>
        row.map((cell) => (cell?.team === 'blue' ? '🔵' : cell?.team === 'red' ? '🔴' : '⚪')).join('')
      )
      .join('\n');
    const result = isDraw ? "It's a draw!" : `${winner === 'blue' ? '🔵 Blue' : '🔴 Red'} wins!`;
    return `⚽ Football Connect 4\n${result}\n\n${grid}\n\nPlay at douknowball.lovable.app/football-connect-4`;
  }, [board, winner, isDraw]);

  return {
    boardConfig,
    board,
    currentTurn,
    phase,
    winner,
    isDraw,
    selectedColumn,
    targetRow,
    isValidating,
    validationError,
    selectColumn,
    cancelSelection,
    submitPlayer,
    skipTurn,
    resetGame,
    getShareText,
  };
}
