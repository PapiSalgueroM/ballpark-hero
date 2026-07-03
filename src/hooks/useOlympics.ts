import { useState, useMemo, useCallback } from 'react';
import { olympicAthletes } from '@/data/olympicsAthletes';
import { OlympicAthlete } from '@/types/olympics';
import { supabase } from '@/integrations/supabase/client';
import { ensureAnswerInOptions } from '@/lib/ensureAnswerInOptions';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { getTodayET } from '@/lib/dateUtils';
import { toast } from 'sonner';

const TOTAL_CLUES = 7;
const CLUE_SCORES = [1000, 850, 700, 550, 400, 250, 100];

export type OlympicsMode = 'daily' | 'unlimited';
export type OlympicsStatus = 'playing' | 'guessed' | 'revealed';

type OlympicsAction = { t: 'skip' } | { t: 'won' } | { t: 'give' };

export function useOlympics() {
  const [mode, setMode] = useState<OlympicsMode>('daily');
  const switchMode = useCallback((m: OlympicsMode) => setMode(m), []);

  // ── Daily ──────────────────────────────────────────────────────────────────
  const {
    puzzle: dailyPuzzle,
    guesses: dailyActions,
    addGuess: addDailyAction,
    gameStatus: rawDailyStatus,
    isLoading,
  } = useDailyPuzzle<OlympicAthlete, OlympicsAction>({
    gameSlug: 'olympics',
    puzzles: olympicAthletes,
    maxGuesses: 999,
    isWon: (g) => g.some((a) => a.t === 'won'),
    isLost: (g) => g.some((a) => a.t === 'give'),
    deserializeGuesses: (raw) => raw as OlympicsAction[],
  });

  const dailyClueLevel = dailyActions.filter((a) => a.t === 'skip').length;
  const dailyStatus: OlympicsStatus = useMemo(() => {
    if (rawDailyStatus === 'won') return 'guessed';
    if (rawDailyStatus === 'lost') return 'revealed';
    return 'playing';
  }, [rawDailyStatus]);

  // ── Unlimited ──────────────────────────────────────────────────────────────
  const [unlimitedAthlete, setUnlimitedAthlete] = useState<OlympicAthlete>(
    () => olympicAthletes[Math.floor(Math.random() * olympicAthletes.length)],
  );
  const [unlimitedClueLevel, setUnlimitedClueLevel] = useState(0);
  const [unlimitedStatus, setUnlimitedStatus] = useState<OlympicsStatus>('playing');

  // ── Active (mode-dependent) values ────────────────────────────────────────
  const athlete = mode === 'daily' ? (dailyPuzzle ?? olympicAthletes[0]) : unlimitedAthlete;
  const clueLevel = mode === 'daily' ? dailyClueLevel : unlimitedClueLevel;
  const status = mode === 'daily' ? dailyStatus : unlimitedStatus;

  // ── Shared local state ────────────────────────────────────────────────────
  const [guessInput, setGuessInput] = useState('');
  const [wrongGuess, setWrongGuess] = useState(false);

  const score = status === 'guessed' ? CLUE_SCORES[Math.min(clueLevel, CLUE_SCORES.length - 1)] : 0;

  const visibleClues = useMemo(() => {
    const clues: { label: string; value: string }[] = [];
    if (clueLevel >= 0) clues.push({ label: 'Sport', value: athlete.sport });
    if (clueLevel >= 1) clues.push({ label: 'Country', value: athlete.country });
    if (clueLevel >= 2) clues.push({ label: 'The Games', value: `${athlete.gamesYear}, ${athlete.hostCity}` });
    if (clueLevel >= 3) clues.push({ label: 'Achievement', value: athlete.achievement });
    if (clueLevel >= 4) clues.push({ label: 'Career Context', value: athlete.careerContext });
    if (clueLevel >= 5) clues.push({ label: 'Medals', value: athlete.medalSummary });
    return clues;
  }, [clueLevel, athlete]);

  const logScore = useCallback(async (cluesUsed: number, finalScore: number, guessed: boolean) => {
    try {
      await supabase.from('medal_games_scores').insert({
        puzzle_date: getTodayET(),
        clues_used: cluesUsed,
        score: finalScore,
        guessed,
      });
    } catch { /* silent */ }
  }, []);

  const revealNextClue = useCallback(() => {
    if (status !== 'playing' || clueLevel >= TOTAL_CLUES - 1) return;
    if (mode === 'daily') {
      addDailyAction({ t: 'skip' });
    } else {
      setUnlimitedClueLevel((prev) => prev + 1);
    }
  }, [mode, clueLevel, status, addDailyAction]);

  const submitGuess = useCallback((guess: string) => {
    if (status !== 'playing') return;
    const normalized = guess.trim().toLowerCase();
    const target = athlete.name.toLowerCase();
    const lastName = target.split(' ').pop() ?? '';
    if (normalized === target || normalized === lastName) {
      const finalScore = CLUE_SCORES[Math.min(clueLevel, CLUE_SCORES.length - 1)];
      toast.success(`🏅 Correct! You scored ${finalScore} points!`);
      logScore(clueLevel + 1, finalScore, true);
      if (mode === 'daily') {
        addDailyAction({ t: 'won' });
      } else {
        setUnlimitedStatus('guessed');
      }
    } else {
      setWrongGuess(true);
      toast.error('❌ Not correct');
      setTimeout(() => setWrongGuess(false), 1500);
    }
  }, [mode, status, athlete.name, clueLevel, logScore, addDailyAction]);

  const giveUp = useCallback(() => {
    if (status !== 'playing') return;
    logScore(TOTAL_CLUES, 0, false);
    if (mode === 'daily') {
      addDailyAction({ t: 'give' });
    } else {
      setUnlimitedStatus('revealed');
      setUnlimitedClueLevel(TOTAL_CLUES - 1);
    }
  }, [mode, status, logScore, addDailyAction]);

  const resetGame = useCallback(() => {
    if (mode !== 'unlimited') return;
    setUnlimitedAthlete(olympicAthletes[Math.floor(Math.random() * olympicAthletes.length)]);
    setUnlimitedStatus('playing');
    setUnlimitedClueLevel(0);
  }, [mode]);

  const shareText = useMemo(() => {
    if (status === 'playing') return '';
    if (status === 'guessed') {
      return `I guessed today's athlete in ${clueLevel + 1} clue${clueLevel > 0 ? 's' : ''} on DoUKnowBall! Score: ${score}. douknowball.com/olympics`;
    }
    return `I couldn't guess today's athlete on DoUKnowBall 😞 douknowball.com/olympics`;
  }, [status, clueLevel, score]);

  const athleteNames = useMemo(
    () => ensureAnswerInOptions(olympicAthletes.map((a) => a.name), athlete.name),
    [athlete],
  );

  useGameCompletion('olympics', rawDailyStatus !== 'playing', score);

  return {
    mode, switchMode,
    athlete, clueLevel, visibleClues, totalClues: TOTAL_CLUES, status, score,
    guessInput, setGuessInput, submitGuess, revealNextClue, giveUp, wrongGuess,
    shareText, athleteNames, isLoading, resetGame,
  };
}
