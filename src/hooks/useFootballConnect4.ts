import { useState, useCallback, useMemo } from 'react';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import {
  Board,
  Team,
  GamePhase,
  ROWS,
  COLS,
  FOOTBALL_CONNECT4_BOARDS,
  FootballConnect4Board,
} from '@/types/footballConnect4';

type C4Action =
  | { t: 'move'; col: number; row: number; team: Team; playerName: string }
  | { t: 'skip'; team: Team };

export type FootballConnect4Mode = 'daily' | 'unlimited';

function createEmptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function getRandomBoard(): FootballConnect4Board {
  return FOOTBALL_CONNECT4_BOARDS[Math.floor(Math.random() * FOOTBALL_CONNECT4_BOARDS.length)];
}

function checkWin(board: Board, row: number, col: number, team: Team): boolean {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (const [dr, dc] of directions) {
    let count = 1;
    for (let i = 1; i < 4; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break;
      if (board[r][c]?.team !== team) break;
      count++;
    }
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
  return -1;
}

function replayC4Board(actions: C4Action[]): {
  board: Board;
  currentTurn: Team;
  phase: GamePhase;
  winner: Team | null;
  isDraw: boolean;
  usedPlayers: Set<string>;
} {
  const board = createEmptyBoard();
  let currentTurn: Team = 'blue';
  let phase: GamePhase = 'playing';
  let winner: Team | null = null;
  let isDraw = false;
  const usedPlayers = new Set<string>();

  for (const action of actions) {
    if (action.t === 'move') {
      board[action.row][action.col] = { team: action.team, playerName: action.playerName };
      usedPlayers.add(action.playerName.toLowerCase());
      if (checkWin(board, action.row, action.col, action.team)) {
        phase = 'won';
        winner = action.team;
        break;
      }
      const isFull = board[0].every((cell) => cell !== null);
      if (isFull) {
        phase = 'won';
        isDraw = true;
        break;
      }
      currentTurn = action.team === 'blue' ? 'red' : 'blue';
    } else if (action.t === 'skip') {
      currentTurn = action.team === 'blue' ? 'red' : 'blue';
    }
  }

  return { board, currentTurn, phase, winner, isDraw, usedPlayers };
}

export function useFootballConnect4() {
  const [mode, setMode] = useState<FootballConnect4Mode>('daily');

  // Daily persistence
  const {
    puzzle: dailyBoardConfig,
    guesses: dailyActions,
    addGuess: addDailyAction,
    gameStatus: rawDailyStatus,
    isLoading,
  } = useDailyPuzzle<FootballConnect4Board, C4Action>({
    gameSlug: 'football-connect4',
    puzzles: FOOTBALL_CONNECT4_BOARDS,
    maxGuesses: 999,
    isWon: (actions) => replayC4Board(actions).phase === 'won',
    deserializeGuesses: (raw) => raw as C4Action[],
  });

  const dailyState = useMemo(() => replayC4Board(dailyActions), [dailyActions]);

  // Unlimited local state
  const [unlimitedBoardConfig, setUnlimitedBoardConfig] = useState<FootballConnect4Board>(getRandomBoard);
  const [unlimitedBoard, setUnlimitedBoard] = useState<Board>(createEmptyBoard);
  const [unlimitedCurrentTurn, setUnlimitedCurrentTurn] = useState<Team>('blue');
  const [unlimitedPhase, setUnlimitedPhase] = useState<GamePhase>('playing');
  const [unlimitedWinner, setUnlimitedWinner] = useState<Team | null>(null);
  const [unlimitedIsDraw, setUnlimitedIsDraw] = useState(false);
  const [unlimitedUsedPlayers, setUnlimitedUsedPlayers] = useState<Set<string>>(new Set());

  // Active values — daily replays from action log; unlimited uses local state
  const boardConfig = mode === 'daily' ? (dailyBoardConfig ?? FOOTBALL_CONNECT4_BOARDS[0]) : unlimitedBoardConfig;
  const board = mode === 'daily' ? dailyState.board : unlimitedBoard;
  const currentTurn = mode === 'daily' ? dailyState.currentTurn : unlimitedCurrentTurn;
  const phase: GamePhase = mode === 'daily'
    ? (rawDailyStatus !== 'playing' ? 'won' : 'playing')
    : unlimitedPhase;
  const winner = mode === 'daily' ? dailyState.winner : unlimitedWinner;
  const isDraw = mode === 'daily' ? dailyState.isDraw : unlimitedIsDraw;
  const usedPlayers = mode === 'daily' ? dailyState.usedPlayers : unlimitedUsedPlayers;

  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [targetRow, setTargetRow] = useState<number | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

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
    [phase, board, isValidating],
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
          `${"https://flawuiqbvjobmkfkauhw.supabase.co"}/functions/v1/football-connect4-validate`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsYXd1aXFidmpvYm1rZmthdWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTUwNzYsImV4cCI6MjA5MTQzMTA3Nn0.L8xWIXikPIaXC0XOL-FLOuPQb6idws2NdliARxBgk_Y"}`,
            },
            body: JSON.stringify({ playerName: trimmed, columnAttribute: colAttr, rowAttribute: rowAttr }),
          },
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

        if (mode === 'daily') {
          addDailyAction({ t: 'move', col: selectedColumn, row: targetRow, team: currentTurn, playerName: displayName });
        } else {
          const newBoard = unlimitedBoard.map((r) => [...r]);
          newBoard[targetRow][selectedColumn] = { team: currentTurn, playerName: displayName };
          setUnlimitedBoard(newBoard);
          setUnlimitedUsedPlayers((prev) => new Set(prev).add(displayName.toLowerCase()));

          if (checkWin(newBoard, targetRow, selectedColumn, currentTurn)) {
            setUnlimitedPhase('won');
            setUnlimitedWinner(currentTurn);
          } else {
            const isFull = newBoard[0].every((cell) => cell !== null);
            if (isFull) {
              setUnlimitedPhase('won');
              setUnlimitedIsDraw(true);
            } else {
              setUnlimitedCurrentTurn(currentTurn === 'blue' ? 'red' : 'blue');
            }
          }
        }

        setSelectedColumn(null);
        setTargetRow(null);
      } catch {
        setValidationError('Network error — please try again.');
      }

      setIsValidating(false);
    },
    [phase, selectedColumn, targetRow, board, currentTurn, boardConfig, usedPlayers, mode, addDailyAction, unlimitedBoard],
  );

  const skipTurn = useCallback(() => {
    if (phase !== 'playing') return;
    if (mode === 'daily') {
      addDailyAction({ t: 'skip', team: currentTurn });
    } else {
      setUnlimitedCurrentTurn(currentTurn === 'blue' ? 'red' : 'blue');
    }
    setSelectedColumn(null);
    setTargetRow(null);
    setValidationError(null);
  }, [phase, currentTurn, mode, addDailyAction]);

  const switchMode = useCallback((m: FootballConnect4Mode) => {
    if (m === 'unlimited') {
      setUnlimitedBoardConfig(getRandomBoard());
      setUnlimitedBoard(createEmptyBoard());
      setUnlimitedCurrentTurn('blue');
      setUnlimitedPhase('playing');
      setUnlimitedWinner(null);
      setUnlimitedIsDraw(false);
      setUnlimitedUsedPlayers(new Set());
    }
    setMode(m);
    setSelectedColumn(null);
    setTargetRow(null);
    setValidationError(null);
  }, []);

  const resetGame = useCallback(() => {
    if (mode !== 'unlimited') return;
    setUnlimitedBoardConfig(getRandomBoard());
    setUnlimitedBoard(createEmptyBoard());
    setUnlimitedCurrentTurn('blue');
    setUnlimitedPhase('playing');
    setUnlimitedWinner(null);
    setUnlimitedIsDraw(false);
    setUnlimitedUsedPlayers(new Set());
    setSelectedColumn(null);
    setTargetRow(null);
    setValidationError(null);
  }, [mode]);

  const getShareText = useCallback(() => {
    const grid = board
      .map((r) =>
        r.map((cell) => (cell?.team === 'blue' ? '🔵' : cell?.team === 'red' ? '🔴' : '⚪')).join(''),
      )
      .join('\n');
    const result = isDraw ? "It's a draw!" : `${winner === 'blue' ? '🔵 Blue' : '🔴 Red'} wins!`;
    return `⚽ Soccer Connect 4\n${result}\n\n${grid}\n\nPlay at douknowball.com/football-connect-4`;
  }, [board, winner, isDraw]);

  useGameCompletion('football-connect4', rawDailyStatus !== 'playing', winner ? 500 : 0);

  return {
    mode, switchMode,
    boardConfig, board, currentTurn, phase, winner, isDraw,
    selectedColumn, targetRow, isValidating, validationError,
    selectColumn, cancelSelection, submitPlayer, skipTurn, resetGame, getShareText,
    isLoading,
  };
}
