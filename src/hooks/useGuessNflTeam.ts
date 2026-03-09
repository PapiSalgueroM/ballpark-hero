import { useState, useCallback } from 'react';
import { GuessNflTeamState, GameMode, Difficulty, POINTS_BY_CLUE } from '@/types/guessNflTeam';
import { getDailyNflTeamPuzzle, getRandomNflTeamPuzzle, nflTeamPuzzles } from '@/data/nflTeamPuzzles';

const MAX_CLUES = 11;

export function useGuessNflTeam() {
  const [gameState, setGameState] = useState<GuessNflTeamState | null>(null);

  const startGame = useCallback((
    mode: GameMode,
    difficulty: Difficulty,
    conference?: 'AFC' | 'NFC',
    division?: string
  ) => {
    const excludeRelocated = difficulty === 'easy';
    let puzzle;
    
    if (mode === 'daily') {
      puzzle = getDailyNflTeamPuzzle();
    } else {
      puzzle = getRandomNflTeamPuzzle(excludeRelocated, conference, division);
    }

    setGameState({
      puzzle,
      revealedClues: 1,
      guesses: [],
      gameStatus: 'playing',
      score: 0,
      mode,
      difficulty,
      conferenceFilter: conference,
      divisionFilter: division,
    });
  }, []);

  const makeGuess = useCallback((teamName: string) => {
    if (!gameState || gameState.gameStatus !== 'playing') return;

    const isCorrect = teamName.toLowerCase() === gameState.puzzle.fullName.toLowerCase();
    const newGuesses = [...gameState.guesses, teamName];

    if (isCorrect) {
      const score = POINTS_BY_CLUE[gameState.revealedClues - 1] || 0;
      setGameState(prev => prev ? {
        ...prev,
        guesses: newGuesses,
        gameStatus: 'won',
        score,
        revealedClues: MAX_CLUES + 1, // Reveal all
      } : null);
    } else {
      const newRevealedClues = Math.min(gameState.revealedClues + 1, MAX_CLUES);
      const isLost = newRevealedClues >= MAX_CLUES;

      setGameState(prev => prev ? {
        ...prev,
        guesses: newGuesses,
        revealedClues: newRevealedClues,
        gameStatus: isLost ? 'lost' : 'playing',
        score: 0,
      } : null);
    }
  }, [gameState]);

  const revealNextClue = useCallback(() => {
    if (!gameState || gameState.gameStatus !== 'playing') return;
    if (gameState.revealedClues >= MAX_CLUES) return;

    setGameState(prev => prev ? {
      ...prev,
      revealedClues: prev.revealedClues + 1,
    } : null);
  }, [gameState]);

  const resetGame = useCallback(() => {
    setGameState(null);
  }, []);

  const getClueText = useCallback((index: number): string => {
    if (!gameState) return '';
    const { puzzle } = gameState;
    const { clues } = puzzle;

    switch (index) {
      case 0: return `"${clues.vibe}"`;
      case 1: return clues.region;
      case 2: return `Stadium capacity: ~${clues.stadiumCapacity.toLocaleString()}`;
      case 3: return `${puzzle.conference} ${puzzle.division}`;
      case 4: return `Has appeared in ${clues.superBowlAppearances} Super Bowl${clues.superBowlAppearances !== 1 ? 's' : ''}`;
      case 5: return `Won ${clues.superBowlWins} championship${clues.superBowlWins !== 1 ? 's' : ''}`;
      case 6: return clues.famousPlayerHint;
      case 7: return clues.colors;
      case 8: return clues.stadiumHint;
      case 9: return clues.nicknameHint;
      case 10: return `Based in ${puzzle.city}`;
      default: return '';
    }
  }, [gameState]);

  const getAvailableTeams = useCallback(() => {
    if (!gameState) return nflTeamPuzzles.map(t => t.fullName).sort();
    
    const excludeRelocated = gameState.difficulty === 'easy';
    let teams = nflTeamPuzzles;
    
    if (excludeRelocated) {
      teams = teams.filter(t => !t.isRelocated);
    }
    if (gameState.conferenceFilter) {
      teams = teams.filter(t => t.conference === gameState.conferenceFilter);
    }
    if (gameState.divisionFilter) {
      teams = teams.filter(t => t.division === gameState.divisionFilter);
    }
    
    return teams.map(t => t.fullName).sort();
  }, [gameState]);

  return {
    gameState,
    startGame,
    makeGuess,
    revealNextClue,
    resetGame,
    getClueText,
    getAvailableTeams,
    maxClues: MAX_CLUES,
    pointsForCurrentClue: gameState ? POINTS_BY_CLUE[gameState.revealedClues - 1] || 0 : POINTS_BY_CLUE[0],
  };
}
