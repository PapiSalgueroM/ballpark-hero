/**
 * Round 288: the running arena. The engine is src/lib/idleArena.ts; this is
 * the clock, the save and the floaters.
 *
 * The clock ticks every 100ms off the real time (not a fixed step). Round 438:
 * a tick that lands hours late did not measure hours of play, it measured a tab
 * that was hidden, frozen or asleep, so tick pays that gap as away time (half
 * rate, eight hours an absence) exactly as a closed tab is paid. The save is
 * written every five seconds and on unload, and the load path runs the same
 * away rule against the timestamp the last session wrote.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { recordCompletion } from '@/lib/completions';
import {
  SAVE_KEY, TICK_MS, type ArenaState,
  newState, loadSave, serialize, tick, applyOffline, tap, buyGen, buyUpgrade, lift, affordable,
  GENERATORS,
} from '@/lib/idleArena';

export interface Floater { id: number; text: string; x: number; y: number }

const SAVE_EVERY_MS = 5000;

function readState(): { state: ArenaState; offline: { earned: number; seconds: number } | null; fresh: boolean } {
  const now = Date.now();
  let raw: string | null = null;
  try { raw = localStorage.getItem(SAVE_KEY); } catch { /* storage blocked: a fresh arena every visit */ }
  const loaded = loadSave(raw, now);
  if (!loaded) return { state: newState(now), offline: null, fresh: true };
  const { state, earned, seconds } = applyOffline(loaded, now);
  return { state, offline: earned > 0 ? { earned, seconds } : null, fresh: false };
}

export function useIdleArena() {
  const [boot] = useState(readState);
  const [state, setState] = useState<ArenaState>(boot.state);
  const [offline, setOffline] = useState(boot.offline);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;
  const floaterId = useRef(0);

  /* the clock */
  useEffect(() => {
    const t = window.setInterval(() => {
      setState(s => tick(s, Date.now()).state);
    }, TICK_MS);
    return () => window.clearInterval(t);
  }, []);

  /* the save */
  useEffect(() => {
    const write = () => { try { localStorage.setItem(SAVE_KEY, serialize(stateRef.current)); } catch { /* storage blocked */ } };
    const t = window.setInterval(write, SAVE_EVERY_MS);
    window.addEventListener('beforeunload', write);
    document.addEventListener('visibilitychange', write);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('beforeunload', write);
      document.removeEventListener('visibilitychange', write);
      write();
    };
  }, []);

  /* Round 195's rule, the tycoon shape (see useHallOfChampions): one unscored
     mark per sitting, on the first signing, behind a ref so marking never
     re-renders the loop. Taps do not count as a sitting; a signing does. */
  const sessionMarkedRef = useRef(false);
  const markSessionPlay = useCallback(() => {
    if (sessionMarkedRef.current) return;
    sessionMarkedRef.current = true;
    recordCompletion('/idle-arena');
  }, []);

  const doTap = useCallback((x: number, y: number) => {
    setState(s => {
      const next = tap(s);
      const gained = next.points - s.points;
      const id = ++floaterId.current;
      setFloaters(f => [...f.slice(-11), { id, text: `+${gained < 10 ? gained.toFixed(1) : Math.floor(gained)}`, x, y }]);
      window.setTimeout(() => setFloaters(f => f.filter(fl => fl.id !== id)), 700);
      return next;
    });
  }, []);

  const doBuy = useCallback((genId: string, mode: 1 | 10 | 'max') => {
    markSessionPlay();
    setState(s => {
      const g = GENERATORS.find(x => x.id === genId);
      if (!g) return s;
      const n = mode === 'max' ? affordable(g, s.owned[g.id] ?? 0, s.points) : mode;
      return n > 0 ? buyGen(s, genId, n) : s;
    });
  }, [markSessionPlay]);

  const doUpgrade = useCallback((id: string) => setState(s => buyUpgrade(s, id)), []);
  const doLift = useCallback(() => setState(s => lift(s, Date.now())), []);
  const dismissOffline = useCallback(() => setOffline(null), []);

  return { state, fresh: boot.fresh, offline, dismissOffline, floaters, doTap, doBuy, doUpgrade, doLift };
}
