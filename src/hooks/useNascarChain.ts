import { useState, useCallback } from 'react';
import { NascarChainState, NascarChainMode, getNascarChainMultiplier, getNascarEarnedBadge, NASCAR_CHAIN_STARTERS } from '@/types/nascarChain';
import { supabase } from '@/integrations/supabase/client';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import type { PlayerSourceConfig } from '@/lib/playerSearch';
import { toast } from 'sonner';

/**
 * NASCAR driver pool for the shared PlayerAutocomplete input (see
 * src/components/game/PlayerAutocomplete.tsx and src/lib/playerSearch.ts).
 * Points at nascar_drivers (83 rows, verified via information_schema + row
 * count on flawuiqbvjobmkfkauhw, 2026-07-03), which is a real stats table
 * (years_active, total_wins, championships, etc.) and a bigger pool than the
 * 44-name static ALL_NASCAR_DRIVERS list in src/types/nascarChain.ts, so this
 * migration is a straightforward win in name coverage, unlike tennis_players
 * which is smaller than its static counterpart. total_wins is used as the
 * prominence column so more accomplished drivers surface first.
 */
export const NASCAR_DRIVER_SOURCE: PlayerSourceConfig = {
  table: 'nascar_drivers',
  nameColumn: 'driver_name',
  prominenceColumn: 'total_wins',
  metaColumns: {
    championships: 'championships',
    yearsActive: 'years_active',
  },
  ilikeLimit: 200,
  prominenceLimit: 1000,
};

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
      // FAIL CLOSED: a network failure is not a wrong answer, don't accept
      // an unverified guess (that farms score) and don't end the game.
      // Leave the chain untouched and ask the player to retry.
      toast.error("Couldn't verify that guess right now, please try again.");
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

  useGameCompletion('nascar-chain', gameState?.gameStatus === 'ended', gameState?.score ?? 0);

  return { gameState, startGame, makeGuess, giveUp, resetGame, validating };
}
