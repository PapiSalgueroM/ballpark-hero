import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The flight: DRAWN by animation frames and SETTLED by a timer.
 *
 * Round 445, lifted out of FreeKickBoard so the second arcade game gets the
 * subtlety for free instead of rediscovering it.
 *
 * WHY BOTH. A browser pauses requestAnimationFrame in a hidden tab. Round 433
 * drew the ball with frames alone, and a player who switched away mid kick came
 * back to a ball frozen in the air and a game that never moved on: the round
 * could not finish because the frame that would have finished it was never
 * scheduled. A setTimeout is throttled in a background tab but it still fires,
 * so the timer is what guarantees the ball lands. Whichever arrives first
 * settles, and settling is idempotent.
 *
 * REDUCED MOTION gets no flight at all: progress goes straight to 1 and the
 * round settles in the same tick, so nothing on screen moves and the game is
 * still playable end to end.
 *
 * The hook owns the frames and nothing else. The page decides what a settled
 * round means, which is the split that keeps both games' rules pure and
 * testable without a browser.
 */

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useArcadeFlight(durationMs: number) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => stop, [stop]);

  /** Put the ball back on the ground, for the start of the next round. */
  const reset = useCallback(() => { stop(); setProgress(0); }, [stop]);

  /** Fly for durationMs, then call onSettle exactly once. */
  const launch = useCallback((onSettle: () => void) => {
    stop();
    setProgress(0);
    if (prefersReducedMotion()) {
      setProgress(1);
      onSettle();
      return;
    }
    const started = performance.now();
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      stop();
      setProgress(1);
      onSettle();
    };
    const tick = (now: number) => {
      if (settled) return;
      const p = Math.min(1, (now - started) / durationMs);
      setProgress(p);
      if (p < 1) { rafRef.current = requestAnimationFrame(tick); return; }
      settle();
    };
    rafRef.current = requestAnimationFrame(tick);
    timerRef.current = window.setTimeout(settle, durationMs + 60);
  }, [durationMs, stop]);

  return { progress, launch, reset };
}
