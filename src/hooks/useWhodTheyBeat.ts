import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getTodayET } from '@/lib/dateUtils';
import {
  FINALS_COMPS, BEAT_ROUNDS, buildQuestions, fetchFinalsRows,
  type FinalsRow, type BeatQuestion,
} from '@/lib/whodTheyBeat';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { markRestoredFinish } from '@/lib/restoredFinish';

export type BeatMode = 'daily' | 'unlimited';
export type LoadState = 'loading' | 'ready' | 'error';

const STORAGE_PREFIX = 'whod-they-beat-';

interface SavedDaily {
  answers: boolean[];
}

/** Fail closed: anything that is not the exact saved shape loads as null. */
export function loadDailySave(raw: string | null): SavedDaily | null {
  if (!raw) return null;
  try {
    const p: unknown = JSON.parse(raw);
    if (typeof p !== 'object' || p === null || Array.isArray(p)) return null;
    const answers = (p as Record<string, unknown>).answers;
    if (!Array.isArray(answers) || answers.length > BEAT_ROUNDS) return null;
    if (!answers.every(a => typeof a === 'boolean')) return null;
    return { answers: answers as boolean[] };
  } catch {
    return null;
  }
}

export function useWhodTheyBeat() {
  const today = getTodayET();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [rowsByKey, setRowsByKey] = useState<Map<string, FinalsRow[]> | null>(null);
  const [mode, setMode] = useState<BeatMode>('daily');
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [showingResult, setShowingResult] = useState(false);
  const [unlimitedRun, setUnlimitedRun] = useState(0);
  const unlimitedNonce = useRef(String(Date.now() % 1000000007));

  useEffect(() => {
    let alive = true;
    const watchdog = window.setTimeout(() => {
      if (alive) setLoadState(s => (s === 'loading' ? 'error' : s));
    }, 15000);
    (async () => {
      try {
        const entries = await Promise.all(
          FINALS_COMPS.map(async c => [c.key, await fetchFinalsRows(c).catch(() => [] as FinalsRow[])] as const),
        );
        if (!alive) return;
        const m = new Map(entries.map(([k, v]) => [k, v]));
        const usable = FINALS_COMPS.filter(c => (m.get(c.key)?.length ?? 0) >= 8).length;
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

  const dailySeed = `whod-they-beat:${today}`;
  const seedPrefix = mode === 'daily'
    ? dailySeed
    : `whod-they-beat:unlimited:${unlimitedNonce.current}:${unlimitedRun}`;

  const questions: BeatQuestion[] = useMemo(() => {
    if (!rowsByKey) return [];
    return buildQuestions(rowsByKey, seedPrefix);
  }, [rowsByKey, seedPrefix]);

  /* Round 643: today's board on its own, whatever mode is on screen, so a
     restore can tell whether the answers it reads back finish it. */
  const dailyQuestionCount = useMemo(
    () => (rowsByKey ? buildQuestions(rowsByKey, dailySeed).length : 0),
    [rowsByKey, dailySeed],
  );

  /* Round 643: both restores (the data landing, and the Daily tab after
     Unlimited) run after mount, so a finished daily read back says so first
     or the completion hook records it again (the Round 399 double record). */
  const restoreDaily = useCallback(() => {
    const saved = loadDailySave(localStorage.getItem(`${STORAGE_PREFIX}daily-${today}`));
    if (saved && dailyQuestionCount > 0 && saved.answers.length >= dailyQuestionCount) markRestoredFinish('whod-they-beat');
    return saved;
  }, [today, dailyQuestionCount]);

  useEffect(() => {
    if (loadState !== 'ready' || mode !== 'daily') return;
    const saved = restoreDaily();
    if (saved) setAnswers(saved.answers);
  }, [loadState, mode, restoreDaily]);

  const qIdx = Math.min(answers.length, questions.length);
  const current = qIdx < questions.length ? questions[qIdx] : null;
  const done = questions.length > 0 && answers.length >= questions.length;
  const score = answers.filter(Boolean).length;

  useGameCompletion('whod-they-beat', done && mode === 'daily', score, 1);

  const answer = useCallback((optionIndex: number) => {
    if (!current || showingResult) return;
    const correct = optionIndex === current.correctIndex;
    setPickedIndex(optionIndex);
    setShowingResult(true);
    const next = [...answers, correct];
    if (mode === 'daily') {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}daily-${today}`, JSON.stringify({ answers: next }));
      } catch { /* storage blocked: play on */ }
    }
    window.setTimeout(() => {
      setAnswers(next);
      setShowingResult(false);
      setPickedIndex(null);
    }, 2200);
  }, [current, showingResult, answers, mode, today]);

  const switchMode = useCallback((m: BeatMode) => {
    if (m === mode) return;
    setMode(m);
    setShowingResult(false);
    setPickedIndex(null);
    if (m === 'unlimited') {
      setAnswers([]);
      setUnlimitedRun(r => r + 1);
    } else {
      const saved = restoreDaily();
      setAnswers(saved?.answers ?? []);
    }
  }, [mode, restoreDaily]);

  const playAgain = useCallback(() => {
    if (mode !== 'unlimited') return;
    setAnswers([]);
    setShowingResult(false);
    setPickedIndex(null);
    setUnlimitedRun(r => r + 1);
  }, [mode]);

  return {
    loadState, mode, switchMode, questions, qIdx, current, showingResult,
    pickedIndex, answers, done, score, answer, playAgain,
  };
}
