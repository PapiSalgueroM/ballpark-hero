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

const dailySeedOf = (day: string) => `whod-they-beat:${day}`;
const readDaily = (day: string) => loadDailySave(localStorage.getItem(`${STORAGE_PREFIX}daily-${day}`));

export function useWhodTheyBeat() {
  const today = getTodayET();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [rowsByKey, setRowsByKey] = useState<Map<string, FinalsRow[]> | null>(null);
  const [mode, setMode] = useState<BeatMode>('daily');
  /* Round 643 review: today's daily on its own, whatever mode is on screen.
     It moves in the same step as the save, so the recorder reads what is
     stored: `answers` below is only what the board shows, and it waits out
     each reveal. Reading the recorder off `answers` lost a finish whenever
     the page reloaded or went to Unlimited inside the final reveal, because
     the restore found the day already finished and marked it. Restored in
     the initializer, keyed to its day (the Champ or Not shape). */
  const [daily, setDaily] = useState<{ day: string; answers: boolean[] }>(() => ({ day: today, answers: readDaily(today)?.answers ?? [] }));
  const dailyAnswers = daily.day === today ? daily.answers : [];
  const [answers, setAnswers] = useState<boolean[]>(daily.answers);
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [showingResult, setShowingResult] = useState(false);
  const [unlimitedRun, setUnlimitedRun] = useState(0);
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
        /* Round 643: the answers are restored at mount, but whether they
           finish today's board is known only now, so a finished daily read
           back says so before the board lands, or the recorder sees false
           then true and records it again. */
        const dailyCount = buildQuestions(m, dailySeedOf(today)).length;
        const saved = readDaily(today);
        if (saved && dailyCount > 0 && saved.answers.length >= dailyCount) markRestoredFinish('whod-they-beat');
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

  const dailySeed = dailySeedOf(today);
  const seedPrefix = mode === 'daily'
    ? dailySeed
    : `whod-they-beat:unlimited:${unlimitedNonce.current}:${unlimitedRun}`;

  const questions: BeatQuestion[] = useMemo(() => {
    if (!rowsByKey) return [];
    return buildQuestions(rowsByKey, seedPrefix);
  }, [rowsByKey, seedPrefix]);

  /* Round 643: today's board on its own, whatever mode is on screen. */
  const dailyQuestionCount = useMemo(
    () => (rowsByKey ? buildQuestions(rowsByKey, dailySeed).length : 0),
    [rowsByKey, dailySeed],
  );

  const qIdx = Math.min(answers.length, questions.length);
  const current = qIdx < questions.length ? questions[qIdx] : null;
  const done = questions.length > 0 && answers.length >= questions.length;
  const score = answers.filter(Boolean).length;

  /* Round 643 review: the recorder reads the stored daily alone, in either
     mode, with the daily's own score. A mode toggle never flips it, the final
     pick records at once, and a restore arrives through the mark above. */
  const dailyDone = dailyQuestionCount > 0 && dailyAnswers.length >= dailyQuestionCount;
  useGameCompletion('whod-they-beat', dailyDone, dailyAnswers.filter(Boolean).length, 1);

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
      setDaily({ day: today, answers: next });
    }
    clearReveal();
    revealTimer.current = window.setTimeout(() => {
      revealTimer.current = null;
      setAnswers(next);
      setShowingResult(false);
      setPickedIndex(null);
    }, 2200);
  }, [current, showingResult, answers, mode, today, clearReveal]);

  const switchMode = useCallback((m: BeatMode) => {
    if (m === mode) return;
    clearReveal();
    setMode(m);
    setShowingResult(false);
    setPickedIndex(null);
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
    setPickedIndex(null);
    setUnlimitedRun(r => r + 1);
  }, [mode, clearReveal]);

  return {
    loadState, mode, switchMode, questions, qIdx, current, showingResult,
    pickedIndex, answers, done, score, answer, playAgain,
  };
}
