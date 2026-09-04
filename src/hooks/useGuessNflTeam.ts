import { useState, useCallback, useEffect, useRef } from 'react';
import { GuessNflTeamState, GameMode, Difficulty, POINTS_BY_CLUE } from '@/types/guessNflTeam';
import { getDailyNflTeamPuzzle, getRandomNflTeamPuzzle, nflTeamPuzzles } from '@/data/nflTeamPuzzles';
import { nflTeamFacts } from '@/data/nflTeamFacts';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { getTodayET } from '@/lib/dateUtils';
import { readDailyRecord, writeDailyRecord } from '@/lib/dailyRecord';
import { markRestoredFinish } from '@/lib/restoredFinish';

const MAX_CLUES = 11;
const SLUG = 'guess-nfl-team';

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string');

/* ROUND 428: today's daily record, read fail closed. Nothing was kept across
   a refresh, so a finished daily came back as a fresh puzzle with the answer
   already known and every replay recorded and paid the score again. The
   pool is bundled, so only the puzzle id is stored and it must still be
   today's pick; every field is range checked because scripts/sweepSaves.mjs
   reloads this route with the key set to garbage. A win reveals every clue,
   so revealedClues may sit one past MAX_CLUES. */
function validate(f: Record<string, unknown>): GuessNflTeamState | null {
  const puzzle = getDailyNflTeamPuzzle();
  if (f.puzzleId !== puzzle.id) return null;
  const { revealedClues, guesses, gameStatus, score } = f;
  if (typeof revealedClues !== 'number' || !Number.isInteger(revealedClues) || revealedClues < 1 || revealedClues > MAX_CLUES + 1) return null;
  if (!isStringArray(guesses)) return null;
  if (gameStatus !== 'playing' && gameStatus !== 'won' && gameStatus !== 'lost') return null;
  if (typeof score !== 'number' || !Number.isFinite(score)) return null;
  return { puzzle, revealedClues, guesses, gameStatus, score, mode: 'daily', difficulty: 'easy' };
}

export function useGuessNflTeam() {
  /* Round 428 part two: TODAY IS PINNED AT MOUNT, and every read, write and
     deal in this hook uses it. Calling the clock again at write time was the
     bug the review caught: a daily dealt before midnight ET and finished after
     it was filed under TOMORROW, so the next day opened already finished with
     yesterday something on screen and that day never got dealt. Pinning is the
     convention useDailyPuzzle already follows (its own todayStr ref).
     A session that crosses midnight therefore finishes the day it started, and
     a reload after midnight deals the new day fresh. */
  const todayStr = useRef(getTodayET()).current;
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
      /* ROUND 428: a daily already played today comes back as it was left,
         and a finished one says so before it is set, because this restore
         runs in a click handler after mount and useGameCompletion would
         otherwise record it as a new finish (the Round 399 double record). */
      const saved = readDailyRecord(SLUG, todayStr, validate);
      if (saved) {
        if (saved.gameStatus !== 'playing') markRestoredFinish(SLUG);
        setGameState({ ...saved, difficulty });
        return;
      }
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

  const giveUp = useCallback(() => {
    if (!gameState || gameState.gameStatus !== 'playing') return;
    setGameState(prev => prev ? { ...prev, gameStatus: 'lost', score: 0, revealedClues: MAX_CLUES + 1 } : null);
  }, [gameState]);

  const resetGame = useCallback(() => {
    setGameState(null);
  }, []);

  const getClueText = useCallback((index: number): string => {
    if (!gameState) return '';
    const { puzzle } = gameState;
    const { clues } = puzzle;

    const facts = nflTeamFacts[puzzle.id] ?? [];

    switch (index) {
      case 0: return facts[0] ?? `"${clues.vibe}"`;
      case 1: return facts[1] ?? clues.region;
      case 2: return `Stadium capacity: ~${clues.stadiumCapacity.toLocaleString()}`;
      case 3: return `${puzzle.conference} ${puzzle.division}`;
      case 4: return `Has appeared in ${clues.superBowlAppearances} Super Bowl${clues.superBowlAppearances !== 1 ? 's' : ''}`;
      case 5: return `Won ${clues.superBowlWins} championship${clues.superBowlWins !== 1 ? 's' : ''}`;
      case 6: return facts[2] ?? clues.famousPlayerHint;
      case 7: return clues.colors;
      case 8: return facts[3] ?? clues.stadiumHint;
      case 9: return clues.nicknameHint;
      case 10: return `Based in ${puzzle.city}`;
      default: return '';
    }
  }, [gameState]);

  const getAvailableTeams = useCallback(() => {
    // Always show all 32 current NFL teams as selectable options
    const allTeams = nflTeamPuzzles.map(t => t.fullName);
    
    // Ensure the current puzzle answer is always included
    if (gameState?.puzzle && !allTeams.includes(gameState.puzzle.fullName)) {
      allTeams.push(gameState.puzzle.fullName);
    }
    
    return [...new Set(allTeams)].sort();
  }, [gameState]);

  useGameCompletion('guess-nfl-team', gameState?.gameStatus === 'won' || gameState?.gameStatus === 'lost', gameState?.score ?? 0);

  /* ROUND 428: the daily board is kept current on every move, the fields
     validate reads back. Unlimited and conference play are never written. */
  useEffect(() => {
    if (gameState?.mode !== 'daily') return;
    writeDailyRecord(SLUG, todayStr, {
      puzzleId: gameState.puzzle.id,
      revealedClues: gameState.revealedClues,
      guesses: gameState.guesses,
      gameStatus: gameState.gameStatus,
      score: gameState.score,
    });
  }, [gameState]);

  return {
    gameState,
    startGame,
    makeGuess,
    giveUp,
    revealNextClue,
    resetGame,
    getClueText,
    getAvailableTeams,
    maxClues: MAX_CLUES,
    pointsForCurrentClue: gameState ? POINTS_BY_CLUE[gameState.revealedClues - 1] || 0 : POINTS_BY_CLUE[0],
  };
}
