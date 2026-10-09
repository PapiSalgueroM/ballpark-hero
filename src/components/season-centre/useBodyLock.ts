/* Round 1046: the page behind a Season Centre overlay does not scroll. Lifted
   from the viewer (Round 1045) so the season picker takes the same lock: the
   body is padded by the scrollbar the lock hides, so the page behind does not
   shift sideways when an overlay opens or closes, and everything is put back
   as it was on the way out. */
import { useEffect } from 'react';

export function useBodyLock(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const body = document.body;
    const prev = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    const bar = window.innerWidth - document.documentElement.clientWidth;
    if (bar > 0) body.style.paddingRight = `${(parseFloat(window.getComputedStyle(body).paddingRight) || 0) + bar}px`;
    body.style.overflow = 'hidden';
    return () => { body.style.overflow = prev.overflow; body.style.paddingRight = prev.paddingRight; };
  }, [enabled]);
}
