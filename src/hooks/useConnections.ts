import { useState, useMemo, useCallback, useEffect } from 'react';
import { connectionsPuzzles } from '@/data/connectionsPuzzles';
import type { ConnectionGroup, ConnectionDifficulty } from '@/types/connections';

export function useConnections() {
  const [puzzleIndex, setPuzzleIndex] = useState(() => Math.floor(Math.random() * connectionsPuzzles.length));
  const [streak, setStreak] = useState(() => {
    const saved = localStorage.getItem('connections-streak');
    return saved ? parseInt(saved, 10) : 0;
  });

  const puzzle = useMemo(() => connectionsPuzzles[puzzleIndex % connectionsPuzzles.length], [puzzleIndex]);

  const allPlayers = useMemo(() => {
    const players = puzzle.groups.flatMap((g) => g.players);
    const seed = puzzle.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return players
      .map((p, i) => ({ p, sort: Math.sin(seed * (i + 1)) }))
      .sort((a, b) => a.sort - b.sort)
      .map((x) => x.p);
  }, [puzzle]);

  const [selected, setSelected] = useState<string[]>([]);
  const [solvedGroups, setSolvedGroups] = useState<ConnectionGroup[]>([]);
  const [lives, setLives] = useState(4);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintCategories, setHintCategories] = useState<string[]>([]);
  const [lastIncorrect, setLastIncorrect] = useState<string[] | null>(null);
  const [oneAway, setOneAway] = useState(false);

  const gameStatus = useMemo(() => {
    if (solvedGroups.length === 4) return 'won' as const;
    if (lives <= 0) return 'lost' as const;
    return 'playing' as const;
  }, [solvedGroups, lives]);

  // Update streak when game ends
  useEffect(() => {
    if (gameStatus === 'won') {
      setStreak((prev) => {
        const next = prev + 1;
        localStorage.setItem('connections-streak', String(next));
        return next;
      });
    } else if (gameStatus === 'lost') {
      setStreak(0);
      localStorage.setItem('connections-streak', '0');
    }
  }, [gameStatus]);

  const [shuffleKey, setShuffleKey] = useState(0);

  const remainingPlayers = useMemo(() => {
    const solved = new Set(solvedGroups.flatMap((g) => g.players));
    const remaining = allPlayers.filter((p) => !solved.has(p));
    if (shuffleKey === 0) return remaining;
    // Fisher-Yates shuffle using shuffleKey as seed
    const arr = [...remaining];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.abs(Math.sin(shuffleKey * (i + 1) * 9301 + 49297) * 233280) % (i + 1) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [allPlayers, solvedGroups, shuffleKey]);

  const shufflePlayers = useCallback(() => {
    setShuffleKey((prev) => prev + 1);
  }, []);

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
    [gameStatus]
  );

  const submitGuess = useCallback(() => {
    if (selected.length !== 4 || gameStatus !== 'playing') return;

    const match = puzzle.groups.find(
      (g) =>
        !solvedGroups.includes(g) &&
        selected.every((p) => g.players.includes(p)) &&
        g.players.every((p) => selected.includes(p))
    );

    if (match) {
      setSolvedGroups((prev) => [...prev, match]);
      setSelected([]);
      setLastIncorrect(null);
    } else {
      const isOneAway = puzzle.groups.some(
        (g) =>
          !solvedGroups.includes(g) &&
          selected.filter((p) => g.players.includes(p)).length === 3
      );
      setOneAway(isOneAway);
      setLives((prev) => prev - 1);
      setLastIncorrect([...selected]);
      setSelected([]);
    }
  }, [selected, puzzle, solvedGroups, gameStatus]);

  const useHint = useCallback(() => {
    if (hintsUsed >= 4 || gameStatus !== 'playing') return;
    const difficultyOrder: ConnectionDifficulty[] = ['easy', 'medium', 'hard', 'insane'];
    const unsolved = puzzle.groups.filter((g) => !solvedGroups.includes(g));
    unsolved.sort(
      (a, b) => difficultyOrder.indexOf(a.difficulty) - difficultyOrder.indexOf(b.difficulty)
    );
    const unhinted = unsolved.filter((g) => !hintCategories.includes(g.category));
    if (unhinted.length > 0) {
      setHintCategories((prev) => [...prev, unhinted[0].category]);
      setHintsUsed((prev) => prev + 1);
    }
  }, [hintsUsed, puzzle, solvedGroups, gameStatus, hintCategories]);

  const resetState = useCallback(() => {
    setSelected([]);
    setSolvedGroups([]);
    setLives(4);
    setHintsUsed(0);
    setHintCategories([]);
    setLastIncorrect(null);
    setOneAway(false);
    setShuffleKey(0);
  }, []);

  const resetGame = useCallback(() => {
    resetState();
  }, [resetState]);

  const nextPuzzle = useCallback(() => {
    resetState();
    setPuzzleIndex((prev) => prev + 1);
  }, [resetState]);

  const totalPuzzles = connectionsPuzzles.length;

  return {
    puzzle,
    puzzleIndex,
    totalPuzzles,
    streak,
    selected,
    solvedGroups,
    lives,
    gameStatus,
    remainingPlayers,
    hintsUsed,
    hintCategories,
    lastIncorrect,
    oneAway,
    togglePlayer,
    submitGuess,
    useHint,
    shufflePlayers,
    resetGame,
    nextPuzzle,
  };
}
