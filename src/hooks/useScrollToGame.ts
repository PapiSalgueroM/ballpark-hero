import { useRef, useEffect } from 'react';

/**
 * Scrolls the game container into view on mobile when the game starts.
 * Pass `gameState` (or any truthy trigger) — scrolls once when it becomes truthy.
 */
export function useScrollToGame(trigger: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);

  useEffect(() => {
    if (trigger && !hasScrolled.current && ref.current) {
      hasScrolled.current = true;
      // Small delay to let the DOM update after state change
      setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
    if (!trigger) {
      hasScrolled.current = false;
    }
  }, [trigger]);

  return ref;
}
