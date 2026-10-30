/**
 * Round 1601: the page's stack of cards (a club page, one of my men, a man of another club). Statically imported by
 * the page, so it is kept small: the links and the host hold live in CmCardLink.tsx (imported only by the lazy
 * hosts), and the card screen and its reader are lazy.
 *
 * Opening pushes, Back pops one, a card already in the stack is popped back to rather than pushed twice, and the
 * stack holds at most six. Every push records the scroll of the view it was opened from and Back puts it back, so
 * Back lands where the thumb was. `pushes` moves on a push only: the page's reveal is keyed on it, so it runs when
 * a card opens and never fights the restore on the way back (the club page's Back used to reveal the panel; it now
 * returns to where you were).
 *
 */
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CardRef } from '@/lib/clubManagerCards';

export type CmCard = CardRef | { k: 'club'; club: string };

export interface CmCardsApi {
  top: CmCard | null;
  pushes: number;
  open: (card: CmCard) => void;
  back: () => void;
  reset: () => void;
}

const DEEP = 6;
const same = (a: CmCard, b: CmCard): boolean => JSON.stringify(a) === JSON.stringify(b);

const Cards = createContext<CmCardsApi | null>(null);

export function CmCardsProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<{ card: CmCard; y: number }[]>([]);
  const [pushes, setPushes] = useState(0);
  const restore = useRef<number | null>(null);
  const open = useCallback((card: CmCard) => {
    const y = typeof window === 'undefined' ? 0 : window.scrollY;
    setStack(prev => {
      const at = prev.findIndex(e => same(e.card, card));
      if (at >= 0) return prev.slice(0, at + 1);
      if (prev.length >= DEEP) return [...prev.slice(0, -1), { card, y: prev[prev.length - 1].y }];
      return [...prev, { card, y }];
    });
    setPushes(n => n + 1);
  }, []);
  const back = useCallback(() => {
    setStack(prev => {
      if (!prev.length) return prev;
      restore.current = prev[prev.length - 1].y;
      return prev.slice(0, -1);
    });
  }, []);
  const reset = useCallback(() => setStack([]), []);
  /* After the view under the popped card has drawn: back to where it was. */
  useLayoutEffect(() => {
    if (restore.current === null || typeof window === 'undefined') return;
    const y = restore.current;
    restore.current = null;
    window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
  }, [stack]);
  const api = useMemo<CmCardsApi>(() => ({ top: stack.length ? stack[stack.length - 1].card : null, pushes, open, back, reset }), [stack, pushes, open, back, reset]);
  return <Cards.Provider value={api}>{children}</Cards.Provider>;
}

export function useCmCards(): CmCardsApi | null {
  return useContext(Cards);
}
