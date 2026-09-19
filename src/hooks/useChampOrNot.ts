import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getTodayET } from '@/lib/dateUtils';
import {
  COMPETITIONS, DAILY_ROUNDS, buildRounds, fetchCompetitionRows,
  type ChampRow, type ChampRound,
} from '@/lib/champOrNot';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { markRestoredFinish } from '@/lib/restoredFinish';

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

const dailySeedOf = (day: string) => `champ-or-not:${day}`;
const readDaily = (day: string) => loadDailySave(localStorage.getItem(`${STORAGE_PREFIX}daily-${day}`));

export function useChampOrNot() {
  /* Round 643 review: the day is read ONCE, at mount, as useDailyPuzzle
     reads it, so the seed, the save key, the restore mark, the daily state
     and the recorder all name the day the daily was dealt. Read on every
     render, a final pick landing after midnight ET saved under one day and
     was checked against the next, and the daily was never recorded. */
  const today = useRef(getTodayET()).current;
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [rowsByKey, setRowsByKey] = useState<Map<string, ChampRow[]> | null>(null);
  const [mode, setMode] = useState<ChampMode>('daily');
  /* Round 643 review: today's daily on its own, whatever mode is on screen.
     It moves in the same step as the save, so the recorder reads what is
     stored: `answers` below is only what the board shows, and it waits out
     each reveal. Reading the recorder off `answers` lost a finish whenever
     the page reloaded or went to Unlimited inside the final reveal, because
     the restore found the day already finished and marked it. Restored in
     the initializer. */
  const [dailyAnswers, setDailyAnswers] = useState<boolean[]>(() => readDaily(today)?.answers ?? []);
  const [answers, setAnswers] = useState<boolean[]>(dailyAnswers);
  const [lastPick, setLastPick] = useState<boolean | null>(null);
  const [showingResult, setShowingResult] = useState(false);
  const [unlimitedRun, setUnlimitedRun] = useState(0);
  const [hard, setHard] = useState(false);
  const unlimitedNonce = useRef(String(Date.now() % 1000000007));
  /* The pending reveal, so a mode change can cancel it: left running, it
     wrote the daily's answers onto the Unlimited board. */
  const revealTimer = useRef<number | null>(null);
  const clearReveal = useCallback(() => {
    if (revealTimer.current !== null) window.clearTimeout(revealTimer.current);
    revealTimer.current = null;
  }, []);
  useEffect(() => clearReveal, [clearReveal]);

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
        /* Round 643: the answers are restored at mount, but whether they
           finish today's board is known only now, so a finished daily read
           back says so before the board lands, or the recorder sees false
           then true and records it again. */
        const dailyCount = buildRounds(m, dailySeedOf(today), DAILY_ROUNDS, false).length;
        const saved = readDaily(today);
        if (saved && dailyCount > 0 && saved.answers.length >= dailyCount) markRestoredFinish('champ-or-not');
        setRowsByKey(m);
        setLoadState('ready');
      } catch {
        if (alive) setLoadState('error');
      }
    })();
    return () => { alive = false; window.clearTimeout(watchdog); };
    // The fetch runs once per mount; `today` is the mount's day, as the
    // restore above it is.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // hard is an unlimited-only spice, same convention as the higher-lower
  // games: the shared daily stays one board for everyone
  const hardActive = hard && mode === 'unlimited';
  const dailySeed = dailySeedOf(today);
  const seedPrefix = mode === 'daily'
    ? dailySeed
    : `champ-or-not:unlimited:${unlimitedNonce.current}:${unlimitedRun}${hardActive ? ':hard' : ''}`;

  const rounds: ChampRound[] = useMemo(() => {
    if (!rowsByKey) return [];
    return buildRounds(rowsByKey, seedPrefix, DAILY_ROUNDS, hardActive);
  }, [rowsByKey, seedPrefix, hardActive]);

  /* Round 643: today's board on its own, whatever mode is on screen. */
  const dailyRoundCount = useMemo(
    () => (rowsByKey ? buildRounds(rowsByKey, dailySeed, DAILY_ROUNDS, false).length : 0),
    [rowsByKey, dailySeed],
  );

  const roundIdx = Math.min(answers.length, rounds.length);
  const current = roundIdx < rounds.length ? rounds[roundIdx] : null;
  const done = rounds.length > 0 && answers.length >= rounds.length;
  const score = answers.filter(Boolean).length;

  /* Round 643 review: the recorder reads the stored daily alone, in either
     mode, with the daily's own score. A mode toggle never flips it, the final
     pick records at once, and a restore arrives through the mark above. */
  const dailyDone = dailyRoundCount > 0 && dailyAnswers.length >= dailyRoundCount;
  useGameCompletion('champ-or-not', dailyDone, dailyAnswers.filter(Boolean).length, 1);

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
      setDailyAnswers(next);
    }
    clearReveal();
    revealTimer.current = window.setTimeout(() => {
      revealTimer.current = null;
      setAnswers(next);
      setShowingResult(false);
      setLastPick(null);
    }, 2200);
  }, [current, showingResult, answers, mode, today, clearReveal]);

  const switchMode = useCallback((m: ChampMode) => {
    if (m === mode) return;
    clearReveal();
    setMode(m);
    setShowingResult(false);
    setLastPick(null);
    if (m === 'unlimited') {
      setAnswers([]);
      setUnlimitedRun(r => r + 1);
    } else {
      setAnswers(dailyAnswers);
    }
  }, [mode, dailyAnswers, clearReveal]);

  const playAgain = useCallback(() => {
    if (mode !== 'unlimited') return;
    clearReveal();
    setAnswers([]);
    setShowingResult(false);
    setLastPick(null);
    setUnlimitedRun(r => r + 1);
  }, [mode, clearReveal]);

  const toggleHard = useCallback(() => {
    setHard(h => !h);
    // a new difficulty means a fresh unlimited set, mid-run included
    if (mode === 'unlimited') {
      clearReveal();
      setAnswers([]);
      setShowingResult(false);
      setLastPick(null);
      setUnlimitedRun(r => r + 1);
    }
  }, [mode, clearReveal]);

  return {
    loadState, mode, switchMode, rounds, roundIdx, current, showingResult,
    lastPick, answers, done, score, answer, playAgain, today,
    hard, hardActive, toggleHard,
  };
}
