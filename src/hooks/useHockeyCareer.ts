import { useState, useMemo, useCallback } from 'react';
import { hockeyCareerPuzzles } from '@/data/hockeyCareerPlayers';
import { ensureAnswerInOptions } from '@/lib/ensureAnswerInOptions';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';

export type HockeyCareerStatus = 'playing' | 'guessed' | 'revealed';

export type HockeyCareerMode = 'daily' | 'unlimited';

const CLUE_SCORES = [1000, 850, 700, 550, 400, 250, 100];

// Action events stored in the daily action log
type CareerAction = { t: 'skip' } | { t: 'won' } | { t: 'give' };

type Puzzle = (typeof hockeyCareerPuzzles)[number];

export function useHockeyCareer() {
  // ---- MODE ----------------------------------------------------------------
  const [mode, setMode] = useState<HockeyCareerMode>('daily');

  // ---- DAILY ---------------------------------------------------------------
  const {
    puzzle: dailyPuzzle,
    guesses: dailyActions,
    addGuess: addDailyAction,
    gameStatus: rawDailyStatus,
    isLoading,
    reset: resetDailyHook,
  } = useDailyPuzzle<Puzzle, CareerAction>({
    gameSlug: 'hockey-career',
    puzzles: hockeyCareerPuzzles,
    maxGuesses: 999, // game ends only via isWon / isLost
    isWon: (g) => g.some(a => a.t === 'won'),
    isLost: (g) => g.some(a => a.t === 'give'),
    deserializeGuesses: (raw) => raw as CareerAction[],
  });

  // Derived daily state
  const dailyClueLevel = dailyActions.filter(a => a.t === 'skip').length;
  const dailyStatus: HockeyCareerStatus =
    dailyActions.some(a => a.t === 'won') ? 'guessed' :
    dailyActions.some(a => a.t === 'give') ? 'revealed' : 'playing';

  // ---- UNLIMITED -----------------------------------------------------------
  const [unlimitedPuzzle, setUnlimitedPuzzle] = useState<Puzzle>(
    () => hockeyCareerPuzzles[Math.floor(Math.random() * hockeyCareerPuzzles.length)]
  );
  const [clueLevel, setClueLevel] = useState(0);
  const [hard, setHard] = useState(false);
  const [status, setStatus] = useState<HockeyCareerStatus>('playing');

  // ---- ACTIVE VALUES -------------------------------------------------------
  const puzzle          = mode === 'daily' ? dailyPuzzle : unlimitedPuzzle;
  const activeClueLevel = mode === 'daily' ? dailyClueLevel : clueLevel;
  const activeStatus    = mode === 'daily' ? dailyStatus : status;

  // ---- SHARED LOCAL STATE --------------------------------------------------
  const [guessInput, setGuessInput] = useState('');
  const [wrongGuess, setWrongGuess] = useState(false);

  const player = puzzle?.player;
  const maxClue = 6;
  const score = activeStatus === 'guessed'
    ? CLUE_SCORES[Math.min(activeClueLevel, CLUE_SCORES.length - 1)]
    : 0;

  // ---- CLUES ---------------------------------------------------------------
  const visibleClues = useMemo(() => {
    if (!player) return [];
    const clues: { label: string; value: string }[] = [];
    const cl = activeClueLevel;
    if (cl >= 0) clues.push({ label: 'Position', value: player.position });
    if (cl >= 1) clues.push({ label: 'Country', value: `${player.countryFlag} ${player.country}` });
    if (cl >= 2) clues.push({ label: 'Draft', value: player.draftInfo });
    if (cl >= 3) {
      const teamsToShow = player.teams.slice(0, Math.min(player.teams.length, cl - 2));
      clues.push({ label: 'Teams', value: teamsToShow.join(' → ') || player.teams[0] });
    }
    if (cl >= 4) clues.push({ label: 'Career Stats', value: player.stats.join(', ') });
    if (cl >= 5) clues.push({ label: 'Awards', value: player.awards.join(', ') });
    // HARD (task #12): drop the two easiest clues (display-only; the
    // clue-level action log and scoring are untouched, so daily replay is safe).
    const out = hard ? clues.slice(2) : clues;
    return out.length ? out : clues.slice(-1);
  }, [activeClueLevel, player, hard]);

  // ---- CALLBACKS -----------------------------------------------------------
  const switchMode = useCallback((newMode: HockeyCareerMode) => setMode(newMode), []);
  const toggleHard = useCallback(() => setHard(h => !h), []);

  const revealNextClue = useCallback(() => {
    if (activeStatus !== 'playing') return;
    if (mode === 'daily') {
      if (dailyClueLevel >= maxClue) return;
      addDailyAction({ t: 'skip' });
    } else {
      if (clueLevel >= maxClue) return;
      setClueLevel((prev) => prev + 1);
    }
  }, [mode, activeStatus, dailyClueLevel, clueLevel, maxClue, addDailyAction]);

  const submitGuess = useCallback((guess: string) => {
    if (activeStatus !== 'playing' || !player) return;
    const normalized = guess.trim().toLowerCase();
    const target = player.name.toLowerCase();
    if (normalized === target || normalized === target.split(' ').pop()) {
      if (mode === 'daily') {
        addDailyAction({ t: 'won' });
      } else {
        setStatus('guessed');
      }
    } else {
      setWrongGuess(true);
      setTimeout(() => setWrongGuess(false), 1500);
    }
  }, [mode, activeStatus, player, addDailyAction]);

  const giveUp = useCallback(() => {
    if (activeStatus !== 'playing') return;
    if (mode === 'daily') {
      addDailyAction({ t: 'give' });
    } else {
      setStatus('revealed');
      setClueLevel(maxClue);
    }
  }, [mode, activeStatus, maxClue, addDailyAction]);

  const resetGame = useCallback(() => {
    if (mode === 'daily') {
      resetDailyHook();
    } else {
      setUnlimitedPuzzle(hockeyCareerPuzzles[Math.floor(Math.random() * hockeyCareerPuzzles.length)]);
      setClueLevel(0);
      setStatus('playing');
    }
    setGuessInput('');
  }, [mode, resetDailyHook]);

  // ---- AUTOCOMPLETE --------------------------------------------------------
  const playerNames = useMemo(
    () => player
      ? ensureAnswerInOptions(hockeyCareerPuzzles.map(p => p.player.name), player.name)
      : [],
    [player]
  );

  // ---- COMPLETION ----------------------------------------------------------
  const dailyScore = dailyStatus === 'guessed'
    ? CLUE_SCORES[Math.min(dailyClueLevel, CLUE_SCORES.length - 1)]
    : 0;
  useGameCompletion('hockey-career', rawDailyStatus !== 'playing', dailyScore);

  return {
    hard, toggleHard,
    mode,
    switchMode,
    puzzle,
    player: player ?? null,
    clueLevel: activeClueLevel,
    visibleClues,
    status: activeStatus,
    score,
    guessInput,
    setGuessInput,
    submitGuess,
    revealNextClue,
    giveUp,
    resetGame,
    wrongGuess,
    maxClue,
    playerNames,
    isLoading: mode === 'daily' ? isLoading : false,
  };
}
