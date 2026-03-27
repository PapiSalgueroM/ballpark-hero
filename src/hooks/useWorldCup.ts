import { useState, useMemo } from 'react';
import { worldCupPuzzles } from '@/data/worldCupPuzzles';
import { WorldCupPuzzle, WorldCupClue, WorldCupGameStatus } from '@/types/worldCup';
import { useGameCompletion } from '@/hooks/useGameCompletion';

const TOTAL_CLUES = 7;
const POINTS_BY_CLUE: Record<number, number> = { 1: 1000, 2: 800, 3: 600, 4: 400, 5: 300, 6: 200, 7: 100 };

function normalize(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function isGuessCorrect(guess: string, puzzle: WorldCupPuzzle): boolean {
  const g = normalize(guess);
  if (!g) return false;
  const answerNorm = normalize(puzzle.answer);
  if (g === answerNorm) return true;
  if (puzzle.aliases?.some(alias => normalize(alias) === g)) return true;
  const answerParts = answerNorm.split(/\s+/);
  if (answerParts.length > 1 && answerParts[answerParts.length - 1] === g) return true;
  if (answerParts.length > 1 && answerParts[0] === g && g.length >= 4) return true;
  const guessParts = g.split(/\s+/);
  if (guessParts.length >= 2 && answerParts.every(part => guessParts.includes(part))) return true;
  return false;
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
  const puzzle = useMemo(() => worldCupPuzzles[Math.floor(Math.random() * worldCupPuzzles.length)], []);
  const clues = useMemo(() => getClues(puzzle), [puzzle]);

  const [revealedCount, setRevealedCount] = useState(1);
  const [guess, setGuess] = useState('');
  const [attempts, setAttempts] = useState<string[]>([]);
  const [gameStatus, setGameStatus] = useState<WorldCupGameStatus>('playing');

  const revealedClues = clues.slice(0, revealedCount);
  const score = gameStatus === 'won' ? (POINTS_BY_CLUE[revealedCount] ?? 100) : 0;

  const submitGuess = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || gameStatus !== 'playing') return;
    const correct = isGuessCorrect(trimmed, puzzle);
    const displayName = correct ? puzzle.answer : trimmed;
    setAttempts((prev) => [...prev, displayName]);
    if (correct) { setGameStatus('won'); }
    else if (revealedCount >= TOTAL_CLUES) { setGameStatus('lost'); }
    else { setRevealedCount((c) => c + 1); }
  };

  const skipClue = () => {
    if (gameStatus !== 'playing') return;
    if (revealedCount >= TOTAL_CLUES) { setGameStatus('lost'); }
    else { setRevealedCount((c) => c + 1); }
  };

  const giveUp = () => {
    if (gameStatus !== 'playing') return;
    setGameStatus('lost');
    setRevealedCount(TOTAL_CLUES);
  };

  useGameCompletion('world-cup', gameStatus !== 'playing', score);

  return { puzzle, clues, revealedClues, revealedCount, totalClues: TOTAL_CLUES, guess, setGuess, attempts, submitGuess, skipClue, giveUp, gameStatus, score };
}
