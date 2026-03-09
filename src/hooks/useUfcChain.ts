import { useState, useCallback } from 'react';
import { GameState, GameMode, WeightClass, getChainLengthMultiplier, getEarnedBadge } from '@/types/ufcChain';
import { UFC_FIGHTERS, getFightersWhoBeat, getFightResult, getRandomStartingFighter, getDailyStartingFighter, getHallOfFamers, getFightersByWeightClass } from '@/data/ufcChainData';

const CHAMPIONSHIP_BONUS = 50;

export function useUfcChain() {
  const [gameState, setGameState] = useState<GameState | null>(null);

  const startGame = useCallback((mode: GameMode, weightClass?: WeightClass) => {
    let startingFighter;
    
    if (mode === 'daily') {
      startingFighter = getDailyStartingFighter();
    } else if (mode === 'hall-of-fame') {
      startingFighter = getRandomStartingFighter({ hallOfFameOnly: true });
    } else if (mode === 'weight-class' && weightClass) {
      startingFighter = getRandomStartingFighter({ weightClass });
    } else {
      startingFighter = getRandomStartingFighter();
    }

    setGameState({
      currentFighter: startingFighter,
      chain: [{ fighter: startingFighter }],
      score: 0,
      rawScore: 0,
      gameStatus: 'playing',
      usedFighters: new Set([startingFighter.name]),
      mode,
      selectedWeightClass: weightClass,
    });
  }, []);

  const makeGuess = useCallback((guessedFighterName: string) => {
    if (!gameState || gameState.gameStatus !== 'playing') return;

    const guessedFighter = UFC_FIGHTERS.find(f => f.name === guessedFighterName);
    if (!guessedFighter) return;

    // Validate fighter for mode
    if (gameState.mode === 'hall-of-fame' && !guessedFighter.isHallOfFamer) {
      return; // Invalid selection for mode
    }
    if (gameState.mode === 'weight-class' && gameState.selectedWeightClass && 
        guessedFighter.weightClass !== gameState.selectedWeightClass) {
      return; // Invalid selection for mode
    }

    // Check if fighter already used
    if (gameState.usedFighters.has(guessedFighterName)) {
      const chainLength = gameState.chain.length - 1;
      setGameState(prev => prev ? ({
        ...prev,
        gameStatus: 'ended',
        gameOverReason: `You already used ${guessedFighterName} in this chain!`,
        earnedBadge: getEarnedBadge(chainLength),
      }) : null);
      return;
    }

    // Check if the guessed fighter actually beat the current fighter
    const weightClassFilter = gameState.mode === 'weight-class' ? gameState.selectedWeightClass : undefined;
    const validOpponents = getFightersWhoBeat(gameState.currentFighter.name, weightClassFilter);
    
    // For hall of fame mode, filter to only HOF fighters
    const filteredOpponents = gameState.mode === 'hall-of-fame' 
      ? validOpponents.filter(f => f.isHallOfFamer)
      : validOpponents;
    
    const isCorrect = filteredOpponents.some(f => f.name === guessedFighterName);

    if (isCorrect) {
      // Calculate bonus points
      let bonusPoints = 0;
      const fightResult = getFightResult(guessedFighterName, gameState.currentFighter.name);
      if (fightResult?.wasChampionshipFight) {
        bonusPoints += CHAMPIONSHIP_BONUS;
      }

      // Extend chain
      const newChain = [...gameState.chain];
      newChain[newChain.length - 1].defeatedBy = guessedFighter;
      newChain.push({ fighter: guessedFighter, bonusPoints });

      const newRawScore = gameState.rawScore + 100 + bonusPoints;
      const chainLength = newChain.length - 1;
      const multiplier = getChainLengthMultiplier(chainLength);
      const newScore = Math.floor(newRawScore * multiplier);

      setGameState(prev => prev ? ({
        ...prev,
        currentFighter: guessedFighter,
        chain: newChain,
        score: newScore,
        rawScore: newRawScore,
        usedFighters: new Set([...prev.usedFighters, guessedFighterName]),
      }) : null);
    } else {
      // Wrong guess - end game
      const chainLength = gameState.chain.length - 1;
      setGameState(prev => prev ? ({
        ...prev,
        gameStatus: 'ended',
        gameOverReason: 'Incorrect guess!',
        correctAnswer: filteredOpponents[0],
        earnedBadge: getEarnedBadge(chainLength),
      }) : null);
    }
  }, [gameState]);

  const giveUp = useCallback(() => {
    if (!gameState) return;
    
    const weightClassFilter = gameState.mode === 'weight-class' ? gameState.selectedWeightClass : undefined;
    let validOpponents = getFightersWhoBeat(gameState.currentFighter.name, weightClassFilter);
    
    if (gameState.mode === 'hall-of-fame') {
      validOpponents = validOpponents.filter(f => f.isHallOfFamer);
    }
    
    const chainLength = gameState.chain.length - 1;
    setGameState(prev => prev ? ({
      ...prev,
      gameStatus: 'ended',
      gameOverReason: 'You gave up!',
      correctAnswer: validOpponents[0],
      earnedBadge: getEarnedBadge(chainLength),
    }) : null);
  }, [gameState]);

  const resetGame = useCallback(() => {
    setGameState(null);
  }, []);

  const getAvailableFighters = useCallback(() => {
    if (!gameState) return UFC_FIGHTERS;
    
    if (gameState.mode === 'hall-of-fame') {
      return getHallOfFamers();
    }
    if (gameState.mode === 'weight-class' && gameState.selectedWeightClass) {
      return getFightersByWeightClass(gameState.selectedWeightClass);
    }
    return UFC_FIGHTERS;
  }, [gameState]);

  return {
    gameState,
    startGame,
    makeGuess,
    giveUp,
    resetGame,
    getAvailableFighters,
  };
}