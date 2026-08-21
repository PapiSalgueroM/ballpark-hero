/**
 * Round 252: React glue for Hall of Champions. Every rule lives in
 * src/lib/hallOfChampions.ts where the harness drives it headless; this
 * file owns the clock, the catalog fetch, the save and the render
 * trigger, and nothing else.
 *
 * Same shape as Wonderkid Factory (Round 216): the world is a mutable
 * object behind a ref, ticked four times a second, with one version
 * counter as the only React state, because an idle game that setStates
 * its whole world every frame spends the battery on renders. The one
 * thing this game adds is that its catalog is FETCHED (real champions
 * from the audited tables), so the museum has a loading and an error
 * state the other idles do not need.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type HallState, type Wing, type UpgradeId,
  SAVE_KEY, freshState, loadSave, serialize, fetchCatalog,
  tick, offlineReport, buyArtifact, openWing, buyUpgrade, startRush, rededicate,
} from '@/lib/hallOfChampions';
import { recordCompletion } from '@/lib/completions';

export type LoadState = 'loading' | 'ready' | 'error';

export interface Floater {
  id: number;
  text: string;
  kind: 'buy' | 'open' | 'win' | 'star';
}

export function useHallOfChampions() {
  const stateRef = useRef<HallState | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [wings, setWings] = useState<Wing[]>([]);
  const [offlineEarned, setOfflineEarned] = useState<number | null>(null);
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion(v => v + 1), []);

  const [floaters, setFloaters] = useState<Floater[]>([]);
  const floaterId = useRef(1);
  const pushFloater = useCallback((text: string, kind: Floater['kind']) => {
    const id = floaterId.current++;
    setFloaters(f => [...f.slice(-4), { id, text, kind }]);
    window.setTimeout(() => setFloaters(f => f.filter(x => x.id !== id)), 2600);
  }, []);

  /* the catalog: real champions, through the same fetchers the quiz games
     use. A dead network gets the honest error card after 15 seconds
     rather than an endless spinner (the Round 235 watchdog pattern). */
  useEffect(() => {
    let alive = true;
    const watchdog = window.setTimeout(() => {
      if (alive) setLoadState(s => (s === 'loading' ? 'error' : s));
    }, 15000);
    (async () => {
      try {
        const cat = await fetchCatalog();
        if (!alive) return;
        if (cat.length === 0) { setLoadState('error'); return; }
        // the save is only read once the catalog exists, so offline
        // earnings are computed against the real wings
        const now = Date.now();
        let s: HallState;
        let away = 0;
        let loaded: { state: HallState; lastSeen: number } | null = null;
        try { loaded = loadSave(localStorage.getItem(SAVE_KEY)); } catch { loaded = null; }
        if (loaded) {
          s = loaded.state;
          away = Math.max(0, Math.floor((now - loaded.lastSeen) / 1000));
        } else {
          s = freshState(now % 2147483647);
        }
        if (away > 60) {
          const rep = offlineReport(cat, s, away);
          if (rep.earned > 1) setOfflineEarned(rep.earned);
        }
        stateRef.current = s;
        setWings(cat);
        setLoadState('ready');
      } catch {
        if (alive) setLoadState('error');
      }
    })();
    return () => { alive = false; window.clearTimeout(watchdog); };
  }, []);

  /* the clock and the save that survives a closed lid */
  useEffect(() => {
    if (loadState !== 'ready') return;
    const iv = window.setInterval(() => {
      const s = stateRef.current;
      if (!s) return;
      tick(wings, s, 0.25);
      bump();
    }, 250);
    const save = () => {
      const s = stateRef.current;
      if (!s) return;
      try { localStorage.setItem(SAVE_KEY, serialize(s, Date.now())); } catch { /* storage full or blocked */ }
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
  }, [loadState, wings, bump]);

  /* Round 195's rule, the tycoon shape: one unscored mark per sitting, on
     the first meaningful action, behind a ref so marking never re-renders
     the loop. An idle game never sends a score. */
  const sessionMarkedRef = useRef(false);
  const markSessionPlay = useCallback(() => {
    if (sessionMarkedRef.current) return;
    sessionMarkedRef.current = true;
    recordCompletion('/hall-of-champions');
  }, []);

  const doBuyArtifact = useCallback((wingKey: string) => {
    markSessionPlay();
    const s = stateRef.current;
    const wing = wings.find(w => w.key === wingKey);
    if (!s || !wing) return;
    const got = buyArtifact(wing, s);
    if (got) {
      pushFloater(`${wing.emoji} ${got.year} ${got.team} joins the hall`, 'buy');
      if (s.owned[wing.key] === wing.artifacts.length) {
        pushFloater(`🏅 the ${wing.title} wing is complete, forever`, 'win');
      }
      bump();
    }
  }, [wings, bump, markSessionPlay, pushFloater]);

  const doOpenWing = useCallback((wingKey: string) => {
    markSessionPlay();
    const s = stateRef.current;
    const wing = wings.find(w => w.key === wingKey);
    if (!s || !wing) return;
    if (openWing(wing, s)) {
      pushFloater(`${wing.emoji} the ${wing.title} wing opens`, 'open');
      bump();
    }
  }, [wings, bump, markSessionPlay, pushFloater]);

  const doBuyUpgrade = useCallback((id: UpgradeId) => {
    markSessionPlay();
    const s = stateRef.current;
    if (s && buyUpgrade(id, s)) bump();
  }, [bump, markSessionPlay]);

  const doRush = useCallback(() => {
    markSessionPlay();
    const s = stateRef.current;
    if (s && startRush(s)) {
      pushFloater('🎉 anniversary weekend: admissions x3', 'win');
      bump();
    }
  }, [bump, markSessionPlay, pushFloater]);

  const doRededicate = useCallback(() => {
    markSessionPlay();
    const s = stateRef.current;
    if (s && rededicate(s)) {
      try { localStorage.setItem(SAVE_KEY, serialize(s, Date.now())); } catch { /* ignore */ }
      pushFloater('⭐ the hall reopens with its reputation intact', 'star');
      bump();
    }
  }, [bump, markSessionPlay, pushFloater]);

  const dismissOffline = useCallback(() => setOfflineEarned(null), []);

  return {
    loadState, wings, state: stateRef.current, floaters,
    offlineEarned, dismissOffline,
    doBuyArtifact, doOpenWing, doBuyUpgrade, doRush, doRededicate,
  };
}
