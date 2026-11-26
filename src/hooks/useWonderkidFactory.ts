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
import { useOwnedTimeouts } from '@/hooks/useOwnedTimeouts';
import {
  FactoryState, FacilityId, SAVE_KEY,
  newFactory, deserialize, serialize, applyOffline, advanceClock,
  buyFacility, salePrice, sellProspect, startShowcase, moveUp, setCoachingFocus,
  bedFree, deliverPack, makeProspectInBand, promote, sellSenior, equipBoot, updateDevelopmentTarget,
} from '@/lib/wonderkidFactory';
import type { DevelopmentTargetAction, PackId } from '@/lib/wonderkidFactory';
import { commitOpenPack, clearPendingPack, loadLedger, commitUpgradeBoot } from '@/lib/tycoonRewards';
import { recordCompletion } from '@/lib/completions';
import { backupKeysOf, copyAside, dismissBackup, routeSaveEntry } from '@/lib/brokenSaveRecovery';
import { createSaveFence, fenceKeyOf, type FenceWrite } from '@/lib/saveFence';

export interface Floater {
  id: number;
  text: string;
  kind: 'sale' | 'find' | 'bad' | 'win';
}

function readAcademyBytes(): string | null | undefined {
  try { return localStorage.getItem(SAVE_KEY); } catch { return undefined; }
}

function hasAcademyContainers(raw: string): boolean {
  // Every writer including the first v1 wrote these containers. The engine
  // can still repair individual fields within them or salvage other fields.
  const { levels, prospects, firstTeam } = JSON.parse(raw) as Partial<FactoryState>;
  return Boolean(levels && typeof levels === 'object' && !Array.isArray(levels))
    && Array.isArray(prospects)
    && (firstTeam === undefined || Array.isArray(firstTeam));
}

function readAcademy(raw: string | null | undefined) {
  const now = Date.now();
  const loaded = deserialize(raw ?? null, now, loadLedger().gearLevel);
  const s = loaded ?? newFactory(now);
  const applied = applyOffline(s, now);
  if (applied > 60) s.scoutProgress = Math.max(s.scoutProgress, 0);
  return { state: s, needsCopy: typeof raw === 'string' && (!loaded || !hasAcademyContainers(raw)) };
}

function keepAcademyCopy(raw: string): string | undefined {
  const entry = routeSaveEntry('/wonderkid-factory');
  if (!entry) return;
  const kept = backupKeysOf(entry, localStorage).find(key => localStorage.getItem(key) === raw);
  if (kept) return kept;
  const copy = copyAside(entry, localStorage, new Date(), false, { raw, slot: 1 });
  if (!copy.ok || !copy.backupKey) return;
  dismissBackup(entry, copy.backupKey, localStorage);
  return copy.backupKey;
}

export function useWonderkidFactory() {
  const [fence] = useState(() => {
    const academyFence = createSaveFence(() => localStorage);
    academyFence.adopt(SAVE_KEY);
    return academyFence;
  });
  const savedAcademyBytes = useRef<string | null | undefined>(undefined);
  const stateRef = useRef<FactoryState | null>(null);
  const needsCopy = useRef(false);
  const unconfirmed = useRef(false);
  const loadAcademy = useCallback((raw: string | null | undefined) => {
    const loaded = readAcademy(raw);
    savedAcademyBytes.current = raw;
    stateRef.current = loaded.state;
    needsCopy.current = loaded.needsCopy;
  }, []);
  if (stateRef.current === null) loadAcademy(readAcademyBytes());
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion(v => v + 1), []);
  const [packSaveBlocked, setPackSaveBlocked] = useState(false);
  const [academySaveBlocked, setAcademySaveBlocked] = useState(false);
  const [gearSaveBlocked, setGearSaveBlocked] = useState(false);

  const saveMoved = useRef(false);
  const markMoved = useCallback(() => {
    if (!saveMoved.current) {
      saveMoved.current = true;
      bump();
    }
  }, [bump]);
  const checkMoved = useCallback((raw?: string | null) => {
    if (saveMoved.current) return true;
    const expected = savedAcademyBytes.current;
    if (fence.moved(SAVE_KEY) || (raw !== undefined && expected !== undefined && raw !== expected)) markMoved();
    return saveMoved.current;
  }, [fence, markMoved]);

  const readOwnedSnapshot = useCallback(() => {
    if (unconfirmed.current || needsCopy.current || saveMoved.current || fence.moved(SAVE_KEY)) return null;
    const raw = readAcademyBytes();
    return raw !== undefined && raw === savedAcademyBytes.current ? stateRef.current : null;
  }, [fence]);

  const actionsBlocked = useCallback(() => {
    if (unconfirmed.current) return true;
    const raw = readAcademyBytes();
    return checkMoved(raw) || needsCopy.current || raw === undefined || savedAcademyBytes.current === undefined;
  }, [checkMoved]);

  const writeAcademy = useCallback((next: FactoryState, verifyWrite = false): FenceWrite => {
    if (unconfirmed.current || savedAcademyBytes.current === undefined) return 'failed';
    if (checkMoved()) return 'moved';
    const expected = savedAcademyBytes.current;
    const bytes = serialize(next);
    try {
      let backupKey: string | undefined;
      if (needsCopy.current && expected !== null) {
        backupKey = keepAcademyCopy(expected);
        if (checkMoved(readAcademyBytes())) return 'moved';
        if (!backupKey) return 'failed';
      }
      if (localStorage.getItem(SAVE_KEY) !== expected) {
        markMoved();
        return 'moved';
      }
      const sameBytes = expected === bytes && !backupKey;
      if (sameBytes && !verifyWrite) return 'written';
      const generationKey = fenceKeyOf(SAVE_KEY);
      const generation = backupKey ? Number(localStorage.getItem(generationKey)) : 0;
      const claimed = String((Number.isSafeInteger(generation) && generation >= 0 ? generation : 0) + 1);
      let moved = false;
      const persist = () => {
        try {
          if (backupKey) {
            if (localStorage.getItem(SAVE_KEY) !== expected || localStorage.getItem(generationKey) !== claimed) {
              moved = true;
              return false;
            }
            if (localStorage.getItem(backupKey) !== expected) return false;
          }
          localStorage.setItem(SAVE_KEY, bytes);
          return true;
        } catch { return false; }
      };
      const result = sameBytes ? (persist() ? 'written' : 'failed') : fence.write(SAVE_KEY, persist, backupKey !== undefined);
      if (moved || result === 'moved') {
        markMoved();
        return 'moved';
      }
      if (result !== 'written') return result;
      if (backupKey) {
        // Never roll back an acknowledged claim because its receipt cannot be read.
        const written = readAcademyBytes();
        if (fence.moved(SAVE_KEY)) {
          markMoved();
          return 'moved';
        }
        let claimReadBack: string | null | undefined;
        try { claimReadBack = localStorage.getItem(generationKey); } catch { /* report an unconfirmed write */ }
        if (written !== bytes || claimReadBack !== claimed) {
          unconfirmed.current = true;
          bump();
          return 'failed';
        }
        needsCopy.current = false;
        bump();
      }
      savedAcademyBytes.current = bytes;
      return 'written';
    } catch { return 'failed'; }
  }, [bump, checkMoved, fence, markMoved]);

  const retryAcademySave = useCallback(() => {
    if (savedAcademyBytes.current === undefined) {
      if (checkMoved()) return;
      const raw = readAcademyBytes();
      if (raw === undefined) return;
      loadAcademy(raw);
      bump();
      if (!needsCopy.current) return;
    }
    writeAcademy(stateRef.current!);
  }, [bump, checkMoved, loadAcademy, writeAcademy]);

  /* Moving a player only reaches the screen after the whole academy is saved. */
  const commitAcademy = useCallback((next: FactoryState): boolean => {
    const result = writeAcademy(next);
    if (result !== 'written') {
      if (result === 'failed') setAcademySaveBlocked(true);
      return false;
    }
    stateRef.current = next;
    setAcademySaveBlocked(false);
    bump();
    return true;
  }, [bump, writeAcademy]);

  /** Round 585: a pack opened and not yet in a bed (a reload between the draw
   *  and the delivery, or a bed that filled) moves in as soon as a bed is free. */
  const deliverWaiting = useCallback((s: FactoryState): boolean => {
    const pending = loadLedger().pending;
    if (!pending) return false;
    const next = { ...s, prospects: [...s.prospects] };
    if (!deliverPack(next, pending.seq, pending.kid, pending.tier)) return false;
    const result = writeAcademy(next);
    if (result !== 'written') {
      if (result === 'failed') setPackSaveBlocked(true);
      return false;
    }
    Object.assign(s, next);
    setPackSaveBlocked(false);
    return true;
  }, [writeAcademy]);

  const [floaters, setFloaters] = useState<Floater[]>([]);
  const floaterId = useRef(1);
  /* Round 657: the floater timer is owned by the page (useOwnedTimeouts). */
  const later = useOwnedTimeouts();
  const pushFloater = useCallback((text: string, kind: Floater['kind']) => {
    const id = floaterId.current++;
    setFloaters(f => [...f.slice(-4), { id, text, kind }]);
    later(() => setFloaters(f => f.filter(x => x.id !== id)), 2600);
  }, [later]);

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
    // A route leaving in this tab can save after the next panel's first render.
    const raw = readAcademyBytes();
    if (fence.moved(SAVE_KEY) || (raw !== undefined && raw !== savedAcademyBytes.current)) {
      fence.adopt(SAVE_KEY);
      loadAcademy(raw);
      bump();
    }
    const iv = window.setInterval(() => {
      if (unconfirmed.current || checkMoved() || needsCopy.current || savedAcademyBytes.current === undefined) return;
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
    const save = () => { writeAcademy(stateRef.current!); };
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
  }, [bump, checkMoved, deliverWaiting, fence, loadAcademy, pushFloater, writeAcademy]);

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
    if (actionsBlocked()) return;
    markSessionPlay();
    if (buyFacility(stateRef.current!, id)) bump();
  }, [actionsBlocked, bump, markSessionPlay]);

  const doSell = useCallback((id: number, minimumPrice: number): 'price-changed' | undefined => {
    if (actionsBlocked()) return;
    const current = stateRef.current!;
    const kid = current.prospects.find(p => p.id === id);
    if (!kid) return;
    if (salePrice(current, kid) < minimumPrice) return 'price-changed';
    const next = copyAcademy(current);
    const price = sellProspect(next, id);
    if (price !== null && commitAcademy(next)) {
      markSessionPlay();
      pushFloater(`💵 ${kid.name} sold for $${price.toLocaleString('en-US')}`, 'sale');
    }
  }, [actionsBlocked, commitAcademy, markSessionPlay, pushFloater]);

  const doShowcase = useCallback(() => {
    if (actionsBlocked()) return;
    markSessionPlay();
    if (startShowcase(stateRef.current!)) {
      pushFloater('🎪 showcase day: training x3', 'win');
      bump();
    }
  }, [actionsBlocked, bump, markSessionPlay, pushFloater]);

  const doSetCoachingFocus = useCallback((id: number | null) => {
    if (actionsBlocked()) return;
    const next = { ...stateRef.current! };
    if (setCoachingFocus(next, id) && commitAcademy(next)) markSessionPlay();
  }, [actionsBlocked, commitAcademy, markSessionPlay]);

  const doDevelopmentTarget = useCallback((action: DevelopmentTargetAction) => {
    if (actionsBlocked()) return;
    const before = stateRef.current!;
    const next = updateDevelopmentTarget(before, action);
    if (next !== before) commitAcademy(next);
  }, [actionsBlocked, commitAcademy]);

  const doMoveUp = useCallback(() => {
    if (actionsBlocked()) return;
    const next = copyAcademy(stateRef.current!);
    if (moveUp(next) && commitAcademy(next)) {
      markSessionPlay();
      pushFloater('⭐ the academy moves up in the world', 'win');
    }
  }, [actionsBlocked, commitAcademy, markSessionPlay, pushFloater]);

  const doPromote = useCallback((id: number) => {
    if (actionsBlocked()) return;
    const next = copyAcademy(stateRef.current!);
    const kid = next.prospects.find(p => p.id === id);
    if (kid && promote(next, id) && commitAcademy(next)) {
      markSessionPlay();
      pushFloater(`⚽ ${kid.name} joined the first team`, 'win');
    }
  }, [actionsBlocked, commitAcademy, markSessionPlay, pushFloater]);

  const doSellSenior = useCallback((id: string) => {
    if (actionsBlocked()) return;
    const next = copyAcademy(stateRef.current!);
    const player = next.firstTeam?.find(p => p.id === id);
    const price = sellSenior(next, id);
    if (player && price !== null && commitAcademy(next)) {
      markSessionPlay();
      pushFloater(`💵 ${player.name} sold for $${price.toLocaleString('en-US')}`, 'sale');
    }
  }, [actionsBlocked, commitAcademy, markSessionPlay, pushFloater]);

  const doEquipBoot = useCallback((seniorId: string, bootId: string | null) => {
    if (actionsBlocked()) return;
    const next = copyAcademy(stateRef.current!);
    if (!equipBoot(next, seniorId, bootId, loadLedger().gearLevel ?? {})) return;
    setGearSaveBlocked(!commitAcademy(next));
  }, [actionsBlocked, commitAcademy]);

  const doUpgradeBoot = useCallback((bootId: string) => {
    if (actionsBlocked()) return;
    try {
      if (commitUpgradeBoot(bootId)) {
        setGearSaveBlocked(false);
        bump();
      }
    } catch { setGearSaveBlocked(true); }
  }, [actionsBlocked, bump]);

  /* Round 585: open a pack. The ledger stores the draw first, then the kid moves
     into a free bed and the academy is saved, all before anything is shown. */
  /* Review: no session mark here. Safeguard 2 keeps packs and gems away from
     streaks, and a mark is what a streak counts. */
  const doOpenPack = useCallback((id: PackId) => {
    if (actionsBlocked()) return;
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
  }, [actionsBlocked, bump, deliverWaiting]);

  const doDismissPack = useCallback(() => {
    if (actionsBlocked()) return;
    const s = stateRef.current!;
    // Keep the pending draw until the academy accepts a write.
    const result = writeAcademy(s, true);
    if (result !== 'written') {
      if (result === 'failed') setPackSaveBlocked(true);
      return;
    }
    setPackSaveBlocked(false);
    if (clearPendingPack(s.packsDelivered ?? 0)) bump();
  }, [actionsBlocked, bump, writeAcademy]);

  return {
    saveMoved: saveMoved.current,
    recovery: unconfirmed.current ? 'reload' : (needsCopy.current || savedAcademyBytes.current === undefined) ? 'retry' : null,
    retryAcademySave,
    state: stateRef.current!,
    readOwnedSnapshot,
    floaters,
    doBuy,
    doSetCoachingFocus,
    doDevelopmentTarget,
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
