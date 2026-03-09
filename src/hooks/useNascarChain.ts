import { useState, useCallback } from 'react';
import { NascarChainState, NascarChainMode, getNascarChainMultiplier, getNascarEarnedBadge, NASCAR_CHAIN_STARTERS } from '@/types/nascarChain';
import { supabase } from '@/integrations/supabase/client';

function getDailyStarter(): string {
  const today = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = ((hash << 5) - hash + today.charCodeAt(i)) | 0;
  }
  return NASCAR_CHAIN_STARTERS[Math.abs(hash) % NASCAR_CHAIN_STARTERS.length];
}

function getRandomStarter(): string {
  return NASCAR_CHAIN_STARTERS[Math.floor(Math.random() * NASCAR_CHAIN_STARTERS.length)];
}

export function useNascarChain() {
  const [gameState, setGameState] = useState<NascarChainState | null>(null);
  const [validating, setValidating] = useState(false);

  const startGame = useCallback((mode: NascarChainMode) => {
    const starter = mode === 'daily' ? getDailyStarter() : getRandomStarter();
    setGameState({
      currentDriver: starter,
      chain: [{ driverName: starter }],
      score: 0,
      rawScore: 0,
      gameStatus: 'playing',
      usedDrivers: new Set([starter.toLowerCase()]),
      mode,
    });
  }, []);

  const makeGuess = useCallback(async (guessedName: string) => {
    if (!gameState || gameState.gameStatus !== 'playing' || validating) return;

    const normalizedGuess = guessedName.toLowerCase();

    if (gameState.usedDrivers.has(normalizedGuess)) {
      const chainLength = gameState.chain.length - 1;
      setGameState(prev => prev ? ({
        ...prev,
        gameStatus: 'ended',
        gameOverReason: `You already used ${guessedName} in this chain!`,
        earnedBadge: getNascarEarnedBadge(chainLength),
      }) : null);
      return;
    }

    setValidating(true);

    try {
      const { data, error } = await supabase.functions.invoke('nascar-chain-validate', {
        body: {
          currentDriver: gameState.currentDriver,
          guessedDriver: guessedName,
        },
      });

      if (error) throw error;

      if (data.valid) {
        const fullName = data.fullName || guessedName;
        const connection = data.connection || '';

        const newChain = [...gameState.chain];
        newChain[newChain.length - 1] = {
          ...newChain[newChain.length - 1],
          connection,
        };
        newChain.push({ driverName: fullName });

        const newRawScore = gameState.rawScore + 100;
        const chainLength = newChain.length - 1;
        const multiplier = getNascarChainMultiplier(chainLength);
        const newScore = Math.floor(newRawScore * multiplier);

        setGameState(prev => prev ? ({
          ...prev,
          currentDriver: fullName,
          chain: newChain,
          score: newScore,
          rawScore: newRawScore,
          usedDrivers: new Set([...prev.usedDrivers, fullName.toLowerCase()]),
        }) : null);
      } else {
        const chainLength = gameState.chain.length - 1;
        setGameState(prev => prev ? ({
          ...prev,
          gameStatus: 'ended',
          gameOverReason: data.reason || 'Incorrect! That driver did not beat them to the Cup title.',
          earnedBadge: getNascarEarnedBadge(chainLength),
        }) : null);
      }
    } catch {
      const newChain = [...gameState.chain];
      newChain.push({ driverName: guessedName });
      const newRawScore = gameState.rawScore + 100;
      const chainLength = newChain.length - 1;
      const multiplier = getNascarChainMultiplier(chainLength);

      setGameState(prev => prev ? ({
        ...prev,
        currentDriver: guessedName,
        chain: newChain,
        score: Math.floor(newRawScore * multiplier),
        rawScore: newRawScore,
        usedDrivers: new Set([...prev.usedDrivers, guessedName.toLowerCase()]),
      }) : null);
    } finally {
      setValidating(false);
    }
  }, [gameState, validating]);

  const giveUp = useCallback(() => {
    if (!gameState) return;
    const chainLength = gameState.chain.length - 1;
    setGameState(prev => prev ? ({
      ...prev,
      gameStatus: 'ended',
      gameOverReason: 'You gave up!',
      earnedBadge: getNascarEarnedBadge(chainLength),
    }) : null);
  }, [gameState]);

  const resetGame = useCallback(() => setGameState(null), []);

  return { gameState, startGame, makeGuess, giveUp, resetGame, validating };
}
