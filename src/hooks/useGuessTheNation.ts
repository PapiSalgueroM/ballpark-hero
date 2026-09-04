import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getTodayET } from '@/lib/dateUtils';
import { supabase } from '@/integrations/supabase/client';
import {
  NationPuzzle, GuessTheNationState, POINTS_BY_CLUE, MAX_CLUES, STREAK_BADGES,
} from '@/types/guessTheNation';
import { ensureAnswerInList } from '@/lib/ensureAnswerInOptions';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { readDailyRecord, writeDailyRecord } from '@/lib/dailyRecord';
import { markRestoredFinish } from '@/lib/restoredFinish';

function getTodayStr() { return getTodayET(); }

const SLUG = 'guess-the-nation';

/* ROUND 428: a finished daily vanished on refresh, and Daily Challenge then
   dealt the same nation fresh with the answer just shown, so every replay
   recorded a second completion and paid the score again. The daily board is
   kept under guess-the-nation-daily-<date> and read back fail closed: the
   puzzle is the one today's seeded pick names rather than anything trusted
   from the store, and any field out of range drops the whole record. */
function restoreDaily(f: Record<string, unknown>, puzzle: NationPuzzle, difficulty: 'easy' | 'hard'): GuessTheNationState | null {
  const { puzzleId, revealedClues, guesses, gameStatus, score } = f;
  if (puzzleId !== puzzle.id) return null;
  if (typeof revealedClues !== 'number' || !Number.isInteger(revealedClues) || revealedClues < 1 || revealedClues > MAX_CLUES) return null;
  if (!Array.isArray(guesses) || !guesses.every(g => typeof g === 'string')) return null;
  if (gameStatus !== 'playing' && gameStatus !== 'won' && gameStatus !== 'lost') return null;
  if (typeof score !== 'number' || !Number.isFinite(score)) return null;
  return { puzzle, mode: 'daily', difficulty, revealedClues, guesses: guesses as string[], gameStatus, score };
}

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
  /* Round 428 part two: TODAY IS PINNED AT MOUNT, and every read, write and
     deal below uses it. Calling the clock again at write time was the bug the
     review caught: a daily dealt before midnight ET and finished after it was
     filed under TOMORROW, so the next day opened already finished with
     yesterday something on screen and that day never got dealt. Pinning is the
     convention useDailyPuzzle already follows (its own todayStr ref).
     A session that crosses midnight therefore finishes the day it started, and
     a reload after midnight deals the new day fresh. */
  const todayStr = useRef(getTodayStr()).current;
  const [countries, setCountries] = useState<NationPuzzle[]>([]);
  const [gameState, setGameState] = useState<GuessTheNationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [streak, setStreak] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        /* ROUND 362: ordered for the same reason as useCbbProgram, see the note
           there. This hook's own comment below promises that every player gets
           the same daily puzzle, and without an order by, nothing guaranteed it. */
        const { data, error: fetchError } = await (supabase as any).from('guess_nation_countries').select('*')
          .order('id', { ascending: true });
        if (cancelled) return;
        if (fetchError || !data) {
          setError(true);
        } else {
          setCountries(data.map(mapRow));
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [retryCount]);

  const retryLoad = useCallback(() => setRetryCount((c) => c + 1), []);

  const startGame = useCallback(
    async (mode: GuessTheNationState['mode'], difficulty: 'easy' | 'hard' = 'easy', continentFilter?: string) => {
      if (countries.length === 0) return;

      let pool = [...countries];
      if (difficulty === 'easy') pool = pool.filter((c) => c.difficulty === 'easy');
      if (mode === 'continent' && continentFilter) pool = pool.filter((c) => c.continent === continentFilter);
      else if (mode === 'summer') pool = pool.filter((c) => c.seasonFocus !== 'winter');
      else if (mode === 'winter') pool = pool.filter((c) => c.seasonFocus !== 'summer');
      if (pool.length === 0) pool = countries;

      let puzzle: NationPuzzle | undefined;
      if (mode === 'daily') {
        /* ROUND 366: THE DAILY DRAWS FROM THE UNFILTERED LIST, NOT FROM `pool`.
           The comment below promised every player the same daily, and the code
           did the opposite: `pool` is filtered by the difficulty toggle, which
           is plain component state with Easy and Hard buttons rendered directly
           above the Daily button. Measured live, 24 of the 82 countries are
           easy, so the two cohorts were drawing from a 24 long list and an 82
           long list, filed under one completion slug while answering different
           questions. Difficulty now governs unlimited, summer, winter and
           continent only, which is the convention every other daily follows
           (useChampOrNot gates it on mode === 'unlimited', as do the Higher and
           Lower hooks).
           Pinning the daily to the easy pool was the rejected alternative: it
           would keep today's puzzle for the default cohort but shrink the daily
           rotation to 24 and make 58 countries permanently unreachable, which
           is the same pool-is-wrong defect in a different coat. */
        const today = todayStr;
        const seed = parseInt(today.replace(/-/g, ''), 10);
        puzzle = countries[seed % countries.length];
      } else {
        puzzle = pool[Math.floor(Math.random() * pool.length)];
      }
      if (!puzzle) return;

      if (mode === 'daily') {
        const saved = readDailyRecord(SLUG, todayStr, f => restoreDaily(f, puzzle, difficulty));
        if (saved) {
          /* Restored in a handler after mount, so the completion hook is
             told first that this finish is not a new one (Round 399). */
          if (saved.gameStatus !== 'playing') markRestoredFinish(SLUG);
          setGameState(saved);
          return;
        }
      }

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
        /* ROUND 375: THE `.then()` IS THE WHOLE FIX, AND WITHOUT IT THIS LINE
           DID NOTHING FOR MONTHS.
           The Supabase query builder is a thenable: building the query does not
           send anything, and the request only leaves when something awaits it
           or calls .then(). Both writes in this file stopped at the semicolon,
           so no HTTP request was ever issued and guess_nation_scores sat at
           zero rows while daily_completions recorded eight finished games of
           guess-the-nation. Every other game on the site ends its score write
           the same way this one now does, which is why their tables have rows.
           It is deliberately not awaited: a score write must never block the
           player's screen, and a failure here is not worth interrupting a game
           for. .then() is what fires it; the empty callback is the point. */
        (supabase as any).from('guess_nation_scores').insert({
          puzzle_date: todayStr, clues_used: gameState.revealedClues, score, guessed: true, mode: gameState.mode,
        }).then(() => {});
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
          /* ROUND 375: same thenable fix as the win path above. */
          (supabase as any).from('guess_nation_scores').insert({
            puzzle_date: todayStr, clues_used: MAX_CLUES, score: 0, guessed: false, mode: gameState.mode,
          }).then(() => {});
        }
      }
    },
    [gameState]
  );

  const revealHint = useCallback(() => {
    if (!gameState || gameState.gameStatus !== 'playing' || gameState.revealedClues >= MAX_CLUES) return;
    setGameState(prev => prev ? { ...prev, revealedClues: (prev.revealedClues ?? 0) + 1 } : null);
  }, [gameState]);

  const giveUp = useCallback(() => {
    if (!gameState || gameState.gameStatus !== 'playing') return;
    setGameState({ ...gameState, gameStatus: 'lost', score: 0, revealedClues: MAX_CLUES });
    setStreak(0);
  }, [gameState]);

  const resetGame = useCallback(() => setGameState(null), []);

  const currentBadge = STREAK_BADGES.filter((b) => streak >= b.threshold).pop() ?? null;
  const pointsForCurrentClue = gameState ? POINTS_BY_CLUE[gameState.revealedClues - 1] ?? 0 : 0;

  const validatedCountries = useMemo(() => {
    if (!gameState?.puzzle) return countries;
    return ensureAnswerInList(countries, gameState.puzzle.countryName, c => c.countryName, gameState.puzzle);
  }, [countries, gameState?.puzzle]);

  useGameCompletion('guess-the-nation', gameState?.gameStatus === 'won' || gameState?.gameStatus === 'lost', gameState?.score ?? 0);

  useEffect(() => {
    if (gameState?.mode !== 'daily') return;
    const { puzzle, revealedClues, guesses, gameStatus, score } = gameState;
    writeDailyRecord(SLUG, todayStr, { puzzleId: puzzle.id, revealedClues, guesses, gameStatus, score });
  }, [gameState]);

  return { countries: validatedCountries, loading, error, retryLoad, gameState, streak, currentBadge, pointsForCurrentClue, startGame, makeGuess, giveUp, revealHint, resetGame };
}
