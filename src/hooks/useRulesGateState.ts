import { useEffect, useState } from 'react';
import { useRoutePath } from '@/hooks/useRoutePath';

export function useRulesGateState({ immediate = false, enabled = true } = {}) {
  const pathname = useRoutePath();
  const key = `rules-gate-seen:${pathname}`;
  const [open, setOpen] = useState(() => {
    if (!immediate) return false;
    try { return !window.localStorage.getItem(key); }
    catch { return false; }
  });

  useEffect(() => {
    if (!enabled) return;
    // Record the same read that chose the first frame, so a later read cannot strand an open gate.
    if (immediate) {
      if (open) {
        try { window.localStorage.setItem(key, '1'); }
        catch { /* Storage is not available in every browser mode. */ }
      }
      return;
    }
    try {
      if (!window.localStorage.getItem(key)) {
        setOpen(true);
        window.localStorage.setItem(key, '1');
      }
    } catch {
      // Storage is not available in every browser mode.
    }
    // Each mount keeps the first-entry decision for the route that opened it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { open, setOpen };
}
