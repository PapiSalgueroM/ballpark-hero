/**
 * Round 289: the duel's clock and its record. Every rule is in
 * src/lib/faceOff.ts; this file owns the shot clock, the rival's timing, the
 * daily lock and the save.
 *
 * The clock is read from performance.now() at pick time, not counted in
 * ticks, so a throttled tab cannot hand out free seconds. The interval only
 * redraws the bar.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getTodayET } from '@/lib/dateUtils';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { recordCompletion } from '@/lib/completions';
import {
  SAVE_KEY, SHOT_CLOCK, DAILY_DIFFICULTY, ROUNDS,
  type Difficulty, type Round, type RoundResult, type FaceOffSave, type Rng, type Category,
  buildCategories, makeRng, seedForDate, dealRounds, resolveRound, resolveVersus, totals, outcome, needsExtra,
  loadSave, serialize, recordMatch,
} from '@/lib/faceOff';

export type Mode = 'daily' | 'unlimited' | 'versus';
/** handoff: two player mode, the first chair has answered and the phone is on its way to the second */
export type Phase = 'menu' | 'playing' | 'handoff' | 'reveal' | 'done';

function readSave(): FaceOffSave {
  try { return loadSave(localStorage.getItem(SAVE_KEY)); } catch { return loadSave(null); }
}

function writeSave(s: FaceOffSave) {
  try { localStorage.setItem(SAVE_KEY, serialize(s)); } catch { /* storage blocked */ }
}

export function useFaceOff() {
  const [save, setSave] = useState<FaceOffSave>(readSave);
  const [phase, setPhase] = useState<Phase>('menu');
  const [mode, setMode] = useState<Mode>('daily');
  const [difficulty, setDifficulty] = useState<Difficulty>(DAILY_DIFFICULTY);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [index, setIndex] = useState(0);
  /** seconds since the round opened, redrawn ten times a second while playing */
  const [elapsed, setElapsed] = useState(0);
  const catsRef = useRef<Category[] | null>(null);
  const rngRef = useRef<Rng | null>(null);
  const startedAt = useRef(0);
  /* which round index has already been settled: a click landing in the same
     tick as the clock running out must not book the round twice */
  const settledFor = useRef(-1);
  /** two player mode: whose clock is running, and what the first chair did */
  const [turn, setTurn] = useState<1 | 2>(1);
  const firstChair = useRef<{ pick: 'a' | 'b' | null; secs: number } | null>(null);
  const today = getTodayET();
  const dailyPlayed = save.daily?.date === today ? save.daily : null;

  const cats = () => (catsRef.current ??= buildCategories());

  const start = useCallback((m: Mode, d: Difficulty) => {
    const diff = m === 'daily' ? DAILY_DIFFICULTY : d;
    const rng = makeRng(m === 'daily' ? seedForDate(getTodayET()) : Math.floor(Math.random() * 2 ** 31));
    rngRef.current = rng;
    const dealt = dealRounds(cats(), rng, diff, ROUNDS);
    setMode(m); setDifficulty(diff); setRounds(dealt); setResults([]); setIndex(0);
    settledFor.current = -1;
    setTurn(1); firstChair.current = null;
    startedAt.current = performance.now();
    setElapsed(0);
    setPhase('playing');
  }, []);

  /* the bar */
  useEffect(() => {
    if (phase !== 'playing') return;
    const t = window.setInterval(() => setElapsed((performance.now() - startedAt.current) / 1000), 100);
    return () => window.clearInterval(t);
  }, [phase, index]);

  const current = rounds[index] ?? null;

  const settle = useCallback((pick: 'a' | 'b' | null) => {
    if (phase !== 'playing' || !current) return;
    const used = Math.min(SHOT_CLOCK, (performance.now() - startedAt.current) / 1000);
    const secs = pick === null ? SHOT_CLOCK : used;
    if (mode === 'versus' && turn === 1) {
      /* the first chair is done; the clock stops until the second chair says ready */
      firstChair.current = { pick, secs };
      setElapsed(secs);
      setPhase('handoff');
      return;
    }
    if (settledFor.current === index) return;
    settledFor.current = index;
    const res = mode === 'versus'
      ? resolveVersus(current, firstChair.current?.pick ?? null, firstChair.current?.secs ?? SHOT_CLOCK, pick, secs)
      : resolveRound(current, pick, secs);
    setResults(r => [...r, res]);
    setElapsed(secs);
    setPhase('reveal');
  }, [phase, current, index, mode, turn]);

  /* two player mode: the second chair has the phone and starts their own clock */
  const ready = useCallback(() => {
    if (phase !== 'handoff') return;
    setTurn(2);
    startedAt.current = performance.now();
    setElapsed(0);
    setPhase('playing');
  }, [phase]);

  /* the clock runs out */
  useEffect(() => {
    if (phase !== 'playing') return;
    if (elapsed >= SHOT_CLOCK) settle(null);
  }, [elapsed, phase, settle]);

  const pick = useCallback((choice: 'a' | 'b') => settle(choice), [settle]);

  const next = useCallback(() => {
    if (phase !== 'reveal') return;
    const played = results.length;
    if (played < rounds.length) {
      setIndex(played);
      setTurn(1); firstChair.current = null;
      startedAt.current = performance.now();
      setElapsed(0);
      setPhase('playing');
      return;
    }
    if (needsExtra(results, rounds.length) && rngRef.current) {
      const extra = dealRounds(cats(), rngRef.current, difficulty, 1);
      if (extra.length) {
        setRounds(r => [...r, ...extra]);
        setIndex(played);
        setTurn(1); firstChair.current = null;
        startedAt.current = performance.now();
        setElapsed(0);
        setPhase('playing');
        return;
      }
    }
    const t = totals(results);
    if (mode !== 'versus') {
      /* two people on one phone is a game, not a record: the save tracks you against the rivals */
      const booked = recordMatch(save, t, difficulty, mode === 'daily' ? getTodayET() : null);
      setSave(booked);
      writeSave(booked);
    }
    /* the daily goes through useGameCompletion below (leaderboard, streak,
       badges); any other match is a play but never a ranked score */
    if (mode !== 'daily') recordCompletion('/face-off');
    setPhase('done');
  }, [phase, results, rounds.length, difficulty, mode, save]);

  const toMenu = useCallback(() => { setPhase('menu'); setRounds([]); setResults([]); setIndex(0); setTurn(1); firstChair.current = null; }, []);

  const t = totals(results);
  const right = results.filter(r => r.youCorrect).length;
  useGameCompletion('face-off', phase === 'done' && mode === 'daily', t.you, right);
  const lastResult = results.length ? results[results.length - 1] : null;
  const rivalLocked = phase === 'playing' && mode !== 'versus' && current ? elapsed >= current.rival.seconds : false;

  return {
    save, phase, mode, difficulty, rounds, results, index, current, elapsed, rivalLocked, turn,
    totals: t, outcome: outcome(t), lastResult, dailyPlayed, today,
    start, pick, ready, next, toMenu,
  };
}
