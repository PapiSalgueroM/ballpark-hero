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
import { useOwnedTimeouts } from '@/hooks/useOwnedTimeouts';
import {
  type HallState, type Wing, type UpgradeId,
  SAVE_KEY, freshState, loadSave, serialize, fetchCatalog,
  advanceClock, offlineReport, awayPaidSoFar, buyArtifact, openWing, buyUpgrade, startRush, rededicate,
} from '@/lib/hallOfChampions';
import { recordCompletion } from '@/lib/completions';
import { CONTINUE_SAVES } from '@/data/continueSaves';
import { backupKeysOf, browserStorage, copyAside, dismissBackup } from '@/lib/brokenSaveRecovery';

/** Round 1548: a hidden spell shorter than this pays but shows no welcome, the load path's own bar. */
const WELCOME_AFTER_MS = 60_000;

/**
 * Round 1548: a save the loader refuses is copied aside before a fresh museum
 * is written over its key. Before this round the loader refused every museum
 * past 1e15 and the five second saver wrote a fresh one over it with nothing
 * kept; a save already lost that way cannot come back. The copy is the one
 * src/lib/saveKeeper.ts makes before a version step (copyAside), marked as
 * answered so the card does not offer back bytes this build refuses again,
 * and skipped when the same bytes are already kept aside. Never throws.
 */
function keepRefusedSave(): void {
  const entry = CONTINUE_SAVES.find(e => e.saveKey === SAVE_KEY);
  const storage = browserStorage();
  if (!entry || !storage) return;
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (raw === null) return;
    for (const k of backupKeysOf(entry, storage)) if (storage.getItem(k) === raw) return;
    const copied = copyAside(entry, storage);
    if (copied.ok && copied.backupKey) dismissBackup(entry, copied.backupKey, storage);
  } catch { /* storage that stopped answering: nothing more to do */ }
}

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
  /* Round 1548: the wall time the museum has been paid through. Every save
     stamps this as lastSeen, so the next load pays from exactly here. */
  const lastTickRef = useRef(0);

  const [floaters, setFloaters] = useState<Floater[]>([]);
  const floaterId = useRef(1);
  /* Round 657: the floater timer is owned by the page (useOwnedTimeouts). */
  const later = useOwnedTimeouts();
  const pushFloater = useCallback((text: string, kind: Floater['kind']) => {
    const id = floaterId.current++;
    setFloaters(f => [...f.slice(-4), { id, text, kind }]);
    later(() => setFloaters(f => f.filter(x => x.id !== id)), 2600);
  }, [later]);

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
          keepRefusedSave();
          s = freshState(now % 2147483647);
        }
        /* Round 1548: the note tells the whole absence, the part a hidden tab
           was paid before it was closed included (it travels in the save). */
        if (away > 60) offlineReport(cat, s, away);
        const took = awayPaidSoFar(s);
        if ((s.awayMs ?? 0) > WELCOME_AFTER_MS && took > 1) setOfflineEarned(took);
        stateRef.current = s;
        lastTickRef.current = now;
        setWings(cat);
        setLoadState('ready');
      } catch {
        if (alive) setLoadState('error');
      }
    })();
    return () => { alive = false; window.clearTimeout(watchdog); };
  }, []);

  /* the clock and the save that survives a closed lid.
     Round 1548: each callback pays the wall time since the last one, not a
     fixed quarter second. A browser slows a hidden tab's interval to once a
     second and then once a minute, so the fixed step paid a museum left open
     in a background tab overnight a couple of minutes. advanceClock pays a
     watched gap at full rate, and a hidden page, or a gap too long to have
     been watched, as time away under the same half speed, eight hour rule a
     closed tab gets on load (one meter for the whole absence). Coming back to
     the page after a real absence shows the same welcome a reload does, read
     from the meter and its takings, which the first watched callback zeroes. */
  useEffect(() => {
    if (loadState !== 'ready') return;
    const iv = window.setInterval(() => {
      const s = stateRef.current;
      if (!s) return;
      const now = Date.now();
      const gap = now - lastTickRef.current;
      lastTickRef.current = now;
      const absence = s.awayMs ?? 0;
      const took = awayPaidSoFar(s);
      const step = advanceClock(wings, s, gap, document.visibilityState !== 'hidden');
      /* the absence just closed. Set, not added: a load's note is the start of
         this same absence, so adding would count the closed part twice. */
      if (!step.away && !s.awayMs && absence > WELCOME_AFTER_MS && took > 1) setOfflineEarned(took);
      bump();
    }, 250);
    const save = () => {
      const s = stateRef.current;
      if (!s) return;
      try { localStorage.setItem(SAVE_KEY, serialize(s, lastTickRef.current)); } catch { /* storage full or blocked */ }
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
      try { localStorage.setItem(SAVE_KEY, serialize(s, lastTickRef.current)); } catch { /* ignore */ }
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
