import { useState, useMemo, useCallback } from 'react';
import { f1HLDrivers, F1HLDriver } from '@/data/f1HLDrivers';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { dateSeed } from '@/lib/dateUtils';

/**
 * F1 Higher/Lower — third Higher/Lower sport port (task #23), same rules as
 * useHockeyHL / useNbaHL / useNflHL: 10 rounds, 10 pts per correct, +5 per
 * consecutive-correct streak step, daily (ET-seeded) + unlimited modes.
 * Keep the HL hooks in lockstep if the mechanic ever changes.
 */
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

export type F1HLStatus = 'playing' | 'complete';
export type F1HLMode = 'daily' | 'unlimited';

interface RoundResult {
  player1: F1HLDriver;
  player2: F1HLDriver;
  correct: boolean;
}

type HLAction = { t: 'result'; correct: boolean };

const ROUNDS = 10;
// Sentinel puzzle array — useDailyPuzzle needs at least one element.
const SENTINEL_PUZZLES = [{ id: 'f1hl-daily' }];

function buildPairs(seed: number): [F1HLDriver, F1HLDriver][] {
  const shuffled = seededShuffle(f1HLDrivers, seed);
  const result: [F1HLDriver, F1HLDriver][] = [];
  for (let i = 0; i < ROUNDS * 2 && i + 1 < shuffled.length; i += 2) {
    result.push([shuffled[i], shuffled[i + 1]]);
  }
  return result;
}

export function useF1HL() {
  const [mode, setMode] = useState<F1HLMode>('daily');

  const {
    guesses: dailyActions,
    addGuess: addDailyAction,
    gameStatus: rawDailyStatus,
    isLoading,
    todayStr,
  } = useDailyPuzzle<{ id: string }, HLAction>({
    gameSlug: 'f1-hl',
    puzzles: SENTINEL_PUZZLES,
    maxGuesses: ROUNDS,
    isWon: (g) => g.length >= ROUNDS,
    deserializeGuesses: (raw) => raw as HLAction[],
  });

  const dailyPairs = useMemo(() => buildPairs(dateSeed(todayStr)), [todayStr]);

  const [currentResult, setCurrentResult] = useState<RoundResult | null>(null);
  const [showingResult, setShowingResult] = useState(false);

  const [unlimitedPairs, setUnlimitedPairs] = useState<[F1HLDriver, F1HLDriver][]>(
    () => buildPairs(Math.floor(Math.random() * 100000)),
  );
  const [unlimitedResults, setUnlimitedResults] = useState<RoundResult[]>([]);
  const [unlimitedRound, setUnlimitedRound] = useState(0);

  const dailyCurrentRound = dailyActions.length;
  const dailyResults: RoundResult[] = useMemo(
    () =>
      dailyActions.map((a, i) => ({
        player1: dailyPairs[i]?.[0] ?? f1HLDrivers[0],
        player2: dailyPairs[i]?.[1] ?? f1HLDrivers[1],
        correct: a.correct,
      })),
    [dailyActions, dailyPairs],
  );

  const pairs = mode === 'daily' ? dailyPairs : unlimitedPairs;
  const currentRound = mode === 'daily' ? dailyCurrentRound : unlimitedRound;
  const baseResults = mode === 'daily' ? dailyResults : unlimitedResults;
  const results: RoundResult[] = useMemo(
    () => (currentResult ? [...baseResults, currentResult] : baseResults),
    [baseResults, currentResult],
  );

  const gameStatus: F1HLStatus = mode === 'daily'
    ? (rawDailyStatus !== 'playing' ? 'complete' : 'playing')
    : (unlimitedRound >= ROUNDS ? 'complete' : 'playing');

  const currentPair = gameStatus === 'playing' ? pairs[currentRound] ?? null : null;

  const correctCount = baseResults.filter((r) => r.correct).length;
  const streakBonus = baseResults.reduce((sum, r, i) => {
    if (!r.correct) return sum;
    let s = 0;
    for (let j = i; j >= 0 && baseResults[j].correct; j--) s++;
    return sum + Math.max(0, s - 1);
  }, 0);
  const totalScore = correctCount * 10 + streakBonus * 5;

  const streak = useMemo(() => {
    let s = 0;
    for (let i = baseResults.length - 1; i >= 0; i--) {
      if (!baseResults[i].correct) break;
      s++;
    }
    return s;
  }, [baseResults]);

  const makeGuess = useCallback(
    (choice: 'left' | 'right') => {
      if (!currentPair || showingResult || gameStatus !== 'playing') return;
      const [p1, p2] = currentPair;
      const leftHigher = p1.careerWins >= p2.careerWins;
      const correct = (choice === 'left' && leftHigher) || (choice === 'right' && !leftHigher);

      setCurrentResult({ player1: p1, player2: p2, correct });
      setShowingResult(true);

      setTimeout(() => {
        if (mode === 'daily') {
          addDailyAction({ t: 'result', correct });
        } else {
          setUnlimitedResults((prev) => [...prev, { player1: p1, player2: p2, correct }]);
          setUnlimitedRound((prev) => prev + 1);
        }
        setCurrentResult(null);
        setShowingResult(false);
      }, 2000);
    },
    [currentPair, showingResult, gameStatus, mode, addDailyAction],
  );

  const switchMode = useCallback((m: F1HLMode) => {
    if (m === 'unlimited') {
      setUnlimitedPairs(buildPairs(Math.floor(Math.random() * 100000)));
      setUnlimitedResults([]);
      setUnlimitedRound(0);
    }
    setMode(m);
    setCurrentResult(null);
    setShowingResult(false);
  }, []);

  useGameCompletion('f1-higher-lower', rawDailyStatus !== 'playing', totalScore);

  return {
    mode, switchMode, currentPair, currentRound, results, showingResult, streak,
    gameStatus, correctCount, totalScore, makeGuess, totalRounds: ROUNDS, isLoading,
  };
}
