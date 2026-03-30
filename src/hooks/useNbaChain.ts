import { useState, useCallback } from 'react';
import { CHAIN_STARTERS } from '@/types/nbaChain';
import type { ChainLink, ChainGamePhase } from '@/types/nbaChain';
import { useGameCompletion } from '@/hooks/useGameCompletion';

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
  const [initialStarter] = useState(() => getRandomStarter());
  const [chain, setChain] = useState<ChainLink[]>(() => [{ playerName: initialStarter }]);
  const [phase, setPhase] = useState<ChainGamePhase>('playing');
  const [gameOverReason, setGameOverReason] = useState<string | null>(null);
  const [bestStreak, setBestStreak] = useState(loadBestStreak);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [usedPlayers, setUsedPlayers] = useState<Set<string>>(() => {
    return new Set([initialStarter.toLowerCase()]);
  });

  const score = chain.length - 1;

  const lastPlayer = chain[chain.length - 1]?.playerName || '';

  const submitPlayer = useCallback(
    async (playerName: string) => {
      if (phase !== 'playing') return;
      const trimmed = playerName.trim();
      if (!trimmed) return;

      const lowerName = trimmed.toLowerCase();

      // Check duplicate — instant game over
      if (usedPlayers.has(lowerName)) {
        setPhase('ended');
        setGameOverReason(`${trimmed} was already used — game over!`);
        const finalScore = chain.length - 1;
        if (finalScore > bestStreak) { setBestStreak(finalScore); saveBestStreak(finalScore); }
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
        const displayName = result.fullName || trimmed;

        // Check if the resolved full name is a duplicate or self-connection
        if (usedPlayers.has(displayName.toLowerCase())) {
          setPhase('ended');
          setGameOverReason(`${displayName} was already used — game over!`);
          const finalScore = chain.length - 1;
          if (finalScore > bestStreak) { setBestStreak(finalScore); saveBestStreak(finalScore); }
          setIsValidating(false);
          return;
        }

        if (displayName.toLowerCase() === lastPlayer.toLowerCase()) {
          setPhase('ended');
          setGameOverReason(`${displayName} is the same as the current player — game over!`);
          const finalScore = chain.length - 1;
          if (finalScore > bestStreak) { setBestStreak(finalScore); saveBestStreak(finalScore); }
          setIsValidating(false);
          return;
        }

        if (!result.valid) {
          setPhase('ended');
          setGameOverReason(result.reason || 'No valid NBA connection found — game over!');
          const finalScore = chain.length - 1;
          if (finalScore > bestStreak) { setBestStreak(finalScore); saveBestStreak(finalScore); }
          setIsValidating(false);
          return;
        }

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
    return `🏀 NBA Chain Game\n🔗 Chain of ${score}: ${names.join(' → ')}\n\nPlay at douknowball.com/nba-chain`;
  }, [chain, score]);

  useGameCompletion('nba-chain', phase === 'ended', score * 100);

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
