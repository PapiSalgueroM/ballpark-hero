import { useEffect, useState, type CSSProperties } from "react";

/* Round 1107: the once per key rule, lifted out of the soccer folder.

   A career moment plays once, when the state flips in front of the player,
   and never again: not when the card is mounted a second time (another
   screen and back), not on a reload, not in a new tab, not after the browser
   was closed. Soccer Career wrote the rule in Round 985
   (src/components/soccer-career/careerMoments.ts, whose header tells the
   whole story and still builds soccer's own keys); the hook, the set it
   remembers in and the beat helper now live here, moved word for word, so
   every career on the site shares one rule. That soccer file re-exports
   them, so not one importer changed a line.

   The rule needs no storage at all. The only memory is the module level set
   below, which a reload forgets; the page then settles what its loaded save
   already holds (settleMoments), so only a moment that first appears AFTER
   the load is fresh.

   A fresh moment also waits to be SEEN. A card that mounts below the fold
   would otherwise play to nobody and then count as played. Until the card
   comes into view its beats hold on their first frame (animation-play-state
   paused); the moment is settled when it starts, not when it mounts.

   This file knows no sport and imports nothing but React. */

const settled = new Set<string>();

/** Settle keys a restored save already holds: each was seen in an earlier
    visit. A null (the save holds no such moment) is skipped. */
export function settleMoments(keys: readonly (string | null)[]): void {
  for (const k of keys) {
    if (k) settled.add(k);
  }
}

/** True once a key has started playing in this visit, or was settled on load. */
export function isMomentSettled(key: string | null): boolean {
  return key !== null && settled.has(key);
}

export interface CareerMoment {
  /** The card carries its animated classes on this mount. */
  fresh: boolean;
  /** The card has come into view, so its beats run and its confetti falls. */
  live: boolean;
  /** Goes on the card's outer element, which is what is watched. */
  ref: (el: HTMLElement | null) => void;
}

/* Starts once the card's top is above the bottom 15 percent of the screen,
   where the floating action bar sits on a retired career. */
const IN_VIEW: IntersectionObserverInit = { rootMargin: "0px 0px -15% 0px" };

/** A moment that flipped in this visit is fresh for the whole of this mount.
    Read in the initialiser and held there (a discarded render reads the same
    answer, and a re-render of the page cannot cut a playing moment short).
    It goes live when the card is first seen, and is settled at that point. */
export function useCareerMoment(key: string | null): CareerMoment {
  const [fresh] = useState(() => key !== null && !settled.has(key));
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (!fresh || live || !el) return;
    if (typeof IntersectionObserver === "undefined") { setLive(true); return; }
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) setLive(true);
    }, IN_VIEW);
    io.observe(el);
    return () => io.disconnect();
  }, [fresh, live, el]);
  useEffect(() => {
    if (key && live) settled.add(key);
  }, [key, live]);
  return { fresh, live, ref: setEl };
}

/** The inline style of beat i: its delay, and held on its first frame until
    the card is live. Nothing at all when the card is drawn still. */
export function beatStyle(m: CareerMoment, delay: string): CSSProperties | undefined {
  if (!m.fresh) return undefined;
  return m.live ? { animationDelay: delay } : { animationDelay: delay, animationPlayState: "paused" };
}

/** Test seam: forget every settled moment, as a new tab would. */
export function resetCareerMomentsForTest(): void {
  settled.clear();
}
