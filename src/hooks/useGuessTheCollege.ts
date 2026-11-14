import { useState, useEffect, useCallback, useMemo } from 'react';
import { colleges, cfbTitleCount, mbbTitleCount } from '@/data/colleges';
import { College, CollegeGameMode, CollegeDifficulty, CollegeClue } from '@/types/guessTheCollege';
import { supabase } from '@/integrations/supabase/client';
import { ensureAnswerInList } from '@/lib/ensureAnswerInOptions';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';

const SCORE_MAP: Record<number, number> = {
  1: 1200, 2: 1000, 3: 900, 4: 800, 5: 700, 6: 600, 7: 500, 8: 400, 9: 300, 10: 200, 11: 100,
};

/** The clue we could not stand behind says so, rather than showing a number two
 *  publishers would not agree on. See COLLEGE_THIN in src/data/colleges.ts. */
const WITHHELD = 'Not shown for this school: we could not confirm it with two sources';

const sizeClue = (c: College): string =>
  c.enrollment && c.enrollmentYear
    ? `Enrollment: about ${c.enrollment.toLocaleString()} students in fall ${c.enrollmentYear}`
    : WITHHELD;

const levelClue = (c: College): string => {
  if (c.conferenceType === 'power4') return 'Plays in one of the four power conferences';
  if (c.conferenceType === 'independent') return 'Plays outside the power conferences, as an independent';
  return 'Plays outside the four power conferences';
};

const conferenceClue = (c: College): string => {
  const base = c.conference === 'Independent' ? 'Competes as an Independent' : `Competes in the ${c.conference}`;
  return c.conferenceNote ? `${base}, ${c.conferenceNote}` : base;
};

/** Counts are derived from the championship ledgers, never typed beside a
 *  school, so the prose and the number cannot drift apart. */
const titled = (count: number, noun: string, rest: string): string => {
  if (count === 0) return rest;
  const head = `${count} ${noun}${count === 1 ? '' : 's'}`;
  return rest ? `${head}. ${rest}` : head;
};

const generateClues = (college: College): CollegeClue[] => [
  { number: 1, icon: '✨', label: 'Vibe', text: college.vibeWord },
  { number: 2, icon: '🗺️', label: 'Region', text: college.region },
  { number: 3, icon: '👥', label: 'School Size', text: sizeClue(college) },
  { number: 4, icon: '📊', label: 'Level', text: levelClue(college) },
  { number: 5, icon: '🏆', label: 'Conference', text: conferenceClue(college) },
  {
    number: 6,
    icon: '🏀',
    label: 'Basketball History',
    text: titled(mbbTitleCount(college.name), 'NCAA Tournament title', college.basketballHistory),
  },
  {
    number: 7,
    icon: '🏈',
    label: 'CFB History',
    text: titled(cfbTitleCount(college.name), 'poll era national title', college.cfbHistory),
  },
  { number: 8, icon: '🏅', label: 'Olympic Athletes', text: college.olympicAthletes || WITHHELD },
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
  | { t: 'won'; name?: string }
  | { t: 'give' };

type RecapEntry =
  | { clue: number; action: 'skip' }
  | { clue: number; action: 'give' }
  | { clue: number; action: 'miss'; name: string }
  | { clue: number; action: 'solve'; name: string };

function replayCollegeGame(actions: GCAction[], answer = '') {
  let revealedClues = 1;
  let gameOver = false;
  let won = false;
  const guessHistory: string[] = [];
  const recap: RecapEntry[] = [];
  let solvedClue: number | null = null;
  let score = 0;

  for (const action of actions) {
    if (action.t === 'won') {
      const name = action.name || answer;
      recap.push({ clue: revealedClues, action: 'solve', name });
      guessHistory.push(name);
      solvedClue = revealedClues;
      score = SCORE_MAP[revealedClues] || 0;
      won = true;
      gameOver = true;
      revealedClues = 12;
      break;
    }
    if (action.t === 'give') {
      recap.push({ clue: revealedClues, action: 'give' });
      gameOver = true;
      revealedClues = 12;
      break;
    }
    if (action.t === 'guess') {
      recap.push({ clue: revealedClues, action: 'miss', name: action.name });
      guessHistory.push(action.name);
      if (revealedClues >= 11) {
        gameOver = true;
        revealedClues = 12;
        break;
      }
      revealedClues++;
    }
    if (action.t === 'skip') {
      recap.push({ clue: revealedClues, action: 'skip' });
      if (revealedClues >= 11) {
        gameOver = true;
        revealedClues = 12;
        break;
      }
      revealedClues++;
    }
  }

  return { revealedClues, gameOver, won, guessHistory, score, recap, solvedClue };
}

function isCollegeActionLog(actions: GCAction[]): boolean {
  return actions.length <= 11 && actions.every(action => {
    if (action.t === 'guess') return typeof action.name === 'string';
    if (action.t === 'won') return action.name === undefined || typeof action.name === 'string';
    return action.t === 'skip' || action.t === 'give';
  });
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
    isValidGuesses: isCollegeActionLog,
  });

  const dailyGameState = useMemo(() => replayCollegeGame(dailyActions, dailyPuzzle?.name), [dailyActions, dailyPuzzle]);

  // Unlimited / conference local state (original logic unchanged)
  const [unlimitedCollege, setUnlimitedCollege] = useState<College | null>(null);
  const [unlimitedActions, setUnlimitedActions] = useState<GCAction[]>([]);
  const unlimitedGameState = useMemo(() => replayCollegeGame(unlimitedActions, unlimitedCollege?.name), [unlimitedActions, unlimitedCollege]);
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
    setUnlimitedActions([]);
    setSearchQuery('');
  }, [pickCollege]);

  const initConferenceGame = useCallback((diff: CollegeDifficulty, conf: string | null) => {
    const college = pickCollege('conference', diff, conf);
    setUnlimitedCollege(college);
    setUnlimitedActions([]);
    setSearchQuery('');
  }, [pickCollege]);

  useEffect(() => {
    if (mode === 'unlimited') initUnlimitedGame(difficulty, selectedConference);
    if (mode === 'conference') initConferenceGame(difficulty, selectedConference);
  }, [mode, difficulty, selectedConference, initUnlimitedGame, initConferenceGame]);

  // Active values based on mode
  const currentCollege = mode === 'daily' ? dailyPuzzle : unlimitedCollege;
  const { revealedClues, gameOver, won, score, guessHistory, recap, solvedClue } = mode === 'daily' ? dailyGameState : unlimitedGameState;
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

    const action: GCAction = isCorrect ? { t: 'won', name: collegeName } : { t: 'guess', name: collegeName };
    if (mode === 'daily') addDailyAction(action);
    else {
      setUnlimitedActions([...unlimitedActions, action]);
      if (isCorrect) {
        setStreak((s) => s + 1);
      } else if (revealedClues >= 11) {
        setStreak(0);
      }
    }
  }, [currentCollege, gameOver, mode, addDailyAction, unlimitedActions, revealedClues]);

  const skipClue = useCallback(() => {
    if (gameOver) return;
    const action: GCAction = revealedClues >= 11 ? { t: 'give' } : { t: 'skip' };
    if (mode === 'daily') addDailyAction(action);
    else {
      setUnlimitedActions([...unlimitedActions, action]);
      if (action.t === 'give') setStreak(0);
    }
  }, [gameOver, mode, addDailyAction, revealedClues, unlimitedActions]);

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

  useGameCompletion('guess-the-college', rawDailyStatus !== 'playing', dailyGameState.score);

  return {
    mode, setMode, difficulty, setDifficulty, selectedConference, setSelectedConference,
    currentCollege, revealedClues, clues, gameOver, won, score, streak, guessHistory, recap, solvedClue,
    searchQuery, setSearchQuery, suggestions, pointsAvailable, conferences,
    submitGuess, skipClue, playAgain, getStreakBadge, dailyCompleted,
    isLoading,
  };
}
