import { useState, useMemo, useCallback } from 'react';
import { Player, Difficulty, GuessResult } from '@/types/game';
import { players } from '@/data/players';
import { compareGuess } from '@/lib/gameLogic';
import { ensureAnswerInList } from '@/lib/ensureAnswerInOptions';
import { useGameCompletion } from '@/hooks/useGameCompletion';

const MAX_GUESSES = 8;

function selectRandomPlayer(diff: Difficulty): Player {
  let pool: Player[];
  if (diff === 'easy') {
    pool = players.filter(p => p.difficulty === 'easy');
  } else if (diff === 'hard') {
    pool = players.filter(p => p.difficulty === 'easy' || p.difficulty === 'hard');
  } else {
    // insane: all players
    pool = players;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

export function useGame() {
  const [difficulty, setDifficultyState] = useState<Difficulty>('easy');
  const [targetPlayer, setTargetPlayer] = useState<Player>(() => selectRandomPlayer('easy'));
  const [guesses, setGuesses] = useState<GuessResult[]>([]);
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');

  const availablePlayers = useMemo(() => {
    let pool: Player[];
    if (difficulty === 'easy') pool = players.filter(p => p.difficulty === 'easy');
    else if (difficulty === 'hard') pool = players.filter(p => p.difficulty === 'easy' || p.difficulty === 'hard');
    else pool = players;
    return ensureAnswerInList(pool, targetPlayer.name, p => p.name, targetPlayer);
  }, [difficulty, targetPlayer]);

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

  const completionScore = gameStatus === 'won' ? Math.max(100, (MAX_GUESSES - guesses.length) * 100) : 0;
  useGameCompletion('footle', gameStatus !== 'playing', completionScore);

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
