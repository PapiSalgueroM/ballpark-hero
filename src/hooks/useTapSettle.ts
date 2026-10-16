import { useRef } from 'react';

/* Round 1346: the second tap of a double tap, landing on a button that slid under the finger.

   When one press swaps a button for another in the same place, a double tap presses both. Measured on a runner
   (review r1346-run-d): a double tap on "Undo skip" pressed "Go all out", a graded showcase with no undo, at
   every gap from 80 to 700 ms, at 390 and 1280. Draft night's "Skip to the end" and "Watch it again" share a cell
   the same way, and the coach hub shrinks under the pointer when a retirement is confirmed.

   `mark()` goes in the handler of the press that swaps the buttons; `settled()` is false for SETTLE_MS after it,
   and the button that must not take that second tap returns early while it is false. Only the second tap is
   dropped: nothing is saved, and the next press after the settle works as before. */
export const SETTLE_MS = 1000;

export function useTapSettle() {
  const at = useRef(Number.NEGATIVE_INFINITY);
  return {
    mark: () => { at.current = performance.now(); },
    settled: () => performance.now() - at.current >= SETTLE_MS,
  };
}
