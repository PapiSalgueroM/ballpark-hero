import { useState, useMemo, useCallback } from 'react';
import { UfcFighter, UfcGuessResult } from '@/types/ufc';
import { uniqueUfcFighters } from '@/data/ufcFighters';
import { compareUfcGuess } from '@/lib/ufcGameLogic';
import { ensureAnswerInList } from '@/lib/ensureAnswerInOptions';

const MAX_GUESSES = 8;

function selectRandomFighter(): UfcFighter {
  return uniqueUfcFighters[Math.floor(Math.random() * uniqueUfcFighters.length)];
}

export function useUfcGame() {
  const [targetFighter, setTargetFighter] = useState<UfcFighter>(selectRandomFighter);
  const [guesses, setGuesses] = useState<UfcGuessResult[]>([]);
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');

  const resetGame = useCallback(() => {
    setTargetFighter(selectRandomFighter());
    setGuesses([]);
    setGameStatus('playing');
  }, []);

  const makeGuess = useCallback((fighter: UfcFighter) => {
    if (gameStatus !== 'playing') return;
    const result = compareUfcGuess(fighter, targetFighter);
    setGuesses(prev => {
      const newGuesses = [...prev, result];
      if (result.isCorrect) {
        setGameStatus('won');
      } else if (newGuesses.length >= MAX_GUESSES) {
        setGameStatus('lost');
      }
      return newGuesses;
    });
  }, [gameStatus, targetFighter]);

  const guessedFighterNames = useMemo(() => guesses.map(g => g.fighterName), [guesses]);
  const validatedFighters = useMemo(() => ensureAnswerInList(uniqueUfcFighters, targetFighter.name, f => f.name, targetFighter), [targetFighter]);

  return {
    targetFighter,
    guesses,
    gameStatus,
    makeGuess,
    resetGame,
    fighters: validatedFighters,
    guessedFighterNames,
    maxGuesses: MAX_GUESSES,
  };
}
