import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { getTodayET } from '@/lib/dateUtils';
import { CbbProgramPuzzle, CbbProgramState, MAX_CLUES, POINTS_BY_CLUE } from '@/types/cbbProgram';
import { supabase } from '@/integrations/supabase/client';
import { ensureAnswerInList } from '@/lib/ensureAnswerInOptions';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { readDailyRecord, writeDailyRecord } from '@/lib/dailyRecord';
import { markRestoredFinish } from '@/lib/restoredFinish';

const SLUG = 'guess-cbb-team';

function mapRow(row: any): CbbProgramPuzzle {
  return {
    id: row.id,
    school_name: row.school_name,
    common_names: row.common_names ?? [],
    clues: [
      row.vibe_word,
      row.region_hint,
      row.conference_hint,
      row.tournament_hint,
      row.championships_hint,
      row.mascot_hint,
    ],
  };
}

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string');

/* ROUND 428: today's daily record, read fail closed. Nothing was kept across
   a refresh, so a finished daily came back as a fresh puzzle with the answer
   already known and every replay recorded and paid the score again. The
   puzzle is stored whole because the pool is remote and cbb_daily can
   change under a session; every field is range checked because
   scripts/simDailyReload.mjs assertion 5 reloads this route with the key set to garbage. */
function validate(f: Record<string, unknown>): CbbProgramState | null {
  const p = f.puzzle;
  if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
  const { id, school_name, common_names, clues } = p as Record<string, unknown>;
  if (typeof id !== 'string' || typeof school_name !== 'string') return null;
  if (!isStringArray(common_names) || !isStringArray(clues) || clues.length !== MAX_CLUES) return null;
  const { revealedClues, guesses, gameStatus, score } = f;
  if (typeof revealedClues !== 'number' || !Number.isInteger(revealedClues) || revealedClues < 1 || revealedClues > MAX_CLUES) return null;
  if (!isStringArray(guesses)) return null;
  if (gameStatus !== 'playing' && gameStatus !== 'won' && gameStatus !== 'lost') return null;
  if (typeof score !== 'number' || !Number.isFinite(score)) return null;
  return { puzzle: { id, school_name, common_names, clues }, revealedClues, guesses, gameStatus, score, mode: 'daily' };
}

export function useCbbProgram() {
  /* Round 428 part two: TODAY IS PINNED AT MOUNT, and every read, write and
     deal in this hook uses it. Calling the clock again at write time was the
     bug the review caught: a daily dealt before midnight ET and finished after
     it was filed under TOMORROW, so the next day opened already finished with
     yesterday something on screen and that day never got dealt. Pinning is the
     convention useDailyPuzzle already follows (its own todayStr ref).
     A session that crosses midnight therefore finishes the day it started, and
     a reload after midnight deals the new day fresh. */
  const todayStr = useRef(getTodayET()).current;
  const [gameState, setGameState] = useState<CbbProgramState | null>(null);
  const [allPrograms, setAllPrograms] = useState<CbbProgramPuzzle[]>([]);
  const [loading, setLoading] = useState(false);
  const [programsStatus, setProgramsStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // Load all programs on mount (for autocomplete + puzzle selection).
  const loadPrograms = useCallback(async () => {
    setProgramsStatus('loading');
    const { data, error } = await supabase
      .from('cbb_programs')
      .select('*')
      /* ROUND 362: THE DAILY INDEX NEEDS A GUARANTEED ORDER.
         The daily puzzle is pool[dateSeed % pool.length], which is this site's
         documented standard (see dateUtils.ts) and is correct. It rests
         entirely on the pool arriving in the same order every time, and a
         select without an order by gives no such guarantee: Postgres returns
         heap order, which looks stable only until a row is edited, because an
         UPDATE rewrites that tuple to the end of the heap and shifts every
         index after it. The mapping from date to puzzle would then change
         silently, and two players on the same date could be served different
         puzzles. Ordering by id rather than by a name, because a name can be
         corrected and an id cannot. */
      .order('id', { ascending: true });
    if (error) {
      setProgramsStatus('error');
      return;
    }
    setAllPrograms((data ?? []).map(mapRow));
    setProgramsStatus('ready');
  }, []);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  const startGame = useCallback(async (mode: 'daily' | 'unlimited') => {
    setLoading(true);
    try {
      if (mode === 'daily') {
        const today = todayStr;
        /* ROUND 428: a daily already played today comes back as it was left,
           and a finished one says so before it is set, because this restore
           runs in a click handler after mount and useGameCompletion would
           otherwise record it as a new finish (the Round 399 double record). */
        const saved = readDailyRecord(SLUG, today, validate);
        if (saved) {
          if (saved.gameStatus !== 'playing') markRestoredFinish(SLUG);
          setGameState(saved);
          return;
        }
        const { data: daily } = await supabase
          .from('cbb_daily')
          .select('program_id')
          .eq('puzzle_date', today)
          .maybeSingle();

        if (daily?.program_id) {
          const { data: prog } = await supabase
            .from('cbb_programs')
            .select('*')
            .eq('id', daily.program_id)
            .single();
          if (prog) {
            setGameState({ puzzle: mapRow(prog), revealedClues: 1, guesses: [], gameStatus: 'playing', score: 0, mode });
            setLoading(false);
            return;
          }
        }
        // Fallback: deterministic pick
        if (allPrograms.length > 0) {
          const seed = parseInt(today.replace(/-/g, ''), 10);
          const puzzle = allPrograms[seed % allPrograms.length];
          setGameState({ puzzle, revealedClues: 1, guesses: [], gameStatus: 'playing', score: 0, mode });
        }
      } else {
        if (allPrograms.length > 0) {
          const puzzle = allPrograms[Math.floor(Math.random() * allPrograms.length)];
          setGameState({ puzzle, revealedClues: 1, guesses: [], gameStatus: 'playing', score: 0, mode });
        }
      }
    } finally {
      setLoading(false);
    }
  }, [allPrograms]);

  const makeGuess = useCallback((input: string) => {
    if (!gameState || gameState.gameStatus !== 'playing') return;

    const norm = input.trim().toLowerCase();
    const isCorrect = gameState.puzzle.common_names.some(n => n.toLowerCase() === norm) ||
      gameState.puzzle.school_name.toLowerCase() === norm;
    const newGuesses = [...gameState.guesses, input];

    if (isCorrect) {
      const score = POINTS_BY_CLUE[gameState.revealedClues - 1] ?? 0;
      setGameState(prev => prev ? { ...prev, guesses: newGuesses, gameStatus: 'won', score } : null);
      // Save score
      const today = todayStr;
      supabase.from('cbb_scores').insert({
        puzzle_date: today,
        clues_used: gameState.revealedClues,
        score: POINTS_BY_CLUE[gameState.revealedClues - 1] ?? 0,
        guessed: true,
        mode: gameState.mode,
      }).then(() => {});
    } else {
      const newRevealed = gameState.revealedClues + 1;
      const isLost = newRevealed > MAX_CLUES;
      if (isLost) {
        const today = todayStr;
        supabase.from('cbb_scores').insert({
          puzzle_date: today,
          clues_used: MAX_CLUES,
          score: 0,
          guessed: false,
          mode: gameState.mode,
        }).then(() => {});
      }
      setGameState(prev =>
        prev ? {
          ...prev,
          guesses: newGuesses,
          revealedClues: Math.min(newRevealed, MAX_CLUES),
          gameStatus: isLost ? 'lost' : 'playing',
          score: 0,
        } : null
      );
    }
  }, [gameState]);

  const giveUp = useCallback(() => {
    if (!gameState || gameState.gameStatus !== 'playing') return;
    setGameState(prev => prev ? { ...prev, gameStatus: 'lost', score: 0 } : null);
  }, [gameState]);

  const resetGame = useCallback(() => setGameState(null), []);

  const pointsForCurrentClue =
    gameState ? (POINTS_BY_CLUE[gameState.revealedClues - 1] ?? 0) : POINTS_BY_CLUE[0];

  const validatedPrograms = useMemo(() => {
    if (!gameState?.puzzle) return allPrograms;
    return ensureAnswerInList(allPrograms, gameState.puzzle.school_name, p => p.school_name, gameState.puzzle);
  }, [allPrograms, gameState?.puzzle]);

  useGameCompletion('guess-cbb-team', gameState?.gameStatus === 'won' || gameState?.gameStatus === 'lost', gameState?.score ?? 0);

  /* ROUND 428: the daily board is kept current on every move, the fields
     validate reads back. Unlimited is never written. */
  useEffect(() => {
    if (gameState?.mode !== 'daily') return;
    writeDailyRecord(SLUG, todayStr, {
      puzzle: gameState.puzzle,
      revealedClues: gameState.revealedClues,
      guesses: gameState.guesses,
      gameStatus: gameState.gameStatus,
      score: gameState.score,
    });
  }, [gameState]);

  return { gameState, startGame, makeGuess, giveUp, resetGame, maxClues: MAX_CLUES, pointsForCurrentClue, allPrograms: validatedPrograms, loading, programsStatus, reloadPrograms: loadPrograms };
}
