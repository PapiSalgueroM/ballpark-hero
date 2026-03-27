import { useState, useMemo, useCallback } from 'react';
import { olympicAthletes } from '@/data/olympicsAthletes';
import { OlympicAthlete } from '@/types/olympics';
import { supabase } from '@/integrations/supabase/client';
import { ensureAnswerInOptions } from '@/lib/ensureAnswerInOptions';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { toast } from 'sonner';

const TOTAL_CLUES = 7;
const CLUE_SCORES = [1000, 850, 700, 550, 400, 250, 100];

function getTodayDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export type OlympicsStatus = 'playing' | 'guessed' | 'revealed';

export function useOlympics() {
  const todayDate = getTodayDate();

  const athlete = useMemo<OlympicAthlete>(() => olympicAthletes[Math.floor(Math.random() * olympicAthletes.length)], []);

  const [clueLevel, setClueLevel] = useState(0);
  const [status, setStatus] = useState<OlympicsStatus>('playing');
  const [guessInput, setGuessInput] = useState('');
  const [wrongGuess, setWrongGuess] = useState(false);

  const score = status === 'guessed' ? CLUE_SCORES[Math.min(clueLevel, CLUE_SCORES.length - 1)] : 0;

  const visibleClues = useMemo(() => {
    const clues: { label: string; value: string }[] = [];
    if (clueLevel >= 0) clues.push({ label: 'Sport', value: athlete.sport });
    if (clueLevel >= 1) clues.push({ label: 'Country', value: athlete.country });
    if (clueLevel >= 2) clues.push({ label: 'The Games', value: `${athlete.gamesYear} — ${athlete.hostCity}` });
    if (clueLevel >= 3) clues.push({ label: 'Achievement', value: athlete.achievement });
    if (clueLevel >= 4) clues.push({ label: 'Career Context', value: athlete.careerContext });
    if (clueLevel >= 5) clues.push({ label: 'Medals', value: athlete.medalSummary });
    return clues;
  }, [clueLevel, athlete]);

  const logScore = useCallback(async (cluesUsed: number, finalScore: number, guessed: boolean) => {
    try {
      await supabase.from('medal_games_scores').insert({
        puzzle_date: todayDate,
        clues_used: cluesUsed,
        score: finalScore,
        guessed,
      });
    } catch { /* silent */ }
  }, [todayDate]);

  const revealNextClue = useCallback(() => {
    if (status !== 'playing' || clueLevel >= TOTAL_CLUES - 1) return;
    setClueLevel((prev) => prev + 1);
  }, [clueLevel, status]);

  const submitGuess = useCallback((guess: string) => {
    if (status !== 'playing') return;
    const normalized = guess.trim().toLowerCase();
    const target = athlete.name.toLowerCase();
    const lastName = target.split(' ').pop() ?? '';
    if (normalized === target || normalized === lastName) {
      setStatus('guessed');
      const finalScore = CLUE_SCORES[Math.min(clueLevel, CLUE_SCORES.length - 1)];
      toast.success(`🏅 Correct! You scored ${finalScore} points!`);
      logScore(clueLevel + 1, finalScore, true);
    } else {
      setWrongGuess(true);
      toast.error(`❌ Not correct`);
      setTimeout(() => setWrongGuess(false), 1500);
    }
  }, [status, athlete.name, clueLevel, logScore]);

  const giveUp = useCallback(() => {
    setStatus('revealed');
    setClueLevel(TOTAL_CLUES - 1);
    logScore(TOTAL_CLUES, 0, false);
  }, [logScore]);

  const shareText = useMemo(() => {
    if (status === 'playing') return '';
    if (status === 'guessed') {
      return `I guessed today's athlete in ${clueLevel + 1} clue${clueLevel > 0 ? 's' : ''} on DoUKnowBall! Score: ${score} — douknowball.com/olympics`;
    }
    return `I couldn't guess today's athlete on DoUKnowBall 😞 — douknowball.com/olympics`;
  }, [status, clueLevel, score]);

  const athleteNames = useMemo(() => ensureAnswerInOptions(olympicAthletes.map(a => a.name), athlete.name), [athlete]);

  useGameCompletion('olympics', status !== 'playing', score);

  return {
    athlete, clueLevel, visibleClues, totalClues: TOTAL_CLUES, status, score,
    guessInput, setGuessInput, submitGuess, revealNextClue, giveUp, wrongGuess,
    shareText, athleteNames,
  };
}
