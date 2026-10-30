/**
 * Round 1601: the page's stack of cards (a club page, one of my men, a man of another club), its name link, and
 * the host hold. Statically imported by the page, so it is kept small: the card screen and its reader are lazy.
 *
 * Opening pushes, Back pops one, a card already in the stack is popped back to rather than pushed twice, and the
 * stack holds at most six. Every push records the scroll of the view it was opened from and Back puts it back, so
 * Back lands where the thumb was. `pushes` moves on a push only: the page's reveal is keyed on it, so it runs when
 * a card opens and never fights the restore on the way back (the club page's Back used to reveal the panel; it now
 * returns to where you were).
 *
 * A host whose own state would be lost while the hub is unmounted (the Stats screen, the Squad screen) wraps what
 * it renders in CmHost; every link inside calls the hold before it opens, so the host files its state for the trip
 * the way WorldCompScreen's resume already does.
 *
 * With no provider above it, a link renders its children untouched, so every existing render is the markup it was.
 */
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CardRef } from '@/lib/clubManagerCards';
import type { Position } from '@/types/game';

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
const keyOf = (c: CmCard): string => (c.k === 'club' ? `club:${c.club}` : c.k === 'mine' ? `mine:${c.id}` : `man:${c.club}|${c.name}|${c.pos}`);

const Cards = createContext<CmCardsApi | null>(null);
const Hold = createContext<(() => void) | null>(null);

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

/** A host's hold: called before any link inside opens a card. No DOM node. */
export function CmHost({ hold, children }: { hold: () => void; children: ReactNode }) {
  return <Hold.Provider value={hold}>{children}</Hold.Provider>;
}

/** One of my men from a board row: by name and position in the squad, exactly one match, else no link. */
export function mineCard(squad: readonly { id: string; name: string; position: Position }[], name: string, pos: Position): CmCard | null {
  let found: string | null = null;
  for (const p of squad) {
    if (p.name !== name || p.position !== pos) continue;
    if (found !== null) return null;
    found = p.id;
  }
  return found === null ? null : { k: 'mine', id: found };
}

/** The link. With no provider (or no card) the children come back untouched. */
export function CmCardLink({ card, className, children }: { card: CmCard | null; className?: string; children: ReactNode }) {
  const cards = useContext(Cards);
  const hold = useContext(Hold);
  if (!cards || !card) return <>{children}</>;
  return (
    <button type="button" data-cm-card-link={keyOf(card)} className={className} onClick={() => { hold?.(); cards.open(card); }}>
      {children}
    </button>
  );
}
