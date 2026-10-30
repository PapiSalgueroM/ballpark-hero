/**
 * Round 1601: the name link and the host hold, imported only by the lazy hosts (the leaders boards, the Squad
 * screen, the Stats screen), so the page's first load carries none of it.
 *
 * A host whose own state would be lost while the hub is unmounted (the Stats screen, the Squad screen) wraps what
 * it renders in CmHost; every link inside calls the hold before it opens, so the host files its state for the trip
 * the way WorldCompScreen's resume already does.
 *
 * With no provider above it, a link renders its children untouched, so every existing render is the markup it was.
 */
import { createContext, useContext, type ReactNode } from 'react';
import type { Position } from '@/types/game';
import { useCmCards, type CmCard } from '@/components/club-manager/CmCards';

const keyOf = (c: CmCard): string => (c.k === 'club' ? `club:${c.club}` : c.k === 'mine' ? `mine:${c.id}` : `man:${c.club}|${c.name}|${c.pos}`);
const Hold = createContext<(() => void) | null>(null);

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

/** The link. With no provider (or no card) the children come back untouched; with `only`, nothing is drawn. */
export function CmCardLink({ card, className, children, only = false }: { card: CmCard | null; className?: string; children: ReactNode; only?: boolean }) {
  const cards = useCmCards();
  const hold = useContext(Hold);
  if (!cards || !card) return only ? null : <>{children}</>;
  return (
    <button type="button" data-cm-card-link={keyOf(card)} className={className} onClick={() => { hold?.(); cards.open(card); }}>
      {children}
    </button>
  );
}
