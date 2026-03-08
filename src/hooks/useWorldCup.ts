import { useState, useEffect, useMemo } from 'react';
import { worldCupPuzzles } from '@/data/worldCupPuzzles';
import { WorldCupPuzzle, WorldCupClue, WorldCupGameStatus } from '@/types/worldCup';

const TOTAL_CLUES = 7;

const POINTS_BY_CLUE: Record<number, number> = {
  1: 1000,
  2: 800,
  3: 600,
  4: 400,
  5: 300,
  6: 200,
  7: 100,
};

function getDailyIndex(): number {
  const now = new Date();
  const start = new Date('2026-01-01');
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.abs(diffDays) % worldCupPuzzles.length;
}

function getClues(puzzle: WorldCupPuzzle): WorldCupClue[] {
  return [
    { label: 'Year', value: String(puzzle.year) },
    { label: 'Host Country', value: `${puzzle.hostFlag} ${puzzle.hostCountry}` },
    { label: 'Position', value: puzzle.position },
    { label: 'Country', value: `${puzzle.countryFlag} ${puzzle.country}` },
    { label: 'Club at the Time', value: puzzle.clubAtTime },
    { label: 'Achievement', value: puzzle.achievement },
    { label: 'Answer', value: puzzle.answer },
  ];
}

export function useWorldCup() {
  const puzzle = useMemo(() => worldCupPuzzles[getDailyIndex()], []);
  const clues = useMemo(() => getClues(puzzle), [puzzle]);

  const storageKey = `wc-daily-${puzzle.id}`;

  const [revealedCount, setRevealedCount] = useState(1);
  const [guess, setGuess] = useState('');
  const [attempts, setAttempts] = useState<string[]>([]);
  const [gameStatus, setGameStatus] = useState<WorldCupGameStatus>('playing');

  // Restore saved state
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        setRevealedCount(state.revealedCount ?? 1);
        setAttempts(state.attempts ?? []);
        setGameStatus(state.gameStatus ?? 'playing');
      } catch { /* ignore */ }
    }
  }, [storageKey]);

  // Persist state
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ revealedCount, attempts, gameStatus }));
  }, [revealedCount, attempts, gameStatus, storageKey]);

  const revealedClues = clues.slice(0, revealedCount);

  const score = gameStatus === 'won' ? (POINTS_BY_CLUE[revealedCount] ?? 100) : 0;

  const submitGuess = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || gameStatus !== 'playing') return;

    const isCorrect = trimmed.toLowerCase() === puzzle.answer.toLowerCase();
    setAttempts((prev) => [...prev, trimmed]);

    if (isCorrect) {
      setGameStatus('won');
    } else if (revealedCount >= TOTAL_CLUES) {
      setGameStatus('lost');
    } else {
      setRevealedCount((c) => c + 1);
    }
  };

  const skipClue = () => {
    if (gameStatus !== 'playing') return;
    if (revealedCount >= TOTAL_CLUES) {
      setGameStatus('lost');
    } else {
      setRevealedCount((c) => c + 1);
    }
  };

  return {
    puzzle,
    clues,
    revealedClues,
    revealedCount,
    totalClues: TOTAL_CLUES,
    guess,
    setGuess,
    attempts,
    submitGuess,
    skipClue,
    gameStatus,
    score,
  };
}
