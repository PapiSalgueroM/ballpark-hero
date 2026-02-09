import { useState, useMemo, useCallback } from 'react';
import { connectionsPuzzles } from '@/data/connectionsPuzzles';
import { ConnectionGroup, ConnectionDifficulty } from '@/types/connections';

function getDailyPuzzleIndex(): number {
  const start = new Date('2026-02-09').getTime();
  const now = new Date().setHours(0, 0, 0, 0);
  const dayIndex = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  return Math.abs(dayIndex) % connectionsPuzzles.length;
}

export function useConnections() {
  const puzzle = useMemo(() => connectionsPuzzles[getDailyPuzzleIndex()], []);

  const allPlayers = useMemo(() => {
    const players = puzzle.groups.flatMap((g) => g.players);
    // Deterministic shuffle based on puzzle id
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

  const gameStatus = useMemo(() => {
    if (solvedGroups.length === 4) return 'won' as const;
    if (lives <= 0) return 'lost' as const;
    return 'playing' as const;
  }, [solvedGroups, lives]);

  const remainingPlayers = useMemo(() => {
    const solved = new Set(solvedGroups.flatMap((g) => g.players));
    return allPlayers.filter((p) => !solved.has(p));
  }, [allPlayers, solvedGroups]);

  const togglePlayer = useCallback(
    (player: string) => {
      if (gameStatus !== 'playing') return;
      setLastIncorrect(null);
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
    // Reveal the next unsolved category (skip already hinted ones)
    const unhinted = unsolved.filter((g) => !hintCategories.includes(g.category));
    if (unhinted.length > 0) {
      setHintCategories((prev) => [...prev, unhinted[0].category]);
      setHintsUsed((prev) => prev + 1);
    }
  }, [hintsUsed, puzzle, solvedGroups, gameStatus, hintCategories]);

  const resetGame = useCallback(() => {
    setSelected([]);
    setSolvedGroups([]);
    setLives(4);
    setHintsUsed(0);
    setHintCategories([]);
    setLastIncorrect(null);
  }, []);

  return {
    puzzle,
    selected,
    solvedGroups,
    lives,
    gameStatus,
    remainingPlayers,
    hintsUsed,
    hintCategories,
    lastIncorrect,
    togglePlayer,
    submitGuess,
    useHint,
    resetGame,
  };
}
