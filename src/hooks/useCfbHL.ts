import { useState, useMemo, useCallback } from 'react';
import { cfbHLPlayers, CfbHLPlayer } from '@/data/cfbHLPlayers';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { dateSeed } from '@/lib/dateUtils';

/**
 * College Football Higher/Lower — sixth Higher/Lower sport port (task #23),
 * same rules as the Hockey/NBA/NFL/F1/MLB/Tennis hooks: 10 rounds, 10 pts
 * per correct, +5 per consecutive-correct streak step, daily (ET-seeded) +
 * unlimited modes. Ties score as correct for either pick. Keep the HL hooks
 * in lockstep if the mechanic ever changes.
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

export type CfbHLStatus = 'playing' | 'complete';
export type CfbHLMode = 'daily' | 'unlimited';

interface RoundResult {
  player1: CfbHLPlayer;
  player2: CfbHLPlayer;
  correct: boolean;
}

type HLAction = { t: 'result'; correct: boolean };

const ROUNDS = 10;
// Sentinel puzzle array — useDailyPuzzle needs at least one element.
const SENTINEL_PUZZLES = [{ id: 'cfbhl-daily' }];

function buildPairs(seed: number): [CfbHLPlayer, CfbHLPlayer][] {
  const shuffled = seededShuffle(cfbHLPlayers, seed);
  const result: [CfbHLPlayer, CfbHLPlayer][] = [];
  for (let i = 0; i < ROUNDS * 2 && i + 1 < shuffled.length; i += 2) {
    result.push([shuffled[i], shuffled[i + 1]]);
  }
  return result;
}

export function useCfbHL() {
  const [mode, setMode] = useState<CfbHLMode>('daily');

  const {
    guesses: dailyActions,
    addGuess: addDailyAction,
    gameStatus: rawDailyStatus,
    isLoading,
    todayStr,
  } = useDailyPuzzle<{ id: string }, HLAction>({
    gameSlug: 'cfb-hl',
    puzzles: SENTINEL_PUZZLES,
    maxGuesses: ROUNDS,
    isWon: (g) => g.length >= ROUNDS,
    deserializeGuesses: (raw) => raw as HLAction[],
  });

  const dailyPairs = useMemo(() => buildPairs(dateSeed(todayStr)), [todayStr]);

  const [currentResult, setCurrentResult] = useState<RoundResult | null>(null);
  const [showingResult, setShowingResult] = useState(false);

  const [unlimitedPairs, setUnlimitedPairs] = useState<[CfbHLPlayer, CfbHLPlayer][]>(
    () => buildPairs(Math.floor(Math.random() * 100000)),
  );
  const [unlimitedResults, setUnlimitedResults] = useState<RoundResult[]>([]);
  const [unlimitedRound, setUnlimitedRound] = useState(0);

  const dailyCurrentRound = dailyActions.length;
  const dailyResults: RoundResult[] = useMemo(
    () =>
      dailyActions.map((a, i) => ({
        player1: dailyPairs[i]?.[0] ?? cfbHLPlayers[0],
        player2: dailyPairs[i]?.[1] ?? cfbHLPlayers[1],
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

  const gameStatus: CfbHLStatus = mode === 'daily'
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
      // Ties count as correct either way (HL-wide rule, July 2026).
      const tie = p1.careerPassYds === p2.careerPassYds;
      const leftHigher = p1.careerPassYds >= p2.careerPassYds;
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

  const switchMode = useCallback((m: CfbHLMode) => {
    if (m === 'unlimited') {
      setUnlimitedPairs(buildPairs(Math.floor(Math.random() * 100000)));
      setUnlimitedResults([]);
      setUnlimitedRound(0);
    }
    setMode(m);
    setCurrentResult(null);
    setShowingResult(false);
  }, []);

  useGameCompletion('cfb-higher-lower', rawDailyStatus !== 'playing', totalScore);

  return {
    mode, switchMode, currentPair, currentRound, results, showingResult, streak,
    gameStatus, correctCount, totalScore, makeGuess, totalRounds: ROUNDS, isLoading,
  };
}
