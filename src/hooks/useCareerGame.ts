import { useState, useCallback, useMemo } from 'react';
import { CareerPlayer } from '@/types/career';
import { careerPlayers } from '@/data/careerPlayers';
import { toast } from 'sonner';

export function useCareerGame() {
  const [targetPlayer, setTargetPlayer] = useState<CareerPlayer>(() =>
    careerPlayers[Math.floor(Math.random() * careerPlayers.length)]
  );
  const [revealedCells, setRevealedCells] = useState<Set<string>>(new Set());
  const [guessInput, setGuessInput] = useState('');
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [boxesUsed, setBoxesUsed] = useState(0);

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

  const makeGuess = useCallback((name: string): boolean => {
    if (gameStatus !== 'playing') return false;
    if (name.toLowerCase().trim() === targetPlayer.name.toLowerCase().trim()) {
      setGameStatus('won');
      return true;
    }
    toast.error(`❌ Not ${name}. Try again!`);
    return false;
  }, [gameStatus, targetPlayer]);

  const giveUp = useCallback(() => {
    if (gameStatus !== 'playing') return;
    setGameStatus('lost');
  }, [gameStatus]);

  const resetGame = useCallback(() => {
    setTargetPlayer(careerPlayers[Math.floor(Math.random() * careerPlayers.length)]);
    setRevealedCells(new Set());
    setGuessInput('');
    setGameStatus('playing');
    setBoxesUsed(0);
  }, []);

  const playerNames = useMemo(() => careerPlayers.map(p => p.name), []);

  return {
    targetPlayer,
    revealedCells,
    revealCell,
    guessInput,
    setGuessInput,
    makeGuess,
    giveUp,
    resetGame,
    gameStatus,
    boxesUsed,
    playerNames,
  };
}
