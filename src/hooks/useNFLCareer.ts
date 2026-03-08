import { useState, useCallback, useMemo } from 'react';
import { nflCareerPlayers } from '@/data/nflCareerPlayers';
import { NFLCareerPlayer } from '@/types/nflCareer';
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
    return all.slice(0, cluesRevealed);
  }, [targetPlayer, cluesRevealed]);

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
      return `NFL Career Path ${boxes} — got it in ${cluesRevealed}!\n\nhttps://douknowball.com/nfl-career`;
    }
    return `NFL Career Path ${boxes} — couldn't get it 😞\n\nhttps://douknowball.com/nfl-career`;
  }, [gameStatus, cluesRevealed]);

  const playerNames = useMemo(() => nflCareerPlayers.map(p => p.name), []);

  return {
    targetPlayer,
    clues,
    cluesRevealed,
    totalClues: TOTAL_CLUES,
    score,
    gameStatus,
    guessHistory,
    makeGuess,
    giveUp,
    resetGame,
    shareText,
    playerNames,
  };
}
