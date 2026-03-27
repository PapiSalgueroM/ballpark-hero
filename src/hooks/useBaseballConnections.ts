import { useState, useMemo, useCallback } from 'react';
import { baseballConnectionsPuzzles } from '@/data/baseballConnectionsPuzzles';
import { useGameCompletion } from '@/hooks/useGameCompletion';

function isValidBBPuzzle(p: { groups: { players: string[] }[] }): boolean {
  const all = p.groups.flatMap((g) => g.players);
  const unique = new Set(all);
  const expectedPerGroup = p.groups[0]?.players.length ?? 5;
  return p.groups.length === 4 && p.groups.every((g) => g.players.length === expectedPerGroup) && unique.size === p.groups.length * expectedPerGroup;
}

const validBBPuzzles = baseballConnectionsPuzzles.filter(isValidBBPuzzle);
const fallbackBBPuzzles = validBBPuzzles.length > 0 ? validBBPuzzles : baseballConnectionsPuzzles;

export type BBConnStatus = 'playing' | 'complete';

export interface SolvedGroup {
  theme: string;
  players: string[];
  difficulty: 'yellow' | 'green' | 'blue' | 'purple';
}

export function useBaseballConnections() {
  const puzzle = useMemo(() => fallbackBBPuzzles[Math.floor(Math.random() * fallbackBBPuzzles.length)], []);

  const allPlayers = useMemo(() => {
    const seen = new Set<string>();
    const players = puzzle.groups.flatMap((g) => g.players).filter((p) => {
      if (seen.has(p)) return false;
      seen.add(p);
      return true;
    });
    const seed = puzzle.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const shuffled = [...players];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = (seed * (i + 1) + 13) % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [puzzle]);

  const [selected, setSelected] = useState<string[]>([]);
  const [solvedGroups, setSolvedGroups] = useState<SolvedGroup[]>([]);
  const [lives, setLives] = useState(4);
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

  const togglePlayer = useCallback((name: string) => {
    if (gameStatus !== 'playing') return;
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : prev.length < 5 ? [...prev, name] : prev
    );
  }, [gameStatus]);

  const submitSelection = useCallback(() => {
    if (selected.length !== 5 || gameStatus !== 'playing') return;

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
    } else {
      const newLives = lives - 1;
      setLives(newLives);
      setShakeWrong(true);
      setTimeout(() => setShakeWrong(false), 600);
      if (newLives <= 0) {
        const remaining = puzzle.groups.filter(
          (g) => !solvedGroups.some((s) => s.theme === g.theme)
        );
        const allSolved = [...solvedGroups, ...remaining.map((g) => ({ theme: g.theme, players: g.players, difficulty: g.difficulty }))];
        setSolvedGroups(allSolved);
      }
    }
  }, [selected, gameStatus, puzzle.groups, solvedGroups, lives]);

  const deselectAll = useCallback(() => setSelected([]), []);

  const completionScore = gameStatus === 'complete' ? (lives * 250) : 0;
  useGameCompletion('baseball-connections', gameStatus === 'complete', completionScore);

  return {
    puzzle, remainingPlayers, selected, togglePlayer, submitSelection,
    deselectAll, solvedGroups, lives, gameStatus, shakeWrong,
  };
}
