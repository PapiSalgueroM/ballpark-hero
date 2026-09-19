import { useCallback, useEffect, useRef } from 'react';

/**
 * Round 657: timeouts a page starts for itself, all cleared when it unmounts.
 *
 * The four idle games (Stadium Tycoon, Hall of Champions, Wonderkid Factory,
 * Idle Arena) each pushed a floating "+$1.2K" and a bare setTimeout to take it
 * down again 0.7 to 2.6 seconds later. None of those timers was ever cleared,
 * so leaving the page inside that window set state on an unmounted hook, and
 * in the test suite the timer fired after jsdom was gone, which is the
 * "window is not defined" error that made full Vitest runs exit 1.
 *
 * One helper rather than four copies of the same fix, per the one engine
 * rule. scripts/simIdleTimers.mjs fences it: a behaviour check that taps and
 * unmounts, and a source scan that fails on any floater timer started without
 * it.
 */
export function useOwnedTimeouts() {
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const owned = timers.current;
    return () => {
      owned.forEach(clearTimeout);
      owned.clear();
    };
  }, []);
  return useCallback((fn: () => void, ms: number) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      fn();
    }, ms);
    timers.current.add(timer);
    return timer;
  }, []);
}
