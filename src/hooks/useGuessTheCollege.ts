import { useState, useEffect, useCallback, useMemo } from 'react';
import { colleges } from '@/data/colleges';
import { College, CollegeGameMode, CollegeDifficulty, CollegeClue } from '@/types/guessTheCollege';
import { supabase } from '@/integrations/supabase/client';
import { ensureAnswerInList } from '@/lib/ensureAnswerInOptions';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';

const SCORE_MAP: Record<number, number> = {
  1: 1200, 2: 1000, 3: 900, 4: 800, 5: 700, 6: 600, 7: 500, 8: 400, 9: 300, 10: 200, 11: 100,
};

const generateClues = (college: College): CollegeClue[] => [
  { number: 1, icon: '✨', label: 'Vibe', text: college.vibeWord },
  { number: 2, icon: '🗺️', label: 'Region', text: college.region },
  { number: 3, icon: '👥', label: 'School Size', text: `Enrollment: approximately ${college.enrollment.toLocaleString()} students` },
  { number: 4, icon: '📊', label: 'Acceptance Rate', text: `Acceptance rate: around ${college.acceptanceRate}%` },
  { number: 5, icon: '🏆', label: 'Conference', text: college.conference === 'Independent' ? 'Competes as an Independent' : `Competes in the ${college.conference}` },
  { number: 6, icon: '🏀', label: 'Basketball History', text: college.basketballHistory },
  { number: 7, icon: '🏈', label: 'CFB History', text: college.cfbHistory },
  { number: 8, icon: '🏅', label: 'Olympic Athletes', text: college.olympicAthletes },
  { number: 9, icon: '📋', label: 'NFL Draft History', text: college.nflDraftHistory },
  { number: 10, icon: '🌟', label: 'Famous Alumni', text: college.famousAlumniHint },
  { number: 11, icon: '🎨', label: 'School Colors', text: `School colors are ${college.colors}` },
  { number: 12, icon: '🎓', label: 'Answer', text: college.name },
];

// Daily pool: Power 4 schools for a recognizable daily challenge
const DAILY_COLLEGES = colleges.filter((c) => c.conferenceType === 'power4');

type GCAction =
  | { t: 'guess'; name: string }
  | { t: 'skip' }
  | { t: 'won' }
  | { t: 'give' };

function replayCollegeGame(actions: GCAction[]): {
  revealedClues: number;
  gameOver: boolean;
  won: boolean;
  guessHistory: string[];
  score: number;
} {
  let revealedClues = 1;
  let gameOver = false;
  let won = false;
  const guessHistory: string[] = [];
  let score = 0;

  for (const action of actions) {
    if (action.t === 'won') {
      score = SCORE_MAP[revealedClues] || 0;
      won = true;
      gameOver = true;
      revealedClues = 12;
      break;
    }
    if (action.t === 'give') {
      gameOver = true;
      revealedClues = 12;
      break;
    }
    if (action.t === 'guess') {
      guessHistory.push(action.name);
      if (revealedClues >= 11) {
        gameOver = true;
        revealedClues = 12;
        break;
      }
      revealedClues++;
    }
    if (action.t === 'skip') {
      if (revealedClues >= 11) {
        gameOver = true;
        revealedClues = 12;
        break;
      }
      revealedClues++;
    }
  }

  return { revealedClues, gameOver, won, guessHistory, score };
}

export function useGuessTheCollege() {
  const [mode, setModeState] = useState<CollegeGameMode>('daily');
  const [difficulty, setDifficultyState] = useState<CollegeDifficulty>('easy');
  const [selectedConference, setSelectedConference] = useState<string | null>(null);

  // Daily persistence
  const {
    puzzle: dailyPuzzle,
    guesses: dailyActions,
    addGuess: addDailyAction,
    gameStatus: rawDailyStatus,
    isLoading: dailyLoading,
  } = useDailyPuzzle<College, GCAction>({
    gameSlug: 'guess-the-college',
    puzzles: DAILY_COLLEGES,
    maxGuesses: 999,
    isWon: (g) => g.some((a) => a.t === 'won'),
    isLost: (g) => { const s = replayCollegeGame(g); return s.gameOver && !s.won; },
    deserializeGuesses: (raw) => raw as GCAction[],
  });

  const dailyGameState = useMemo(() => replayCollegeGame(dailyActions), [dailyActions]);

  // Unlimited / conference local state (original logic unchanged)
  const [unlimitedCollege, setUnlimitedCollege] = useState<College | null>(null);
  const [unlimitedRevealedClues, setUnlimitedRevealedClues] = useState(1);
  const [unlimitedGameOver, setUnlimitedGameOver] = useState(false);
  const [unlimitedWon, setUnlimitedWon] = useState(false);
  const [unlimitedScore, setUnlimitedScore] = useState(0);
  const [unlimitedGuessHistory, setUnlimitedGuessHistory] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');

  const getPool = useCallback((diff: CollegeDifficulty, conf: string | null, m: CollegeGameMode) => {
    let pool = colleges;
    if (diff === 'easy') pool = pool.filter((c) => c.conferenceType === 'power4');
    if (m === 'conference' && conf) pool = pool.filter((c) => c.conference === conf);
    return pool;
  }, []);

  const conferences = useMemo(() => {
    const set = new Set(colleges.map((c) => c.conference));
    return [...set].sort();
  }, []);

  const pickCollege = useCallback((m: CollegeGameMode, diff: CollegeDifficulty, conf: string | null) => {
    const pool = getPool(diff, conf, m);
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }, [getPool]);

  const initUnlimitedGame = useCallback((diff: CollegeDifficulty, conf: string | null) => {
    const college = pickCollege('unlimited', diff, conf);
    setUnlimitedCollege(college);
    setUnlimitedRevealedClues(1);
    setUnlimitedGameOver(false);
    setUnlimitedWon(false);
    setUnlimitedScore(0);
    setUnlimitedGuessHistory([]);
    setSearchQuery('');
  }, [pickCollege]);

  const initConferenceGame = useCallback((diff: CollegeDifficulty, conf: string | null) => {
    const college = pickCollege('conference', diff, conf);
    setUnlimitedCollege(college);
    setUnlimitedRevealedClues(1);
    setUnlimitedGameOver(false);
    setUnlimitedWon(false);
    setUnlimitedScore(0);
    setUnlimitedGuessHistory([]);
    setSearchQuery('');
  }, [pickCollege]);

  useEffect(() => {
    if (mode === 'unlimited') initUnlimitedGame(difficulty, selectedConference);
    if (mode === 'conference') initConferenceGame(difficulty, selectedConference);
  }, [mode, difficulty, selectedConference, initUnlimitedGame, initConferenceGame]);

  // Active values based on mode
  const currentCollege = mode === 'daily' ? dailyPuzzle : unlimitedCollege;
  const revealedClues = mode === 'daily' ? dailyGameState.revealedClues : unlimitedRevealedClues;
  const gameOver = mode === 'daily' ? dailyGameState.gameOver : unlimitedGameOver;
  const won = mode === 'daily' ? dailyGameState.won : unlimitedWon;
  const score = mode === 'daily' ? dailyGameState.score : unlimitedScore;
  const guessHistory = mode === 'daily' ? dailyGameState.guessHistory : unlimitedGuessHistory;
  const dailyCompleted = mode === 'daily' && dailyGameState.gameOver;
  const isLoading = mode === 'daily' && dailyLoading;

  const clues = useMemo(() => {
    if (!currentCollege) return [];
    return generateClues(currentCollege);
  }, [currentCollege]);

  const pointsAvailable = SCORE_MAP[revealedClues] || 0;

  const suggestions = useMemo(() => {
    if (searchQuery.length < 2 || !currentCollege) return [];
    const q = searchQuery.toLowerCase();
    const pool = ensureAnswerInList(colleges, currentCollege.name, (c) => c.name, currentCollege);
    return pool.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.nicknames.some((n) => n.toLowerCase().includes(q)) ||
        c.mascot.toLowerCase().includes(q),
    );
  }, [searchQuery, currentCollege]);

  const submitGuess = useCallback((collegeName: string) => {
    if (!currentCollege || gameOver) return;
    const normalizedGuess = collegeName.toLowerCase().trim();
    const isCorrect =
      currentCollege.name.toLowerCase() === normalizedGuess ||
      currentCollege.nicknames.some((n) => n.toLowerCase() === normalizedGuess) ||
      currentCollege.mascot.toLowerCase() === normalizedGuess;

    setSearchQuery('');

    if (mode === 'daily') {
      if (isCorrect) {
        addDailyAction({ t: 'won' });
      } else {
        addDailyAction({ t: 'guess', name: collegeName });
      }
    } else {
      const newHistory = [...unlimitedGuessHistory, collegeName];
      setUnlimitedGuessHistory(newHistory);
      if (isCorrect) {
        const earnedScore = SCORE_MAP[unlimitedRevealedClues] || 0;
        setUnlimitedScore(earnedScore);
        setUnlimitedWon(true);
        setUnlimitedGameOver(true);
        setUnlimitedRevealedClues(12);
        setStreak((s) => s + 1);
      } else if (unlimitedRevealedClues >= 11) {
        setUnlimitedGameOver(true);
        setUnlimitedWon(false);
        setUnlimitedScore(0);
        setUnlimitedRevealedClues(12);
        setStreak(0);
      } else {
        setUnlimitedRevealedClues((prev) => prev + 1);
      }
    }
  }, [currentCollege, gameOver, mode, addDailyAction, unlimitedGuessHistory, unlimitedRevealedClues]);

  const skipClue = useCallback(() => {
    if (gameOver) return;
    if (mode === 'daily') {
      if (dailyGameState.revealedClues >= 11) {
        addDailyAction({ t: 'give' });
      } else {
        addDailyAction({ t: 'skip' });
      }
    } else {
      if (unlimitedRevealedClues >= 11) {
        setUnlimitedGameOver(true);
        setUnlimitedWon(false);
        setUnlimitedScore(0);
        setUnlimitedRevealedClues(12);
        setStreak(0);
      } else {
        setUnlimitedRevealedClues((prev) => prev + 1);
      }
    }
  }, [gameOver, mode, addDailyAction, dailyGameState.revealedClues, unlimitedRevealedClues]);

  const playAgain = useCallback(() => {
    if (mode === 'unlimited') initUnlimitedGame(difficulty, selectedConference);
    if (mode === 'conference') initConferenceGame(difficulty, selectedConference);
  }, [mode, difficulty, selectedConference, initUnlimitedGame, initConferenceGame]);

  const setMode = useCallback((m: CollegeGameMode) => setModeState(m), []);
  const setDifficulty = useCallback((d: CollegeDifficulty) => setDifficultyState(d), []);

  const getStreakBadge = useCallback(() => {
    if (streak >= 10) return '🎓 Superfan';
    if (streak >= 5) return '💪 Scholar';
    if (streak >= 3) return '🔥 Hot';
    return '';
  }, [streak]);

  const getShareText = useCallback(() => {
    if (!currentCollege) return '';
    const clueCount = won ? guessHistory.length : 'X';
    return `I guessed today's college in ${clueCount} ${won && guessHistory.length === 1 ? 'try' : 'tries'} on DoUKnowBall! Score: ${score} 🎓 Can you beat me? douknowball.com/guess-the-college`;
  }, [currentCollege, won, guessHistory, score]);

  useGameCompletion('guess-the-college', rawDailyStatus !== 'playing', score);

  return {
    mode, setMode, difficulty, setDifficulty, selectedConference, setSelectedConference,
    currentCollege, revealedClues, clues, gameOver, won, score, streak, guessHistory,
    searchQuery, setSearchQuery, suggestions, pointsAvailable, conferences,
    submitGuess, skipClue, playAgain, getStreakBadge, getShareText, dailyCompleted,
    isLoading,
  };
}
