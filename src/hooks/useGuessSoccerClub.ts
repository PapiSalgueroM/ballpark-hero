import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import {
  GuessSoccerClubState,
  GameMode,
  POINTS_BY_CLUE,
  SoccerClubPuzzle,
  QuestionTreeState,
} from '@/types/guessSoccerClub';
import { soccerClubPuzzles } from '@/data/soccerClubPuzzles';
import { fetchSoccerClubPuzzles } from '@/lib/fetchSoccerClubPuzzles';
import { fetchNotablePlayersForClubs } from '@/lib/fetchSoccerClubNotablePlayers';
import { dailyIndex, getTodayET } from '@/lib/dateUtils';
import {
  ClubQuestionId,
  scoreQuestionTreeRound,
  getClubQuestion,
} from '@/lib/clubQuestionTree';
import { readDailyRecord, writeDailyRecord } from '@/lib/dailyRecord';
import { markRestoredFinish } from '@/lib/restoredFinish';

export const MAX_CLUES = 6;

const SLUG = 'guess-soccer-club';

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string');

/* ROUND 428: today's daily record, read fail closed. Nothing was kept across
   a refresh, so a finished daily came back as a fresh puzzle with the answer
   already known and every replay recorded and paid the score again. The
   pool is whichever one loaded (the table, or the bundled fallback), so
   only the puzzle id is stored and it is resolved against the pool in hand;
   every field is range checked because scripts/sweepSaves.mjs reloads this
   route with the key set to garbage. */
function validate(f: Record<string, unknown>, pool: SoccerClubPuzzle[]): GuessSoccerClubState | null {
  const puzzle = pool.find(p => p.id === f.puzzleId);
  if (!puzzle) return null;
  const { revealedClues, guesses, gameStatus, score } = f;
  if (typeof revealedClues !== 'number' || !Number.isInteger(revealedClues) || revealedClues < 1 || revealedClues > MAX_CLUES) return null;
  if (!isStringArray(guesses)) return null;
  if (gameStatus !== 'playing' && gameStatus !== 'won' && gameStatus !== 'lost') return null;
  if (typeof score !== 'number' || !Number.isFinite(score)) return null;
  return { puzzle, revealedClues, guesses, gameStatus, score, mode: 'daily' };
}

export function useGuessSoccerClub() {
  /* Round 428 part two: TODAY IS PINNED AT MOUNT, and every read, write and
     deal below uses it. Calling the clock again at write time was the bug the
     review caught: a daily dealt before midnight ET and finished after it was
     filed under TOMORROW, so the next day opened already finished with
     yesterday something on screen and that day never got dealt. Pinning is the
     convention useDailyPuzzle already follows (its own todayStr ref).
     A session that crosses midnight therefore finishes the day it started, and
     a reload after midnight deals the new day fresh. */
  const todayStr = useRef(getTodayET()).current;
  // ── Pool state (Supabase fetch, falls back to hardcoded soccerClubPuzzles) ──
  const [puzzlePool, setPuzzlePool]       = useState<SoccerClubPuzzle[]>(soccerClubPuzzles);
  const [isLoadingPool, setIsLoadingPool] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchSoccerClubPuzzles().then(pool => {
      if (cancelled) return;
      if (pool.length > 0) setPuzzlePool(pool);
      setIsLoadingPool(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Enriches whichever pool just loaded (DB or hardcoded fallback) with the
  // "Notable Players" clue tier in one batched request. Runs after the pool
  // is set so it always targets the real full_name values in play, and is
  // non-blocking: isLoadingPool is not held up by this second fetch, since a
  // missing notablePlayers array just means that clue tier is skipped for
  // that puzzle (see getClueContent in GuessSoccerClubBoard.tsx).
  useEffect(() => {
    if (puzzlePool.length === 0) return;
    let cancelled = false;
    const names = puzzlePool.map(p => p.fullName);
    fetchNotablePlayersForClubs(names).then(map => {
      if (cancelled || map.size === 0) return;
      setPuzzlePool(prev =>
        prev.map(p => {
          const players = map.get(p.fullName);
          return players && players.length > 0 ? { ...p, notablePlayers: players } : p;
        })
      );
    });
    return () => { cancelled = true; };
    // Intentionally keyed off puzzlePool.length rather than the full array:
    // this effect's own setPuzzlePool call above changes object identities
    // (via the map/spread) but not the array length, so keying on length
    // means the effect fires once per real pool swap (hardcoded fallback,
    // then again once the DB pool replaces it) and never loops on its own
    // enrichment write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzlePool.length]);

  // ── allClubNames: flat sorted list of fullName + all aliases, for autocomplete ──
  const allClubNames = useMemo(
    () =>
      Array.from(
        new Set(puzzlePool.flatMap(p => [p.fullName, ...p.commonNames]))
      ).sort(),
    [puzzlePool]
  );

  // ── Hook-internal helpers (closures over puzzlePool, replace module-level imports) ──
  const resolvePuzzleByName = useCallback(
    (input: string): SoccerClubPuzzle | undefined => {
      const lower = input.toLowerCase().trim();
      return puzzlePool.find(
        p =>
          p.fullName.toLowerCase() === lower ||
          p.commonNames.some(alias => alias.toLowerCase() === lower)
      );
    },
    [puzzlePool]
  );

  const getDailyPuzzle = useCallback((): SoccerClubPuzzle => {
    // UTC-safe: all users share same rollover at midnight ET
    const idx = dailyIndex(todayStr, puzzlePool.length);
    return puzzlePool[idx];
  }, [puzzlePool]);

  const getRandomPuzzle = useCallback(
    (leagueFilter?: string): SoccerClubPuzzle => {
      let pool = puzzlePool;
      if (leagueFilter) pool = pool.filter(p => p.league === leagueFilter);
      if (!pool.length) pool = puzzlePool;
      return pool[Math.floor(Math.random() * pool.length)];
    },
    [puzzlePool]
  );

  // ── Game state ────────────────────────────────────────────────────────────────
  const [gameState, setGameState] = useState<GuessSoccerClubState | null>(null);

  const startGame = useCallback(
    (mode: GameMode, leagueFilter?: string) => {
      if (mode === 'daily') {
        /* ROUND 428: a daily already played today comes back as it was left,
           and a finished one says so before it is set, because this restore
           runs in a click handler after mount and useGameCompletion would
           otherwise record it as a new finish (the Round 399 double record). */
        const saved = readDailyRecord(SLUG, todayStr, f => validate(f, puzzlePool));
        if (saved) {
          if (saved.gameStatus !== 'playing') markRestoredFinish(SLUG);
          setGameState(saved);
          return;
        }
      }
      const puzzle = mode === 'daily' ? getDailyPuzzle() : getRandomPuzzle(leagueFilter);
      setGameState({
        puzzle,
        revealedClues: 1,
        guesses: [],
        gameStatus: 'playing',
        score: 0,
        mode,
        leagueFilter,
      });
    },
    [getDailyPuzzle, getRandomPuzzle, puzzlePool]
  );

  const makeGuess = useCallback(
    (input: string) => {
      if (!gameState || gameState.gameStatus !== 'playing') return;

      const resolved = resolvePuzzleByName(input);
      const isCorrect = resolved?.id === gameState.puzzle.id;
      const newGuesses = [...gameState.guesses, input];

      if (isCorrect) {
        const score = POINTS_BY_CLUE[gameState.revealedClues - 1] ?? 0;
        setGameState(prev =>
          prev ? { ...prev, guesses: newGuesses, gameStatus: 'won', score } : null
        );
      } else {
        const newRevealed = gameState.revealedClues + 1;
        const isLost = newRevealed > MAX_CLUES;
        setGameState(prev =>
          prev
            ? {
                ...prev,
                guesses: newGuesses,
                revealedClues: Math.min(newRevealed, MAX_CLUES),
                gameStatus: isLost ? 'lost' : 'playing',
                score: 0,
              }
            : null
        );
      }
    },
    [gameState, resolvePuzzleByName]
  );

  const giveUp = useCallback(() => {
    if (!gameState || gameState.gameStatus !== 'playing') return;
    setGameState(prev => prev ? { ...prev, gameStatus: 'lost', score: 0 } : null);
  }, [gameState]);

  const resetGame = useCallback(() => setGameState(null), []);

  const pointsForCurrentClue =
    gameState ? (POINTS_BY_CLUE[gameState.revealedClues - 1] ?? 0) : POINTS_BY_CLUE[0];

  useGameCompletion(
    'guess-soccer-club',
    gameState?.gameStatus === 'won' || gameState?.gameStatus === 'lost',
    gameState?.score ?? 0
  );

  /* ROUND 428: the daily board is kept current on every move, the fields
     validate reads back. Unlimited and league play are never written. */
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

  // ── Guided question-tree mode ("20 Questions" tab) ──
  // Fully separate state from classic mode's gameState above; classic
  // mode's behavior is unchanged by any of this.
  const [treeState, setTreeState] = useState<QuestionTreeState | null>(null);

  const startQuestionTree = useCallback(
    (leagueFilter?: string) => {
      const puzzle = getRandomPuzzle(leagueFilter);
      setTreeState({
        puzzle,
        askedIds: [],
        guesses: [],
        status: 'playing',
        score: 0,
      });
    },
    [getRandomPuzzle]
  );

  const askQuestion = useCallback(
    (id: ClubQuestionId) => {
      if (!treeState || treeState.status !== 'playing') return;
      if (treeState.askedIds.includes(id)) return;
      setTreeState(prev =>
        prev ? { ...prev, askedIds: [...prev.askedIds, id] } : null
      );
    },
    [treeState]
  );

  const guessClubInTree = useCallback(
    (input: string) => {
      if (!treeState || treeState.status !== 'playing') return;

      const resolved = resolvePuzzleByName(input);
      const isCorrect = resolved?.id === treeState.puzzle.id;
      const newGuesses = [...treeState.guesses, input];

      if (isCorrect) {
        const score = scoreQuestionTreeRound(treeState.askedIds, true);
        setTreeState(prev =>
          prev ? { ...prev, guesses: newGuesses, status: 'won', score } : null
        );
      } else {
        setTreeState(prev =>
          prev ? { ...prev, guesses: newGuesses, status: 'lost', score: 0 } : null
        );
      }
    },
    [treeState, resolvePuzzleByName]
  );

  const resetQuestionTree = useCallback(() => setTreeState(null), []);

  const questionsRemainingCount = useMemo(() => {
    if (!treeState) return 0;
    const term = treeState.puzzle.fullName.toLowerCase();
    // "Players remaining" narrowing counter: how many pool entries still
    // share every answered attribute in common with the secret club, purely
    // for the narrowing-the-field visual (does not affect scoring).
    return puzzlePool.filter(candidate => {
      return treeState.askedIds.every(id => {
        const q = getClubQuestion(id);
        return q.answer(candidate) === q.answer(treeState.puzzle) || candidate.fullName.toLowerCase() === term;
      });
    }).length;
  }, [treeState, puzzlePool]);

  useGameCompletion(
    'guess-soccer-club-questions',
    treeState?.status === 'won' || treeState?.status === 'lost',
    treeState?.score ?? 0
  );

  return {
    gameState,
    startGame,
    makeGuess,
    giveUp,
    resetGame,
    maxClues: MAX_CLUES,
    pointsForCurrentClue,
    allClubNames,
    isLoadingPool,
    // Question-tree mode
    treeState,
    startQuestionTree,
    askQuestion,
    guessClubInTree,
    resetQuestionTree,
    questionsRemainingCount,
  };
}
