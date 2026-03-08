import { useState, useMemo, useCallback } from 'react';
import { hockeyCareerPuzzles } from '@/data/hockeyCareerPlayers';

function getDailyIndex(): number {
  const now = new Date();
  const start = new Date('2026-01-01');
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.abs(diffDays) % hockeyCareerPuzzles.length;
}

export type HockeyCareerStatus = 'playing' | 'guessed' | 'revealed';

const CLUE_SCORES = [1000, 850, 700, 550, 400, 250, 100];

export function useHockeyCareer() {
  const puzzle = useMemo(() => hockeyCareerPuzzles[getDailyIndex()], []);
  const storageKey = `hkc-daily-${puzzle.id}`;

  const [clueLevel, setClueLevel] = useState<number>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) { try { return JSON.parse(saved).clueLevel ?? 0; } catch { /* */ } }
    return 0;
  });

  const [status, setStatus] = useState<HockeyCareerStatus>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) { try { return JSON.parse(saved).status ?? 'playing'; } catch { /* */ } }
    return 'playing';
  });

  const [guessInput, setGuessInput] = useState('');
  const [wrongGuess, setWrongGuess] = useState(false);

  const player = puzzle.player;
  const maxClue = 6;
  const score = status === 'guessed' ? CLUE_SCORES[Math.min(clueLevel, CLUE_SCORES.length - 1)] : 0;

  const visibleClues = useMemo(() => {
    const clues: { label: string; value: string }[] = [];
    if (clueLevel >= 0) clues.push({ label: 'Position', value: player.position });
    if (clueLevel >= 1) clues.push({ label: 'Country', value: `${player.countryFlag} ${player.country}` });
    if (clueLevel >= 2) clues.push({ label: 'Draft', value: player.draftInfo });
    if (clueLevel >= 3) {
      const teamsToShow = player.teams.slice(0, Math.min(player.teams.length, clueLevel - 2));
      clues.push({ label: 'Teams', value: teamsToShow.join(' → ') || player.teams[0] });
    }
    if (clueLevel >= 4) clues.push({ label: 'Career Stats', value: player.stats.join(', ') });
    if (clueLevel >= 5) clues.push({ label: 'Awards', value: player.awards.join(', ') });
    return clues;
  }, [clueLevel, player]);

  const save = useCallback((cl: number, st: HockeyCareerStatus) => {
    localStorage.setItem(storageKey, JSON.stringify({ clueLevel: cl, status: st }));
  }, [storageKey]);

  const revealNextClue = useCallback(() => {
    if (status !== 'playing' || clueLevel >= maxClue) return;
    const next = clueLevel + 1;
    setClueLevel(next);
    save(next, 'playing');
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
    puzzle, player, clueLevel, visibleClues, status, score,
    guessInput, setGuessInput, submitGuess, revealNextClue, giveUp, wrongGuess, maxClue,
  };
}
