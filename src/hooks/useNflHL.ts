import { useState, useMemo, useCallback } from 'react';
import { nflHLPlayers, NflHLPlayer } from '@/data/nflHLPlayers';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { dateSeed } from '@/lib/dateUtils';

/**
 * NFL Higher/Lower — a direct port of useNbaHL/useHockeyHL (task #23), same rules:
 * 10 rounds, 10 pts per correct, +5 per consecutive-correct streak step,
 * daily (ET-seeded, same pairs for everyone) + unlimited modes.
 * Only the pool and slugs differ; keep the HL hooks in lockstep if the
 * mechanic ever changes.
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

export type NflHLStatus = 'playing' | 'complete';
export type NflHLMode = 'daily' | 'unlimited';

interface RoundResult {
  player1: NflHLPlayer;
  player2: NflHLPlayer;
  correct: boolean;
}

type HLAction = { t: 'result'; correct: boolean };

const ROUNDS = 10;
// Sentinel puzzle array — useDailyPuzzle needs at least one element.
const SENTINEL_PUZZLES = [{ id: 'nflhl-daily' }];

function buildPairs(seed: number, hard = false): [NflHLPlayer, NflHLPlayer][] {
  const shuffled = seededShuffle(nflHLPlayers, seed);
  if (!hard) {
    const result: [NflHLPlayer, NflHLPlayer][] = [];
    for (let i = 0; i < ROUNDS * 2 && i + 1 < shuffled.length; i += 2) {
      result.push([shuffled[i], shuffled[i + 1]]);
    }
    return result;
  }
  // HARD (task #12): greedy close-gap pairing on careerTds from a seeded
  // shuffle window — selection-only, scoring untouched. Unlimited-only:
  // daily pairs stay canonical so stored daily actions replay correctly.
  const pool = [...shuffled];
  const result: [NflHLPlayer, NflHLPlayer][] = [];
  while (result.length < ROUNDS && pool.length >= 2) {
    const a = pool.shift()!;
    let bestI = 0, bestGap = Infinity;
    for (let i = 0; i < Math.min(pool.length, 12); i++) {
      const gap = Math.abs(pool[i].careerTds - a.careerTds);
      if (gap < bestGap) { bestGap = gap; bestI = i; }
    }
    result.push([a, pool.splice(bestI, 1)[0]]);
  }
  return result;
}

export function useNflHL() {
  const [mode, setMode] = useState<NflHLMode>('daily');
  const [hard, setHard] = useState(false);

  const {
    guesses: dailyActions,
    addGuess: addDailyAction,
    gameStatus: rawDailyStatus,
    isLoading,
    todayStr,
  } = useDailyPuzzle<{ id: string }, HLAction>({
    gameSlug: 'nfl-hl',
    puzzles: SENTINEL_PUZZLES,
    maxGuesses: ROUNDS,
    isWon: (g) => g.length >= ROUNDS,
    deserializeGuesses: (raw) => raw as HLAction[],
  });

  const dailyPairs = useMemo(() => buildPairs(dateSeed(todayStr)), [todayStr]);

  const [currentResult, setCurrentResult] = useState<RoundResult | null>(null);
  const [showingResult, setShowingResult] = useState(false);

  const [unlimitedPairs, setUnlimitedPairs] = useState<[NflHLPlayer, NflHLPlayer][]>(
    () => buildPairs(Math.floor(Math.random() * 100000), hard),
  );
  const [unlimitedResults, setUnlimitedResults] = useState<RoundResult[]>([]);
  const [unlimitedRound, setUnlimitedRound] = useState(0);

  const dailyCurrentRound = dailyActions.length;
  const dailyResults: RoundResult[] = useMemo(
    () =>
      dailyActions.map((a, i) => ({
        player1: dailyPairs[i]?.[0] ?? nflHLPlayers[0],
        player2: dailyPairs[i]?.[1] ?? nflHLPlayers[1],
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

  const gameStatus: NflHLStatus = mode === 'daily'
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
      // Ties count as correct either way — HL pools contain exact-equal stat
      // values, and the old `>=` logic silently marked the right-side pick
      // wrong on a dead tie. Fixed across all HL hooks (July 2026).
      const tie = p1.careerTds === p2.careerTds;
      const leftHigher = p1.careerTds >= p2.careerTds;
      const correct = tie || (choice === 'left' && leftHigher) || (choice === 'right' && !leftHigher);

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

  const switchMode = useCallback((m: NflHLMode) => {
    if (m === 'unlimited') {
      setUnlimitedPairs(buildPairs(Math.floor(Math.random() * 100000), hard));
      setUnlimitedResults([]);
      setUnlimitedRound(0);
    }
    setMode(m);
    setCurrentResult(null);
    setShowingResult(false);
  }, [hard]);

  const toggleHard = useCallback(() => {
    setHard((prev) => {
      const next = !prev;
      // Hard pairs are an unlimited-mode feature — switching keeps the
      // daily's canonical pair list untouched.
      setMode('unlimited');
      setUnlimitedPairs(buildPairs(Math.floor(Math.random() * 100000), next));
      setUnlimitedResults([]);
      setUnlimitedRound(0);
      setCurrentResult(null);
      setShowingResult(false);
      return next;
    });
  }, []);

  useGameCompletion('nfl-higher-lower', rawDailyStatus !== 'playing', totalScore);

  return {
    mode, switchMode, hard, toggleHard, currentPair, currentRound, results, showingResult, streak,
    gameStatus, correctCount, totalScore, makeGuess, totalRounds: ROUNDS, isLoading,
  };
}
