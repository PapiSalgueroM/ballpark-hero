import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { TennisPlayerPuzzle, TennisPlayerState, MAX_CLUES, POINTS_BY_CLUE } from '@/types/tennisPlayer';
import { supabase } from '@/integrations/supabase/client';
import { getTodayET } from '@/lib/dateUtils';
import { ensureAnswerInList } from '@/lib/ensureAnswerInOptions';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { readDailyRecord, writeDailyRecord } from '@/lib/dailyRecord';
import { markRestoredFinish } from '@/lib/restoredFinish';

const SLUG = 'guess-tennis-player';

function mapRow(row: any): TennisPlayerPuzzle {
  return {
    id: row.id,
    player_name: row.player_name,
    common_names: row.common_names ?? [],
    clues: [
      row.vibe_word,
      row.nationality_era_hint,
      row.tour_hint,
      row.slam_count_hint,
      row.slam_detail_hint,
      row.famous_moment_hint,
    ],
  };
}

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string');

/* ROUND 428: today's daily record, read fail closed. Nothing was kept across
   a refresh, so a finished daily came back as a fresh puzzle with the answer
   already known and every replay recorded and paid the score again. The
   puzzle is stored whole because the pool is remote and tennis_daily can
   change under a session; every field is range checked because
   scripts/sweepSaves.mjs reloads this route with the key set to garbage. */
function validate(f: Record<string, unknown>): TennisPlayerState | null {
  const p = f.puzzle;
  if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
  const { id, player_name, common_names, clues } = p as Record<string, unknown>;
  if (typeof id !== 'string' || typeof player_name !== 'string') return null;
  if (!isStringArray(common_names) || !isStringArray(clues) || clues.length !== MAX_CLUES) return null;
  const { revealedClues, guesses, gameStatus, score } = f;
  if (typeof revealedClues !== 'number' || !Number.isInteger(revealedClues) || revealedClues < 1 || revealedClues > MAX_CLUES) return null;
  if (!isStringArray(guesses)) return null;
  if (gameStatus !== 'playing' && gameStatus !== 'won' && gameStatus !== 'lost') return null;
  if (typeof score !== 'number' || !Number.isFinite(score)) return null;
  return { puzzle: { id, player_name, common_names, clues }, revealedClues, guesses, gameStatus, score, mode: 'daily' };
}

export function useTennisPlayer() {
  /* Round 428 part two: TODAY IS PINNED AT MOUNT, and every read, write and
     deal in this hook uses it. Calling the clock again at write time was the
     bug the review caught: a daily dealt before midnight ET and finished after
     it was filed under TOMORROW, so the next day opened already finished with
     yesterday something on screen and that day never got dealt. Pinning is the
     convention useDailyPuzzle already follows (its own todayStr ref).
     A session that crosses midnight therefore finishes the day it started, and
     a reload after midnight deals the new day fresh. */
  const todayStr = useRef(getTodayET()).current;
  const [gameState, setGameState] = useState<TennisPlayerState | null>(null);
  const [allPlayers, setAllPlayers] = useState<TennisPlayerPuzzle[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const loadPlayers = useCallback(async () => {
    setStatus('loading');
    /* ROUND 362: ordered for the same reason as useCbbProgram, see the note
       there. This hook is the one the others cite as the pattern to mirror,
       so it is the one most worth getting right. id is the primary key. */
    const { data, error } = await supabase.from('tennis_players').select('*')
      .order('id', { ascending: true });
    if (error) {
      setStatus('error');
      return;
    }
    setAllPlayers((data ?? []).map(mapRow));
    setStatus('ready');
  }, []);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  const startGame = useCallback(async (mode: 'daily' | 'unlimited') => {
    setLoading(true);
    try {
      if (mode === 'daily') {
        /* ROUND 366: ET, not UTC. This ran a day ahead of every other daily on the site from early evening, and puzzle_date on the scores table sat on a different calendar from the rest of the site. */
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
          .from('tennis_daily')
          .select('player_id')
          .eq('puzzle_date', today)
          .maybeSingle();

        if (daily?.player_id) {
          const { data: player } = await supabase
            .from('tennis_players')
            .select('*')
            .eq('id', daily.player_id)
            .single();
          if (player) {
            setGameState({ puzzle: mapRow(player), revealedClues: 1, guesses: [], gameStatus: 'playing', score: 0, mode });
            return;
          }
        }
        // Fallback: deterministic pick
        if (allPlayers.length > 0) {
          const seed = parseInt(today.replace(/-/g, ''), 10);
          const puzzle = allPlayers[seed % allPlayers.length];
          setGameState({ puzzle, revealedClues: 1, guesses: [], gameStatus: 'playing', score: 0, mode });
        }
      } else {
        if (allPlayers.length > 0) {
          const puzzle = allPlayers[Math.floor(Math.random() * allPlayers.length)];
          setGameState({ puzzle, revealedClues: 1, guesses: [], gameStatus: 'playing', score: 0, mode });
        }
      }
    } finally {
      setLoading(false);
    }
  }, [allPlayers]);

  const makeGuess = useCallback((input: string) => {
    if (!gameState || gameState.gameStatus !== 'playing') return;

    const norm = input.trim().toLowerCase();
    const isCorrect = gameState.puzzle.common_names.some(n => n.toLowerCase() === norm) ||
      gameState.puzzle.player_name.toLowerCase() === norm;
    const newGuesses = [...gameState.guesses, input];

    if (isCorrect) {
      const score = POINTS_BY_CLUE[gameState.revealedClues - 1] ?? 0;
      setGameState(prev => prev ? { ...prev, guesses: newGuesses, gameStatus: 'won', score } : null);
      const today = todayStr;
      supabase.from('tennis_scores').insert({
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
        supabase.from('tennis_scores').insert({
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

  const revealHint = useCallback(() => {
    if (!gameState || gameState.gameStatus !== 'playing' || gameState.revealedClues >= MAX_CLUES) return;
    setGameState(prev => prev ? { ...prev, revealedClues: prev.revealedClues + 1 } : null);
  }, [gameState]);

  const giveUp = useCallback(() => {
    if (!gameState || gameState.gameStatus !== 'playing') return;
    setGameState(prev => prev ? { ...prev, gameStatus: 'lost', score: 0 } : null);
  }, [gameState]);

  const resetGame = useCallback(() => setGameState(null), []);

  const pointsForCurrentClue =
    gameState ? (POINTS_BY_CLUE[gameState.revealedClues - 1] ?? 0) : POINTS_BY_CLUE[0];

  const validatedPlayers = useMemo(() => {
    if (!gameState?.puzzle) return allPlayers;
    return ensureAnswerInList(allPlayers, gameState.puzzle.player_name, p => p.player_name, gameState.puzzle);
  }, [allPlayers, gameState?.puzzle]);

  useGameCompletion('guess-tennis-player', gameState?.gameStatus === 'won' || gameState?.gameStatus === 'lost', gameState?.score ?? 0);

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

  return { gameState, startGame, makeGuess, giveUp, revealHint, resetGame, maxClues: MAX_CLUES, pointsForCurrentClue, allPlayers: validatedPlayers, loading, status, reloadPlayers: loadPlayers };
}
