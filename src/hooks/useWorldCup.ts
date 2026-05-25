import { useState, useMemo, useCallback } from 'react';
import { worldCupPuzzles } from '@/data/worldCupPuzzles';
import { WorldCupPuzzle, WorldCupClue, WorldCupGameStatus } from '@/types/worldCup';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';

const TOTAL_CLUES = 7;
const POINTS_BY_CLUE: Record<number, number> = { 1: 1000, 2: 800, 3: 600, 4: 400, 5: 300, 6: 200, 7: 100 };

function normalize(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function isGuessCorrect(guess: string, puzzle: WorldCupPuzzle): boolean {
  const g = normalize(guess);
  if (!g) return false;
  const answerNorm = normalize(puzzle.answer);
  if (g === answerNorm) return true;
  if (puzzle.aliases?.some(alias => normalize(alias) === g)) return true;
  const answerParts = answerNorm.split(/\s+/);
  if (answerParts.length > 1 && answerParts[answerParts.length - 1] === g) return true;
  if (answerParts.length > 1 && answerParts[0] === g && g.length >= 4) return true;
  const guessParts = g.split(/\s+/);
  if (guessParts.length >= 2 && answerParts.every(part => guessParts.includes(part))) return true;
  return false;
}

function getClues(puzzle: WorldCupPuzzle): WorldCupClue[] {
  return [
    { label: 'Year', value: String(puzzle.year) },
    { label: 'Host Country', value: puzzle.hostCountry },
    { label: 'Position', value: puzzle.position },
    { label: 'Country', value: puzzle.country },
    { label: 'Club at the Time', value: puzzle.clubAtTime },
    { label: 'Achievement', value: puzzle.achievement },
    { label: 'Answer', value: puzzle.answer },
  ];
}

// Action persisted per guess attempt
type WCAction =
  | { t: 'w'; v: string }   // wrong guess
  | { t: 's' }              // skip
  | { t: 'ok'; v: string }  // correct (won)
  | { t: 'g' };             // give up / auto-lose at last clue

export type WorldCupMode = 'daily' | 'unlimited';

function countProgression(actions: WCAction[]): number {
  // wrong + skip actions each advance the clue
  return actions.filter(a => a.t === 'w' || a.t === 's').length;
}

export function useWorldCup() {
  // ---- MODE ----------------------------------------------------------------
  const [mode, setMode] = useState<WorldCupMode>('daily');

  // ---- DAILY ---------------------------------------------------------------
  const {
    puzzle: dailyPuzzle,
    guesses: dailyActions,
    addGuess: addDailyAction,
    gameStatus: rawDailyStatus,
    isLoading,
    reset: resetDailyHook,
  } = useDailyPuzzle<WorldCupPuzzle, WCAction>({
    gameSlug: 'world-cup',
    puzzles: worldCupPuzzles,
    maxGuesses: 999, // ends via isWon/isLost only
    isWon: (g) => g.some(a => a.t === 'ok'),
    isLost: (g) =>
      g.some(a => a.t === 'g') ||
      (!g.some(a => a.t === 'ok') && 1 + countProgression(g) >= TOTAL_CLUES),
    deserializeGuesses: (raw) => raw as WCAction[],
  });

  // Derived daily state
  const dailyRevealedCount = Math.min(1 + countProgression(dailyActions), TOTAL_CLUES);
  const dailyAttempts = dailyActions.filter(a => a.t === 'w').map(a => a.v);

  // ---- UNLIMITED -----------------------------------------------------------
  const [unlimitedPuzzle, setUnlimitedPuzzle] = useState(
    () => worldCupPuzzles[Math.floor(Math.random() * worldCupPuzzles.length)]
  );
  const [revealedCount, setRevealedCount] = useState(1);
  const [attempts, setAttempts] = useState<string[]>([]);
  const [unlimitedStatus, setUnlimitedStatus] = useState<WorldCupGameStatus>('playing');

  // ---- SHARED LOCAL STATE --------------------------------------------------
  const [guess, setGuess] = useState('');

  // ---- ACTIVE VALUES -------------------------------------------------------
  const puzzle           = mode === 'daily' ? dailyPuzzle : unlimitedPuzzle;
  const activeRevealed   = mode === 'daily' ? dailyRevealedCount : revealedCount;
  const activeAttempts   = mode === 'daily' ? dailyAttempts : attempts;
  const gameStatus       = mode === 'daily' ? (rawDailyStatus as WorldCupGameStatus) : unlimitedStatus;

  const clues = useMemo(() => (puzzle ? getClues(puzzle) : []), [puzzle]);
  const revealedClues = clues.slice(0, activeRevealed);
  const score = gameStatus === 'won' ? (POINTS_BY_CLUE[activeRevealed] ?? 100) : 0;

  // ---- CALLBACKS -----------------------------------------------------------
  const switchMode = useCallback((newMode: WorldCupMode) => setMode(newMode), []);

  const submitGuess = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed || gameStatus !== 'playing' || !puzzle) return;
    const correct = isGuessCorrect(trimmed, puzzle);

    if (mode === 'daily') {
      if (correct) {
        addDailyAction({ t: 'ok', v: puzzle.answer });
      } else if (dailyRevealedCount >= TOTAL_CLUES) {
        // At last clue, wrong guess ends the game
        addDailyAction({ t: 'g' });
      } else {
        addDailyAction({ t: 'w', v: trimmed });
      }
    } else {
      const displayName = correct ? puzzle.answer : trimmed;
      setAttempts(prev => [...prev, displayName]);
      if (correct) {
        setUnlimitedStatus('won');
      } else if (revealedCount >= TOTAL_CLUES) {
        setUnlimitedStatus('lost');
      } else {
        setRevealedCount(c => c + 1);
      }
    }
  }, [mode, gameStatus, puzzle, dailyRevealedCount, revealedCount, addDailyAction]);

  const skipClue = useCallback(() => {
    if (gameStatus !== 'playing') return;
    if (mode === 'daily') {
      if (dailyRevealedCount >= TOTAL_CLUES) {
        addDailyAction({ t: 'g' });
      } else {
        addDailyAction({ t: 's' });
      }
    } else {
      if (revealedCount >= TOTAL_CLUES) {
        setUnlimitedStatus('lost');
      } else {
        setRevealedCount(c => c + 1);
      }
    }
  }, [mode, gameStatus, dailyRevealedCount, revealedCount, addDailyAction]);

  const giveUp = useCallback(() => {
    if (gameStatus !== 'playing') return;
    if (mode === 'daily') {
      addDailyAction({ t: 'g' });
    } else {
      setUnlimitedStatus('lost');
      setRevealedCount(TOTAL_CLUES);
    }
  }, [mode, gameStatus, addDailyAction]);

  const resetGame = useCallback(() => {
    if (mode === 'daily') {
      resetDailyHook();
    } else {
      setUnlimitedPuzzle(worldCupPuzzles[Math.floor(Math.random() * worldCupPuzzles.length)]);
      setRevealedCount(1);
      setAttempts([]);
      setUnlimitedStatus('playing');
    }
    setGuess('');
  }, [mode, resetDailyHook]);

  // ---- COMPLETION ----------------------------------------------------------
  const dailyScore = rawDailyStatus === 'won' ? (POINTS_BY_CLUE[dailyRevealedCount] ?? 100) : 0;
  useGameCompletion('world-cup', rawDailyStatus !== 'playing', dailyScore);

  return {
    mode,
    switchMode,
    puzzle,
    clues,
    revealedClues,
    revealedCount: activeRevealed,
    totalClues: TOTAL_CLUES,
    guess,
    setGuess,
    attempts: activeAttempts,
    submitGuess,
    skipClue,
    giveUp,
    resetGame,
    gameStatus,
    score,
    isLoading: mode === 'daily' ? isLoading : false,
  };
}
