import { useEffect, useRef } from 'react';

/* ─── useRevealScroll (Round 61) ───
   Owner's standing UX rule, in his words: "after you click something, the next
   step or result must appear in view on its own, never make the player scroll
   down to find it."

   Multi step games break this constantly. You tap a choice at the top of the
   screen, the result renders below the fold, and on a phone it looks like
   nothing happened at all. This hook fixes it in one line per game: attach the
   returned ref to the element that appears, pass the value that changes when a
   new step arrives, and the element scrolls itself into view.

   Details that matter:
   - Waits a frame (double rAF) so the element has actually laid out before we
     measure it. Scrolling on the same tick as the state change lands on the
     old layout and undershoots.
   - Does nothing when the element is already comfortably in view, so it never
     yanks the page around for no reason.
   - Honours prefers-reduced-motion by jumping instead of smooth scrolling.
   - Skips the very first render, so opening a game does not scroll you.
*/

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useRevealScroll<T extends HTMLElement = HTMLDivElement>(
  key: unknown,
  options?: { enabled?: boolean; block?: ScrollLogicalPosition; skipFirst?: boolean },
) {
  const ref = useRef<T>(null);
  const firstRun = useRef(true);
  const enabled = options?.enabled ?? true;
  const block = options?.block ?? 'center';
  const skipFirst = options?.skipFirst ?? true;

  useEffect(() => {
    if (!enabled) return;
    if (firstRun.current) {
      firstRun.current = false;
      if (skipFirst) return;
    }
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const node = ref.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight;
        // Already mostly visible? Leave the page alone.
        const comfortablyVisible = rect.top >= 0 && rect.bottom <= vh * 0.95;
        if (comfortablyVisible) return;
        node.scrollIntoView({
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          block,
          inline: 'nearest',
        });
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [key, enabled, block, skipFirst]);

  return ref;
}

export default useRevealScroll;
