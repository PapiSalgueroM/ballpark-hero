import { useState, useMemo, useCallback } from 'react';
import { nbaHLPlayers, NbaHLPlayer } from '@/data/nbaHLPlayers';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { higherLowerScore } from '@/lib/higherLowerScore';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { dateSeed } from '@/lib/dateUtils';

/**
 * NBA Higher/Lower, a direct port of useHockeyHL (task #23), same rules:
 * 10 rounds, 10 pts per correct, +5 per consecutive-correct streak step,
 * daily (ET-seeded, same pairs for everyone) + unlimited modes.
 * Only the pool and slugs differ; keep the two hooks in lockstep if the
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

export type NbaHLStatus = 'playing' | 'complete';
export type NbaHLMode = 'daily' | 'unlimited';

interface RoundResult {
  player1: NbaHLPlayer;
  player2: NbaHLPlayer;
  correct: boolean;
}

type HLAction = { t: 'result'; correct: boolean };

const ROUNDS = 10;
// Sentinel puzzle array, useDailyPuzzle needs at least one element.
const SENTINEL_PUZZLES = [{ id: 'nbahl-daily' }];

function buildPairs(seed: number, hard = false): [NbaHLPlayer, NbaHLPlayer][] {
  const shuffled = seededShuffle(nbaHLPlayers, seed);
  if (!hard) {
    const result: [NbaHLPlayer, NbaHLPlayer][] = [];
    for (let i = 0; i < ROUNDS * 2 && i + 1 < shuffled.length; i += 2) {
      result.push([shuffled[i], shuffled[i + 1]]);
    }
    return result;
  }
  // HARD (task #12): greedy close-gap pairing on careerPoints from a seeded
  // shuffle window, selection-only, scoring untouched. Unlimited-only:
  // daily pairs stay canonical so stored daily actions replay correctly.
  const pool = [...shuffled];
  const result: [NbaHLPlayer, NbaHLPlayer][] = [];
  while (result.length < ROUNDS && pool.length >= 2) {
    const a = pool.shift()!;
    let bestI = 0, bestGap = Infinity;
    for (let i = 0; i < Math.min(pool.length, 12); i++) {
      const gap = Math.abs(pool[i].careerPoints - a.careerPoints);
      if (gap < bestGap) { bestGap = gap; bestI = i; }
    }
    result.push([a, pool.splice(bestI, 1)[0]]);
  }
  return result;
}

export function useNbaHL() {
  const [mode, setMode] = useState<NbaHLMode>('daily');
  const [hard, setHard] = useState(false);

  const {
    guesses: dailyActions,
    addGuess: addDailyAction,
    gameStatus: rawDailyStatus,
    isLoading,
    todayStr,
  } = useDailyPuzzle<{ id: string }, HLAction>({
    gameSlug: 'nba-higher-lower',
    storageSlug: 'nba-hl',
    puzzles: SENTINEL_PUZZLES,
    maxGuesses: ROUNDS,
    isWon: (g) => g.length >= ROUNDS,
    deserializeGuesses: (raw) => raw as HLAction[],
  });

  const dailyPairs = useMemo(() => buildPairs(dateSeed(todayStr)), [todayStr]);

  const [currentResult, setCurrentResult] = useState<RoundResult | null>(null);
  const [showingResult, setShowingResult] = useState(false);

  const [unlimitedPairs, setUnlimitedPairs] = useState<[NbaHLPlayer, NbaHLPlayer][]>(
    () => buildPairs(Math.floor(Math.random() * 100000), hard),
  );
  const [unlimitedResults, setUnlimitedResults] = useState<RoundResult[]>([]);
  const [unlimitedRound, setUnlimitedRound] = useState(0);

  /* Round 643 review: a daily round is saved the moment it is decided, not
     when its reveal ends. It used to wait out the two second reveal, so a
     reload inside that window dealt the same round again with the answer
     already seen. While the reveal shows, the round just decided is in the
     save but stays on screen, so everything the page reads is computed as
     though it were still pending, exactly as before. */
  const revealingDaily = mode === 'daily' && showingResult && currentResult !== null;
  const dailyCurrentRound = dailyActions.length - (revealingDaily ? 1 : 0);
  const dailyResults: RoundResult[] = useMemo(
    () =>
      dailyActions.map((a, i) => ({
        player1: dailyPairs[i]?.[0] ?? nbaHLPlayers[0],
        player2: dailyPairs[i]?.[1] ?? nbaHLPlayers[1],
        correct: a.correct,
      })),
    [dailyActions, dailyPairs],
  );

  const pairs = mode === 'daily' ? dailyPairs : unlimitedPairs;
  const currentRound = mode === 'daily' ? dailyCurrentRound : unlimitedRound;
  const baseResults = mode === 'daily' ? (revealingDaily ? dailyResults.slice(0, -1) : dailyResults) : unlimitedResults;
  const results: RoundResult[] = useMemo(
    () => (currentResult ? [...baseResults, currentResult] : baseResults),
    [baseResults, currentResult],
  );

  const gameStatus: NbaHLStatus = mode === 'daily'
    ? (rawDailyStatus !== 'playing' && !revealingDaily ? 'complete' : 'playing')
    : (unlimitedRound >= ROUNDS ? 'complete' : 'playing');

  const currentPair = gameStatus === 'playing' ? pairs[currentRound] ?? null : null;

  const correctCount = baseResults.filter((r) => r.correct).length;
  const totalScore = higherLowerScore(baseResults);
  /* Round 643 review: the recorder reads the daily's own score, every
     decided round in it, whatever mode is on screen. The final round is
     saved (and the daily recorded) while its reveal still shows, when the
     score on screen does not include it yet. */
  const dailyScore = higherLowerScore(dailyResults);

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
      // Ties count as correct either way, HL pools contain exact-equal stat
      // values, and the old `>=` logic silently marked the right-side pick
      // wrong on a dead tie. Fixed across all HL hooks (July 2026).
      const tie = p1.careerPoints === p2.careerPoints;
      const leftHigher = p1.careerPoints >= p2.careerPoints;
      const correct = tie || (choice === 'left' && leftHigher) || (choice === 'right' && !leftHigher);

      setCurrentResult({ player1: p1, player2: p2, correct });
      setShowingResult(true);

      if (mode === 'daily') addDailyAction({ t: 'result', correct });

      setTimeout(() => {
        if (mode !== 'daily') {
          setUnlimitedResults((prev) => [...prev, { player1: p1, player2: p2, correct }]);
          setUnlimitedRound((prev) => prev + 1);
        }
        setCurrentResult(null);
        setShowingResult(false);
      }, 2000);
    },
    [currentPair, showingResult, gameStatus, mode, addDailyAction],
  );

  const switchMode = useCallback((m: NbaHLMode) => {
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
      // Hard pairs are an unlimited-mode feature, switching keeps the
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

  useGameCompletion('nba-higher-lower', rawDailyStatus !== 'playing', dailyScore);

  return {
    mode, switchMode, hard, toggleHard, currentPair, currentRound, results, showingResult, streak,
    gameStatus, correctCount, totalScore, makeGuess, totalRounds: ROUNDS, isLoading,
  };
}
