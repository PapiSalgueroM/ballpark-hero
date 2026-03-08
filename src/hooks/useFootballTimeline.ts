import { useState, useMemo, useCallback } from 'react';
import { timelinePuzzles, TimelinePlayer } from '@/data/timelinePlayers';

function getDailyIndex(): number {
  const now = new Date();
  const start = new Date('2026-01-01');
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.abs(diffDays) % timelinePuzzles.length;
}

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
  const puzzle = useMemo(() => timelinePuzzles[getDailyIndex()], []);
  const storageKey = `ft-daily-${puzzle.id}`;

  const [order, setOrder] = useState<TimelinePlayer[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.order) return parsed.order;
      } catch { /* ignore */ }
    }
    // Shuffle but ensure it's not already correct
    let shuffled = shuffle(puzzle.players);
    const sorted = [...puzzle.players].sort((a, b) => a.draftYear - b.draftYear);
    while (shuffled.every((p, i) => p.name === sorted[i].name)) {
      shuffled = shuffle(puzzle.players);
    }
    return shuffled;
  });

  const [status, setStatus] = useState<TimelineStatus>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.status) return parsed.status;
      } catch { /* ignore */ }
    }
    return 'playing';
  });

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
    localStorage.setItem(storageKey, JSON.stringify({ order, status: 'submitted' }));
  }, [status, order, storageKey]);

  // Save order changes
  const saveOrder = useCallback(() => {
    if (status === 'playing') {
      localStorage.setItem(storageKey, JSON.stringify({ order, status }));
    }
  }, [order, status, storageKey]);

  return {
    puzzle,
    order,
    setOrder,
    movePlayer,
    status,
    submit,
    score,
    correctOrder,
    saveOrder,
  };
}
