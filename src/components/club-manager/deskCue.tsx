import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/* ─── Round 982: the desk cue, lifted so three desks share one. ───
   The staff room (StaffScreen, Codex) already had the right shape: the press
   asks the engine what the save WOULD be, the screen only speaks once the save
   it is handed afterwards really is that, and the line is keyed by a counter
   and cleared on a timer. Contracts, the academy and the facilities desk
   pressed buttons into silence, so this is that same pattern as one hook
   rather than three copies of it.

   The rule that keeps it honest: `read` gets the state the screen was handed
   AFTER the press and returns the sentence built from that save, or null when
   the save does not show what the engine promised. A refused press leaves the
   state untouched, the hook sees the same object, and nothing is said. The
   cue lives in component state only, so reopening a desk or reloading the
   page never replays an old one.

   Nothing here knows which game it is in: the state type is a parameter, so a
   front office desk in another sport binds it with its own save type. */

/** How long a cue stays up. Long enough to read a sentence, short enough
    that the next press is not talking over the last one. */
export const DESK_CUE_MS = 4000;

export interface DeskCue<K> {
  key: K;
  text: string;
  /** Counts up on every cue, so the line remounts and the slam replays. */
  id: number;
}

export type DeskCueRead<S> = (after: S) => string | null;

export function useDeskCue<K, S extends object>(state: S | null | undefined, holdMs: number = DESK_CUE_MS) {
  const [request, setRequest] = useState<{ key: K; read: DeskCueRead<S>; before: S } | null>(null);
  const [cue, setCue] = useState<DeskCue<K> | null>(null);
  const counter = useRef(0);

  /** Run the screen's callback. With `read`, listen for the save it writes;
      with null (the engine would refuse) just pass the press on. */
  const press = useCallback((key: K, read: DeskCueRead<S> | null, callback: () => void) => {
    if (read && state) setRequest({ key, read, before: state });
    callback();
  }, [state]);

  useLayoutEffect(() => {
    if (!request) return;
    const text = state && state !== request.before ? request.read(state) : null;
    if (text) setCue({ key: request.key, text, id: ++counter.current });
    setRequest(null);
  }, [request, state]);

  useEffect(() => {
    if (!cue) return;
    const timer = window.setTimeout(() => setCue(null), holdMs);
    return () => window.clearTimeout(timer);
  }, [cue, holdMs]);

  return { cue, press };
}

/** Gap kept between a line and whatever sits at the foot of the screen (bottom-3). */
const FOOT_GAP_PX = 12;

/**
 * While the cookie banner is still unanswered it is fixed to the foot of the
 * screen above everything else (CookieConsent, z-[60]), so a line stuck at the
 * foot would be drawn under it. This is how far above the screen's bottom edge
 * the line has to sit to clear the banner, measured off the banner itself when
 * the line lands, or '' when nothing is in the way (consent answered, or the
 * banner drawn inside a help dialog rather than fixed).
 */
export function bannerClearance(): string {
  if (typeof document === 'undefined' || !document.body.dataset.consentPending) return '';
  const banner = document.querySelector<HTMLElement>('[role="region"][aria-label="Cookie choices"]');
  if (!banner || window.getComputedStyle(banner).position !== 'fixed') return '';
  const covered = window.innerHeight - banner.getBoundingClientRect().top;
  return covered > 0 ? `${Math.ceil(covered) + FOOT_GAP_PX}px` : '';
}

/**
 * Where a desk's cue is shown. The anchor has no height and sticks to the
 * bottom of the screen while the card runs past it, so the line is in view
 * wherever on the card the press was, and nothing below or above it moves:
 * the pill is drawn over the card, never in its flow, and moving a sticky
 * anchor's offset never moves anything else either.
 *
 * Two elements, two jobs. The live region is in the page from the first
 * render, empty, and only its words change: a region that is already there
 * when its text arrives is the shape screen readers announce reliably, where
 * one inserted already holding its text often goes unsaid. It carries no
 * role=status, so a desk where nothing happened has no status element at all
 * (the contract and facility preview tests hold the desks to that). The pill
 * is for the eye only, so it is hidden from screen readers and nothing is read
 * twice. The slam sits on the pill, a plain paragraph, never on a control, and
 * the box that holds it clips the first frames of the slam rather than letting
 * a 1.6 scale widen the page on a 320 phone.
 */
export function DeskCueLine({ cue, testId }: { cue: { text: string; id: number } | null; testId: string }) {
  const anchor = useRef<HTMLDivElement>(null);
  const cueId = cue?.id ?? null;
  useLayoutEffect(() => {
    if (anchor.current) anchor.current.style.bottom = cueId === null ? '' : bannerClearance();
  }, [cueId]);
  return (
    <div ref={anchor} className="sticky bottom-3 z-20 h-0 !mt-0" data-desk-cue-anchor>
      <p aria-live="polite" aria-atomic="true" data-desk-cue-live={testId} className="sr-only">{cue?.text ?? ''}</p>
      {cue && (
        <div
          key={cue.id}
          aria-hidden="true"
          data-testid={testId}
          className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center overflow-hidden px-1 pt-4 pb-1"
        >
          <p
            data-desk-cue={cue.id}
            className="cm-slam max-w-full rounded-lg border border-primary/50 bg-card px-3 py-1.5 text-center text-[11px] font-bold text-foreground shadow-lg break-words"
          >
            {cue.text}
          </p>
        </div>
      )}
    </div>
  );
}
