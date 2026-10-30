/**
 * Round 1561: the career kit on a Front Office board, for every sport. Round 1550 wrote this for the NFL board inline
 * (FrontOfficeBoard.tsx: the kit state, kitNeeded and its effect, closeWaits, retryKit, and Round 1533's careerRevealRef);
 * the NFL board and the NHL board now both call it, so the rule lives in one place (CLAUDE.md, one engine).
 *
 * - The kit is read from the loader on the first render, so a board mounted after it came (a later visit to the page
 *   in the same tab) never waits for it.
 * - It is asked for when a screen needs it and at no other time (careerKitNeeded, careerKitLoader.ts): the recap and
 *   the fired screen, a press conference to answer, a career box opened, and the last period of the season on the
 *   hub, so the verdict's code is here before the press that closes the season (that press waits for it: `waits`).
 *   A new front office hands it in from its own fetch (`arrived`). A season being played, the draft and the pick
 *   screen never ask.
 * - A fetch that failed says so (`failed`) and asks again on `retry` (the holding box's button).
 * - The two career screens a tap lands on bring their top onto the screen (Round 1533's fix pass, the owner's rule
 *   that the next step appears in view on its own): the out of work screen ('out') and the arrival recap of the club
 *   he took (`arrival:{club}`). Keyed to those two landings alone, so opening a box, a year out, a reload or an
 *   ordinary recap never moves the page.
 *
 * Nothing here is saved: the kit is code, never localStorage. Imports the loader's leaf and the reveal hook only.
 */
import { useEffect, useState, type RefObject } from 'react';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { careerKitNeeded, type CareerKitLoader, type CareerKitMoment } from '@/components/front-office-shared/careerKitLoader';

export interface GmCareerKitState<K> {
  /** The kit when it has arrived, else null. */
  kit: K | null;
  /** The last fetch failed (the holding box says so and offers a retry). */
  failed: boolean;
  /** Ask again after a failed fetch. */
  retry(): void;
  /** A start that fetched the kit beside its league hands it in. */
  arrived(k: K): void;
  /** The press that closes the season waits for the kit: the kit is absent on the hub's last period. */
  waits: boolean;
  /** The element the two career landings bring into view. */
  revealRef: RefObject<HTMLDivElement>;
}

export function useGmCareerKit<K>(
  loader: CareerKitLoader<K>,
  moment: CareerKitMoment,
  landing: { phase: string; landedAt: string | null },
): GmCareerKitState<K> {
  const [kit, setKit] = useState<K | null>(loader.now);
  const [failed, setFailed] = useState(false);
  const [kitTry, setKitTry] = useState(0);
  const revealRef = useRevealScroll<HTMLDivElement>(
    landing.phase === 'fired' ? 'out' : landing.landedAt === null ? 'none' : `arrival:${landing.landedAt}`,
    { enabled: landing.phase === 'fired' || landing.landedAt !== null, skipFirst: false },
  );
  const needed = !kit && careerKitNeeded(moment);
  useEffect(() => {
    if (!needed) return;
    let live = true;
    loader.load().then(
      k => { if (live) { setFailed(false); setKit(k); } },
      () => { if (live) setFailed(true); },
    );
    return () => { live = false; };
    /* the loader is one object per page (a module level const of the sport's loader file), so it is not a dependency */
  }, [needed, kitTry]);
  return {
    kit,
    failed,
    retry: () => { setFailed(false); setKitTry(n => n + 1); },
    arrived: setKit,
    waits: !kit && moment.phase === 'hub' && moment.lastPeriod,
    revealRef,
  };
}
