import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { draftGuesserPuzzles, DraftGuesserPlayer } from '@/data/draftGuesserPlayers';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';

export type DraftGameStatus = 'playing' | 'complete';

export type FootballDraftMode = 'daily' | 'unlimited';

export interface PlayerGuess {
  guessedRound: number | null;
  points: number;
  submitted: boolean;
}

const ROUND_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 0];

const MAX_PER_PLAYER = 30;

// Exact round earns more the fewer clues were revealed first (incentive to guess
// early). cluesUsed is the reveal level (0-4). Close guesses keep modest partial
// credit. The game guesses round (not pick), so there is no exact-pick bonus.
function calcPoints(actual: number | null, guessed: number | null, cluesUsed: number): number {
  const a = actual ?? 0;
  const g = guessed ?? 0;
  if (a === g) return Math.max(15, MAX_PER_PLAYER - cluesUsed * 5); // 30/25/20/15/15 for 0..4 clues
  const diff = Math.abs(a - g);
  if (diff === 1) return 8;
  if (diff === 2) return 3;
  return 0;
}

type Puzzle = (typeof draftGuesserPuzzles)[number];

export function useFootballDraft() {
  // ---- MODE ----------------------------------------------------------------
  const [mode, setMode] = useState<FootballDraftMode>('daily');

  // ---- DAILY ---------------------------------------------------------------
  const {
    puzzle: dailyPuzzle,
    guesses: dailyGuesses,
    addGuess: addDailyGuess,
    gameStatus: rawDailyStatus,
    isLoading,
    reset: resetDailyHook,
  } = useDailyPuzzle<Puzzle, PlayerGuess>({
    gameSlug: 'football-draft',
    puzzles: draftGuesserPuzzles,
    maxGuesses: 50, // well above any puzzle's player count
    isWon: (g, puzzle) => g.length >= puzzle.players.length,
    deserializeGuesses: (raw) => raw as PlayerGuess[],
  });

  // ---- UNLIMITED -----------------------------------------------------------
  const [unlimitedPuzzle, setUnlimitedPuzzle] = useState<Puzzle>(
    () => draftGuesserPuzzles[Math.floor(Math.random() * draftGuesserPuzzles.length)]
  );
  const [unlimitedGuesses, setUnlimitedGuesses] = useState<PlayerGuess[]>(
    () => (unlimitedPuzzle as Puzzle).players.map(() => ({ guessedRound: null, points: 0, submitted: false }))
  );
  const [unlimitedCurrentIndex, setUnlimitedCurrentIndex] = useState(0);

  // ---- SHARED LOCAL STATE --------------------------------------------------
  const [revealLevel, setRevealLevel] = useState(0);
  // Owner bug (2026-07-10): "the 5th you don't even get to see, you just go to
  // the end screen." Hold the end screen until the final player's 2s reveal
  // window has played out.
  const [finalHold, setFinalHold] = useState(false);

  // currentIndex in daily mode is tracked locally (to allow the 2-second result display)
  const [dailyCurrentIndex, setDailyCurrentIndex] = useState(0);
  const indexSynced = useRef(false);

  // After daily puzzle loads, initialize currentIndex to the number of already-submitted guesses
  useEffect(() => {
    if (!isLoading && !indexSynced.current && mode === 'daily') {
      setDailyCurrentIndex(dailyGuesses.length);
      indexSynced.current = true;
    }
  }, [isLoading, dailyGuesses.length, mode]);

  // ---- ACTIVE VALUES -------------------------------------------------------
  const puzzle       = mode === 'daily' ? dailyPuzzle : unlimitedPuzzle;
  const guesses      = mode === 'daily' ? dailyGuesses : unlimitedGuesses;
  const currentIndex = mode === 'daily' ? dailyCurrentIndex : unlimitedCurrentIndex;

  const currentPlayer: DraftGuesserPlayer | null =
    puzzle && currentIndex < puzzle.players.length ? puzzle.players[currentIndex] : null;

  const gameStatus: DraftGameStatus = finalHold
    ? 'playing'
    : mode === 'daily'
      ? (rawDailyStatus !== 'playing' ? 'complete' : 'playing')
      : (unlimitedGuesses.every(g => g.submitted) ? 'complete' : 'playing');

  const totalPoints = guesses.reduce((sum, g) => sum + g.points, 0);
  const maxPoints   = puzzle ? puzzle.players.length * MAX_PER_PLAYER : 0;

  // ---- CALLBACKS -----------------------------------------------------------
  const switchMode = useCallback((newMode: FootballDraftMode) => {
    setMode(newMode);
    setRevealLevel(0);
    setFinalHold(false);
    if (newMode === 'unlimited') {
      setUnlimitedCurrentIndex(0);
    } else {
      // Will be re-synced by the useEffect on next render
      indexSynced.current = false;
      setDailyCurrentIndex(0);
    }
  }, []);

  const revealMore = useCallback(() => {
    setRevealLevel(prev => Math.min(prev + 1, 4));
  }, []);

  const submitGuess = useCallback((roundGuess: number) => {
    if (!currentPlayer || gameStatus !== 'playing') return;
    const guessValue = roundGuess === 0 ? null : roundGuess;
    const points = calcPoints(currentPlayer.draftRound, guessValue, revealLevel);
    const playerGuess: PlayerGuess = { guessedRound: roundGuess, points, submitted: true };

    const isLastPlayer = !!puzzle && currentIndex + 1 >= puzzle.players.length;
    if (isLastPlayer) setFinalHold(true);
    if (mode === 'daily') {
      addDailyGuess(playerGuess);
      setTimeout(() => {
        setDailyCurrentIndex(prev => prev + 1);
        setRevealLevel(0);
        if (isLastPlayer) setFinalHold(false);
      }, 2200);
    } else {
      setUnlimitedGuesses(prev => {
        const next = [...prev];
        next[currentIndex] = playerGuess;
        return next;
      });
      setTimeout(() => {
        setUnlimitedCurrentIndex(prev => prev + 1);
        setRevealLevel(0);
        if (isLastPlayer) setFinalHold(false);
      }, 2200);
    }
  }, [mode, currentPlayer, currentIndex, gameStatus, addDailyGuess, revealLevel, puzzle]);

  const resetGame = useCallback(() => {
    if (mode === 'daily') {
      indexSynced.current = false;
      setDailyCurrentIndex(0);
      resetDailyHook();
    } else {
      const next = draftGuesserPuzzles[Math.floor(Math.random() * draftGuesserPuzzles.length)];
      setUnlimitedPuzzle(next);
      setUnlimitedGuesses((next as Puzzle).players.map(() => ({ guessedRound: null, points: 0, submitted: false })));
      setUnlimitedCurrentIndex(0);
    }
    setRevealLevel(0);
    setFinalHold(false);
  }, [mode, resetDailyHook]);

  // ---- COMPLETION ----------------------------------------------------------
  const dailyScore = rawDailyStatus === 'won' ? dailyGuesses.reduce((sum, g) => sum + g.points, 0) * 10 : 0;
  useGameCompletion('football-draft', rawDailyStatus !== 'playing', dailyScore);

  return {
    mode,
    switchMode,
    puzzle,
    currentPlayer,
    currentIndex,
    guesses,
    revealLevel,
    revealMore,
    submitGuess,
    resetGame,
    gameStatus,
    totalPoints,
    maxPoints,
    roundOptions: ROUND_OPTIONS,
    isLoading: mode === 'daily' ? isLoading : false,
  };
}
