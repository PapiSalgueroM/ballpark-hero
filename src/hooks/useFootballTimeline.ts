import { dailyIndex, getTodayET } from '@/lib/dateUtils';
import { useState, useMemo, useCallback, useRef } from 'react';
import { timelinePuzzles, TimelinePlayer, TimelinePuzzle } from '@/data/timelinePlayers';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { readDailyRecord, writeDailyRecord } from '@/lib/dailyRecord';

const SLUG = 'football-timeline';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Round 645 part three: today's locked in order, or null. The daily never
   locked: a refresh dealt the same five again, now with every draft year
   already seen, and every lock in recorded another completion. The record
   is the order as names, on the Round 428 helper, and it must be exactly
   today's five, each once, or the page deals a fresh daily. */
function readLockedOrder(today: string, puzzle: TimelinePuzzle): TimelinePlayer[] | null {
  return readDailyRecord<TimelinePlayer[]>(SLUG, today, f => {
    const names = f.order;
    if (!Array.isArray(names) || names.length !== puzzle.players.length) return null;
    const out: TimelinePlayer[] = [];
    for (const n of names) {
      const p = puzzle.players.find(x => x.name === n);
      if (!p || out.includes(p)) return null;
      out.push(p);
    }
    return out;
  });
}

export type TimelineStatus = 'playing' | 'submitted';

export function useFootballTimeline() {
  /* Round 428's rule: the day is pinned at mount, and the puzzle, the record
     and its key all read this one value. */
  const todayStr = useRef(getTodayET()).current;
  const puzzle = useMemo(() => {
    /* ROUND 366: three faults in two lines. The date was UTC, so the day rolled
       at 8pm ET rather than midnight; the seed was the SUM of the date string's
       character codes, which is order independent and takes only 19 distinct
       values across a whole year (486 to 504), skewing the fifteen puzzles
       about three to one; and that 19 value ceiling means any pool grown past
       19 would leave puzzles permanently unreachable. dailyIndex fixes all
       three at once. */
    return timelinePuzzles[dailyIndex(todayStr, timelinePuzzles.length)];
  }, [todayStr]);

  /* Restored in the initializers, so the recorder never sees a transition. */
  const [locked] = useState(() => readLockedOrder(todayStr, puzzle));

  const [order, setOrder] = useState<TimelinePlayer[]>(() => {
    if (locked) return locked;
    let shuffled = shuffle(puzzle.players);
    const sorted = [...puzzle.players].sort((a, b) => a.draftYear - b.draftYear);
    while (shuffled.every((p, i) => p.name === sorted[i].name)) {
      shuffled = shuffle(puzzle.players);
    }
    return shuffled;
  });

  const [status, setStatus] = useState<TimelineStatus>(locked ? 'submitted' : 'playing');

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
    writeDailyRecord(SLUG, todayStr, { order: order.map(p => p.name) });
    setStatus('submitted');
  }, [status, order, todayStr]);

  const saveOrder = useCallback(() => {}, []);

  useGameCompletion('football-timeline', status === 'submitted', score * 100);

  return { puzzle, order, setOrder, movePlayer, status, submit, score, correctOrder, saveOrder };
}
