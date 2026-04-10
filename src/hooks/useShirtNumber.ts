import { useState, useCallback, useMemo } from 'react';
import shirtNumberPuzzles, { type ShirtNumberPuzzle } from '@/data/shirtNumberPuzzles';
import { useGameCompletion } from '@/hooks/useGameCompletion';

function getDateSeed(): number {
  const d = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < d.length; i++) {
    hash = (hash << 5) - hash + d.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export type ShirtNumberMode = 'daily' | 'unlimited';

export interface ShirtNumberState {
  puzzle: ShirtNumberPuzzle;
  attempts: number[];
  maxAttempts: number;
  status: 'playing' | 'won' | 'lost';
  score: number;
  hint: 'higher' | 'lower' | null;
  mode: ShirtNumberMode;
  submitGuess: (n: number) => void;
  switchToUnlimited: () => void;
  nextPuzzle: () => void;
  unlimitedIndex: number;
}

const STORAGE_KEY_PREFIX = 'shirt-number-';
const MAX_ATTEMPTS = 3;
const SCORES = [1000, 600, 200];

function getDailyPuzzle(): ShirtNumberPuzzle {
  const idx = getDateSeed() % shirtNumberPuzzles.length;
  return shirtNumberPuzzles[idx];
}

function loadDailyState(puzzle: ShirtNumberPuzzle) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${STORAGE_KEY_PREFIX}daily-${today}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as { attempts: number[]; status: 'playing' | 'won' | 'lost'; score: number };
  } catch { /* ignore */ }
  return null;
}

function saveDailyState(attempts: number[], status: string, score: number) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `${STORAGE_KEY_PREFIX}daily-${today}`;
  localStorage.setItem(key, JSON.stringify({ attempts, status, score }));
}

export function useShirtNumber(): ShirtNumberState {
  const dailyPuzzle = useMemo(() => getDailyPuzzle(), []);
  const saved = useMemo(() => loadDailyState(dailyPuzzle), [dailyPuzzle]);

  const [mode, setMode] = useState<ShirtNumberMode>('daily');
  const [unlimitedIndex, setUnlimitedIndex] = useState(0);
  const [attempts, setAttempts] = useState<number[]>(saved?.attempts ?? []);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>(saved?.status as any ?? 'playing');
  const [score, setScore] = useState(saved?.score ?? 0);
  const [hint, setHint] = useState<'higher' | 'lower' | null>(null);

  // Unlimited puzzle: shuffle deterministically using daily seed + index
  const unlimitedPuzzle = useMemo(() => {
    const seed = getDateSeed() + unlimitedIndex + 1;
    return shirtNumberPuzzles[seed % shirtNumberPuzzles.length];
  }, [unlimitedIndex]);

  const puzzle = mode === 'daily' ? dailyPuzzle : unlimitedPuzzle;

  const isComplete = status === 'won' || status === 'lost';

  useGameCompletion('shirt-number', isComplete && mode === 'daily', score, status === 'won' ? 1 : 0);

  const submitGuess = useCallback((n: number) => {
    if (status !== 'playing') return;
    const newAttempts = [...attempts, n];
    setAttempts(newAttempts);

    if (n === puzzle.kitNumber) {
      const s = SCORES[newAttempts.length - 1] ?? 200;
      setScore(s);
      setStatus('won');
      setHint(null);
      if (mode === 'daily') saveDailyState(newAttempts, 'won', s);
    } else if (newAttempts.length >= MAX_ATTEMPTS) {
      setStatus('lost');
      setScore(0);
      setHint(null);
      if (mode === 'daily') saveDailyState(newAttempts, 'lost', 0);
    } else {
      setHint(puzzle.kitNumber > n ? 'higher' : 'lower');
    }
  }, [status, attempts, puzzle, mode]);

  const switchToUnlimited = useCallback(() => {
    setMode('unlimited');
    setAttempts([]);
    setStatus('playing');
    setScore(0);
    setHint(null);
    setUnlimitedIndex(0);
  }, []);

  const nextPuzzle = useCallback(() => {
    setUnlimitedIndex(i => i + 1);
    setAttempts([]);
    setStatus('playing');
    setScore(0);
    setHint(null);
  }, []);

  return { puzzle, attempts, maxAttempts: MAX_ATTEMPTS, status, score, hint, mode, submitGuess, switchToUnlimited, nextPuzzle, unlimitedIndex };
}
