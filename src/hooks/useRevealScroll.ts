import { useEffect, useRef } from 'react';

/* ─── useRevealScroll (Round 61, rebuilt Round 128) ───
   Owner's standing UX rule, in his words: "after you click something, the next
   step or result must appear in view on its own, never make the player scroll
   down to find it."

   Multi step games break this constantly. You tap a choice at the top of the
   screen, the result renders below the fold, and on a phone it looks like
   nothing happened at all. This hook fixes it in one line per game: attach the
   returned ref to the element that appears, pass the value that changes when a
   new step arrives, and the element scrolls itself into view.

   ── Round 128: the rule was the thing breaking the rule ──

   His report: "every time u click something on my career on the soccer one on
   a mobile phone, after clicking something it drags u to lower on the screen."
   He was right, and it was this file doing it. Two bugs stacked on top of each
   other, and both of them are invisible on a desktop, which is why it lived
   from Round 61 to Round 128 without anyone catching it.

   One. The "it is already in view, leave the page alone" guard could not fire
   for anything taller than the screen. It asked for rect.top >= 0 AND
   rect.bottom <= vh * 0.95, so it wanted the WHOLE element on screen. Measured
   on the built site at 390x844, which is the phone he uses: the Soccer Career
   overlay panel is 1361px tall against an 844px viewport. Its bottom is 517px
   past the fold no matter where you stand, so the guard read false on every
   single press, forever, even when the top of the panel was sitting right at
   the top of the screen with a third of a screen of it readable. Every click,
   a scroll.

   Two. Having decided to scroll it then used block: 'center', which is the
   worst possible target for something tall. Centring puts the element's
   midpoint at the viewport's midpoint, so a panel taller than the screen has
   its top pushed ABOVE the fold by (height - vh) / 2. Measured, same page,
   same phone: press Next Year from the top of the page and the panel top went
   from 411px down the screen to MINUS 258px, with the page dragged 669px. You
   land in the middle of the card having lost the top of the very thing you
   just uncovered. A 2000px panel loses 578px of its top the same way.

   Desktop mostly escaped both because a 900px tall panel does fit inside a
   1200px browser window, which is exactly why he only ever saw it on a phone.

   Three, found while measuring the first two and worth writing down. The ref
   in Soccer Career wraps a stack of conditional overlays, so when the phase
   moves to one with no overlay the wrapper is still there and still gets a new
   key, but it is now zero pixels tall. The old code cheerfully scrolled the
   page to an invisible empty div. Nothing was revealed, so nothing should
   move. Height zero is now an immediate no.

   ── What it does now ──

   Two questions, in order.

   Is the top of the new content already somewhere a person can read it? Top
   edge at or below the top of the unobstructed area, and enough of the thing
   showing under that edge to know it arrived. If yes, do nothing at all, and
   that is the case that was firing on every press before.

   If not, put the TOP of it just under whatever is pinned to the top of the
   screen. Never the centre, unless the caller explicitly asked for a different
   block AND the element is short enough to fit, which keeps the options object
   honest for the 21 call sites without ever letting a tall panel lose its head
   again.

   The offset is done with scroll-margin-top rather than by working out a pixel
   target and calling window.scrollTo. That was deliberate and the alternative
   was tried first: window.scrollTo(0, scrollY + rect.top - inset) only ever
   scrolls the window, and several call sites (the Club Manager roles list, the
   halftime bench) sit inside their own overflow-y-auto box, where the window
   is not the thing that needs to move. scrollIntoView walks up and scrolls
   whichever scroller actually holds the element, and scroll-margin-top is the
   one line of CSS that tells it to stop short by the height of the header.
   Supported everywhere back to iOS 14.5, and where it is not, it degrades to a
   plain top align, which is still the right answer and only loses the gap.

   How the header height is found, since the brief was to measure it rather
   than guess. It is measured live, per scroll, with
   document.elementsFromPoint() one pixel below the top edge of the viewport:
   walk what is actually painted there, keep anything whose computed position
   is fixed or sticky and whose top edge is pinned at the viewport top, and
   take the lowest bottom edge among them. Same trick upside down at the bottom
   edge for bottom pinned bars.

   Reading the class names instead would have got it wrong, twice over. The
   site header is <header class="sticky top-0 ..."> around a <div class="h-14">,
   so h-14 says 56px, and the real measured height at 390 wide is 106px,
   because the row wraps on a phone. And the header is not on game routes at
   all: App.tsx only mounts it for '/', '/leaderboard' and '/profile', so on all
   21 pages this hook actually runs on the top inset is 0 today. Measuring
   costs nothing, is right on all of those, and stays right the day the header
   moves or a game grows its own sticky bar.

   The bottom edge matters too, and that is the Round 86 sticky action bar in
   Soccer Career: 85px of Next Season button welded across the bottom of the
   phone. Content sitting in that strip is not "in view", it is behind a
   button. The measured 85px comes off the readable window before the hook
   decides whether the new thing counts as visible, so the two features stop
   disagreeing about what visible means. Confirmed at 390x844 on the built
   site: top inset 0, bottom inset 85, and on '/' where the header does mount,
   top inset 106.

   Everything else from Round 61 stands: waits a double rAF so the element has
   actually laid out before it is measured, jumps instead of gliding for
   prefers-reduced-motion, and skips the very first render so opening a game
   does not scroll you.

   Guarded permanently by scripts/simRevealScroll.mjs, which drives four of
   these games in a real Chromium at 390x844, records window.scrollY either
   side of every press, and fails if a press moves the page while the top of
   the new content was already readable, or if the top ends up above the fold
   after one. It also proves the feature still works, so a later round cannot
   make it green by switching the hook off.
*/

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Breathing room under the header. Small on purpose: it is there so a card's
   top border is not welded to the bar above it, not to create a margin. */
const GAP = 12;

/* How much of the new thing has to be showing before "it appeared" is true.
   160px on an 844px phone is roughly a card heading and two or three lines,
   which is enough to see what arrived and decide whether to read on. Clamped
   to the element's own height, so a 40px strip only has to show its 40px.
   A much stricter version was tried first, requiring half the readable window
   (about 380px on this phone), and it is worth writing down why it went: it
   put the Soccer Career panel 11px from the threshold, so an overlay one line
   taller would have started scrolling on every press again and the whole bug
   would have come back through a number nobody would think to look at. */
const MIN_LEAD = 160;

/* A header is a strip. Anything taller than this is a full screen overlay or a
   dialog, and treating a dialog as a header would push the aim point half way
   down the page. */
const MAX_BAR = 0.4;

/** Bottom edge of whatever is pinned across the top of the viewport, in px. */
function topInset(): number {
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const vw = window.innerWidth || document.documentElement.clientWidth;
  let inset = 0;
  for (const x of [vw * 0.5, 6, vw - 6]) {
    for (const el of document.elementsFromPoint(x, 1)) {
      const pos = getComputedStyle(el).position;
      if (pos !== 'fixed' && pos !== 'sticky') continue;
      const r = el.getBoundingClientRect();
      if (r.height === 0 || r.height > vh * MAX_BAR) continue;
      if (r.top > 2 || r.bottom <= 0) continue;
      if (r.bottom > inset) inset = r.bottom;
    }
  }
  return inset;
}

/** Height of whatever is pinned across the bottom of the viewport, in px. */
function bottomInset(): number {
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const vw = window.innerWidth || document.documentElement.clientWidth;
  let inset = 0;
  for (const x of [vw * 0.5, 6, vw - 6]) {
    for (const el of document.elementsFromPoint(x, vh - 2)) {
      const pos = getComputedStyle(el).position;
      if (pos !== 'fixed' && pos !== 'sticky') continue;
      const r = el.getBoundingClientRect();
      if (r.height === 0 || r.height > vh * MAX_BAR) continue;
      if (r.bottom < vh - 2 || r.top >= vh) continue;
      if (vh - r.top > inset) inset = vh - r.top;
    }
  }
  return inset;
}

export function useRevealScroll<T extends HTMLElement = HTMLDivElement>(
  key: unknown,
  options?: { enabled?: boolean; block?: ScrollLogicalPosition; skipFirst?: boolean },
) {
  const ref = useRef<T>(null);
  const firstRun = useRef(true);
  const enabled = options?.enabled ?? true;
  /* Undefined is meaningful here and it is why this is not defaulted. No caller
     passes block today, so undefined means "you decide", which is the top align
     below. A caller that DOES pass one gets it honoured, as long as the element
     fits on the screen. */
  const block = options?.block;
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
        // Nothing was actually revealed. An empty wrapper is not content and
        // the page has no business moving for it.
        if (rect.height === 0) return;

        const vh = window.innerHeight || document.documentElement.clientHeight;
        const top = topInset();
        const bottom = bottomInset();
        // The strip of screen a person can actually read: under the header,
        // above the sticky action bar.
        const readTop = top;
        const readBottom = vh - bottom;

        /* Already readable? Its top edge has to be inside that strip, not
           scrolled off above it, and enough of it has to be showing under that
           edge to count as having appeared. The 2px of slack on the top edge is
           for subpixel layout, so a card that lands at 0.4px does not trigger a
           pointless half pixel scroll. */
        const visible = Math.max(0, Math.min(rect.bottom, readBottom) - Math.max(rect.top, readTop));
        const needed = Math.min(rect.height, MIN_LEAD);
        if (rect.top >= readTop - 2 && visible >= needed) return;

        const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
        /* Honour an explicitly requested block only when the whole element fits
           in the readable strip. The moment it does not fit, any block other
           than start throws part of the element off one end, and off the TOP is
           the end that loses you the thing you just revealed. */
        const fits = rect.height <= readBottom - readTop - GAP;
        if (block && block !== 'start' && fits) {
          node.scrollIntoView({ behavior, block, inline: 'nearest' });
          return;
        }
        node.style.scrollMarginTop = `${readTop + GAP}px`;
        node.scrollIntoView({ behavior, block: 'start', inline: 'nearest' });
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
