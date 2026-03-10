import { useState, useEffect, useMemo } from 'react';
import { worldCupPuzzles } from '@/data/worldCupPuzzles';
import { WorldCupPuzzle, WorldCupClue, WorldCupGameStatus } from '@/types/worldCup';
import { useGameCompletion } from '@/hooks/useGameCompletion';

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

/** Normalize accented characters for comparison */
function normalize(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/** Check if a guess matches the answer using flexible matching */
function isGuessCorrect(guess: string, puzzle: WorldCupPuzzle): boolean {
  const g = normalize(guess);
  if (!g) return false;

  const answer = puzzle.answer;
  const answerNorm = normalize(answer);

  // Exact match (accent-insensitive)
  if (g === answerNorm) return true;

  // Check explicit aliases
  if (puzzle.aliases?.some(alias => normalize(alias) === g)) return true;

  // Split answer into name parts
  const answerParts = answerNorm.split(/\s+/);

  // Match on last name alone (e.g. "Maradona" for "Diego Maradona")
  if (answerParts.length > 1 && answerParts[answerParts.length - 1] === g) return true;

  // Match on first name alone (e.g. "Diego" for "Diego Maradona") — only if first name is 4+ chars to avoid false positives
  if (answerParts.length > 1 && answerParts[0] === g && g.length >= 4) return true;

  // Match if guess contains all parts of the answer or answer contains all parts of the guess
  const guessParts = g.split(/\s+/);
  if (guessParts.length >= 2 && answerParts.every(part => guessParts.includes(part))) return true;

  return false;
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

    const correct = isGuessCorrect(trimmed, puzzle);
    setAttempts((prev) => [...prev, trimmed]);

    if (correct) {
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

  useGameCompletion('world-cup', gameStatus !== 'playing', score);

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
