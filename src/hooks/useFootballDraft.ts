import { useState, useMemo, useCallback } from 'react';
import { draftGuesserPuzzles, DraftGuesserPlayer } from '@/data/draftGuesserPlayers';
import { useGameCompletion } from '@/hooks/useGameCompletion';

export type DraftGameStatus = 'playing' | 'complete';

export interface PlayerGuess {
  guessedRound: number | null;
  points: number;
  submitted: boolean;
}

const ROUND_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 0];

function calcPoints(actual: number | null, guessed: number | null): number {
  const a = actual ?? 0;
  const g = guessed ?? 0;
  if (a === g) return 10;
  const diff = Math.abs(a - g);
  if (diff === 1) return 5;
  if (diff === 2) return 2;
  return 0;
}

export function useFootballDraft() {
  const puzzle = useMemo(() => draftGuesserPuzzles[Math.floor(Math.random() * draftGuesserPuzzles.length)], []);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [guesses, setGuesses] = useState<PlayerGuess[]>(() =>
    puzzle.players.map(() => ({ guessedRound: null, points: 0, submitted: false }))
  );
  const [revealLevel, setRevealLevel] = useState(0);

  const currentPlayer: DraftGuesserPlayer | null = currentIndex < puzzle.players.length ? puzzle.players[currentIndex] : null;
  const gameStatus: DraftGameStatus = guesses.every((g) => g.submitted) ? 'complete' : 'playing';
  const totalPoints = guesses.reduce((sum, g) => sum + g.points, 0);
  const maxPoints = puzzle.players.length * 10;

  const revealMore = useCallback(() => {
    setRevealLevel((prev) => Math.min(prev + 1, 3));
  }, []);

  const submitGuess = useCallback((roundGuess: number) => {
    if (!currentPlayer) return;
    const guessValue = roundGuess === 0 ? null : roundGuess;
    const points = calcPoints(currentPlayer.draftRound, guessValue);

    setGuesses((prev) => {
      const next = [...prev];
      next[currentIndex] = { guessedRound: roundGuess, points, submitted: true };
      return next;
    });

    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setRevealLevel(0);
    }, 2000);
  }, [currentIndex, currentPlayer]);

  useGameCompletion('football-draft', gameStatus === 'complete', totalPoints * 10);

  return {
    puzzle, currentPlayer, currentIndex, guesses, revealLevel,
    revealMore, submitGuess, gameStatus, totalPoints, maxPoints,
    roundOptions: ROUND_OPTIONS,
  };
}
