import { useState, useMemo, useCallback } from 'react';
import { baseballConnectionsPuzzles } from '@/data/baseballConnectionsPuzzles';

function getDailyIndex(): number {
  const now = new Date();
  const start = new Date('2026-01-01');
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.abs(diffDays) % baseballConnectionsPuzzles.length;
}

export type BBConnStatus = 'playing' | 'complete';

export interface SolvedGroup {
  theme: string;
  players: string[];
  difficulty: 'yellow' | 'green' | 'blue' | 'purple';
}

export function useBaseballConnections() {
  const puzzle = useMemo(() => baseballConnectionsPuzzles[getDailyIndex()], []);
  const storageKey = `bbconn-daily-${puzzle.id}`;

  // Flatten and shuffle all players
  const allPlayers = useMemo(() => {
    const players = puzzle.groups.flatMap((g) => g.players);
    // Deterministic daily shuffle using puzzle id
    const seed = puzzle.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const shuffled = [...players];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = (seed * (i + 1) + 13) % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [puzzle]);

  const [selected, setSelected] = useState<string[]>([]);
  const [solvedGroups, setSolvedGroups] = useState<SolvedGroup[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { return JSON.parse(saved).solved ?? []; } catch { /* */ }
    }
    return [];
  });
  const [lives, setLives] = useState<number>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { return JSON.parse(saved).lives ?? 4; } catch { /* */ }
    }
    return 4;
  });
  const [shakeWrong, setShakeWrong] = useState(false);

  const solvedPlayerNames = useMemo(
    () => new Set(solvedGroups.flatMap((g) => g.players)),
    [solvedGroups]
  );

  const remainingPlayers = useMemo(
    () => allPlayers.filter((p) => !solvedPlayerNames.has(p)),
    [allPlayers, solvedPlayerNames]
  );

  const gameStatus: BBConnStatus =
    solvedGroups.length === puzzle.groups.length || lives <= 0 ? 'complete' : 'playing';

  const save = useCallback((solved: SolvedGroup[], l: number) => {
    localStorage.setItem(storageKey, JSON.stringify({ solved, lives: l }));
  }, [storageKey]);

  const togglePlayer = useCallback((name: string) => {
    if (gameStatus !== 'playing') return;
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : prev.length < 5 ? [...prev, name] : prev
    );
  }, [gameStatus]);

  const submitSelection = useCallback(() => {
    if (selected.length !== 5 || gameStatus !== 'playing') return;

    // Check if selected matches any unsolved group
    const match = puzzle.groups.find(
      (g) =>
        !solvedGroups.some((s) => s.theme === g.theme) &&
        g.players.length === 5 &&
        selected.every((p) => g.players.includes(p)) &&
        g.players.every((p) => selected.includes(p))
    );

    if (match) {
      const newSolved = [...solvedGroups, { theme: match.theme, players: match.players, difficulty: match.difficulty }];
      setSolvedGroups(newSolved);
      setSelected([]);
      save(newSolved, lives);
    } else {
      const newLives = lives - 1;
      setLives(newLives);
      setShakeWrong(true);
      setTimeout(() => setShakeWrong(false), 600);
      save(solvedGroups, newLives);
      if (newLives <= 0) {
        // Reveal all remaining groups
        const remaining = puzzle.groups.filter(
          (g) => !solvedGroups.some((s) => s.theme === g.theme)
        );
        const allSolved = [...solvedGroups, ...remaining.map((g) => ({ theme: g.theme, players: g.players, difficulty: g.difficulty }))];
        setSolvedGroups(allSolved);
        save(allSolved, 0);
      }
    }
  }, [selected, gameStatus, puzzle.groups, solvedGroups, lives, save]);

  const deselectAll = useCallback(() => setSelected([]), []);

  return {
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
  };
}
