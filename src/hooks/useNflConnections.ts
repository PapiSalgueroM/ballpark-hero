import { useState, useMemo, useCallback, useEffect } from 'react';
import { nflConnectionsPuzzles } from '@/data/nflConnectionsPuzzles';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { fetchNflConnectionsPuzzles } from '@/lib/fetchNflConnectionsPuzzles';
import { dailyIndex, getTodayET } from '@/lib/dateUtils';

/**
 * NFL Connections, direct port of useNbaConnections (task #26).
 * Keep the connections hooks in lockstep if the mechanic changes.
 */
function isValidNflPuzzle(p: { groups: { players: string[] }[] }): boolean {
  const all = p.groups.flatMap((g) => g.players);
  const unique = new Set(all);
  const expectedPerGroup = p.groups[0]?.players.length ?? 5;
  return p.groups.length === 4 && p.groups.every((g) => g.players.length === expectedPerGroup) && unique.size === p.groups.length * expectedPerGroup;
}

const validNflPuzzles = nflConnectionsPuzzles.filter(isValidNflPuzzle);
const fallbackNflPuzzles = validNflPuzzles.length > 0 ? validNflPuzzles : nflConnectionsPuzzles;

export type NflConnStatus = 'playing' | 'complete';

export type NflConnMode = 'daily' | 'unlimited';

export interface SolvedGroup {
  theme: string;
  players: string[];
  difficulty: 'yellow' | 'green' | 'blue' | 'purple';
}

// Action events stored in the daily action log
type NflConnAction =
  | { t: 'ok'; theme: string; players: string[]; diff: 'yellow' | 'green' | 'blue' | 'purple' }
  | { t: 'x' };

type Puzzle = (typeof fallbackNflPuzzles)[number];

function shufflePlayers(players: string[], seed: number): string[] {
  const shuffled = [...players];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = (seed * (i + 1) + 13) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function useNflConnections() {
  // ---- MODE ----------------------------------------------------------------
  const [mode, setMode] = useState<NflConnMode>('daily');

  // ---- SUPABASE POOL -------------------------------------------------------
  // Cloud is source of truth (nfl_connections_puzzles); the hardcoded
  // fallbackNflPuzzles is the offline/error fallback. Mirrors useConnections.
  const [puzzlePool, setPuzzlePool] = useState<Puzzle[]>(fallbackNflPuzzles);
  const [isLoadingPool, setIsLoadingPool] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchNflConnectionsPuzzles().then((pool) => {
      if (cancelled) return;
      if (pool.length > 0) setPuzzlePool(pool as Puzzle[]);
      setIsLoadingPool(false);
    });
    return () => { cancelled = true; };
  }, []);

  const todaysPuzzle = useMemo(
    () => (puzzlePool.length > 0 ? puzzlePool[dailyIndex(getTodayET(), puzzlePool.length)] : null),
    [puzzlePool],
  );

  // ---- DAILY ---------------------------------------------------------------
  const {
    puzzle: dailyPuzzle,
    guesses: dailyActions,
    addGuess: addDailyAction,
    gameStatus: rawDailyStatus,
    isLoading,
    reset: resetDailyHook,
  } = useDailyPuzzle<Puzzle, NflConnAction>({
    gameSlug: 'nfl-connections',
    puzzles: fallbackNflPuzzles,
    supabasePuzzle: todaysPuzzle,
    getPuzzleId: (p) => p.id,
    maxGuesses: 999, // ends via isWon / isLost only
    isWon: (g, puzzle) => g.filter(a => a.t === 'ok').length >= puzzle.groups.length,
    isLost: (g) => 4 - g.filter(a => a.t === 'x').length <= 0,
    deserializeGuesses: (raw) => raw as NflConnAction[],
  });

  // Derived daily state
  const dailySolvedGroups: SolvedGroup[] = dailyActions
    .filter((a): a is Extract<NflConnAction, { t: 'ok' }> => a.t === 'ok')
    .map(a => ({ theme: a.theme, players: a.players, difficulty: a.diff }));
  const dailyLives = 4 - dailyActions.filter(a => a.t === 'x').length;

  // Auto-reveal remaining groups when lives hit 0 (mirrors original behavior)
  const dailySolvedGroupsFinal = useMemo(() => {
    if (dailyLives > 0 || !dailyPuzzle) return dailySolvedGroups;
    const remaining = dailyPuzzle.groups.filter(
      g => !dailySolvedGroups.some(s => s.theme === g.theme)
    );
    return [
      ...dailySolvedGroups,
      ...remaining.map(g => ({ theme: g.theme, players: g.players, difficulty: g.difficulty })),
    ];
  }, [dailyLives, dailySolvedGroups, dailyPuzzle]);

  // ---- UNLIMITED -----------------------------------------------------------
  const [unlimitedIndex, setUnlimitedIndex] = useState(
    () => Math.floor(Math.random() * fallbackNflPuzzles.length)
  );
  const unlimitedPuzzle = puzzlePool[unlimitedIndex % puzzlePool.length];
  const [unlimitedSolvedGroups, setUnlimitedSolvedGroups] = useState<SolvedGroup[]>([]);
  const [unlimitedLives, setUnlimitedLives] = useState(4);

  // ---- ACTIVE VALUES -------------------------------------------------------
  const puzzle       = mode === 'daily' ? dailyPuzzle : unlimitedPuzzle;
  const solvedGroups = mode === 'daily' ? dailySolvedGroupsFinal : unlimitedSolvedGroups;
  const lives        = mode === 'daily' ? dailyLives : unlimitedLives;
  const gameStatus: NflConnStatus = mode === 'daily'
    ? (rawDailyStatus !== 'playing' ? 'complete' : 'playing')
    : (unlimitedSolvedGroups.length === unlimitedPuzzle.groups.length || unlimitedLives <= 0 ? 'complete' : 'playing');

  // ---- SHUFFLED PLAYERS (deterministic by puzzle.id) ----------------------
  const allPlayers = useMemo(() => {
    if (!puzzle) return [];
    const seen = new Set<string>();
    const players = puzzle.groups.flatMap(g => g.players).filter(p => {
      if (seen.has(p)) return false;
      seen.add(p);
      return true;
    });
    const seed = puzzle.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return shufflePlayers(players, seed);
  }, [puzzle]);

  const solvedPlayerNames = useMemo(
    () => new Set(solvedGroups.flatMap(g => g.players)),
    [solvedGroups]
  );

  const remainingPlayers = useMemo(
    () => allPlayers.filter(p => !solvedPlayerNames.has(p)),
    [allPlayers, solvedPlayerNames]
  );

  // ---- SHARED LOCAL STATE --------------------------------------------------
  const [selected, setSelected] = useState<string[]>([]);
  const [shakeWrong, setShakeWrong] = useState(false);

  // ---- CALLBACKS -----------------------------------------------------------
  const switchMode = useCallback((newMode: NflConnMode) => {
    setMode(newMode);
    setSelected([]);
  }, []);

  const togglePlayer = useCallback((name: string) => {
    if (gameStatus !== 'playing') return;
    setSelected(prev =>
      prev.includes(name) ? prev.filter(p => p !== name) : prev.length < 5 ? [...prev, name] : prev
    );
  }, [gameStatus]);

  const submitSelection = useCallback(() => {
    if (selected.length !== 5 || gameStatus !== 'playing' || !puzzle) return;

    const match = puzzle.groups.find(g =>
      !solvedGroups.some(s => s.theme === g.theme) &&
      g.players.length === 5 &&
      selected.every(p => g.players.includes(p)) &&
      g.players.every(p => selected.includes(p))
    );

    if (match) {
      if (mode === 'daily') {
        addDailyAction({ t: 'ok', theme: match.theme, players: match.players, diff: match.difficulty });
      } else {
        setUnlimitedSolvedGroups(prev => [...prev, { theme: match.theme, players: match.players, difficulty: match.difficulty }]);
      }
      setSelected([]);
    } else {
      if (mode === 'daily') {
        addDailyAction({ t: 'x' });
      } else {
        const newLives = unlimitedLives - 1;
        setUnlimitedLives(newLives);
        if (newLives <= 0) {
          const remaining = puzzle.groups.filter(g => !unlimitedSolvedGroups.some(s => s.theme === g.theme));
          setUnlimitedSolvedGroups(prev => [
            ...prev,
            ...remaining.map(g => ({ theme: g.theme, players: g.players, difficulty: g.difficulty })),
          ]);
        }
      }
      setShakeWrong(true);
      setTimeout(() => setShakeWrong(false), 600);
    }
  }, [mode, selected, gameStatus, puzzle, solvedGroups, unlimitedLives, unlimitedSolvedGroups, addDailyAction]);

  const deselectAll = useCallback(() => setSelected([]), []);

  const resetGame = useCallback(() => {
    if (mode === 'daily') {
      resetDailyHook();
    } else {
      setUnlimitedIndex(Math.floor(Math.random() * puzzlePool.length));
      setUnlimitedSolvedGroups([]);
      setUnlimitedLives(4);
    }
    setSelected([]);
  }, [mode, resetDailyHook, puzzlePool]);

  // ---- COMPLETION ----------------------------------------------------------
  const dailyWon = rawDailyStatus === 'won';
  const completionScore = dailyWon ? (dailyLives * 250) : 0;
  useGameCompletion('nfl-connections', rawDailyStatus !== 'playing', completionScore);

  return {
    mode,
    switchMode,
    puzzle,
    remainingPlayers,
    selected,
    togglePlayer,
    submitSelection,
    deselectAll,
    solvedGroups,
    lives,
    gameStatus,
    shakeWrong,
    resetGame,
    isLoading: mode === 'daily' ? isLoading : false,
    isLoadingPool,
  };
}
