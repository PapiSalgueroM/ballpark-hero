import { useState, useCallback, useMemo } from 'react';
import { nflCareerPlayers } from '@/data/nflCareerPlayers';
import { NFLCareerPlayer } from '@/types/nflCareer';
import { ensureAnswerInOptions } from '@/lib/ensureAnswerInOptions';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { normalizeName } from '@/lib/playerSearch';
import { toast } from 'sonner';

const TOTAL_CLUES = 6;

function getDailyIndex(): number {
  const now = new Date();
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return seed % nflCareerPlayers.length;
}

export function useNFLCareer() {
  const [targetPlayer] = useState<NFLCareerPlayer>(() => nflCareerPlayers[getDailyIndex()]);
  const [cluesRevealed, setCluesRevealed] = useState(1); // start with 1 clue
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [guessHistory, setGuessHistory] = useState<string[]>([]);
  const [hard, setHard] = useState(false);

  const score = useMemo(() => Math.max(1, TOTAL_CLUES + 1 - cluesRevealed), [cluesRevealed]);

  const clues = useMemo(() => {
    const all = [
      { label: 'Draft', value: `Round ${targetPlayer.draftRound}, ${targetPlayer.draftYear}` },
      { label: 'College', value: targetPlayer.college },
      { label: 'First Team', value: targetPlayer.firstTeam },
      { label: 'Career Stat', value: targetPlayer.careerStat },
      { label: 'Teams', value: targetPlayer.teams.join(' → ') },
      { label: 'Jersey #', value: `#${targetPlayer.jerseyNumbers}` },
    ];
    // HARD (task #12): hide the easiest leading clues (display-only).
    const start = hard ? Math.min(2, Math.max(0, cluesRevealed - 1)) : 0;
    return all.slice(start, cluesRevealed);
  }, [targetPlayer, cluesRevealed, hard]);

  const makeGuess = useCallback((name: string) => {
    if (gameStatus !== 'playing') return;
    const trimmed = name.trim();
    if (!trimmed) return;

    setGuessHistory(prev => [...prev, trimmed]);

    if (trimmed.toLowerCase() === targetPlayer.name.toLowerCase()) {
      setGameStatus('won');
      toast.success(`🎉 Correct! You scored ${Math.max(1, TOTAL_CLUES + 1 - cluesRevealed)} points!`);
      return;
    }

    toast.error(`❌ Not ${trimmed}`);

    if (cluesRevealed >= TOTAL_CLUES) {
      setGameStatus('lost');
      toast.error(`The player was ${targetPlayer.name}`);
    } else {
      setCluesRevealed(prev => prev + 1);
    }
  }, [gameStatus, targetPlayer, cluesRevealed]);

  const giveUp = useCallback(() => {
    if (gameStatus !== 'playing') return;
    setGameStatus('lost');
  }, [gameStatus]);

  const resetGame = useCallback(() => {
    // Random mode — pick a random player different from daily
    const idx = Math.floor(Math.random() * nflCareerPlayers.length);
    // We can't reset targetPlayer with useState, so we reload
    window.location.reload();
  }, []);

  const shareText = useMemo(() => {
    if (gameStatus === 'playing') return '';
    const boxes = Array.from({ length: TOTAL_CLUES }, (_, i) => {
      if (gameStatus === 'won' && i === cluesRevealed - 1) return '🟩';
      if (i < cluesRevealed) return '⬛';
      return '⬜';
    }).join('');
    if (gameStatus === 'won') {
      return `NFL Career Path ${boxes} got it in ${cluesRevealed}!\n\nhttps://douknowball.com/nfl-career`;
    }
    return `NFL Career Path ${boxes} couldn't get it 😞\n\nhttps://douknowball.com/nfl-career`;
  }, [gameStatus, cluesRevealed]);

  const playerNames = useMemo(() => ensureAnswerInOptions(nflCareerPlayers.map(p => p.name), targetPlayer.name), [targetPlayer]);

  // Normalized guesses so far, so the autocomplete can exclude players the
  // user already tried (matching normalizeName's accent/case-insensitive
  // rules used throughout the search layer).
  const excludedNames = useMemo(() => new Set(guessHistory.map(normalizeName)), [guessHistory]);

  useGameCompletion('nfl-career', gameStatus !== 'playing', score);

  const toggleHard = useCallback(() => setHard(h => !h), []);

  return {
    hard, toggleHard,
    targetPlayer,
    clues,
    cluesRevealed,
    totalClues: TOTAL_CLUES,
    score,
    gameStatus,
    guessHistory,
    excludedNames,
    makeGuess,
    giveUp,
    resetGame,
    shareText,
    playerNames,
  };
}
