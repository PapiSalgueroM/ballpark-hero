/**
 * Round 146: the live half of Stadium Tycoon. The lib owns the math; this
 * owns time, storage and the event stream the animations feed on. The loop
 * runs on requestAnimationFrame but ticks the sim at ~5 Hz, which is plenty
 * for an idle game and keeps phones cool. Saves every 5 seconds and on tab
 * hide, so the away-earnings clock is honest.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { recordCompletion } from '@/lib/completions';
import {
  TycoonState, TickEvent, newTycoon, tick, buy, tap, prestige,
  offlineEarnings, serializeTycoon, deserializeTycoon, TYCOON_SAVE_KEY,
  activateBoost, hire, catchGolden, rollGoldenKind, goldenActive,
  GOLDEN_INFO, fmtMoney, buyPerk, perkById,
} from '@/lib/stadiumTycoon';
import type { GoldenKind } from '@/lib/stadiumTycoon';

/** Round 162: a golden whistle drifting across the pitch, waiting to be
 *  caught. Purely presentational until the tap: the engine only hears about
 *  it if the player actually catches it. */
export interface PendingGolden {
  id: number;
  kind: GoldenKind;
  x: number;
  y: number;
  /** performance.now() when it drifts away uncaught. */
  expiresAt: number;
}

export interface Floater {
  id: number;
  text: string;
  kind: 'money' | 'goal' | 'win' | 'bad' | 'tap';
  /** Percent coordinates inside the pitch panel. */
  x: number;
  y: number;
}

let floaterSeq = 1;

export function useStadiumTycoon() {
  const [state, setState] = useState<TycoonState>(() => {
    const now = Date.now();
    const loaded = deserializeTycoon(
      typeof localStorage !== 'undefined' ? localStorage.getItem(TYCOON_SAVE_KEY) : null,
      now,
    );
    return loaded ?? newTycoon(now);
  });
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [awayPay, setAwayPay] = useState<number | null>(null);
  const [confetti, setConfetti] = useState(0);
  const [golden, setGolden] = useState<PendingGolden | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const goldenRef = useRef(golden);
  goldenRef.current = golden;

  const pushFloater = useCallback((text: string, kind: Floater['kind'], x?: number, y?: number) => {
    const f: Floater = {
      id: floaterSeq++,
      text,
      kind,
      x: x ?? 20 + Math.random() * 60,
      y: y ?? 30 + Math.random() * 40,
    };
    setFloaters(cur => [...cur.slice(-14), f]);
    // Floaters clean themselves up after the animation finishes.
    setTimeout(() => setFloaters(cur => cur.filter(g => g.id !== f.id)), 1900);
  }, []);

  // The one-time away-earnings settlement, before the loop starts.
  useEffect(() => {
    const now = Date.now();
    const pay = offlineEarnings(stateRef.current, now);
    if (pay > 0) {
      setAwayPay(pay);
      setState(s => ({ ...s, money: s.money + pay, lifetime: s.lifetime + pay, savedAt: now }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The loop.
  useEffect(() => {
    if ((window as Window & { __DUKB_PRERENDER__?: boolean }).__DUKB_PRERENDER__) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let sinceSave = 0;
    const step = (t: number) => {
      const dt = Math.min(2, (t - last) / 1000);
      last = t;
      acc += dt;
      sinceSave += dt;
      if (acc >= 0.2) {
        const use = acc;
        acc = 0;
        const { state: next, events } = tick(stateRef.current, use, Math.random);
        for (const e of events) reactToEvent(e);
        setState(next);
        /* Round 162: the golden whistle. One drifts in every couple of
           minutes of real play (mean ~150s), only while nothing golden is
           already lit, and it drifts away after 12 seconds uncaught. */
        const g = goldenRef.current;
        if (g && t > g.expiresAt) setGolden(null);
        else if (!g && !goldenActive(next) && Math.random() < use / 150) {
          setGolden({
            id: Date.now(),
            kind: rollGoldenKind(Math.random),
            x: 12 + Math.random() * 70,
            y: 24 + Math.random() * 45,
            expiresAt: t + 12000,
          });
        }
        if (sinceSave >= 5) {
          sinceSave = 0;
          try { localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(next, Date.now())); } catch { /* full/blocked storage never kills the game */ }
        }
      }
      raf = requestAnimationFrame(step);
    };
    const reactToEvent = (e: TickEvent) => {
      if (e.kind === 'goal') {
        pushFloater(`GOAL! +$${e.amount}`, 'goal', 30 + Math.random() * 40, 20 + Math.random() * 25);
        setConfetti(c => c + 1);
      } else if (e.kind === 'win') {
        pushFloater(`FULL TIME WIN +$${e.amount}`, 'win', 32, 12);
        setConfetti(c => c + 1);
      } else if (e.kind === 'milestone') {
        pushFloater(`🏁 ${e.label} +$${e.amount}`, 'win', 18, 30);
        setConfetti(c => c + 1);
      } else if (e.kind === 'promoted') {
        // Round 162: the loudest moment the game has.
        pushFloater(`${e.label} +$${e.amount}`, 'win', 16, 20);
        setConfetti(c => c + 2);
      } else if (e.kind === 'ach') {
        pushFloater(`${e.label}: +2% forever`, 'win', 22, 36);
        setConfetti(c => c + 1);
      } else if (e.kind === 'conceded') {
        pushFloater('they score', 'bad', 25 + Math.random() * 50, 55 + Math.random() * 25);
      } else if (e.kind === 'loss') {
        pushFloater('full time. beaten', 'bad', 34, 14);
      }
    };
    raf = requestAnimationFrame(step);
    const onHide = () => {
      try { localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(stateRef.current, Date.now())); } catch { /* ignore */ }
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      onHide();
    };
  }, [pushFloater]);

  /* Round 195: the idle game counts as playing TODAY. One unscored mark
     per session, on the first meaningful action (a tap, a purchase, a
     hire or, since Round 196, a legacy buy), the S-1 rule the header
     games have followed since Round 157.
     A ref, not state: marking must never re-render the game loop. */
  const sessionMarkedRef = useRef(false);
  const markSessionPlay = useCallback(() => {
    if (sessionMarkedRef.current) return;
    sessionMarkedRef.current = true;
    recordCompletion('/stadium-tycoon');
  }, []);

  const doBuy = useCallback((id: string) => {
    markSessionPlay();
    setState(s => buy(s, id));
  }, []);

  /* Round 162: the payroll. */
  const doHire = useCallback((id: string) => {
    markSessionPlay();
    setState(s => hire(s, id));
  }, []);

  /* Round 162: catching the whistle. The floater says what it was worth. */
  const doCatchGolden = useCallback(() => {
    const g = goldenRef.current;
    if (!g) return;
    setGolden(null);
    const { state: next, amount } = catchGolden(stateRef.current, g.kind);
    if (next === stateRef.current) return;
    const info = GOLDEN_INFO[g.kind];
    if (g.kind === 'windfall') pushFloater(`🪙 ${info.label} +${fmtMoney(amount ?? 0)}`, 'win', g.x, g.y);
    else if (g.kind === 'fanWave') pushFloater(`🪙 ${info.label}: +${(amount ?? 0).toLocaleString()} fans`, 'win', g.x, g.y);
    else if (g.kind === 'freeLevel') pushFloater(`🪙 ${info.label}: ${info.blurb}`, 'win', g.x, g.y);
    else pushFloater(`🪙 ${info.label}: ${info.blurb}!`, 'win', g.x, g.y);
    setConfetti(c => c + 1);
    setState(next);
  }, [pushFloater]);

  const doTap = useCallback((xPct: number, yPct: number) => {
    markSessionPlay();
    const before = stateRef.current;
    const after = tap(before);
    pushFloater(`+$${after.money - before.money >= 1 ? Math.round(after.money - before.money) : 1}`, 'tap', xPct, yPct);
    setState(after);
  }, [pushFloater]);

  const doBoost = useCallback(() => {
    const before = stateRef.current;
    const after = activateBoost(before);
    if (after !== before) {
      pushFloater('MATCHDAY HYPE x2!', 'win', 30, 18);
      setConfetti(c => c + 1);
      setState(after);
    }
  }, [pushFloater]);

  const doPrestige = useCallback(() => {
    setState(s => {
      const next = prestige(s, Date.now());
      try { localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(next, Date.now())); } catch { /* ignore */ }
      return next;
    });
  }, []);

  /* Round 196: the boardroom. Spending legacy is a meaningful action too,
     so it marks the session like a tap or a hire does. */
  const doLegacyPerk = useCallback((id: string) => {
    markSessionPlay();
    const before = stateRef.current;
    const after = buyPerk(before, id);
    if (after === before) return;
    const p = perkById(id);
    if (p) pushFloater(`${p.emoji} ${p.name}: locked in forever`, 'win', 24, 30);
    setConfetti(c => c + 1);
    setState(after);
    try { localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(after, Date.now())); } catch { /* ignore */ }
  }, [pushFloater]);

  const dismissAway = useCallback(() => setAwayPay(null), []);

  return {
    state, floaters, awayPay, dismissAway, confetti,
    doBuy, doTap, doPrestige, doBoost,
    golden, doCatchGolden, doHire, doLegacyPerk,
  };
}
