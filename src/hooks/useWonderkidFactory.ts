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
  newFactory, deserialize, serialize, applyOffline, advanceClock,
  buyFacility, sellProspect, startShowcase, moveUp,
  bedFree, deliverPack, makeProspectInBand, promote, sellSenior, equipBoot,
} from '@/lib/wonderkidFactory';
import type { PackId } from '@/lib/wonderkidFactory';
import { commitOpenPack, clearPendingPack, loadLedger, commitUpgradeBoot } from '@/lib/tycoonRewards';
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
    try { loaded = deserialize(localStorage.getItem(SAVE_KEY), now, loadLedger().gearLevel); } catch { loaded = null; }
    const s = loaded ?? newFactory(now);
    const applied = applyOffline(s, now);
    if (applied > 60) s.scoutProgress = Math.max(s.scoutProgress, 0);
    stateRef.current = s;
  }
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion(v => v + 1), []);
  const [packSaveBlocked, setPackSaveBlocked] = useState(false);
  const [academySaveBlocked, setAcademySaveBlocked] = useState(false);
  const [gearSaveBlocked, setGearSaveBlocked] = useState(false);

  /* Moving a player only reaches the screen after the whole academy is saved. */
  const commitAcademy = useCallback((next: FactoryState): boolean => {
    try { localStorage.setItem(SAVE_KEY, serialize(next)); } catch {
      setAcademySaveBlocked(true);
      return false;
    }
    Object.assign(stateRef.current!, next);
    setAcademySaveBlocked(false);
    bump();
    return true;
  }, [bump]);

  /** Round 585: a pack opened and not yet in a bed (a reload between the draw
   *  and the delivery, or a bed that filled) moves in as soon as a bed is free. */
  const deliverWaiting = useCallback((s: FactoryState): boolean => {
    const pending = loadLedger().pending;
    if (!pending) return false;
    const next = { ...s, prospects: [...s.prospects] };
    if (!deliverPack(next, pending.seq, pending.kid, pending.tier)) return false;
    try { localStorage.setItem(SAVE_KEY, serialize(next)); } catch {
      setPackSaveBlocked(true);
      return false;
    }
    Object.assign(s, next);
    setPackSaveBlocked(false);
    return true;
  }, []);

  const [floaters, setFloaters] = useState<Floater[]>([]);
  const floaterId = useRef(1);
  const pushFloater = useCallback((text: string, kind: Floater['kind']) => {
    const id = floaterId.current++;
    setFloaters(f => [...f.slice(-4), { id, text, kind }]);
    window.setTimeout(() => setFloaters(f => f.filter(x => x.id !== id)), 2600);
  }, []);

  /* the clock, and the save that survives a closed lid.
     Round 581: each callback pays the wall time since the last one, not a fixed
     quarter second. A browser that hides the tab slows this interval to once a
     second and then once a minute, and a fixed step turned three hidden hours
     into a minute or two of training. advanceClock pays a watched gap at full
     speed and a hidden page, or a gap too long to have been watched, as time
     away, under the same half speed, eight hour, nobody-ages rule a closed tab
     gets on load. The academy panel hidden under Stadium Tycoon's other tab is
     still a visible page, so it keeps its watched clock. */
  useEffect(() => {
    const iv = window.setInterval(() => {
      const s = stateRef.current!;
      const before = s.prospects.length;
      const now = Date.now();
      advanceClock(s, now - s.lastSeen, document.visibilityState !== 'hidden');
      s.lastSeen = now;
      const scouted = s.prospects.length > before;
      if (deliverWaiting(s)) pushFloater('🎁 your pack kid moved into a free bed', 'win');
      if (scouted) pushFloater('🔭 the scouts found someone', 'find');
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
  }, [bump, pushFloater, deliverWaiting]);

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
    const next = copyAcademy(stateRef.current!);
    if (moveUp(next) && commitAcademy(next)) {
      markSessionPlay();
      pushFloater('⭐ the academy moves up in the world', 'win');
    }
  }, [commitAcademy, markSessionPlay, pushFloater]);

  const doPromote = useCallback((id: number) => {
    const next = copyAcademy(stateRef.current!);
    const kid = next.prospects.find(p => p.id === id);
    if (kid && promote(next, id) && commitAcademy(next)) {
      markSessionPlay();
      pushFloater(`⚽ ${kid.name} joined the first team`, 'win');
    }
  }, [commitAcademy, markSessionPlay, pushFloater]);

  const doSellSenior = useCallback((id: string) => {
    const next = copyAcademy(stateRef.current!);
    const player = next.firstTeam?.find(p => p.id === id);
    const price = sellSenior(next, id);
    if (player && price !== null && commitAcademy(next)) {
      markSessionPlay();
      pushFloater(`💷 ${player.name} sold for ${price.toLocaleString()}`, 'sale');
    }
  }, [commitAcademy, markSessionPlay, pushFloater]);

  const doEquipBoot = useCallback((seniorId: string, bootId: string | null) => {
    const next = copyAcademy(stateRef.current!);
    if (!equipBoot(next, seniorId, bootId, loadLedger().gearLevel ?? {})) return;
    setGearSaveBlocked(!commitAcademy(next));
  }, [commitAcademy]);

  const doUpgradeBoot = useCallback((bootId: string) => {
    try {
      if (commitUpgradeBoot(bootId)) {
        setGearSaveBlocked(false);
        bump();
      }
    } catch { setGearSaveBlocked(true); }
  }, [bump]);

  /* Round 585: open a pack. The ledger stores the draw first, then the kid moves
     into a free bed and the academy is saved, all before anything is shown. */
  /* Review: no session mark here. Safeguard 2 keeps packs and gems away from
     streaks, and a mark is what a streak counts. */
  const doOpenPack = useCallback((id: PackId) => {
    const s = stateRef.current!;
    let pending;
    try {
      pending = commitOpenPack(
        id, bedFree(s),
        (potMin, potMax, rng) => makeProspectInBand({ ...s, prospects: [...s.prospects] }, potMin, potMax, rng),
        (s.packsDelivered ?? 0) + 1,
      );
    } catch {
      setPackSaveBlocked(true);
      return;
    }
    if (!pending) return;
    deliverWaiting(s);
    bump();
  }, [bump, deliverWaiting]);

  const doDismissPack = useCallback(() => {
    const s = stateRef.current!;
    try { localStorage.setItem(SAVE_KEY, serialize(s)); } catch {
      setPackSaveBlocked(true);
      return;
    }
    setPackSaveBlocked(false);
    if (clearPendingPack(s.packsDelivered ?? 0)) bump();
  }, [bump]);

  return {
    state: stateRef.current,
    floaters,
    doBuy,
    doSell,
    doShowcase,
    doMoveUp,
    doOpenPack,
    doDismissPack,
    packSaveBlocked,
    doPromote,
    doSellSenior,
    academySaveBlocked,
    doEquipBoot,
    doUpgradeBoot,
    gearSaveBlocked,
  };
}

function copyAcademy(s: FactoryState): FactoryState {
  return {
    ...s,
    prospects: s.prospects.map(p => ({ ...p })),
    ...(s.firstTeam ? { firstTeam: s.firstTeam.map(p => ({ ...p })) } : {}),
  };
}
