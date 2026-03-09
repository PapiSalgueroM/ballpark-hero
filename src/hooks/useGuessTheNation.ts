import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  NationPuzzle,
  GuessTheNationState,
  POINTS_BY_CLUE,
  MAX_CLUES,
  STREAK_BADGES,
} from '@/types/guessTheNation';
import { ensureAnswerInList } from '@/lib/ensureAnswerInOptions';
import { useGameCompletion } from '@/hooks/useGameCompletion';

const STORAGE_KEY = 'guess-nation';

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function dateToIndex(dateStr: string, poolSize: number): number {
  let hash = 0;
  for (const ch of dateStr) {
    hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  }
  return Math.abs(hash) % poolSize;
}

function mapRow(row: any): NationPuzzle {
  return {
    id: row.id,
    countryName: row.country_name,
    commonNames: row.common_names ?? [],
    flagEmoji: row.flag_emoji,
    continent: row.continent,
    difficulty: row.difficulty,
    seasonFocus: row.season_focus,
    clues: {
      vibeWord: row.vibe_word,
      continentHint: row.continent_hint,
      populationHint: row.population_hint,
      gamesAttendedHint: row.games_attended_hint,
      totalMedalsHint: row.total_medals_hint,
      bestSportHint: row.best_sport_hint,
      famousMomentHint: row.famous_moment_hint,
      winterHistoryHint: row.winter_history_hint,
      goldMedalHint: row.gold_medal_hint,
      flagColorsHint: row.flag_colors_hint,
      countrySizeHint: row.country_size_hint,
    },
    iconicMoment: row.iconic_moment,
  };
}

export function useGuessTheNation() {
  const [countries, setCountries] = useState<NationPuzzle[]>([]);
  const [gameState, setGameState] = useState<GuessTheNationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);

  // Load countries from database
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from('guess_nation_countries').select('*');
      if (data) setCountries(data.map(mapRow));
      setLoading(false);
    })();
  }, []);

  // Load streak from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}-streak`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setStreak(parsed.count ?? 0);
      }
    } catch {}
  }, []);

  const saveStreak = useCallback((count: number) => {
    setStreak(count);
    localStorage.setItem(
      `${STORAGE_KEY}-streak`,
      JSON.stringify({ count, date: getTodayStr() })
    );
  }, []);

  const getDailyPuzzle = useCallback(
    async (difficulty: 'easy' | 'hard'): Promise<NationPuzzle | null> => {
      const today = getTodayStr();

      // Try daily table first
      try {
        const { data: daily } = await (supabase as any)
          .from('guess_nation_daily')
          .select('country_id')
          .eq('puzzle_date', today)
          .eq('difficulty', difficulty)
          .maybeSingle();

        if (daily) {
          const found = countries.find((c) => c.id === daily.country_id);
          if (found) return found;
        }
      } catch {}

      // Deterministic fallback
      const pool = countries.filter((c) =>
        difficulty === 'easy' ? c.difficulty === 'easy' : true
      );
      if (pool.length === 0) return countries[0] ?? null;
      return pool[dateToIndex(today, pool.length)];
    },
    [countries]
  );

  const startGame = useCallback(
    async (
      mode: GuessTheNationState['mode'],
      difficulty: 'easy' | 'hard' = 'easy',
      continentFilter?: string
    ) => {
      if (countries.length === 0) return;

      // Check for saved daily
      if (mode === 'daily') {
        const savedKey = `${STORAGE_KEY}-daily-${getTodayStr()}-${difficulty}`;
        try {
          const saved = localStorage.getItem(savedKey);
          if (saved) {
            setGameState(JSON.parse(saved));
            return;
          }
        } catch {}
      }

      let puzzle: NationPuzzle | null = null;

      if (mode === 'daily') {
        puzzle = await getDailyPuzzle(difficulty);
      } else {
        let pool = [...countries];
        if (difficulty === 'easy') {
          pool = pool.filter((c) => c.difficulty === 'easy');
        }
        if (mode === 'continent' && continentFilter) {
          pool = pool.filter((c) => c.continent === continentFilter);
        } else if (mode === 'summer') {
          pool = pool.filter((c) => c.seasonFocus !== 'winter');
        } else if (mode === 'winter') {
          pool = pool.filter((c) => c.seasonFocus !== 'summer');
        }
        if (pool.length === 0) pool = countries;
        puzzle = pool[Math.floor(Math.random() * pool.length)];
      }

      if (!puzzle) return;

      const state: GuessTheNationState = {
        puzzle,
        mode,
        difficulty,
        continentFilter,
        revealedClues: 1,
        guesses: [],
        gameStatus: 'playing',
        score: 0,
      };
      setGameState(state);
    },
    [countries, getDailyPuzzle]
  );

  const makeGuess = useCallback(
    (guess: string) => {
      if (!gameState || gameState.gameStatus !== 'playing') return;

      const normalize = (s: string) => s.toLowerCase().trim();
      const target = gameState.puzzle;
      const allNames = [target.countryName, ...target.commonNames].map(normalize);
      const isCorrect = allNames.includes(normalize(guess));

      if (isCorrect) {
        const score = POINTS_BY_CLUE[gameState.revealedClues - 1] ?? 0;
        const newState: GuessTheNationState = {
          ...gameState,
          gameStatus: 'won',
          score,
        };
        setGameState(newState);
        saveStreak(streak + 1);

        // Save score to database
        (supabase as any).from('guess_nation_scores').insert({
          puzzle_date: getTodayStr(),
          clues_used: gameState.revealedClues,
          score,
          guessed: true,
          mode: gameState.mode,
        });

        if (gameState.mode === 'daily') {
          localStorage.setItem(
            `${STORAGE_KEY}-daily-${getTodayStr()}-${gameState.difficulty}`,
            JSON.stringify(newState)
          );
        }
      } else {
        const newRevealed = gameState.revealedClues + 1;
        const isLost = newRevealed > MAX_CLUES;

        const newState: GuessTheNationState = {
          ...gameState,
          guesses: [...gameState.guesses, guess],
          revealedClues: isLost ? MAX_CLUES : newRevealed,
          gameStatus: isLost ? 'lost' : 'playing',
          score: 0,
        };
        setGameState(newState);

        if (isLost) {
          saveStreak(0);
          (supabase as any).from('guess_nation_scores').insert({
            puzzle_date: getTodayStr(),
            clues_used: MAX_CLUES,
            score: 0,
            guessed: false,
            mode: gameState.mode,
          });
          if (gameState.mode === 'daily') {
            localStorage.setItem(
              `${STORAGE_KEY}-daily-${getTodayStr()}-${gameState.difficulty}`,
              JSON.stringify(newState)
            );
          }
        }
      }
    },
    [gameState, streak, saveStreak]
  );

  const resetGame = useCallback(() => {
    setGameState(null);
  }, []);

  const currentBadge = STREAK_BADGES.filter((b) => streak >= b.threshold).pop() ?? null;
  const pointsForCurrentClue = gameState
    ? POINTS_BY_CLUE[gameState.revealedClues - 1] ?? 0
    : 0;

  // Ensure current puzzle answer is always in the selectable countries
  const validatedCountries = useMemo(() => {
    if (!gameState?.puzzle) return countries;
    return ensureAnswerInList(countries, gameState.puzzle.countryName, c => c.countryName, gameState.puzzle);
  }, [countries, gameState?.puzzle]);

  useGameCompletion('guess-the-nation', gameState?.gameStatus === 'won' || gameState?.gameStatus === 'lost', gameState?.score ?? 0);

  return {
    countries: validatedCountries,
    loading,
    gameState,
    streak,
    currentBadge,
    pointsForCurrentClue,
    startGame,
    makeGuess,
    resetGame,
  };
}
