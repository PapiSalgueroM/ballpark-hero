import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CareerState } from '@/lib/clubManager';

/* ─── Round 982: the desk cue, lifted so three desks share one. ───
   The staff room (StaffScreen, Codex) already had the right shape: the press
   asks the engine what the save WOULD be, the screen only speaks once the save
   it is handed afterwards really is that, and the line is keyed by a counter
   and cleared on a timer. Contracts, the academy and the facilities desk
   pressed buttons into silence, so this is that same pattern as one hook
   rather than three copies of it.

   The rule that keeps it honest: `read` gets the career the screen was handed
   AFTER the press and returns the sentence built from that save, or null when
   the save does not show what the engine promised. A refused press leaves the
   career untouched, the hook sees the same object, and nothing is said. The
   cue lives in component state only, so reopening a desk or reloading the
   page never replays an old one. */

/** How long a cue stays up. Long enough to read a sentence, short enough
    that the next press is not talking over the last one. */
export const DESK_CUE_MS = 4000;

export interface DeskCue<K> {
  key: K;
  text: string;
  /** Counts up on every cue, so the line remounts and the slam replays. */
  id: number;
}

export type DeskCueRead = (after: CareerState) => string | null;

export function useDeskCue<K>(career: CareerState | null | undefined, holdMs: number = DESK_CUE_MS) {
  const [request, setRequest] = useState<{ key: K; read: DeskCueRead; before: CareerState } | null>(null);
  const [cue, setCue] = useState<DeskCue<K> | null>(null);
  const counter = useRef(0);

  /** Run the screen's callback. With `read`, listen for the save it writes;
      with null (the engine would refuse) just pass the press on. */
  const press = useCallback((key: K, read: DeskCueRead | null, callback: () => void) => {
    if (read && career) setRequest({ key, read, before: career });
    callback();
  }, [career]);

  useLayoutEffect(() => {
    if (!request) return;
    const text = career && career !== request.before ? request.read(career) : null;
    if (text) setCue({ key: request.key, text, id: ++counter.current });
    setRequest(null);
  }, [request, career]);

  useEffect(() => {
    if (!cue) return;
    const timer = window.setTimeout(() => setCue(null), holdMs);
    return () => window.clearTimeout(timer);
  }, [cue, holdMs]);

  return { cue, press };
}

/**
 * Where a desk's cue is shown. The anchor has no height and sticks to the
 * bottom of the screen while the card runs past it, so the line is in view
 * wherever on the card the press was, and nothing below or above it moves:
 * the pill is drawn over the card, never in its flow. The status element
 * exists only while there is something to say, the staff room's way, so a desk
 * where nothing happened carries no status at all (the contract and facility
 * preview tests hold the desks to that). The slam sits on the pill, a plain
 * paragraph, never on a control, and the box that holds it clips the first
 * frames of the slam rather than letting a 1.6 scale widen the page on a 320
 * phone.
 */
export function DeskCueLine({ cue, testId }: { cue: { text: string; id: number } | null; testId: string }) {
  return (
    <div className="sticky bottom-3 z-20 h-0 !mt-0" data-desk-cue-anchor>
      {cue && (
        <div
          key={cue.id}
          role="status"
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
