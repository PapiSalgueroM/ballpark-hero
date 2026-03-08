import { useState, useMemo, useCallback } from 'react';
import { baseballCareerPuzzles } from '@/data/baseballCareerPlayers';

function getDailyIndex(): number {
  const now = new Date();
  const start = new Date('2026-01-01');
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.abs(diffDays) % baseballCareerPuzzles.length;
}

export type BaseballCareerStatus = 'playing' | 'guessed' | 'revealed';

const CLUE_SCORES = [1000, 850, 700, 550, 400, 250, 0];

export function useBaseballCareer() {
  const puzzle = useMemo(() => baseballCareerPuzzles[getDailyIndex()], []);
  const storageKey = `bbc-daily-${puzzle.id}`;

  const [clueLevel, setClueLevel] = useState<number>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { return JSON.parse(saved).clueLevel ?? 0; } catch { /* */ }
    }
    return 0;
  });

  const [status, setStatus] = useState<BaseballCareerStatus>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { return JSON.parse(saved).status ?? 'playing'; } catch { /* */ }
    }
    return 'playing';
  });

  const [guessInput, setGuessInput] = useState('');
  const [wrongGuess, setWrongGuess] = useState(false);

  const player = puzzle.player;
  const maxClue = 6; // 0-6 (7 levels)
  const score = status === 'guessed' ? CLUE_SCORES[Math.min(clueLevel, CLUE_SCORES.length - 1)] : 0;

  // Build visible clues based on level
  const visibleClues = useMemo(() => {
    const clues: { label: string; value: string }[] = [];
    if (clueLevel >= 0) clues.push({ label: 'Position', value: player.position });
    if (clueLevel >= 1) clues.push({ label: 'Draft', value: player.draftInfo });
    if (clueLevel >= 2) clues.push({ label: 'First Team', value: player.firstTeam });
    if (clueLevel >= 3) {
      // Reveal teams one by one up to clue 3
      const teamsToShow = player.teams.slice(0, Math.min(player.teams.length, clueLevel - 2));
      clues.push({ label: 'Career Teams', value: teamsToShow.join(' → ') || player.teams[0] });
    }
    if (clueLevel >= 4) clues.push({ label: 'Career Stats', value: player.stats.join(', ') });
    if (clueLevel >= 5) clues.push({ label: 'Awards', value: player.awards.join(', ') });
    return clues;
  }, [clueLevel, player]);

  const save = useCallback((cl: number, st: BaseballCareerStatus) => {
    localStorage.setItem(storageKey, JSON.stringify({ clueLevel: cl, status: st }));
  }, [storageKey]);

  const revealNextClue = useCallback(() => {
    if (status !== 'playing' || clueLevel >= maxClue) return;
    const next = clueLevel + 1;
    setClueLevel(next);
    if (next > maxClue) {
      setStatus('revealed');
      save(next, 'revealed');
    } else {
      save(next, 'playing');
    }
  }, [clueLevel, status, maxClue, save]);

  const submitGuess = useCallback((guess: string) => {
    if (status !== 'playing') return;
    const normalized = guess.trim().toLowerCase();
    const target = player.name.toLowerCase();
    if (normalized === target || normalized === target.split(' ').pop()) {
      setStatus('guessed');
      save(clueLevel, 'guessed');
    } else {
      setWrongGuess(true);
      setTimeout(() => setWrongGuess(false), 1500);
    }
  }, [status, player.name, clueLevel, save]);

  const giveUp = useCallback(() => {
    setStatus('revealed');
    setClueLevel(maxClue);
    save(maxClue, 'revealed');
  }, [maxClue, save]);

  return {
    puzzle,
    player,
    clueLevel,
    visibleClues,
    status,
    score,
    guessInput,
    setGuessInput,
    submitGuess,
    revealNextClue,
    giveUp,
    wrongGuess,
    maxClue,
  };
}
