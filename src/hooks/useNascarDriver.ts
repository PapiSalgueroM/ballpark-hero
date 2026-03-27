import { useState, useCallback, useEffect, useMemo } from 'react';
import { NascarDriverPuzzle, NascarDriverState, MAX_CLUES, POINTS_BY_CLUE } from '@/types/nascarDriver';
import { supabase } from '@/integrations/supabase/client';
import { ensureAnswerInList } from '@/lib/ensureAnswerInOptions';
import { useGameCompletion } from '@/hooks/useGameCompletion';

function mapRow(row: any): NascarDriverPuzzle {
  return {
    id: row.id,
    driver_name: row.driver_name,
    common_names: row.common_names ?? [],
    clues: [
      row.vibe_word,
      row.era_hint,
      row.car_number_hint,
      row.wins_hint,
      row.championship_hint,
      row.famous_moment_hint,
    ],
  };
}

export function useNascarDriver() {
  const [gameState, setGameState] = useState<NascarDriverState | null>(null);
  const [allDrivers, setAllDrivers] = useState<NascarDriverPuzzle[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('nascar_drivers').select('*');
      if (data) setAllDrivers(data.map(mapRow));
    })();
  }, []);

  const startGame = useCallback(async (mode: 'daily' | 'unlimited') => {
    setLoading(true);
    try {
      if (mode === 'daily') {
        const today = new Date().toISOString().slice(0, 10);
        const { data: daily } = await supabase
          .from('nascar_daily')
          .select('driver_id')
          .eq('puzzle_date', today)
          .maybeSingle();

        if (daily?.driver_id) {
          const { data: driver } = await supabase
            .from('nascar_drivers')
            .select('*')
            .eq('id', daily.driver_id)
            .single();
          if (driver) {
            setGameState({ puzzle: mapRow(driver), revealedClues: 1, guesses: [], gameStatus: 'playing', score: 0, mode });
            return;
          }
        }
        if (allDrivers.length > 0) {
          const seed = parseInt(today.replace(/-/g, ''), 10);
          const puzzle = allDrivers[seed % allDrivers.length];
          setGameState({ puzzle, revealedClues: 1, guesses: [], gameStatus: 'playing', score: 0, mode });
        }
      } else {
        if (allDrivers.length > 0) {
          const puzzle = allDrivers[Math.floor(Math.random() * allDrivers.length)];
          setGameState({ puzzle, revealedClues: 1, guesses: [], gameStatus: 'playing', score: 0, mode });
        }
      }
    } finally {
      setLoading(false);
    }
  }, [allDrivers]);

  const makeGuess = useCallback((input: string) => {
    if (!gameState || gameState.gameStatus !== 'playing') return;

    const norm = input.trim().toLowerCase();
    const isCorrect = gameState.puzzle.common_names.some(n => n.toLowerCase() === norm) ||
      gameState.puzzle.driver_name.toLowerCase() === norm;
    const newGuesses = [...gameState.guesses, input];

    if (isCorrect) {
      const score = POINTS_BY_CLUE[gameState.revealedClues - 1] ?? 0;
      setGameState(prev => prev ? { ...prev, guesses: newGuesses, gameStatus: 'won', score } : null);
      const today = new Date().toISOString().slice(0, 10);
      supabase.from('nascar_scores').insert({
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
        supabase.from('nascar_scores').insert({
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

  // Ensure current puzzle answer is always in the selectable options
  const validatedDrivers = useMemo(() => {
    if (!gameState?.puzzle) return allDrivers;
    return ensureAnswerInList(allDrivers, gameState.puzzle.driver_name, d => d.driver_name, gameState.puzzle);
  }, [allDrivers, gameState?.puzzle]);

  useGameCompletion('nascar-driver', gameState?.gameStatus === 'won' || gameState?.gameStatus === 'lost', gameState?.score ?? 0);

  return { gameState, startGame, makeGuess, giveUp, resetGame, maxClues: MAX_CLUES, pointsForCurrentClue, allDrivers: validatedDrivers, loading };
}
