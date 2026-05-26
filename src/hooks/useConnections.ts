import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { connectionsPuzzles } from '@/data/connectionsPuzzles';
import type { ConnectionGroup, ConnectionDifficulty } from '@/types/connections';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { fetchConnectionsPuzzles } from '@/lib/fetchConnectionsPuzzles';
import { dateSeed, getTodayET } from '@/lib/dateUtils';

function isValidPuzzle(p: { groups: { players: string[] }[] }): boolean {
  const all = p.groups.flatMap((g) => g.players);
  const unique = new Set(all);
  return p.groups.length === 4 && p.groups.every((g) => g.players.length === 4) && unique.size === 16;
}

const validConnectionsPuzzles = connectionsPuzzles.filter(isValidPuzzle);
const fallbackPuzzles = validConnectionsPuzzles.length > 0 ? validConnectionsPuzzles : connectionsPuzzles;

export type ConnectionsMode = 'daily' | 'unlimited';

type ConnAction =
  | { t: 'ok'; cat: string }
  | { t: 'x' }
  | { t: 'hint'; cat: string }
  | { t: 'give' };

// Stable seeded shuffle of puzzle players (same result for same puzzle id)
function seedShuffle(players: string[], seed: number): string[] {
  return players
    .map((p, i) => ({ p, sort: Math.sin(seed * (i + 1)) }))
    .sort((a, b) => a.sort - b.sort)
    .map((x) => x.p);
}

export function useConnections() {
  const [mode, setMode] = useState<ConnectionsMode>('daily');
  const switchMode = useCallback((m: ConnectionsMode) => setMode(m), []);

  // ── Supabase puzzle pool ───────────────────────────────────────────────────
  const [puzzlePool, setPuzzlePool] = useState(fallbackPuzzles);
  const [isLoadingPool, setIsLoadingPool] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchConnectionsPuzzles().then((pool) => {
      if (cancelled) return;
      if (pool.length > 0) setPuzzlePool(pool as typeof fallbackPuzzles);
      setIsLoadingPool(false);
    });
    return () => { cancelled = true; };
  }, []);

  const todaysPuzzle = useMemo(() => {
    const seed = dateSeed(getTodayET());
    return puzzlePool.length > 0 ? puzzlePool[seed % puzzlePool.length] : null;
  }, [puzzlePool]);

  // ── Daily ──────────────────────────────────────────────────────────────────
  const {
    puzzle: dailyPuzzle,
    guesses: dailyActions,
    addGuess: addDailyAction,
    gameStatus: rawDailyStatus,
    isLoading,
  } = useDailyPuzzle<(typeof fallbackPuzzles)[0], ConnAction>({
    gameSlug: 'connections',
    // connectionsPuzzles is the stable module-level ref required by useDailyPuzzle's
    // dep array (puzzles is intentionally excluded from its useMemo deps). The actual
    // puzzle selection comes from supabasePuzzle below — this is just the fallback pool.
    puzzles: fallbackPuzzles,
    supabasePuzzle: todaysPuzzle,
    getPuzzleId: (p) => p.id,
    maxGuesses: 999,
    isWon: (g, puzzle) => g.filter((a) => a.t === 'ok').length >= puzzle.groups.length,
    isLost: (g) =>
      g.some((a) => a.t === 'give') || 4 - g.filter((a) => a.t === 'x').length <= 0,
    deserializeGuesses: (raw) => raw as ConnAction[],
  });

  const dailySolvedGroups = useMemo<ConnectionGroup[]>(() => {
    if (!dailyPuzzle) return [];
    return dailyActions
      .filter((a): a is { t: 'ok'; cat: string } => a.t === 'ok')
      .map((a) => dailyPuzzle.groups.find((g) => g.category === a.cat))
      .filter((g): g is ConnectionGroup => g != null);
  }, [dailyActions, dailyPuzzle]);

  const dailyLives = useMemo(() => {
    if (dailyActions.some((a) => a.t === 'give')) return 0;
    return 4 - dailyActions.filter((a) => a.t === 'x').length;
  }, [dailyActions]);

  const dailyHintCats = useMemo(
    () => dailyActions.filter((a): a is { t: 'hint'; cat: string } => a.t === 'hint').map((a) => a.cat),
    [dailyActions],
  );

  // ── Unlimited ──────────────────────────────────────────────────────────────
  const [unlimitedIndex, setUnlimitedIndex] = useState(
    () => Math.floor(Math.random() * puzzlePool.length),
  );
  const [solvedGroupsUnlimited, setSolvedGroupsUnlimited] = useState<ConnectionGroup[]>([]);
  const [livesUnlimited, setLivesUnlimited] = useState(4);
  const [hintsUsedUnlimited, setHintsUsedUnlimited] = useState(0);
  const [hintCategoriesUnlimited, setHintCategoriesUnlimited] = useState<string[]>([]);

  // ── Shared local state (neither persisted nor mode-split) ─────────────────
  const [selected, setSelected] = useState<string[]>([]);
  const [lastIncorrect, setLastIncorrect] = useState<string[] | null>(null);
  const [oneAway, setOneAway] = useState(false);
  const [shuffleKey, setShuffleKey] = useState(0);

  const [streak, setStreak] = useState(() => {
    const saved = localStorage.getItem('connections-streak');
    return saved ? parseInt(saved, 10) : 0;
  });

  // ── Active (mode-dependent) values ────────────────────────────────────────
  const puzzle =
    mode === 'daily'
      ? (dailyPuzzle ?? fallbackPuzzles[0])
      : puzzlePool[unlimitedIndex % puzzlePool.length];

  const activeSolvedGroups = mode === 'daily' ? dailySolvedGroups : solvedGroupsUnlimited;
  const activeLives = mode === 'daily' ? dailyLives : livesUnlimited;
  const activeHintCats = mode === 'daily' ? dailyHintCats : hintCategoriesUnlimited;
  const activeHintsUsed = activeHintCats.length;

  const gameStatus = useMemo(() => {
    if (mode === 'daily') {
      if (rawDailyStatus === 'won') return 'won' as const;
      if (rawDailyStatus === 'lost') return 'lost' as const;
      return 'playing' as const;
    }
    if (solvedGroupsUnlimited.length >= 4) return 'won' as const;
    if (livesUnlimited <= 0) return 'lost' as const;
    return 'playing' as const;
  }, [mode, rawDailyStatus, solvedGroupsUnlimited, livesUnlimited]);

  // Streak: only fire when the user actually plays (wasPlaying guard)
  const wasPlayingRef = useRef(false);
  useEffect(() => {
    if (isLoading) return;
    if (gameStatus === 'playing') { wasPlayingRef.current = true; return; }
    if (!wasPlayingRef.current) return;
    wasPlayingRef.current = false;
    if (gameStatus === 'won') {
      setStreak((prev) => {
        const next = prev + 1;
        localStorage.setItem('connections-streak', String(next));
        return next;
      });
    } else {
      setStreak(0);
      localStorage.setItem('connections-streak', '0');
    }
  }, [gameStatus, isLoading]);

  const allPlayers = useMemo(() => {
    const seen = new Set<string>();
    const players = puzzle.groups.flatMap((g) => g.players).filter((p) => {
      if (seen.has(p)) return false;
      seen.add(p);
      return true;
    });
    const seed = puzzle.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return seedShuffle(players, seed);
  }, [puzzle]);

  const remainingPlayers = useMemo(() => {
    const solved = new Set(activeSolvedGroups.flatMap((g) => g.players));
    const remaining = allPlayers.filter((p) => !solved.has(p));
    if (shuffleKey === 0) return remaining;
    const arr = [...remaining];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.abs(Math.sin(shuffleKey * (i + 1) * 9301 + 49297) * 233280) % (i + 1) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [allPlayers, activeSolvedGroups, shuffleKey]);

  const shufflePlayers = useCallback(() => setShuffleKey((k) => k + 1), []);

  const togglePlayer = useCallback(
    (player: string) => {
      if (gameStatus !== 'playing') return;
      setLastIncorrect(null);
      setOneAway(false);
      setSelected((prev) => {
        if (prev.includes(player)) return prev.filter((p) => p !== player);
        if (prev.length >= 4) return prev;
        return [...prev, player];
      });
    },
    [gameStatus],
  );

  const submitGuess = useCallback(() => {
    if (selected.length !== 4 || gameStatus !== 'playing') return;

    const match = puzzle.groups.find(
      (g) =>
        !activeSolvedGroups.includes(g) &&
        selected.every((p) => g.players.includes(p)) &&
        g.players.every((p) => selected.includes(p)),
    );

    if (match) {
      if (mode === 'daily') {
        addDailyAction({ t: 'ok', cat: match.category });
      } else {
        setSolvedGroupsUnlimited((prev) => [...prev, match]);
      }
      setSelected([]);
      setLastIncorrect(null);
    } else {
      const isOneAway = puzzle.groups.some(
        (g) =>
          !activeSolvedGroups.includes(g) &&
          selected.filter((p) => g.players.includes(p)).length === 3,
      );
      setOneAway(isOneAway);
      if (mode === 'daily') {
        addDailyAction({ t: 'x' });
      } else {
        setLivesUnlimited((prev) => prev - 1);
      }
      setLastIncorrect([...selected]);
      setSelected([]);
    }
  }, [mode, selected, puzzle, activeSolvedGroups, gameStatus, addDailyAction]);

  const useHint = useCallback(() => {
    if (activeHintsUsed >= 4 || gameStatus !== 'playing') return;
    const difficultyOrder: ConnectionDifficulty[] = ['easy', 'medium', 'hard', 'insane'];
    const unsolved = puzzle.groups.filter((g) => !activeSolvedGroups.includes(g));
    unsolved.sort((a, b) => difficultyOrder.indexOf(a.difficulty) - difficultyOrder.indexOf(b.difficulty));
    const unhinted = unsolved.filter((g) => !activeHintCats.includes(g.category));
    if (unhinted.length === 0) return;
    const cat = unhinted[0].category;
    if (mode === 'daily') {
      addDailyAction({ t: 'hint', cat });
    } else {
      setHintCategoriesUnlimited((prev) => [...prev, cat]);
      setHintsUsedUnlimited((prev) => prev + 1);
    }
  }, [mode, activeHintsUsed, puzzle, activeSolvedGroups, gameStatus, activeHintCats, addDailyAction]);

  const giveUp = useCallback(() => {
    if (gameStatus !== 'playing') return;
    if (mode === 'daily') {
      addDailyAction({ t: 'give' });
    } else {
      setLivesUnlimited(0);
    }
  }, [mode, gameStatus, addDailyAction]);

  const resetUnlimitedState = useCallback(() => {
    setSelected([]);
    setSolvedGroupsUnlimited([]);
    setLivesUnlimited(4);
    setHintsUsedUnlimited(0);
    setHintCategoriesUnlimited([]);
    setLastIncorrect(null);
    setOneAway(false);
    setShuffleKey(0);
  }, []);

  const resetGame = useCallback(() => {
    if (mode !== 'unlimited') return;
    resetUnlimitedState();
  }, [mode, resetUnlimitedState]);

  const nextPuzzle = useCallback(() => {
    if (mode !== 'unlimited') return;
    resetUnlimitedState();
    setUnlimitedIndex((prev) => prev + 1);
  }, [mode, resetUnlimitedState]);

  const totalPuzzles = puzzlePool.length;
  const completionScore = gameStatus === 'won' ? activeLives * 250 : 0;
  useGameCompletion('connections', rawDailyStatus !== 'playing', completionScore);

  return {
    mode, switchMode,
    puzzle,
    puzzleIndex: unlimitedIndex,
    totalPuzzles,
    streak,
    selected,
    solvedGroups: activeSolvedGroups,
    lives: activeLives,
    gameStatus,
    remainingPlayers,
    hintsUsed: activeHintsUsed,
    hintCategories: activeHintCats,
    lastIncorrect,
    oneAway,
    togglePlayer,
    submitGuess,
    useHint,
    shufflePlayers,
    giveUp,
    resetGame,
    nextPuzzle,
    isLoading,
    isLoadingPool,
  };
}
