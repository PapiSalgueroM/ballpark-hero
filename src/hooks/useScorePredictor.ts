import { useState, useCallback, useMemo } from 'react';
import { getTodayET } from '@/lib/dateUtils';
import scorePredictorPuzzles, { type ScorePredictorPuzzle } from '@/data/scorePredictorPuzzles';
import { useGameCompletion } from '@/hooks/useGameCompletion';

function getDateSeed(): number {
  const d = getTodayET();
  let hash = 0;
  for (let i = 0; i < d.length; i++) {
    hash = (hash << 5) - hash + d.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export type ScorePredictorMode = 'daily' | 'unlimited';

export interface ScorePredictorState {
  puzzle: ScorePredictorPuzzle;
  status: 'predicting' | 'revealed';
  guessHome: number | null;
  guessAway: number | null;
  score: number;
  mode: ScorePredictorMode;
  submit: (home: number, away: number) => void;
  switchToUnlimited: () => void;
  nextPuzzle: () => void;
  unlimitedIndex: number;
}

const STORAGE_PREFIX = 'score-predictor-';

function getDailyPuzzle(): ScorePredictorPuzzle {
  const idx = getDateSeed() % scorePredictorPuzzles.length;
  return scorePredictorPuzzles[idx];
}

function calcScore(
  guessH: number, guessA: number,
  actualH: number, actualA: number,
): number {
  if (guessH === actualH && guessA === actualA) return 1000;

  const guessWinner = guessH > guessA ? 'home' : guessH < guessA ? 'away' : 'draw';
  const actualWinner = actualH > actualA ? 'home' : actualH < actualA ? 'away' : 'draw';
  const correctWinner = guessWinner === actualWinner;

  const diffH = Math.abs(guessH - actualH);
  const diffA = Math.abs(guessA - actualA);

  if (correctWinner && diffH <= 1 && diffA <= 1) return 700;
  if (correctWinner && diffH <= 2 && diffA <= 2) return 400;
  if (correctWinner) return 200;
  return 50;
}

function loadDailyState() {
  const today = getTodayET();
  const key = `${STORAGE_PREFIX}daily-${today}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as { guessHome: number; guessAway: number; score: number };
  } catch { /* ignore */ }
  return null;
}

function saveDailyState(guessHome: number, guessAway: number, score: number) {
  const today = getTodayET();
  const key = `${STORAGE_PREFIX}daily-${today}`;
  localStorage.setItem(key, JSON.stringify({ guessHome, guessAway, score }));
}

export function useScorePredictor(): ScorePredictorState {
  const dailyPuzzle = useMemo(() => getDailyPuzzle(), []);
  const saved = useMemo(() => loadDailyState(), []);

  const [mode, setMode] = useState<ScorePredictorMode>('daily');
  const [unlimitedIndex, setUnlimitedIndex] = useState(0);
  const [guessHome, setGuessHome] = useState<number | null>(saved?.guessHome ?? null);
  const [guessAway, setGuessAway] = useState<number | null>(saved?.guessAway ?? null);
  const [score, setScore] = useState(saved?.score ?? 0);

  const unlimitedPuzzle = useMemo(() => {
    const seed = getDateSeed() + unlimitedIndex + 1;
    return scorePredictorPuzzles[seed % scorePredictorPuzzles.length];
  }, [unlimitedIndex]);

  const puzzle = mode === 'daily' ? dailyPuzzle : unlimitedPuzzle;
  const status: 'predicting' | 'revealed' = guessHome !== null ? 'revealed' : 'predicting';
  const isComplete = status === 'revealed';

  useGameCompletion('score-predictor', isComplete && mode === 'daily', score, isComplete ? 1 : 0);

  const submit = useCallback((home: number, away: number) => {
    if (guessHome !== null) return;
    const s = calcScore(home, away, puzzle.homeScore, puzzle.awayScore);
    setGuessHome(home);
    setGuessAway(away);
    setScore(s);
    if (mode === 'daily') saveDailyState(home, away, s);
  }, [guessHome, puzzle, mode]);

  const switchToUnlimited = useCallback(() => {
    setMode('unlimited');
    setGuessHome(null);
    setGuessAway(null);
    setScore(0);
    setUnlimitedIndex(0);
  }, []);

  const nextPuzzle = useCallback(() => {
    setUnlimitedIndex(i => i + 1);
    setGuessHome(null);
    setGuessAway(null);
    setScore(0);
  }, []);

  return { puzzle, status, guessHome, guessAway, score, mode, submit, switchToUnlimited, nextPuzzle, unlimitedIndex };
}
