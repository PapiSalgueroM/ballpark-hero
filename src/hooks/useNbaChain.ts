import { useState, useCallback } from 'react';
import { CHAIN_STARTERS } from '@/types/nbaChain';
import type { ChainLink, ChainGamePhase } from '@/types/nbaChain';

function getRandomStarter(): string {
  return CHAIN_STARTERS[Math.floor(Math.random() * CHAIN_STARTERS.length)];
}

function loadBestStreak(): number {
  try {
    return parseInt(localStorage.getItem('nba-chain-best') || '0', 10);
  } catch {
    return 0;
  }
}

function saveBestStreak(val: number) {
  try {
    localStorage.setItem('nba-chain-best', String(val));
  } catch {}
}

export function useNbaChain() {
  const [chain, setChain] = useState<ChainLink[]>(() => [{ playerName: getRandomStarter() }]);
  const [phase, setPhase] = useState<ChainGamePhase>('playing');
  const [gameOverReason, setGameOverReason] = useState<string | null>(null);
  const [bestStreak, setBestStreak] = useState(loadBestStreak);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [usedPlayers, setUsedPlayers] = useState<Set<string>>(() => {
    const starter = getRandomStarter();
    return new Set([starter.toLowerCase()]);
  });

  const score = chain.length - 1; // first player doesn't count

  const lastPlayer = chain[chain.length - 1]?.playerName || '';

  const submitPlayer = useCallback(
    async (playerName: string) => {
      if (phase !== 'playing') return;
      const trimmed = playerName.trim();
      if (!trimmed) return;

      const lowerName = trimmed.toLowerCase();

      // Check duplicate
      if (usedPlayers.has(lowerName)) {
        setValidationError(`${trimmed} has already been used in this chain!`);
        return;
      }

      setIsValidating(true);
      setValidationError(null);

      try {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nba-chain-validate`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              previousPlayer: lastPlayer,
              newPlayer: trimmed,
            }),
          }
        );

        const result = await resp.json();

        if (!result.valid) {
          setValidationError(result.reason || `No verified NBA connection found.`);
          setIsValidating(false);
          return;
        }

        const displayName = result.fullName || trimmed;
        const connection = result.connection || '';

        const newLink: ChainLink = { playerName: displayName, connection };
        setChain((prev) => [...prev, newLink]);
        setUsedPlayers((prev) => new Set(prev).add(displayName.toLowerCase()));

        // Update best streak
        const newScore = score + 1;
        if (newScore > bestStreak) {
          setBestStreak(newScore);
          saveBestStreak(newScore);
        }
      } catch {
        // Allow on network error
        const newLink: ChainLink = { playerName: trimmed, connection: 'Connection unverified' };
        setChain((prev) => [...prev, newLink]);
        setUsedPlayers((prev) => new Set(prev).add(lowerName));
      }

      setIsValidating(false);
      setValidationError(null);
    },
    [phase, lastPlayer, usedPlayers, score, bestStreak]
  );

  const endGame = useCallback(
    (reason = 'You ended the game') => {
      setPhase('ended');
      setGameOverReason(reason);
      const finalScore = chain.length - 1;
      if (finalScore > bestStreak) {
        setBestStreak(finalScore);
        saveBestStreak(finalScore);
      }
    },
    [chain, bestStreak]
  );

  const resetGame = useCallback(() => {
    const starter = getRandomStarter();
    setChain([{ playerName: starter }]);
    setPhase('playing');
    setGameOverReason(null);
    setIsValidating(false);
    setValidationError(null);
    setUsedPlayers(new Set([starter.toLowerCase()]));
  }, []);

  const getShareText = useCallback(() => {
    const names = chain.map((l) => l.playerName);
    return `🏀 NBA Chain Game\n🔗 Chain of ${score}: ${names.join(' → ')}\n\nPlay at footyfein.lovable.app/nba-chain`;
  }, [chain, score]);

  return {
    chain,
    phase,
    score,
    bestStreak,
    gameOverReason,
    isValidating,
    validationError,
    lastPlayer,
    submitPlayer,
    endGame,
    resetGame,
    getShareText,
  };
}
