/**
 * Round 216: React glue for Wonderkid Factory. All the rules live in
 * src/lib/wonderkidFactory.ts where the harness can drive them headless;
 * this file only owns the clock, the save, and the render trigger.
 *
 * The engine state is a mutable object behind a ref, ticked four times a
 * second, and a version counter is the only React state: an idle game that
 * setStates its whole world every frame spends its battery on renders.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FactoryState, FacilityId, SAVE_KEY,
  newFactory, deserialize, serialize, applyOffline, tick,
  buyFacility, sellProspect, startShowcase, moveUp,
} from '@/lib/wonderkidFactory';
import { recordCompletion } from '@/lib/completions';

export interface Floater {
  id: number;
  text: string;
  kind: 'sale' | 'find' | 'bad' | 'win';
}

export function useWonderkidFactory() {
  const stateRef = useRef<FactoryState | null>(null);
  if (stateRef.current === null) {
    const now = Date.now();
    let loaded: FactoryState | null = null;
    try { loaded = deserialize(localStorage.getItem(SAVE_KEY), now); } catch { loaded = null; }
    const s = loaded ?? newFactory(now);
    const applied = applyOffline(s, now);
    if (applied > 60) s.scoutProgress = Math.max(s.scoutProgress, 0);
    stateRef.current = s;
  }
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion(v => v + 1), []);

  const [floaters, setFloaters] = useState<Floater[]>([]);
  const floaterId = useRef(1);
  const pushFloater = useCallback((text: string, kind: Floater['kind']) => {
    const id = floaterId.current++;
    setFloaters(f => [...f.slice(-4), { id, text, kind }]);
    window.setTimeout(() => setFloaters(f => f.filter(x => x.id !== id)), 2600);
  }, []);

  /* the clock, and the save that survives a closed lid */
  useEffect(() => {
    const iv = window.setInterval(() => {
      const s = stateRef.current!;
      const before = s.prospects.length;
      tick(s, 0.25);
      s.lastSeen = Date.now();
      if (s.prospects.length > before) pushFloater('🔭 the scouts found someone', 'find');
      if (s.prospects.length < before && s.leftFree > 0) {
        /* only the leaver path shrinks the academy inside a tick */
        pushFloater('a kid ran out of time and left on a free', 'bad');
      }
      bump();
    }, 250);
    const save = () => {
      try { localStorage.setItem(SAVE_KEY, serialize(stateRef.current!)); } catch { /* storage full or blocked */ }
    };
    const saver = window.setInterval(save, 5000);
    document.addEventListener('visibilitychange', save);
    window.addEventListener('pagehide', save);
    return () => {
      window.clearInterval(iv);
      window.clearInterval(saver);
      document.removeEventListener('visibilitychange', save);
      window.removeEventListener('pagehide', save);
      save();
    };
  }, [bump, pushFloater]);

  /* Round 195's S-1 rule, the tycoon shape exactly: one unscored mark per
     sitting, on the first meaningful action, behind a ref so marking never
     re-renders the loop. The idle game never sends a score. */
  const sessionMarkedRef = useRef(false);
  const markSessionPlay = useCallback(() => {
    if (sessionMarkedRef.current) return;
    sessionMarkedRef.current = true;
    recordCompletion('/wonderkid-factory');
  }, []);

  const doBuy = useCallback((id: FacilityId) => {
    markSessionPlay();
    if (buyFacility(stateRef.current!, id)) bump();
  }, [bump, markSessionPlay]);

  const doSell = useCallback((id: number) => {
    markSessionPlay();
    const s = stateRef.current!;
    const kid = s.prospects.find(p => p.id === id);
    const price = sellProspect(s, id);
    if (price !== null && kid) {
      pushFloater(`💷 ${kid.name} sold for ${price.toLocaleString()}`, 'sale');
      bump();
    }
  }, [bump, markSessionPlay, pushFloater]);

  const doShowcase = useCallback(() => {
    markSessionPlay();
    if (startShowcase(stateRef.current!)) {
      pushFloater('🎪 showcase day: training x3', 'win');
      bump();
    }
  }, [bump, markSessionPlay, pushFloater]);

  const doMoveUp = useCallback(() => {
    markSessionPlay();
    const s = stateRef.current!;
    if (moveUp(s)) {
      try { localStorage.setItem(SAVE_KEY, serialize(s)); } catch { /* ignore */ }
      pushFloater('⭐ the academy moves up in the world', 'win');
      bump();
    }
  }, [bump, markSessionPlay, pushFloater]);

  return {
    state: stateRef.current,
    floaters,
    doBuy,
    doSell,
    doShowcase,
    doMoveUp,
  };
}
