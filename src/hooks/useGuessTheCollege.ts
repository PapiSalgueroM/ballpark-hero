import { useState, useEffect, useCallback, useMemo } from 'react';
import { colleges } from '@/data/colleges';
import { College, CollegeGameMode, CollegeDifficulty, CollegeClue } from '@/types/guessTheCollege';
import { supabase } from '@/integrations/supabase/client';

const SCORE_MAP: Record<number, number> = {
  1: 1200, 2: 1000, 3: 900, 4: 800, 5: 700,
  6: 600, 7: 500, 8: 400, 9: 300, 10: 200, 11: 100,
};

const getDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getDailyIndex = (poolSize: number) => {
  const dateStr = getDateStr();
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % poolSize;
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

export function useGuessTheCollege() {
  const [mode, setModeState] = useState<CollegeGameMode>('daily');
  const [difficulty, setDifficultyState] = useState<CollegeDifficulty>('easy');
  const [selectedConference, setSelectedConference] = useState<string | null>(null);
  const [currentCollege, setCurrentCollege] = useState<College | null>(null);
  const [revealedClues, setRevealedClues] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(() => {
    const saved = localStorage.getItem('guess-college-streak');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [guessHistory, setGuessHistory] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dailyCompleted, setDailyCompleted] = useState(false);

  const getPool = useCallback((diff: CollegeDifficulty, conf: string | null, m: CollegeGameMode) => {
    let pool = colleges;
    if (diff === 'easy') {
      pool = pool.filter(c => c.conferenceType === 'power4');
    }
    if (m === 'conference' && conf) {
      pool = pool.filter(c => c.conference === conf);
    }
    return pool;
  }, []);

  const conferences = useMemo(() => {
    const set = new Set(colleges.map(c => c.conference));
    return [...set].sort();
  }, []);

  const pickCollege = useCallback((m: CollegeGameMode, diff: CollegeDifficulty, conf: string | null) => {
    const pool = getPool(diff, conf, m);
    if (pool.length === 0) return null;
    if (m === 'daily') {
      return pool[getDailyIndex(pool.length)];
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }, [getPool]);

  const initGame = useCallback((m: CollegeGameMode, diff: CollegeDifficulty, conf: string | null) => {
    if (m === 'daily') {
      const dailyKey = `guess-college-daily-${getDateStr()}-${diff}`;
      const saved = localStorage.getItem(dailyKey);
      if (saved) {
        const data = JSON.parse(saved);
        const college = pickCollege(m, diff, conf);
        setCurrentCollege(college);
        setGameOver(true);
        setWon(data.won);
        setScore(data.score);
        setRevealedClues(12);
        setGuessHistory(data.guessHistory || []);
        setDailyCompleted(true);
        return;
      }
    }
    const college = pickCollege(m, diff, conf);
    setCurrentCollege(college);
    setRevealedClues(1);
    setGameOver(false);
    setWon(false);
    setScore(0);
    setGuessHistory([]);
    setSearchQuery('');
    setDailyCompleted(false);
  }, [pickCollege]);

  useEffect(() => {
    initGame(mode, difficulty, selectedConference);
  }, [mode, difficulty, selectedConference, initGame]);

  const clues = useMemo(() => {
    if (!currentCollege) return [];
    return generateClues(currentCollege);
  }, [currentCollege]);

  const pointsAvailable = SCORE_MAP[revealedClues] || 0;

  const suggestions = useMemo(() => {
    if (searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    return colleges
      .filter(c => {
        return c.name.toLowerCase().includes(q) ||
          c.nicknames.some(n => n.toLowerCase().includes(q)) ||
          c.mascot.toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [searchQuery]);

  const saveDailyResult = useCallback((isWon: boolean, earnedScore: number, cluesUsed: number, history: string[]) => {
    const dailyKey = `guess-college-daily-${getDateStr()}-${difficulty}`;
    localStorage.setItem(dailyKey, JSON.stringify({
      won: isWon,
      score: earnedScore,
      cluesUsed,
      guessHistory: history,
    }));
    setDailyCompleted(true);
    // Save to Supabase
    supabase.from('college_guess_scores' as any).insert({
      puzzle_date: getDateStr(),
      clues_used: cluesUsed,
      score: earnedScore,
      guessed: isWon,
      mode: 'daily',
    }).then(() => {});
  }, [difficulty]);

  const submitGuess = useCallback((collegeName: string) => {
    if (!currentCollege || gameOver) return;

    const normalizedGuess = collegeName.toLowerCase().trim();
    const isCorrect =
      currentCollege.name.toLowerCase() === normalizedGuess ||
      currentCollege.nicknames.some(n => n.toLowerCase() === normalizedGuess) ||
      currentCollege.mascot.toLowerCase() === normalizedGuess;

    const newHistory = [...guessHistory, collegeName];
    setGuessHistory(newHistory);
    setSearchQuery('');

    if (isCorrect) {
      const earnedScore = SCORE_MAP[revealedClues] || 0;
      setScore(earnedScore);
      setWon(true);
      setGameOver(true);
      setRevealedClues(12);

      if (mode === 'unlimited') {
        const newStreak = streak + 1;
        setStreak(newStreak);
        localStorage.setItem('guess-college-streak', String(newStreak));
      }
      if (mode === 'daily') {
        saveDailyResult(true, earnedScore, revealedClues, newHistory);
      }
    } else if (revealedClues >= 11) {
      setGameOver(true);
      setWon(false);
      setScore(0);
      setRevealedClues(12);

      if (mode === 'unlimited') {
        setStreak(0);
        localStorage.setItem('guess-college-streak', '0');
      }
      if (mode === 'daily') {
        saveDailyResult(false, 0, 12, newHistory);
      }
    } else {
      setRevealedClues(prev => prev + 1);
    }
  }, [currentCollege, gameOver, revealedClues, mode, streak, guessHistory, saveDailyResult]);

  const skipClue = useCallback(() => {
    if (gameOver) return;
    if (revealedClues >= 11) {
      // Give up
      setGameOver(true);
      setWon(false);
      setScore(0);
      setRevealedClues(12);
      if (mode === 'unlimited') {
        setStreak(0);
        localStorage.setItem('guess-college-streak', '0');
      }
      if (mode === 'daily') {
        saveDailyResult(false, 0, 12, guessHistory);
      }
      return;
    }
    setRevealedClues(prev => prev + 1);
  }, [gameOver, revealedClues, mode, guessHistory, saveDailyResult]);

  const playAgain = useCallback(() => {
    if (mode === 'daily') return;
    initGame(mode, difficulty, selectedConference);
  }, [mode, difficulty, selectedConference, initGame]);

  const setMode = useCallback((m: CollegeGameMode) => {
    setModeState(m);
  }, []);

  const setDifficulty = useCallback((d: CollegeDifficulty) => {
    setDifficultyState(d);
  }, []);

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

  return {
    mode, setMode,
    difficulty, setDifficulty,
    selectedConference, setSelectedConference,
    currentCollege,
    revealedClues,
    clues,
    gameOver,
    won,
    score,
    streak,
    guessHistory,
    searchQuery, setSearchQuery,
    suggestions,
    pointsAvailable,
    conferences,
    submitGuess,
    skipClue,
    playAgain,
    getStreakBadge,
    getShareText,
    dailyCompleted,
  };
}
