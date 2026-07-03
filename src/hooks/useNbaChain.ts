import { useState, useCallback, useMemo } from 'react';
import { CHAIN_STARTERS } from '@/types/nbaChain';
import type { ChainLink, ChainGamePhase } from '@/types/nbaChain';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { normalizeName } from '@/lib/playerSearch';

export type NbaChainMode = 'endless' | 'round';

// Round mode: a fixed-length challenge instead of "play until you're stuck".
// 10 picks is a full round; par 7 is what a solid chain looks like without
// being so high that most players fail to reach it (endless mode's whole
// player base's typical streak length before this feature shipped was well
// under 10, based on the bestStreak values already seen in the persisted
// localStorage key `nba-chain-best`).
export const ROUND_PICK_COUNT = 10;
export const ROUND_PAR = 7;

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

function loadMode(): NbaChainMode {
  try {
    const raw = localStorage.getItem('nba-chain-mode');
    return raw === 'round' ? 'round' : 'endless';
  } catch {
    return 'endless';
  }
}

function saveMode(mode: NbaChainMode) {
  try {
    localStorage.setItem('nba-chain-mode', mode);
  } catch {}
}

export function useNbaChain() {
  // Endless is the default mode; a returning player's last choice is
  // remembered locally but always falls back to endless if unset/invalid.
  const [mode, setModeState] = useState<NbaChainMode>(loadMode);
  const [initialStarter] = useState(() => getRandomStarter());
  const [chain, setChain] = useState<ChainLink[]>(() => [{ playerName: initialStarter }]);
  const [phase, setPhase] = useState<ChainGamePhase>('playing');
  const [gameOverReason, setGameOverReason] = useState<string | null>(null);
  const [bestStreak, setBestStreak] = useState(loadBestStreak);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [usedPlayers, setUsedPlayers] = useState<Set<string>>(() => {
    return new Set([normalizeName(initialStarter)]);
  });

  const score = chain.length - 1;

  const lastPlayer = chain[chain.length - 1]?.playerName || '';

  // Round mode is "complete" (not stuck) once ROUND_PICK_COUNT valid picks
  // have been made. This is distinct from an endless-mode game-over: no
  // wrong guess happened, the round just ran its full length.
  const roundComplete = mode === 'round' && score >= ROUND_PICK_COUNT;

  const scoreVsPar = useMemo(() => {
    if (mode !== 'round') return null;
    return score - ROUND_PAR;
  }, [mode, score]);

  const submitPlayer = useCallback(
    async (playerName: string) => {
      if (phase !== 'playing') return;
      const trimmed = playerName.trim();
      if (!trimmed) return;

      const normalized = normalizeName(trimmed);

      // Check duplicate — instant game over
      if (usedPlayers.has(normalized)) {
        setPhase('ended');
        setGameOverReason(`${trimmed} was already used. Game over!`);
        const finalScore = chain.length - 1;
        if (finalScore > bestStreak) { setBestStreak(finalScore); saveBestStreak(finalScore); }
        return;
      }

      setIsValidating(true);
      setValidationError(null);

      try {
        const resp = await fetch(
          `${"https://flawuiqbvjobmkfkauhw.supabase.co"}/functions/v1/nba-chain-validate`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsYXd1aXFidmpvYm1rZmthdWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTUwNzYsImV4cCI6MjA5MTQzMTA3Nn0.L8xWIXikPIaXC0XOL-FLOuPQb6idws2NdliARxBgk_Y"}`,
            },
            body: JSON.stringify({
              previousPlayer: lastPlayer,
              newPlayer: trimmed,
            }),
          }
        );

        const result = await resp.json();
        const displayName = result.fullName || trimmed;
        const normalizedDisplayName = normalizeName(displayName);

        // Check if the resolved full name is a duplicate or self-connection
        if (usedPlayers.has(normalizedDisplayName)) {
          setPhase('ended');
          setGameOverReason(`${displayName} was already used. Game over!`);
          const finalScore = chain.length - 1;
          if (finalScore > bestStreak) { setBestStreak(finalScore); saveBestStreak(finalScore); }
          setIsValidating(false);
          return;
        }

        if (normalizedDisplayName === normalizeName(lastPlayer)) {
          setPhase('ended');
          setGameOverReason(`${displayName} is the same as the current player. Game over!`);
          const finalScore = chain.length - 1;
          if (finalScore > bestStreak) { setBestStreak(finalScore); saveBestStreak(finalScore); }
          setIsValidating(false);
          return;
        }

        if (!result.valid) {
          setPhase('ended');
          setGameOverReason(result.reason || 'No valid NBA connection found. Game over!');
          const finalScore = chain.length - 1;
          if (finalScore > bestStreak) { setBestStreak(finalScore); saveBestStreak(finalScore); }
          setIsValidating(false);
          return;
        }

        const connection = result.connection || '';

        const newLink: ChainLink = { playerName: displayName, connection };
        const newScore = score + 1;
        setChain((prev) => [...prev, newLink]);
        setUsedPlayers((prev) => new Set(prev).add(normalizedDisplayName));

        // Update best streak
        if (newScore > bestStreak) {
          setBestStreak(newScore);
          saveBestStreak(newScore);
        }

        // Round mode ends the moment the fixed pick count is reached, even
        // though this was a valid pick (not a "stuck" game-over). The
        // gameOverReason text is what the results screen uses to tell the
        // two cases apart.
        if (mode === 'round' && newScore >= ROUND_PICK_COUNT) {
          setPhase('ended');
          setGameOverReason('Round complete!');
        }
      } catch {
        // Allow on network error
        const newLink: ChainLink = { playerName: trimmed, connection: 'Connection unverified' };
        const newScore = score + 1;
        setChain((prev) => [...prev, newLink]);
        setUsedPlayers((prev) => new Set(prev).add(normalized));
        if (mode === 'round' && newScore >= ROUND_PICK_COUNT) {
          setPhase('ended');
          setGameOverReason('Round complete!');
        }
      }

      setIsValidating(false);
      setValidationError(null);
    },
    [phase, lastPlayer, usedPlayers, score, bestStreak, mode]
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
    setUsedPlayers(new Set([normalizeName(starter)]));
  }, []);

  // Switching modes always starts a fresh chain so a round never inherits
  // picks made under the other mode's rules.
  const switchMode = useCallback((next: NbaChainMode) => {
    setModeState(next);
    saveMode(next);
    const starter = getRandomStarter();
    setChain([{ playerName: starter }]);
    setPhase('playing');
    setGameOverReason(null);
    setIsValidating(false);
    setValidationError(null);
    setUsedPlayers(new Set([normalizeName(starter)]));
  }, []);

  const getShareText = useCallback(() => {
    const names = chain.map((l) => l.playerName);
    if (mode === 'round' && scoreVsPar !== null) {
      const parLine =
        scoreVsPar > 0 ? `${scoreVsPar} over par` : scoreVsPar < 0 ? `${Math.abs(scoreVsPar)} under par` : 'even par';
      return `🏀 NBA Chain Game (Round Mode)\n🔗 ${score}/${ROUND_PICK_COUNT} picks, ${parLine}: ${names.join(' → ')}\n\nPlay at douknowball.com/nba-chain`;
    }
    return `🏀 NBA Chain Game\n🔗 Chain of ${score}: ${names.join(' → ')}\n\nPlay at douknowball.com/nba-chain`;
  }, [chain, score, mode, scoreVsPar]);

  useGameCompletion('nba-chain', phase === 'ended', score * 100);

  return {
    mode,
    switchMode,
    chain,
    phase,
    score,
    bestStreak,
    gameOverReason,
    isValidating,
    validationError,
    lastPlayer,
    roundComplete,
    scoreVsPar,
    roundPickCount: ROUND_PICK_COUNT,
    roundPar: ROUND_PAR,
    submitPlayer,
    endGame,
    resetGame,
    getShareText,
  };
}
