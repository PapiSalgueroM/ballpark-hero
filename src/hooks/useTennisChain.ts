import { useState, useCallback } from 'react';
import { TennisChainState, TennisChainMode, getTennisChainMultiplier, getTennisEarnedBadge, TENNIS_CHAIN_STARTERS } from '@/types/tennisChain';
import { supabase } from '@/integrations/supabase/client';
import { useGameCompletion } from '@/hooks/useGameCompletion';

function getDailyStarter(): string {
  const today = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = ((hash << 5) - hash + today.charCodeAt(i)) | 0;
  }
  return TENNIS_CHAIN_STARTERS[Math.abs(hash) % TENNIS_CHAIN_STARTERS.length];
}

function getRandomStarter(): string {
  return TENNIS_CHAIN_STARTERS[Math.floor(Math.random() * TENNIS_CHAIN_STARTERS.length)];
}

export function useTennisChain() {
  const [gameState, setGameState] = useState<TennisChainState | null>(null);
  const [validating, setValidating] = useState(false);

  const startGame = useCallback((mode: TennisChainMode) => {
    const starter = mode === 'daily' ? getDailyStarter() : getRandomStarter();
    setGameState({
      currentPlayer: starter,
      chain: [{ playerName: starter }],
      score: 0,
      rawScore: 0,
      gameStatus: 'playing',
      usedPlayers: new Set([starter.toLowerCase()]),
      mode,
    });
  }, []);

  const makeGuess = useCallback(async (guessedName: string) => {
    if (!gameState || gameState.gameStatus !== 'playing' || validating) return;

    const normalizedGuess = guessedName.toLowerCase();

    if (gameState.usedPlayers.has(normalizedGuess)) {
      const chainLength = gameState.chain.length - 1;
      setGameState(prev => prev ? ({
        ...prev,
        gameStatus: 'ended',
        gameOverReason: `You already used ${guessedName} in this chain!`,
        earnedBadge: getTennisEarnedBadge(chainLength),
      }) : null);
      return;
    }

    setValidating(true);

    try {
      const { data, error } = await supabase.functions.invoke('tennis-chain-validate', {
        body: {
          currentPlayer: gameState.currentPlayer,
          guessedPlayer: guessedName,
        },
      });

      if (error) throw error;

      if (data.valid) {
        const fullName = data.fullName || guessedName;
        const slamConnection = data.connection || '';
        
        const newChain = [...gameState.chain];
        newChain[newChain.length - 1] = {
          ...newChain[newChain.length - 1],
          slamConnection,
        };
        newChain.push({ playerName: fullName });

        const newRawScore = gameState.rawScore + 100;
        const chainLength = newChain.length - 1;
        const multiplier = getTennisChainMultiplier(chainLength);
        const newScore = Math.floor(newRawScore * multiplier);

        setGameState(prev => prev ? ({
          ...prev,
          currentPlayer: fullName,
          chain: newChain,
          score: newScore,
          rawScore: newRawScore,
          usedPlayers: new Set([...prev.usedPlayers, fullName.toLowerCase()]),
        }) : null);
      } else {
        const chainLength = gameState.chain.length - 1;
        setGameState(prev => prev ? ({
          ...prev,
          gameStatus: 'ended',
          gameOverReason: data.reason || 'Incorrect! That player did not beat them at a Grand Slam.',
          earnedBadge: getTennisEarnedBadge(chainLength),
        }) : null);
      }
    } catch {
      // On error, allow the guess
      const newChain = [...gameState.chain];
      newChain.push({ playerName: guessedName });
      const newRawScore = gameState.rawScore + 100;
      const chainLength = newChain.length - 1;
      const multiplier = getTennisChainMultiplier(chainLength);

      setGameState(prev => prev ? ({
        ...prev,
        currentPlayer: guessedName,
        chain: newChain,
        score: Math.floor(newRawScore * multiplier),
        rawScore: newRawScore,
        usedPlayers: new Set([...prev.usedPlayers, guessedName.toLowerCase()]),
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
      earnedBadge: getTennisEarnedBadge(chainLength),
    }) : null);
  }, [gameState]);

  const resetGame = useCallback(() => {
    setGameState(null);
  }, []);

  useGameCompletion('tennis-chain', gameState?.gameStatus === 'ended', gameState?.score ?? 0);

  return { gameState, startGame, makeGuess, giveUp, resetGame, validating };
}
