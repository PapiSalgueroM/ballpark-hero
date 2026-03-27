import { useState, useMemo, useCallback } from 'react';
import { timelinePuzzles, TimelinePlayer } from '@/data/timelinePlayers';
import { useGameCompletion } from '@/hooks/useGameCompletion';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type TimelineStatus = 'playing' | 'submitted';

export function useFootballTimeline() {
  const puzzle = useMemo(() => timelinePuzzles[Math.floor(Math.random() * timelinePuzzles.length)], []);

  const [order, setOrder] = useState<TimelinePlayer[]>(() => {
    let shuffled = shuffle(puzzle.players);
    const sorted = [...puzzle.players].sort((a, b) => a.draftYear - b.draftYear);
    while (shuffled.every((p, i) => p.name === sorted[i].name)) {
      shuffled = shuffle(puzzle.players);
    }
    return shuffled;
  });

  const [status, setStatus] = useState<TimelineStatus>('playing');

  const correctOrder = useMemo(
    () => [...puzzle.players].sort((a, b) => a.draftYear - b.draftYear),
    [puzzle]
  );

  const score = useMemo(() => {
    if (status !== 'submitted') return 0;
    return order.reduce((acc, p, i) => (p.name === correctOrder[i].name ? acc + 1 : acc), 0);
  }, [status, order, correctOrder]);

  const movePlayer = useCallback((fromIndex: number, toIndex: number) => {
    if (status !== 'playing') return;
    setOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, [status]);

  const submit = useCallback(() => {
    if (status !== 'playing') return;
    setStatus('submitted');
  }, [status]);

  const saveOrder = useCallback(() => {}, []);

  useGameCompletion('football-timeline', status === 'submitted', score * 100);

  return { puzzle, order, setOrder, movePlayer, status, submit, score, correctOrder, saveOrder };
}
