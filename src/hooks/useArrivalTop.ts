import { useLayoutEffect, useRef } from 'react';
import { GAP, MIN_LEAD, bottomInset, topInset } from './useRevealScroll';

/* ─── useArrivalTop (Round 1328) ───
   A new screen is a page change, not content revealed under the thumb. Taking a
   Club Manager job used to open the club's home screen at whatever scroll offset
   the long dugout form had left behind, 1,253 to 2,041 px down the page, in the
   guide text and past every tile. useRevealScroll is the wrong tool for that: it
   waits a double rAF and then glides, so the player would see the guide text
   first and then a whole page sliding past.

   This hook runs in a layout effect, so the move happens BEFORE the first paint
   of the new screen, and it jumps (never smooth). It uses useRevealScroll's own
   readable area rule, imported rather than copied: when the element's top is
   already inside the readable strip with enough of it showing, nothing moves at
   all. Otherwise its top goes to the top of the readable strip, GAP below
   anything pinned there.

   The key decides when it fires: a null key does nothing, and the hook moves the
   page only when the key changes to a new non null value. A screen passes a key
   that is set while the screen is drawn and null while it is not, so every entry
   into the screen lands on it once, and nothing that happens inside the screen
   (a tile, a tab, a Quick Sim) moves the page. */
export function useArrivalTop<T extends HTMLElement = HTMLDivElement>(key: string | null) {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    if (key === null) return;
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;
    const rect = el.getBoundingClientRect();
    if (rect.height === 0) return;

    const vh = window.innerHeight || document.documentElement.clientHeight;
    const readTop = topInset();
    const readBottom = vh - bottomInset();
    const visible = Math.max(0, Math.min(rect.bottom, readBottom) - Math.max(rect.top, readTop));
    const needed = Math.min(rect.height, MIN_LEAD);
    if (rect.top >= readTop - 2 && visible >= needed) return;

    el.style.scrollMarginTop = `${readTop + GAP}px`;
    el.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' });
  }, [key]);

  return ref;
}

export default useArrivalTop;
