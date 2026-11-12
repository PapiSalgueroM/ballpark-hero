import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeName } from '@/lib/playerSearch';
import { markRestoredFinish } from '@/lib/restoredFinish';
import { safeSetItem } from '@/lib/safeStorage';

export type FilledCell = { playerName: string };

type Board = {
  cells: Record<number, FilledCell>;
  wrong: number;
};

function readBoard(key: string, date: string): Board | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { date: string; cells: Board['cells']; wrong?: number };
    if (saved?.date !== date || !saved.cells || typeof saved.cells !== 'object' || Array.isArray(saved.cells)) return null;
    return { cells: saved.cells, wrong: saved.wrong ?? 0 };
  } catch {
    return null;
  }
}

const filled = (board: Board) => Object.keys(board.cells).length;

export function useFranchiseGridDailyBoard(gameSlug: string, date: string, guessLimit: number) {
  const key = `${gameSlug}-daily-${date}`;
  const [board, setBoard] = useState<Board>(() => readBoard(key, date) ?? { cells: {}, wrong: 0 });
  const current = useRef(board);

  const isFinished = useCallback((snapshot: Board) => filled(snapshot) >= 9 || snapshot.wrong >= guessLimit, [guessLimit]);

  const readLatest = useCallback(() => {
    const before = current.current;
    if (isFinished(before)) return before;

    const saved = readBoard(key, date);
    if (!saved) return before;

    if (isFinished(saved)) {
      markRestoredFinish(gameSlug);
    } else {
      const savedCount = filled(saved);
      const beforeCount = filled(before);
      if (savedCount + saved.wrong < beforeCount + before.wrong) return before;
      if (savedCount === beforeCount && saved.wrong === before.wrong &&
        Object.entries(saved.cells).every(([index, cell]) => before.cells[Number(index)]?.playerName === cell.playerName)
      ) return before;
    }

    current.current = saved;
    setBoard(saved);
    return saved;
  }, [date, gameSlug, isFinished, key]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) readLatest();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key, readLatest]);

  const settleGuess = useCallback((index: number, nameKey: string, playerName: string | null) => {
    // Another tab may have saved a turn before this tab receives the storage event.
    const before = readLatest();
    if (isFinished(before) || before.cells[index]) return 'ignored';

    const correct = playerName !== null &&
      !Object.values(before.cells).some((cell) => normalizeName(cell.playerName) === nameKey);
    const next = correct
      ? { cells: { ...before.cells, [index]: { playerName } }, wrong: before.wrong }
      : { cells: before.cells, wrong: before.wrong + 1 };

    current.current = next;
    safeSetItem(key, JSON.stringify({ date, cells: next.cells, wrong: next.wrong }));
    setBoard(next);
    return correct ? 'correct' : 'wrong';
  }, [date, isFinished, key, readLatest]);

  return { board, readLatest, settleGuess };
}
