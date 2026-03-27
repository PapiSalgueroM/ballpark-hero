import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  NationPuzzle, GuessTheNationState, POINTS_BY_CLUE, MAX_CLUES, STREAK_BADGES,
} from '@/types/guessTheNation';
import { ensureAnswerInList } from '@/lib/ensureAnswerInOptions';
import { useGameCompletion } from '@/hooks/useGameCompletion';

function getTodayStr() { return new Date().toISOString().slice(0, 10); }

function mapRow(row: any): NationPuzzle {
  return {
    id: row.id, countryName: row.country_name, commonNames: row.common_names ?? [],
    flagEmoji: row.flag_emoji, continent: row.continent, difficulty: row.difficulty,
    seasonFocus: row.season_focus,
    clues: {
      vibeWord: row.vibe_word, continentHint: row.continent_hint, populationHint: row.population_hint,
      gamesAttendedHint: row.games_attended_hint, totalMedalsHint: row.total_medals_hint,
      bestSportHint: row.best_sport_hint, famousMomentHint: row.famous_moment_hint,
      winterHistoryHint: row.winter_history_hint, goldMedalHint: row.gold_medal_hint,
      flagColorsHint: row.flag_colors_hint, countrySizeHint: row.country_size_hint,
    },
    iconicMoment: row.iconic_moment,
  };
}

export function useGuessTheNation() {
  const [countries, setCountries] = useState<NationPuzzle[]>([]);
  const [gameState, setGameState] = useState<GuessTheNationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from('guess_nation_countries').select('*');
      if (data) setCountries(data.map(mapRow));
      setLoading(false);
    })();
  }, []);

  const startGame = useCallback(
    async (mode: GuessTheNationState['mode'], difficulty: 'easy' | 'hard' = 'easy', continentFilter?: string) => {
      if (countries.length === 0) return;

      let pool = [...countries];
      if (difficulty === 'easy') pool = pool.filter((c) => c.difficulty === 'easy');
      if (mode === 'continent' && continentFilter) pool = pool.filter((c) => c.continent === continentFilter);
      else if (mode === 'summer') pool = pool.filter((c) => c.seasonFocus !== 'winter');
      else if (mode === 'winter') pool = pool.filter((c) => c.seasonFocus !== 'summer');
      if (pool.length === 0) pool = countries;

      const puzzle = pool[Math.floor(Math.random() * pool.length)];
      if (!puzzle) return;

      setGameState({
        puzzle, mode, difficulty, continentFilter,
        revealedClues: 1, guesses: [], gameStatus: 'playing', score: 0,
      });
    },
    [countries]
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
        setGameState({ ...gameState, gameStatus: 'won', score });
        setStreak((s) => s + 1);
        (supabase as any).from('guess_nation_scores').insert({
          puzzle_date: getTodayStr(), clues_used: gameState.revealedClues, score, guessed: true, mode: gameState.mode,
        });
      } else {
        const newRevealed = gameState.revealedClues + 1;
        const isLost = newRevealed > MAX_CLUES;
        setGameState({
          ...gameState, guesses: [...gameState.guesses, guess],
          revealedClues: isLost ? MAX_CLUES : newRevealed,
          gameStatus: isLost ? 'lost' : 'playing', score: 0,
        });
        if (isLost) {
          setStreak(0);
          (supabase as any).from('guess_nation_scores').insert({
            puzzle_date: getTodayStr(), clues_used: MAX_CLUES, score: 0, guessed: false, mode: gameState.mode,
          });
        }
      }
    },
    [gameState]
  );

  const resetGame = useCallback(() => setGameState(null), []);

  const currentBadge = STREAK_BADGES.filter((b) => streak >= b.threshold).pop() ?? null;
  const pointsForCurrentClue = gameState ? POINTS_BY_CLUE[gameState.revealedClues - 1] ?? 0 : 0;

  const validatedCountries = useMemo(() => {
    if (!gameState?.puzzle) return countries;
    return ensureAnswerInList(countries, gameState.puzzle.countryName, c => c.countryName, gameState.puzzle);
  }, [countries, gameState?.puzzle]);

  useGameCompletion('guess-the-nation', gameState?.gameStatus === 'won' || gameState?.gameStatus === 'lost', gameState?.score ?? 0);

  return { countries: validatedCountries, loading, gameState, streak, currentBadge, pointsForCurrentClue, startGame, makeGuess, resetGame };
}
