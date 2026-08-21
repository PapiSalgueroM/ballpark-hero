import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getTodayET } from '@/lib/dateUtils';
import {
  COMPETITIONS, fetchCompetitionRows, aggregateCounts, buildBoards, judge,
  BOARD_SIZE, DAILY_BOARDS, ATTEMPTS,
  type TeamCount, type SortBoard,
} from '@/lib/silverwareSort';
import { useGameCompletion } from '@/hooks/useGameCompletion';

export type SortMode = 'daily' | 'unlimited';
export type LoadState = 'loading' | 'ready' | 'error';

const STORAGE_PREFIX = 'silverware-sort-';

export interface BoardResult {
  /** greens on the final submit, 0 to BOARD_SIZE */
  s: number;
  /** perfect on the first attempt */
  f: boolean;
  /** final per-position greens, for the share grid */
  g: boolean[];
}

interface SavedDaily {
  results: BoardResult[];
}

/** Fail closed: anything that is not the exact saved shape loads as null. */
export function loadDailySave(raw: string | null): SavedDaily | null {
  if (!raw) return null;
  try {
    const p: unknown = JSON.parse(raw);
    if (typeof p !== 'object' || p === null || Array.isArray(p)) return null;
    const results = (p as Record<string, unknown>).results;
    if (!Array.isArray(results) || results.length > DAILY_BOARDS) return null;
    for (const r of results) {
      if (typeof r !== 'object' || r === null || Array.isArray(r)) return null;
      const { s, f, g } = r as Record<string, unknown>;
      if (typeof s !== 'number' || !Number.isInteger(s) || s < 0 || s > BOARD_SIZE) return null;
      if (typeof f !== 'boolean') return null;
      if (!Array.isArray(g) || g.length !== BOARD_SIZE || !g.every(x => typeof x === 'boolean')) return null;
      if (g.filter(Boolean).length !== s) return null;
      if (f && s !== BOARD_SIZE) return null;
    }
    return { results: results as BoardResult[] };
  } catch {
    return null;
  }
}

export function useSilverwareSort() {
  const today = getTodayET();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [countsByKey, setCountsByKey] = useState<Map<string, TeamCount[]> | null>(null);
  const [mode, setMode] = useState<SortMode>('daily');
  const [results, setResults] = useState<BoardResult[]>([]);
  const [unlimitedRun, setUnlimitedRun] = useState(0);
  const unlimitedNonce = useRef(String(Date.now() % 1000000007));

  // within-board state
  const [slots, setSlots] = useState<(number | null)[]>(Array(BOARD_SIZE).fill(null));
  const [locked, setLocked] = useState<boolean[]>(Array(BOARD_SIZE).fill(false));
  const [attempt, setAttempt] = useState(1);
  const [revealed, setRevealed] = useState<boolean[] | null>(null); // final greens while showing the reveal

  useEffect(() => {
    let alive = true;
    // A dead network can leave fetches hanging rather than rejecting, so
    // the spinner gets a watchdog: after 15 seconds of nothing, show the
    // honest error card. If the data lands late anyway, ready wins.
    const watchdog = window.setTimeout(() => {
      if (alive) setLoadState(s => (s === 'loading' ? 'error' : s));
    }, 15000);
    (async () => {
      try {
        const entries = await Promise.all(
          COMPETITIONS.map(async c => [c.key, aggregateCounts(await fetchCompetitionRows(c).catch(() => []))] as const),
        );
        if (!alive) return;
        const m = new Map(entries.map(([k, v]) => [k, v]));
        setCountsByKey(m);
        setLoadState('ready');
      } catch {
        if (alive) setLoadState('error');
      }
    })();
    return () => { alive = false; window.clearTimeout(watchdog); };
  }, []);

  // restore the daily the moment data is ready
  useEffect(() => {
    if (loadState !== 'ready' || mode !== 'daily') return;
    const saved = loadDailySave(localStorage.getItem(`${STORAGE_PREFIX}daily-${today}`));
    if (saved) setResults(saved.results);
  }, [loadState, mode, today]);

  const seedPrefix = mode === 'daily'
    ? `silverware-sort:${today}`
    : `silverware-sort:unlimited:${unlimitedNonce.current}:${unlimitedRun}`;

  const boards: SortBoard[] = useMemo(() => {
    if (!countsByKey) return [];
    return buildBoards(countsByKey, seedPrefix, DAILY_BOARDS);
  }, [countsByKey, seedPrefix]);

  const boardIdx = Math.min(results.length, boards.length);
  const board = boardIdx < boards.length ? boards[boardIdx] : null;
  const done = boards.length > 0 && results.length >= boards.length;
  const score = results.reduce((a, r) => a + r.s, 0);
  const maxScore = boards.length * BOARD_SIZE;

  useGameCompletion('silverware-sort', done && mode === 'daily', score, 1);

  const resetBoardState = useCallback(() => {
    setSlots(Array(BOARD_SIZE).fill(null));
    setLocked(Array(BOARD_SIZE).fill(false));
    setAttempt(1);
    setRevealed(null);
  }, []);

  /** tap a tray chip: fill the first empty slot with that team */
  const place = useCallback((teamIdx: number) => {
    if (!board || revealed) return;
    setSlots(prev => {
      if (prev.includes(teamIdx)) return prev;
      const at = prev.findIndex((v, i) => v === null && !locked[i]);
      if (at === -1) return prev;
      const next = [...prev];
      next[at] = teamIdx;
      return next;
    });
  }, [board, revealed, locked]);

  /** tap a filled, unlocked slot: send its chip back to the tray */
  const unplace = useCallback((slotIdx: number) => {
    if (!board || revealed || locked[slotIdx]) return;
    setSlots(prev => {
      if (prev[slotIdx] === null) return prev;
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
  }, [board, revealed, locked]);

  const canSubmit = board !== null && !revealed && slots.every(v => v !== null);

  const submit = useCallback(() => {
    if (!board || !canSubmit) return;
    const greens = judge(slots);
    const allRight = greens.every(Boolean);
    if (attempt < ATTEMPTS && !allRight) {
      // lock the greens, hand the misses back, one more go
      setLocked(greens);
      setSlots(prev => prev.map((v, i) => (greens[i] ? v : null)));
      setAttempt(a => a + 1);
      return;
    }
    const result: BoardResult = {
      s: greens.filter(Boolean).length,
      f: allRight && attempt === 1,
      g: greens,
    };
    setRevealed(greens);
    const next = [...results, result];
    if (mode === 'daily') {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}daily-${today}`, JSON.stringify({ results: next }));
      } catch { /* storage full or blocked: play on */ }
    }
    window.setTimeout(() => {
      setResults(next);
      resetBoardState();
    }, 3400);
  }, [board, canSubmit, slots, attempt, results, mode, today, resetBoardState]);

  const switchMode = useCallback((m: SortMode) => {
    if (m === mode) return;
    setMode(m);
    resetBoardState();
    if (m === 'unlimited') {
      setResults([]);
      setUnlimitedRun(r => r + 1);
    } else {
      const saved = loadDailySave(localStorage.getItem(`${STORAGE_PREFIX}daily-${today}`));
      setResults(saved?.results ?? []);
    }
  }, [mode, today, resetBoardState]);

  const playAgain = useCallback(() => {
    if (mode !== 'unlimited') return;
    setResults([]);
    resetBoardState();
    setUnlimitedRun(r => r + 1);
  }, [mode, resetBoardState]);

  return {
    loadState, mode, switchMode, boards, boardIdx, board, slots, locked,
    attempt, revealed, place, unplace, canSubmit, submit, results, done,
    score, maxScore, playAgain, today,
  };
}
