import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getTodayET } from '@/lib/dateUtils';
import {
  COMPETITIONS, DAILY_ROUNDS, buildRounds, fetchCompetitionRows,
  type ChampRow, type ChampRound,
} from '@/lib/champOrNot';
import { useGameCompletion } from '@/hooks/useGameCompletion';

export type ChampMode = 'daily' | 'unlimited';
export type LoadState = 'loading' | 'ready' | 'error';

const STORAGE_PREFIX = 'champ-or-not-';

interface SavedDaily {
  answers: boolean[]; // per answered round: was the player right
}

/** Fail closed: anything that is not the exact saved shape loads as null. */
export function loadDailySave(raw: string | null): SavedDaily | null {
  if (!raw) return null;
  try {
    const p: unknown = JSON.parse(raw);
    if (typeof p !== 'object' || p === null || Array.isArray(p)) return null;
    const answers = (p as Record<string, unknown>).answers;
    if (!Array.isArray(answers) || answers.length > DAILY_ROUNDS) return null;
    if (!answers.every(a => typeof a === 'boolean')) return null;
    return { answers: answers as boolean[] };
  } catch {
    return null;
  }
}

export function useChampOrNot() {
  const today = getTodayET();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [rowsByKey, setRowsByKey] = useState<Map<string, ChampRow[]> | null>(null);
  const [mode, setMode] = useState<ChampMode>('daily');
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [lastPick, setLastPick] = useState<boolean | null>(null);
  const [showingResult, setShowingResult] = useState(false);
  const [unlimitedRun, setUnlimitedRun] = useState(0);
  const [hard, setHard] = useState(false);
  const unlimitedNonce = useRef(String(Date.now() % 1000000007));

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
          COMPETITIONS.map(async c => [c.key, await fetchCompetitionRows(c).catch(() => [] as ChampRow[])] as const),
        );
        if (!alive) return;
        const m = new Map(entries.map(([k, v]) => [k, v]));
        const usable = COMPETITIONS.filter(c => (m.get(c.key)?.length ?? 0) >= 8).length;
        if (usable === 0) {
          setLoadState('error');
          return;
        }
        setRowsByKey(m);
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
    if (saved) setAnswers(saved.answers);
  }, [loadState, mode, today]);

  // hard is an unlimited-only spice, same convention as the higher-lower
  // games: the shared daily stays one board for everyone
  const hardActive = hard && mode === 'unlimited';
  const seedPrefix = mode === 'daily'
    ? `champ-or-not:${today}`
    : `champ-or-not:unlimited:${unlimitedNonce.current}:${unlimitedRun}${hardActive ? ':hard' : ''}`;

  const rounds: ChampRound[] = useMemo(() => {
    if (!rowsByKey) return [];
    return buildRounds(rowsByKey, seedPrefix, DAILY_ROUNDS, hardActive);
  }, [rowsByKey, seedPrefix, hardActive]);

  const roundIdx = Math.min(answers.length, rounds.length);
  const current = roundIdx < rounds.length ? rounds[roundIdx] : null;
  const done = rounds.length > 0 && answers.length >= rounds.length;
  const score = answers.filter(Boolean).length;

  useGameCompletion('champ-or-not', done && mode === 'daily', score, 1);

  const answer = useCallback((saysTrue: boolean) => {
    if (!current || showingResult) return;
    const correct = saysTrue === current.isTrue;
    setLastPick(saysTrue);
    setShowingResult(true);
    const next = [...answers, correct];
    if (mode === 'daily') {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}daily-${today}`, JSON.stringify({ answers: next }));
      } catch { /* storage full or blocked: play on */ }
    }
    window.setTimeout(() => {
      setAnswers(next);
      setShowingResult(false);
      setLastPick(null);
    }, 2200);
  }, [current, showingResult, answers, mode, today]);

  const switchMode = useCallback((m: ChampMode) => {
    if (m === mode) return;
    setMode(m);
    setShowingResult(false);
    setLastPick(null);
    if (m === 'unlimited') {
      setAnswers([]);
      setUnlimitedRun(r => r + 1);
    } else {
      const saved = loadDailySave(localStorage.getItem(`${STORAGE_PREFIX}daily-${today}`));
      setAnswers(saved?.answers ?? []);
    }
  }, [mode, today]);

  const playAgain = useCallback(() => {
    if (mode !== 'unlimited') return;
    setAnswers([]);
    setShowingResult(false);
    setLastPick(null);
    setUnlimitedRun(r => r + 1);
  }, [mode]);

  const toggleHard = useCallback(() => {
    setHard(h => !h);
    // a new difficulty means a fresh unlimited set, mid-run included
    if (mode === 'unlimited') {
      setAnswers([]);
      setShowingResult(false);
      setLastPick(null);
      setUnlimitedRun(r => r + 1);
    }
  }, [mode]);

  return {
    loadState, mode, switchMode, rounds, roundIdx, current, showingResult,
    lastPick, answers, done, score, answer, playAgain, today,
    hard, hardActive, toggleHard,
  };
}
