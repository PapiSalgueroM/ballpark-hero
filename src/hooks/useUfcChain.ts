import { useState, useCallback } from 'react';
import { GameState, UfcFighter, ChainLink } from '@/types/ufcChain';
import { UFC_FIGHTERS, getFightersWhoBeat, getRandomStartingFighter } from '@/data/ufcChainData';

export function useUfcChain() {
  const [gameState, setGameState] = useState<GameState>(() => {
    const startingFighter = getRandomStartingFighter();
    return {
      currentFighter: startingFighter,
      chain: [{ fighter: startingFighter }],
      score: 0,
      gameStatus: 'playing',
      usedFighters: new Set([startingFighter.name]),
    };
  });

  const makeGuess = useCallback((guessedFighterName: string) => {
    if (gameState.gameStatus !== 'playing') return;

    const guessedFighter = UFC_FIGHTERS.find(f => f.name === guessedFighterName);
    if (!guessedFighter) return;

    // Check if fighter already used
    if (gameState.usedFighters.has(guessedFighterName)) {
      setGameState(prev => ({
        ...prev,
        gameStatus: 'ended',
        gameOverReason: `You already used ${guessedFighterName} in this chain!`,
      }));
      return;
    }

    // Check if the guessed fighter actually beat the current fighter
    const validOpponents = getFightersWhoBeat(gameState.currentFighter.name);
    const isCorrect = validOpponents.some(f => f.name === guessedFighterName);

    if (isCorrect) {
      // Correct guess - extend chain
      const newChain = [...gameState.chain];
      newChain[newChain.length - 1].defeatedBy = guessedFighter;
      newChain.push({ fighter: guessedFighter });

      setGameState(prev => ({
        ...prev,
        currentFighter: guessedFighter,
        chain: newChain,
        score: prev.score + 100,
        usedFighters: new Set([...prev.usedFighters, guessedFighterName]),
      }));
    } else {
      // Wrong guess - end game
      const correctAnswers = validOpponents.length > 0 ? validOpponents : [];
      setGameState(prev => ({
        ...prev,
        gameStatus: 'ended',
        gameOverReason: 'Incorrect guess!',
        correctAnswer: correctAnswers[0],
      }));
    }
  }, [gameState]);

  const giveUp = useCallback(() => {
    const validOpponents = getFightersWhoBeat(gameState.currentFighter.name);
    setGameState(prev => ({
      ...prev,
      gameStatus: 'ended',
      gameOverReason: 'You gave up!',
      correctAnswer: validOpponents[0],
    }));
  }, [gameState.currentFighter]);

  const resetGame = useCallback(() => {
    const startingFighter = getRandomStartingFighter();
    setGameState({
      currentFighter: startingFighter,
      chain: [{ fighter: startingFighter }],
      score: 0,
      gameStatus: 'playing',
      usedFighters: new Set([startingFighter.name]),
    });
  }, []);

  return {
    gameState,
    makeGuess,
    giveUp,
    resetGame,
  };
}