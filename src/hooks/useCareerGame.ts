import { useState, useCallback, useMemo } from 'react';
import { CareerPlayer } from '@/types/career';
import { careerPlayers } from '@/data/careerPlayers';
import { toast } from 'sonner';
import { ensureAnswerInOptions } from '@/lib/ensureAnswerInOptions';

const MAX_GUESSES = 8;

export function useCareerGame() {
  const [targetPlayer, setTargetPlayer] = useState<CareerPlayer>(() =>
    careerPlayers[Math.floor(Math.random() * careerPlayers.length)]
  );
  const [revealedCells, setRevealedCells] = useState<Set<string>>(new Set());
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [boxesUsed, setBoxesUsed] = useState(0);
  const [guessesUsed, setGuessesUsed] = useState(0);

  // Get all coverable cell keys (everything except season column)
  const getAllCoverableCells = useCallback(() => {
    const cols = ['club', 'appearances', 'goals', 'assists', 'marketValue'];
    const keys: string[] = [];
    targetPlayer.career.forEach((_, rowIdx) => {
      cols.forEach(col => keys.push(`${rowIdx}-${col}`));
    });
    return keys;
  }, [targetPlayer]);

  const revealCell = useCallback((key: string) => {
    if (gameStatus !== 'playing') return;
    setRevealedCells(prev => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      setBoxesUsed(b => b + 1);
      return next;
    });
  }, [gameStatus]);

  const giveHint = useCallback(() => {
    if (gameStatus !== 'playing') return;
    setRevealedCells(prev => {
      const allCells = getAllCoverableCells();
      const unrevealed = allCells.filter(k => !prev.has(k));
      if (unrevealed.length === 0) return prev;

      // Pick up to 4 random unrevealed cells
      const toReveal = Math.min(4, unrevealed.length);
      const shuffled = [...unrevealed].sort(() => Math.random() - 0.5);
      const next = new Set(prev);
      for (let i = 0; i < toReveal; i++) {
        next.add(shuffled[i]);
      }
      setBoxesUsed(b => b + toReveal);
      return next;
    });
  }, [gameStatus, getAllCoverableCells]);

  const allRevealed = useMemo(() => {
    const allCells = getAllCoverableCells();
    return allCells.every(k => revealedCells.has(k));
  }, [revealedCells, getAllCoverableCells]);

  const makeGuess = useCallback((name: string): boolean => {
    if (gameStatus !== 'playing') return false;
    const newCount = guessesUsed + 1;
    setGuessesUsed(newCount);

    if (name.toLowerCase().trim() === targetPlayer.name.toLowerCase().trim()) {
      setGameStatus('won');
      return true;
    }

    if (newCount >= MAX_GUESSES) {
      setGameStatus('lost');
      toast.error(`No more guesses! The player was ${targetPlayer.name}`);
      return false;
    }

    toast.error(`❌ Not ${name}. ${MAX_GUESSES - newCount} guess${MAX_GUESSES - newCount === 1 ? '' : 'es'} remaining!`);
    return false;
  }, [gameStatus, targetPlayer, guessesUsed]);

  const giveUp = useCallback(() => {
    if (gameStatus !== 'playing') return;
    setGameStatus('lost');
  }, [gameStatus]);

  const resetGame = useCallback(() => {
    setTargetPlayer(careerPlayers[Math.floor(Math.random() * careerPlayers.length)]);
    setRevealedCells(new Set());
    setGameStatus('playing');
    setBoxesUsed(0);
    setGuessesUsed(0);
  }, []);

  const playerNames = useMemo(() => ensureAnswerInOptions(careerPlayers.map(p => p.name), targetPlayer.name), [targetPlayer]);

  return {
    targetPlayer,
    revealedCells,
    revealCell,
    makeGuess,
    giveUp,
    giveHint,
    resetGame,
    gameStatus,
    boxesUsed,
    guessesUsed,
    maxGuesses: MAX_GUESSES,
    playerNames,
    allRevealed,
  };
}
