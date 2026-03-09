import { useState, useMemo, useCallback } from 'react';
import { olympicAthletes } from '@/data/olympicsAthletes';
import { OlympicAthlete } from '@/types/olympics';
import { supabase } from '@/integrations/supabase/client';
import { ensureAnswerInOptions } from '@/lib/ensureAnswerInOptions';
import { toast } from 'sonner';

const TOTAL_CLUES = 7;
const CLUE_SCORES = [1000, 850, 700, 550, 400, 250, 100];

function getDailyIndex(): number {
  const now = new Date();
  const start = new Date('2026-01-01');
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.abs(diffDays) % olympicAthletes.length;
}

function getTodayDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export type OlympicsStatus = 'playing' | 'guessed' | 'revealed';

export function useOlympics() {
  const todayDate = getTodayDate();
  const storageKey = `medal-games-${todayDate}`;

  const athlete = useMemo<OlympicAthlete>(() => olympicAthletes[getDailyIndex()], []);

  const [clueLevel, setClueLevel] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved).clueLevel ?? 0;
    } catch { /* */ }
    return 0;
  });

  const [status, setStatus] = useState<OlympicsStatus>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved).status ?? 'playing';
    } catch { /* */ }
    return 'playing';
  });

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

  const save = useCallback((cl: number, st: OlympicsStatus) => {
    localStorage.setItem(storageKey, JSON.stringify({ clueLevel: cl, status: st }));
  }, [storageKey]);

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
    const next = clueLevel + 1;
    setClueLevel(next);
    save(next, 'playing');
  }, [clueLevel, status, save]);

  const submitGuess = useCallback((guess: string) => {
    if (status !== 'playing') return;
    const normalized = guess.trim().toLowerCase();
    const target = athlete.name.toLowerCase();
    const lastName = target.split(' ').pop() ?? '';
    if (normalized === target || normalized === lastName) {
      setStatus('guessed');
      save(clueLevel, 'guessed');
      const finalScore = CLUE_SCORES[Math.min(clueLevel, CLUE_SCORES.length - 1)];
      toast.success(`🏅 Correct! You scored ${finalScore} points!`);
      logScore(clueLevel + 1, finalScore, true);
    } else {
      setWrongGuess(true);
      toast.error(`❌ Not correct`);
      setTimeout(() => setWrongGuess(false), 1500);
    }
  }, [status, athlete.name, clueLevel, save, logScore]);

  const giveUp = useCallback(() => {
    setStatus('revealed');
    setClueLevel(TOTAL_CLUES - 1);
    save(TOTAL_CLUES - 1, 'revealed');
    logScore(TOTAL_CLUES, 0, false);
  }, [save, logScore]);

  const shareText = useMemo(() => {
    if (status === 'playing') return '';
    if (status === 'guessed') {
      return `I guessed today's athlete in ${clueLevel + 1} clue${clueLevel > 0 ? 's' : ''} on DoUKnowBall! Score: ${score} — douknowball.com/olympics`;
    }
    return `I couldn't guess today's athlete on DoUKnowBall 😞 — douknowball.com/olympics`;
  }, [status, clueLevel, score]);

  const athleteNames = useMemo(() => olympicAthletes.map(a => a.name), []);

  return {
    athlete,
    clueLevel,
    visibleClues,
    totalClues: TOTAL_CLUES,
    status,
    score,
    guessInput,
    setGuessInput,
    submitGuess,
    revealNextClue,
    giveUp,
    wrongGuess,
    shareText,
    athleteNames,
  };
}
