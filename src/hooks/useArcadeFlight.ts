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

interface Flight {
  elapsed: number;
  startedAt: number;
  segment: number;
  onSettle: () => void;
}

export function useArcadeFlight(durationMs: number) {
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const flightRef = useRef<Flight | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => () => { stop(); flightRef.current = null; }, [stop]);

  const fly = useCallback((flight: Flight) => {
    const segment = ++flight.segment;
    flight.startedAt = performance.now();
    const isCurrent = () => flightRef.current === flight && flight.segment === segment && !pausedRef.current;
    const settle = () => {
      if (!isCurrent()) return;
      stop();
      flightRef.current = null;
      setProgress(1);
      flight.onSettle();
    };
    if (flight.elapsed >= durationMs) { settle(); return; }
    const tick = (now: number) => {
      if (!isCurrent()) return;
      const elapsed = Math.min(durationMs, flight.elapsed + now - flight.startedAt);
      setProgress(elapsed / durationMs);
      if (elapsed < durationMs) { rafRef.current = requestAnimationFrame(tick); return; }
      settle();
    };
    rafRef.current = requestAnimationFrame(tick);
    timerRef.current = window.setTimeout(settle, durationMs - flight.elapsed + 60);
  }, [durationMs, stop]);

  /** Put the ball back on the ground, for the start of the next round. */
  const reset = useCallback(() => {
    stop();
    flightRef.current = null;
    pausedRef.current = false;
    setPaused(false);
    setProgress(0);
  }, [stop]);

  const pause = useCallback(() => {
    if (pausedRef.current) return;
    pausedRef.current = true;
    const flight = flightRef.current;
    if (flight) {
      flight.elapsed = Math.min(durationMs, flight.elapsed + performance.now() - flight.startedAt);
      flight.segment++;
      setProgress(flight.elapsed / durationMs);
    }
    stop();
    setPaused(true);
  }, [durationMs, stop]);

  const resume = useCallback(() => {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    setPaused(false);
    if (flightRef.current) fly(flightRef.current);
  }, [fly]);

  /** Fly for durationMs, then call onSettle exactly once. */
  const launch = useCallback((onSettle: () => void) => {
    if (pausedRef.current) return;
    stop();
    setProgress(0);
    flightRef.current = null;
    if (prefersReducedMotion()) {
      setProgress(1);
      onSettle();
      return;
    }
    const flight = { elapsed: 0, startedAt: 0, segment: 0, onSettle };
    flightRef.current = flight;
    fly(flight);
  }, [fly, stop]);

  return { progress, paused, launch, reset, pause, resume };
}
