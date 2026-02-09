import { useState, useMemo, useCallback } from 'react';
import { Player, Difficulty, GuessResult } from '@/types/game';
import { players } from '@/data/players';
import { compareGuess } from '@/lib/gameLogic';

const MAX_GUESSES = 8;

function selectRandomPlayer(diff: Difficulty): Player {
  const pool = diff === 'easy'
    ? players.filter(p => p.difficulty === 'easy')
    : players;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function useGame() {
  const [difficulty, setDifficultyState] = useState<Difficulty>('easy');
  const [targetPlayer, setTargetPlayer] = useState<Player>(() => selectRandomPlayer('easy'));
  const [guesses, setGuesses] = useState<GuessResult[]>([]);
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');

  const availablePlayers = useMemo(() => {
    return difficulty === 'easy'
      ? players.filter(p => p.difficulty === 'easy')
      : players;
  }, [difficulty]);

  const resetGame = useCallback((diff?: Difficulty) => {
    const d = diff || difficulty;
    setTargetPlayer(selectRandomPlayer(d));
    setGuesses([]);
    setGameStatus('playing');
  }, [difficulty]);

  const changeDifficulty = useCallback((newDiff: Difficulty) => {
    if (newDiff === difficulty) return;
    setDifficultyState(newDiff);
    setTargetPlayer(selectRandomPlayer(newDiff));
    setGuesses([]);
    setGameStatus('playing');
  }, [difficulty]);

  const makeGuess = useCallback((player: Player) => {
    if (gameStatus !== 'playing') return;

    const result = compareGuess(player, targetPlayer);
    setGuesses(prev => {
      const newGuesses = [...prev, result];
      if (result.isCorrect) {
        setGameStatus('won');
      } else if (newGuesses.length >= MAX_GUESSES) {
        setGameStatus('lost');
      }
      return newGuesses;
    });
  }, [gameStatus, targetPlayer]);

  const guessedPlayerNames = useMemo(() => guesses.map(g => g.playerName), [guesses]);

  return {
    difficulty,
    changeDifficulty,
    targetPlayer,
    guesses,
    gameStatus,
    makeGuess,
    resetGame,
    availablePlayers,
    guessedPlayerNames,
    maxGuesses: MAX_GUESSES,
  };
}
