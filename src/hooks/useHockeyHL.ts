import { useState, useMemo, useCallback } from 'react';
import { hockeyHLPlayers, HockeyHLPlayer } from '@/data/hockeyHLPlayers';
import { useGameCompletion } from '@/hooks/useGameCompletion';

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type HockeyHLStatus = 'playing' | 'complete';
export type HockeyHLMode = 'daily' | 'unlimited';

interface RoundResult {
  player1: HockeyHLPlayer;
  player2: HockeyHLPlayer;
  correct: boolean;
}

const ROUNDS = 10;

export function useHockeyHL() {
  const [mode, setMode] = useState<HockeyHLMode>('daily');

  const pairs = useMemo(() => {
    const seed = Math.floor(Math.random() * 100000);
    const shuffled = seededShuffle(hockeyHLPlayers, seed);
    const result: [HockeyHLPlayer, HockeyHLPlayer][] = [];
    for (let i = 0; i < ROUNDS * 2 && i + 1 < shuffled.length; i += 2) {
      result.push([shuffled[i], shuffled[i + 1]]);
    }
    return result;
  }, [mode]);

  const [currentRound, setCurrentRound] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [showingResult, setShowingResult] = useState(false);
  const [streak, setStreak] = useState(0);

  const gameStatus: HockeyHLStatus = currentRound >= pairs.length || currentRound >= ROUNDS ? 'complete' : 'playing';
  const currentPair = gameStatus === 'playing' ? pairs[currentRound] : null;

  const correctCount = results.filter((r) => r.correct).length;
  const streakBonus = results.reduce((sum, r, i) => {
    if (!r.correct) return sum;
    let s = 0;
    for (let j = i; j >= 0 && results[j].correct; j--) s++;
    return sum + Math.max(0, s - 1);
  }, 0);
  const totalScore = correctCount * 10 + streakBonus * 5;

  const makeGuess = useCallback((choice: 'left' | 'right') => {
    if (!currentPair || showingResult || gameStatus !== 'playing') return;
    const [p1, p2] = currentPair;
    const leftHigher = p1.careerPoints >= p2.careerPoints;
    const correct = (choice === 'left' && leftHigher) || (choice === 'right' && !leftHigher);
    const result: RoundResult = { player1: p1, player2: p2, correct };
    const newResults = [...results, result];
    setResults(newResults);
    setShowingResult(true);
    if (correct) { setStreak((s) => s + 1); } else { setStreak(0); }
    setTimeout(() => {
      setCurrentRound((prev) => prev + 1);
      setShowingResult(false);
    }, 2000);
  }, [currentPair, showingResult, gameStatus, results, currentRound]);

  const switchMode = useCallback((m: HockeyHLMode) => {
    setMode(m);
    setCurrentRound(0);
    setResults([]);
    setStreak(0);
    setShowingResult(false);
  }, []);

  useGameCompletion('hockey-higher-lower', gameStatus === 'complete', totalScore);

  return { mode, switchMode, currentPair, currentRound, results, showingResult, streak, gameStatus, correctCount, totalScore, makeGuess, totalRounds: ROUNDS };
}
