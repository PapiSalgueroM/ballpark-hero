import { dailyIndex, getTodayET, shuffledRange } from '@/lib/dateUtils';
import { useState, useMemo, useCallback } from 'react';
import { timelinePuzzles, TimelinePlayer } from '@/data/timelinePlayers';
import { useGameCompletion } from '@/hooks/useGameCompletion';

export type TimelineStatus = 'playing' | 'submitted';

export function useFootballTimeline() {
  const today = useMemo(() => getTodayET(), []);
  const puzzle = useMemo(() => {
    /* ROUND 366: three faults in two lines. The date was UTC, so the day rolled
       at 8pm ET rather than midnight; the seed was the SUM of the date string's
       character codes, which is order independent and takes only 19 distinct
       values across a whole year (486 to 504), skewing the fifteen puzzles
       about three to one; and that 19 value ceiling means any pool grown past
       19 would leave puzzles permanently unreachable. dailyIndex fixes all
       three at once. */
    return timelinePuzzles[dailyIndex(today, timelinePuzzles.length)];
  }, [today]);

  const [order, setOrder] = useState<TimelinePlayer[]>(() => {
    const shuffled = shuffledRange(
      puzzle.players.length,
      `football-timeline:${today}:${puzzle.id}`
    ).map(index => puzzle.players[index]);
    const sorted = [...puzzle.players].sort((a, b) => a.draftYear - b.draftYear);
    if (shuffled.every((p, i) => p.name === sorted[i].name)) {
      [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
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
