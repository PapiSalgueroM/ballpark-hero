import { useState, useMemo, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { makeFirstDraw } from '@/lib/firstDraw';
import { hockeyHLPlayers, HockeyHLPlayer } from '@/data/hockeyHLPlayers';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { higherLowerScore } from '@/lib/higherLowerScore';
import { isHigherLowerDailyLog } from '@/lib/dailySaveShapes';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { dateSeed } from '@/lib/dateUtils';
import { keyedRng } from '@/lib/keyedRng';
import { safeLocalStorage } from '@/lib/safeStorage';

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

type HLAction = { t: 'result'; correct: boolean };

const ROUNDS = 10;
const PRACTICE_KEY = 'dukb-hockey-hl-unlimited-v1';
type Practice = { seed: number; hard: boolean; answers: boolean[] };

// A changed pool invalidates old pair seeds because it can change the matchups.
const poolRevision = keyedRng(JSON.stringify(hockeyHLPlayers))();
function loadPractice(): { raw: string | null; practice: Practice | null; active: boolean } {
  const raw = safeLocalStorage.getItem(PRACTICE_KEY);
  try {
    const value = raw ? JSON.parse(raw) : null;
    if (value && value.pool === poolRevision && typeof value.active === 'boolean'
      && Number.isInteger(value.seed) && value.seed >= 0 && value.seed < 100000
      && typeof value.hard === 'boolean' && Array.isArray(value.answers) && value.answers.length < ROUNDS
      && value.answers.every((answer: unknown) => typeof answer === 'boolean')) {
      return { raw, active: value.active, practice: { seed: value.seed, hard: value.hard, answers: value.answers } };
    }
  } catch { /* Start on Daily when the practice draft is unreadable. */ }
  return { raw, practice: null, active: false };
}

const encodePractice = (practice: Practice, active: boolean) =>
  JSON.stringify({ pool: poolRevision, seed: practice.seed, hard: practice.hard, answers: practice.answers, active });

// Sentinel puzzle array, useDailyPuzzle needs at least one element.
// The hook ignores the puzzle data and uses todayStr for seeding instead.
const SENTINEL_PUZZLES = [{ id: 'hkhl-daily' }];

function getDailyPairs(todayStr: string): [HockeyHLPlayer, HockeyHLPlayer][] {
  const seed = dateSeed(todayStr);
  const shuffled = seededShuffle(hockeyHLPlayers, seed);
  const result: [HockeyHLPlayer, HockeyHLPlayer][] = [];
  for (let i = 0; i < ROUNDS * 2 && i + 1 < shuffled.length; i += 2) {
    result.push([shuffled[i], shuffled[i + 1]]);
  }
  return result;
}

function getPracticePairs(seed: number, hard = false): [HockeyHLPlayer, HockeyHLPlayer][] {
  const shuffled = seededShuffle(hockeyHLPlayers, seed);
  if (!hard) {
    const result: [HockeyHLPlayer, HockeyHLPlayer][] = [];
    for (let i = 0; i < ROUNDS * 2 && i + 1 < shuffled.length; i += 2) {
      result.push([shuffled[i], shuffled[i + 1]]);
    }
    return result;
  }
  // HARD (task #12): greedy close-gap pairing on careerPoints from the
  // shuffle window, selection-only, scoring untouched. Unlimited-only:
  // daily pairs stay canonical so stored daily actions replay correctly.
  const pool = [...shuffled];
  const result: [HockeyHLPlayer, HockeyHLPlayer][] = [];
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

/* Round 421: drawn once per MOUNT, not once per render attempt. A discarded
   render that drew again shifted the prerenderer's seeded generator and
   changed the pick, which made the snapshot disagree with itself. The
   measurement and the reasoning live in src/lib/firstDraw.ts. */
const drawSeed = () => Math.floor(Math.random() * 100000);
const firstUnlimited = makeFirstDraw(drawSeed);

export function useHockeyHL() {
  const [saved] = useState(loadPractice);
  const [mode, setMode] = useState<HockeyHLMode>(saved.active ? 'unlimited' : 'daily');
  const [practice, setPractice] = useState(() => saved.practice ?? null);
  const hard = practice?.hard ?? false;

  // Daily persistence, sentinel puzzle, we only use todayStr + guesses
  const {
    guesses: dailyActions,
    addGuess: addDailyAction,
    takeNewerSave: takeNewerDailySave,
    gameStatus: rawDailyStatus,
    isLoading,
    todayStr,
  } = useDailyPuzzle<{ id: string }, HLAction>({
    gameSlug: 'hockey-higher-lower',
    storageSlug: 'hockey-hl',
    puzzles: SENTINEL_PUZZLES,
    maxGuesses: ROUNDS,
    isWon: (g) => g.length >= ROUNDS,
    deserializeGuesses: (raw) => raw as HLAction[],
    isValidGuesses: isHigherLowerDailyLog,
  });

  const dailyPairs = useMemo(() => getDailyPairs(todayStr), [todayStr]);

  // currentResult: the in-progress round shown during the 2-second reveal window
  // Not persisted, purely local UX state that disappears on reload (which is fine)
  const [currentResult, setCurrentResult] = useState<RoundResult | null>(null);
  const [showingResult, setShowingResult] = useState(false);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealVersion = useRef(0);
  const cancelReveal = useCallback(() => {
    revealVersion.current += 1;
    if (revealTimer.current !== null) clearTimeout(revealTimer.current);
    revealTimer.current = null;
  }, []);
  useEffect(() => cancelReveal, [cancelReveal]);

  const [initialSeed] = useState(firstUnlimited.get);
  useEffect(firstUnlimited.release, []);
  const unlimitedSeed = practice?.seed ?? initialSeed;
  const unlimitedPairs = useMemo(() => getPracticePairs(unlimitedSeed, hard), [unlimitedSeed, hard]);
  const unlimitedResults = useMemo<RoundResult[]>(() => practice?.answers.map((correct, i) => ({
    player1: unlimitedPairs[i][0], player2: unlimitedPairs[i][1], correct,
  })) ?? [], [practice, unlimitedPairs]);
  const revealingUnlimited = mode === 'unlimited' && showingResult && currentResult !== null;
  // Keep the accepted guess in the save while the reveal keeps it out of the displayed score.
  const unlimitedRound = unlimitedResults.length - (revealingUnlimited ? 1 : 0);
  const storedPractice = useRef(saved.raw);
  const previousPractice = useRef(saved.practice ? encodePractice(saved.practice, saved.active) : null);
  useLayoutEffect(() => {
    const next = practice && practice.answers.length < ROUNDS ? encodePractice(practice, mode === 'unlimited') : null;
    if (next === previousPractice.current) return;
    previousPractice.current = next;
    if (safeLocalStorage.getItem(PRACTICE_KEY) !== storedPractice.current) return;
    if (next === null) safeLocalStorage.removeItem(PRACTICE_KEY);
    else safeLocalStorage.setItem(PRACTICE_KEY, next);
    storedPractice.current = next;
  }, [practice, mode]);

  // Derived daily state
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
        player1: dailyPairs[i]?.[0] ?? hockeyHLPlayers[0],
        player2: dailyPairs[i]?.[1] ?? hockeyHLPlayers[1],
        correct: a.correct,
      })),
    [dailyActions, dailyPairs],
  );

  // Active values, append currentResult during reveal window so page UI is consistent
  const pairs = mode === 'daily' ? dailyPairs : unlimitedPairs;
  const currentRound = mode === 'daily' ? dailyCurrentRound : unlimitedRound;
  const baseResults = mode === 'daily' ? (revealingDaily ? dailyResults.slice(0, -1) : dailyResults)
    : (revealingUnlimited ? unlimitedResults.slice(0, -1) : unlimitedResults);
  const results: RoundResult[] = useMemo(
    () => (currentResult ? [...baseResults, currentResult] : baseResults),
    [baseResults, currentResult],
  );

  const gameStatus: HockeyHLStatus = mode === 'daily'
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

  // Current streak (computed from baseResults so it's consistent after reload)
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
      // Round 848 review: another tab already decided this round; jump to it, no verdict.
      if (mode === 'daily' && takeNewerDailySave()) return;
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
      else setPractice(previous => previous && { ...previous, answers: [...previous.answers, correct] });

      cancelReveal();
      const version = revealVersion.current;
      revealTimer.current = setTimeout(() => {
        if (version !== revealVersion.current) return;
        revealTimer.current = null;
        setCurrentResult(null);
        setShowingResult(false);
      }, 2000);
    },
    [currentPair, showingResult, gameStatus, mode, addDailyAction, takeNewerDailySave, cancelReveal],
  );

  const clearReveal = useCallback(() => {
    cancelReveal();
    setCurrentResult(null);
    setShowingResult(false);
  }, [cancelReveal]);

  const startUnlimited = useCallback((nextHard = hard) => {
    clearReveal();
    setPractice({ seed: drawSeed(), hard: nextHard, answers: [] });
    setMode('unlimited');
  }, [hard, clearReveal]);

  const switchMode = useCallback((m: HockeyHLMode) => {
    if (m === 'unlimited' && (!practice || practice.answers.length === ROUNDS || mode === 'unlimited')) {
      startUnlimited();
      return;
    }
    clearReveal();
    setMode(m);
  }, [practice, mode, startUnlimited, clearReveal]);

  const toggleHard = () => startUnlimited(!hard);

  useGameCompletion('hockey-higher-lower', rawDailyStatus !== 'playing', dailyScore);

  return {
    mode, switchMode, restartUnlimited: () => startUnlimited(), hard, toggleHard, currentPair, currentRound, results, showingResult, streak,
    gameStatus, correctCount, totalScore, makeGuess, totalRounds: ROUNDS, isLoading,
  };
}
