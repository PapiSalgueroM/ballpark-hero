import { useState, useMemo, useCallback } from 'react';
import { NFL_HL_CATEGORIES, type NflHLCategory, type NflHLCatPlayer } from '@/data/nflHLCategories';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { dateSeed } from '@/lib/dateUtils';

/**
 * NFL Higher/Lower, multi-stat edition (owner 2026-08-05: "it should be more
 * than just career touchdowns"). Every round draws a CATEGORY (TDs scored,
 * passing yards, passing TDs, rushing yards, receiving yards, receptions)
 * and a pair measured on that category. Same scoring as every HL on the
 * site: 10 rounds, 10 pts per correct, +5 per consecutive-correct streak
 * step, daily (ET-seeded) + unlimited, hard mode pairs close values.
 *
 * Normal pairing now REFUSES exact-tie pairs when any non-tie partner is
 * available (owner: "try to not have players with the same totals"); if a
 * tie somehow slips through, it still scores as correct either way.
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

export interface HLRound {
  category: NflHLCategory;
  p1: NflHLCatPlayer;
  p2: NflHLCatPlayer;
}

interface RoundResult extends HLRound {
  correct: boolean;
}

type HLAction = { t: 'result'; correct: boolean };

const ROUNDS = 10;
const SENTINEL_PUZZLES = [{ id: 'nflhl-daily' }];

function buildRounds(seed: number, hard = false): HLRound[] {
  const cats = seededShuffle(NFL_HL_CATEGORIES, seed);
  const rounds: HLRound[] = [];
  let s = seed;
  for (let r = 0; r < ROUNDS; r++) {
    const category = cats[r % cats.length];
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const pool = seededShuffle(category.players, s + r * 7919);
    const a = pool[0];
    let partner: NflHLCatPlayer | null = null;
    if (hard) {
      // Closest NON-EQUAL value in a lookahead window.
      let bestGap = Infinity;
      for (let i = 1; i < Math.min(pool.length, 14); i++) {
        const gap = Math.abs(pool[i].value - a.value);
        if (gap > 0 && gap < bestGap) { bestGap = gap; partner = pool[i]; }
      }
    } else {
      // First non-tie partner; a tie only if the whole pool ties (never in practice).
      partner = pool.slice(1).find((p) => p.value !== a.value) ?? null;
    }
    rounds.push({ category, p1: a, p2: partner ?? pool[1] });
  }
  return rounds;
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

  const dailyRounds = useMemo(() => buildRounds(dateSeed(todayStr)), [todayStr]);

  const [currentResult, setCurrentResult] = useState<RoundResult | null>(null);
  const [showingResult, setShowingResult] = useState(false);

  const [unlimitedRounds, setUnlimitedRounds] = useState<HLRound[]>(dailyRounds);
  const [unlimitedResults, setUnlimitedResults] = useState<RoundResult[]>([]);
  const [unlimitedRound, setUnlimitedRound] = useState(0);

  const dailyCurrentRound = dailyActions.length;
  const dailyResults: RoundResult[] = useMemo(
    () =>
      dailyActions.map((a, i) => ({
        ...(dailyRounds[i] ?? dailyRounds[0]),
        correct: a.correct,
      })),
    [dailyActions, dailyRounds],
  );

  const rounds = mode === 'daily' ? dailyRounds : unlimitedRounds;
  const currentRound = mode === 'daily' ? dailyCurrentRound : unlimitedRound;
  const baseResults = mode === 'daily' ? dailyResults : unlimitedResults;
  const results: RoundResult[] = useMemo(
    () => (currentResult ? [...baseResults, currentResult] : baseResults),
    [baseResults, currentResult],
  );

  const gameStatus: NflHLStatus = mode === 'daily'
    ? (rawDailyStatus !== 'playing' ? 'complete' : 'playing')
    : (unlimitedRound >= ROUNDS ? 'complete' : 'playing');

  const activeRound = gameStatus === 'playing' ? rounds[currentRound] ?? null : null;
  const currentPair: [NflHLCatPlayer, NflHLCatPlayer] | null = activeRound
    ? [activeRound.p1, activeRound.p2]
    : null;

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
      if (!activeRound || showingResult || gameStatus !== 'playing') return;
      const { p1, p2 } = activeRound;
      // Ties still score as correct either way, though pairing avoids them.
      const tie = p1.value === p2.value;
      const leftHigher = p1.value >= p2.value;
      const correct = tie || (choice === 'left' && leftHigher) || (choice === 'right' && !leftHigher);

      setCurrentResult({ ...activeRound, correct });
      setShowingResult(true);

      setTimeout(() => {
        if (mode === 'daily') {
          addDailyAction({ t: 'result', correct });
        } else {
          setUnlimitedResults((prev) => [...prev, { ...activeRound, correct }]);
          setUnlimitedRound((prev) => prev + 1);
        }
        setCurrentResult(null);
        setShowingResult(false);
      }, 2000);
    },
    [activeRound, showingResult, gameStatus, mode, addDailyAction],
  );

  const switchMode = useCallback((m: NflHLMode) => {
    if (m === 'unlimited') {
      setUnlimitedRounds(buildRounds(Math.floor(Math.random() * 100000), hard));
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
      setMode('unlimited');
      setUnlimitedRounds(buildRounds(Math.floor(Math.random() * 100000), next));
      setUnlimitedResults([]);
      setUnlimitedRound(0);
      setCurrentResult(null);
      setShowingResult(false);
      return next;
    });
  }, []);

  useGameCompletion('nfl-higher-lower', rawDailyStatus !== 'playing', totalScore);

  return {
    mode, switchMode, hard, toggleHard,
    activeRound, currentPair, currentRound, results, showingResult, streak,
    gameStatus, correctCount, totalScore, makeGuess, totalRounds: ROUNDS, isLoading,
  };
}
