import { useState, useCallback, useEffect, useMemo } from 'react';
import { CbbProgramPuzzle, CbbProgramState, MAX_CLUES, POINTS_BY_CLUE } from '@/types/cbbProgram';
import { supabase } from '@/integrations/supabase/client';
import { ensureAnswerInList } from '@/lib/ensureAnswerInOptions';
import { useGameCompletion } from '@/hooks/useGameCompletion';

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

export function useCbbProgram() {
  const [gameState, setGameState] = useState<CbbProgramState | null>(null);
  const [allPrograms, setAllPrograms] = useState<CbbProgramPuzzle[]>([]);
  const [loading, setLoading] = useState(false);
  const [programsStatus, setProgramsStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // Load all programs on mount (for autocomplete + puzzle selection).
  const loadPrograms = useCallback(async () => {
    setProgramsStatus('loading');
    const { data, error } = await supabase
      .from('cbb_programs')
      .select('*');
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
        const today = new Date().toISOString().slice(0, 10);
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
      const today = new Date().toISOString().slice(0, 10);
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
        const today = new Date().toISOString().slice(0, 10);
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

  return { gameState, startGame, makeGuess, giveUp, resetGame, maxClues: MAX_CLUES, pointsForCurrentClue, allPrograms: validatedPrograms, loading, programsStatus, reloadPrograms: loadPrograms };
}
