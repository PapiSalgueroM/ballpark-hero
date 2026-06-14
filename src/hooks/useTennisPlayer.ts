import { useState, useCallback, useEffect, useMemo } from 'react';
import { TennisPlayerPuzzle, TennisPlayerState, MAX_CLUES, POINTS_BY_CLUE } from '@/types/tennisPlayer';
import { supabase } from '@/integrations/supabase/client';
import { ensureAnswerInList } from '@/lib/ensureAnswerInOptions';
import { useGameCompletion } from '@/hooks/useGameCompletion';

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

export function useTennisPlayer() {
  const [gameState, setGameState] = useState<TennisPlayerState | null>(null);
  const [allPlayers, setAllPlayers] = useState<TennisPlayerPuzzle[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const loadPlayers = useCallback(async () => {
    setStatus('loading');
    const { data, error } = await supabase.from('tennis_players').select('*');
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
        const today = new Date().toISOString().slice(0, 10);
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
      const today = new Date().toISOString().slice(0, 10);
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
        const today = new Date().toISOString().slice(0, 10);
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

  useGameCompletion('tennis-player', gameState?.gameStatus === 'won' || gameState?.gameStatus === 'lost', gameState?.score ?? 0);

  return { gameState, startGame, makeGuess, giveUp, revealHint, resetGame, maxClues: MAX_CLUES, pointsForCurrentClue, allPlayers: validatedPlayers, loading, status, reloadPlayers: loadPlayers };
}
