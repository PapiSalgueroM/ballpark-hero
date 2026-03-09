import { useState, useMemo, useCallback } from 'react';
import { draftGuesserPuzzles, DraftGuesserPlayer } from '@/data/draftGuesserPlayers';
import { useGameCompletion } from '@/hooks/useGameCompletion';

function getDailyIndex(): number {
  const now = new Date();
  const start = new Date('2026-01-01');
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.abs(diffDays) % draftGuesserPuzzles.length;
}

export type DraftGameStatus = 'playing' | 'complete';

export interface PlayerGuess {
  guessedRound: number | null; // null = undrafted, 1-7 = round
  points: number;
  submitted: boolean;
}

const ROUND_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 0]; // 0 = undrafted

function calcPoints(actual: number | null, guessed: number | null): number {
  const a = actual ?? 0; // 0 = undrafted
  const g = guessed ?? 0;
  if (a === g) return 10;
  const diff = Math.abs(a - g);
  if (diff === 1) return 5;
  if (diff === 2) return 2;
  return 0;
}

export function useFootballDraft() {
  const puzzle = useMemo(() => draftGuesserPuzzles[getDailyIndex()], []);
  const storageKey = `fd-daily-${puzzle.id}`;

  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.currentIndex ?? 0;
      } catch { /* ignore */ }
    }
    return 0;
  });

  const [guesses, setGuesses] = useState<PlayerGuess[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.guesses) return parsed.guesses;
      } catch { /* ignore */ }
    }
    return puzzle.players.map(() => ({ guessedRound: null, points: 0, submitted: false }));
  });

  const [revealLevel, setRevealLevel] = useState<number>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.revealLevel ?? 0;
      } catch { /* ignore */ }
    }
    return 0;
  });

  const currentPlayer: DraftGuesserPlayer | null = currentIndex < puzzle.players.length ? puzzle.players[currentIndex] : null;

  const gameStatus: DraftGameStatus = guesses.every((g) => g.submitted) ? 'complete' : 'playing';

  const totalPoints = guesses.reduce((sum, g) => sum + g.points, 0);
  const maxPoints = puzzle.players.length * 10;

  const revealMore = useCallback(() => {
    setRevealLevel((prev) => Math.min(prev + 1, 3));
  }, []);

  const submitGuess = useCallback((roundGuess: number) => {
    if (!currentPlayer) return;
    const actualRound = currentPlayer.draftRound ?? 0;
    const guessValue = roundGuess === 0 ? null : roundGuess;
    const points = calcPoints(currentPlayer.draftRound, guessValue);

    setGuesses((prev) => {
      const next = [...prev];
      next[currentIndex] = { guessedRound: roundGuess, points, submitted: true };
      return next;
    });

    // Save and move to next after a delay
    setTimeout(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        return next;
      });
      setRevealLevel(0);
    }, 2000);
  }, [currentIndex, currentPlayer]);

  // Persist state
  useMemo(() => {
    localStorage.setItem(storageKey, JSON.stringify({ currentIndex, guesses, revealLevel }));
  }, [currentIndex, guesses, revealLevel, storageKey]);

  useGameCompletion('football-draft', gameStatus === 'complete', totalPoints * 10);

  return {
    puzzle,
    currentPlayer,
    currentIndex,
    guesses,
    revealLevel,
    revealMore,
    submitGuess,
    gameStatus,
    totalPoints,
    maxPoints,
    roundOptions: ROUND_OPTIONS,
  };
}
