import { useState, useMemo, useCallback } from 'react';
import { baseballCareerPuzzles } from '@/data/baseballCareerPlayers';
import { ensureAnswerInOptions } from '@/lib/ensureAnswerInOptions';
import { useGameCompletion } from '@/hooks/useGameCompletion';

export type BaseballCareerStatus = 'playing' | 'guessed' | 'revealed';

const CLUE_SCORES = [1000, 850, 700, 550, 400, 250, 0];

export function useBaseballCareer() {
  const puzzle = useMemo(() => baseballCareerPuzzles[Math.floor(Math.random() * baseballCareerPuzzles.length)], []);

  const [clueLevel, setClueLevel] = useState(0);
  const [status, setStatus] = useState<BaseballCareerStatus>('playing');
  const [guessInput, setGuessInput] = useState('');
  const [wrongGuess, setWrongGuess] = useState(false);

  const player = puzzle.player;
  const maxClue = 6;
  const score = status === 'guessed' ? CLUE_SCORES[Math.min(clueLevel, CLUE_SCORES.length - 1)] : 0;

  const visibleClues = useMemo(() => {
    const clues: { label: string; value: string }[] = [];
    if (clueLevel >= 0) clues.push({ label: 'Position', value: player.position });
    if (clueLevel >= 1) clues.push({ label: 'Draft', value: player.draftInfo });
    if (clueLevel >= 2) clues.push({ label: 'First Team', value: player.firstTeam });
    if (clueLevel >= 3) {
      const teamsToShow = player.teams.slice(0, Math.min(player.teams.length, clueLevel - 2));
      clues.push({ label: 'Career Teams', value: teamsToShow.join(' → ') || player.teams[0] });
    }
    if (clueLevel >= 4) clues.push({ label: 'Career Stats', value: player.stats.join(', ') });
    if (clueLevel >= 5) clues.push({ label: 'Awards', value: player.awards.join(', ') });
    return clues;
  }, [clueLevel, player]);

  const revealNextClue = useCallback(() => {
    if (status !== 'playing' || clueLevel >= maxClue) return;
    const next = clueLevel + 1;
    setClueLevel(next);
    if (next > maxClue) {
      setStatus('revealed');
    }
  }, [clueLevel, status, maxClue]);

  const submitGuess = useCallback((guess: string) => {
    if (status !== 'playing') return;
    const normalized = guess.trim().toLowerCase();
    const target = player.name.toLowerCase();
    if (normalized === target || normalized === target.split(' ').pop()) {
      setStatus('guessed');
    } else {
      setWrongGuess(true);
      setTimeout(() => setWrongGuess(false), 1500);
    }
  }, [status, player.name]);

  const giveUp = useCallback(() => {
    setStatus('revealed');
    setClueLevel(maxClue);
  }, [maxClue]);

  const playerNames = useMemo(() => ensureAnswerInOptions(baseballCareerPuzzles.map(p => p.player.name), player.name), [player]);

  useGameCompletion('baseball-career', status !== 'playing', score);

  return {
    puzzle, player, clueLevel, visibleClues, status, score,
    guessInput, setGuessInput, submitGuess, revealNextClue, giveUp, wrongGuess,
    maxClue, playerNames,
  };
}
