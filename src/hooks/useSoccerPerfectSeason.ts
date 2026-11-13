import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { recordCompletion } from '@/lib/completions';
import { getTodayET } from '@/lib/dateUtils';
import { randomSeed } from '@/lib/perfectSeason';
import { getStorageTrouble, holdPendingSave } from '@/lib/safeStorage';
import {
  SOCCER_PS_GAMES, SOCCER_PS_SLOTS, SOCCER_PS_VERSION,
  applySoccerAction, createSoccerRun, deriveSoccerRun, restoreSoccerRun,
  type SoccerPSAction, type SoccerPSMode, type SoccerPSRun, type SoccerPSSlot,
} from '@/lib/soccerPerfectSeason';

export const SOCCER_PS_PATH = '/soccer-perfect-season';
const saveKey = (mode: SoccerPSMode) => `dukb-soccer-perfect-season-${SOCCER_PS_VERSION}-${mode}`;
type Saved = { run: SoccerPSRun | null; invalid: boolean; raw: string | null | undefined; refused?: boolean };
const pendingFinish = (saved: Saved) => saved.refused && saved.run?.completionRecorded ? saved.run : null;

function readRaw(mode: SoccerPSMode): string | null | undefined {
  try {
    return localStorage.getItem(saveKey(mode));
  } catch {
    // Play can continue for this visit when storage is unavailable.
    return undefined;
  }
}

function readSaved(mode: SoccerPSMode, raw = readRaw(mode)): Saved {
  const run = raw == null ? null : restoreSoccerRun(raw);
  return run?.mode === mode ? { run, invalid: false, raw } : { run: null, invalid: raw != null, raw };
}

export function useSoccerPerfectSeason() {
  const [saved, setSaved] = useState(() => ({ daily: readSaved('daily'), unlimited: readSaved('unlimited') }));
  const [run, setRun] = useState<SoccerPSRun | null>(null);
  const runRef = useRef<SoccerPSRun | null>(null);
  const savedRef = useRef(saved);
  const view = useMemo(() => run ? deriveSoccerRun(run) : null, [run]);

  const activate = useCallback((next: SoccerPSRun | null) => {
    runRef.current = next;
    setRun(next);
  }, []);

  const remember = useCallback((mode: SoccerPSMode, next: Saved) => {
    savedRef.current = { ...savedRef.current, [mode]: next };
    setSaved(savedRef.current);
  }, []);

  const apply = (next: SoccerPSRun, before = savedRef.current[next.mode].raw) => {
    activate(next);
    const raw = JSON.stringify(next);
    try {
      localStorage.setItem(saveKey(next.mode), raw);
      remember(next.mode, { run: next, invalid: false, raw });
    } catch {
      remember(next.mode, { run: next, invalid: false, raw: before, refused: true });
    }
  };

  const persistFinish = useCallback((next: SoccerPSRun) => {
    const { mode } = next;
    const before = savedRef.current[mode].raw;
    const bytes = JSON.stringify(next);
    let written = false;
    try {
      // The blocked-storage stand-in keeps bytes only for this visit.
      if (getStorageTrouble() !== 'blocked') {
        const raw = localStorage.getItem(saveKey(mode));
        if (raw !== (before ?? null)) {
          // The result belongs to the old board. Never overwrite a different save.
          const newer = readSaved(mode, raw);
          remember(mode, newer);
          if (runRef.current?.mode === mode) activate(newer.run);
          return true;
        }
        localStorage.setItem(saveKey(mode), bytes);
        written = true;
      }
    } catch {
      // Keep this result until the browser accepts it or a newer save takes its place.
    }
    remember(mode, { run: next, invalid: false, raw: written ? bytes : before, refused: !written });
    if (runRef.current?.mode === mode) activate(next);
    if (written) recordCompletion(SOCCER_PS_PATH, deriveSoccerRun(next).record.score);
    return written;
  }, [activate, remember]);

  const retryFinishes = useCallback((mode?: SoccerPSMode) => {
    let settled = true;
    for (const key of mode ? [mode] : ['daily', 'unlimited'] as const) {
      const next = pendingFinish(savedRef.current[key]);
      if (next && !persistFinish(next)) settled = false;
    }
    return settled;
  }, [persistFinish]);

  const pendingDaily = Boolean(pendingFinish(saved.daily));
  const pendingUnlimited = Boolean(pendingFinish(saved.unlimited));
  const hasPendingFinish = pendingDaily || pendingUnlimited;
  useEffect(() => {
    if (hasPendingFinish) return holdPendingSave(retryFinishes);
  }, [hasPendingFinish, retryFinishes]);

  const latest = (mode: SoccerPSMode) => {
    const inMemory = savedRef.current[mode];
    if (inMemory.refused) return inMemory;
    const stored = readSaved(mode);
    return stored.raw === undefined ? inMemory : stored;
  };

  const startDaily = () => {
    const date = getTodayET();
    const previous = latest('daily');
    if (previous.run?.date === date) {
      remember('daily', { ...previous, invalid: false });
      activate(previous.run);
    } else apply(createSoccerRun('daily', date), readRaw('daily'));
  };

  const resume = (mode: SoccerPSMode) => {
    const previous = latest(mode);
    if (!previous.run) return false;
    remember(mode, { ...previous, invalid: false });
    activate(previous.run);
    return true;
  };

  const startUnlimited = () => apply(createSoccerRun('unlimited', null, randomSeed()), readRaw('unlimited'));

  const syncStoredRun = (current: SoccerPSRun) => {
    if (savedRef.current[current.mode].refused) return false;
    try {
      const raw = localStorage.getItem(saveKey(current.mode));
      if (!raw || raw === JSON.stringify(current)) return false;
      const persisted = restoreSoccerRun(raw);
      if (persisted?.mode !== current.mode) return false;
      // A stale action belongs to the old board. Show the latest board first.
      remember(current.mode, { run: persisted, invalid: false, raw });
      activate(persisted);
      return true;
    } catch {
      return false;
    }
  };

  const draft = (action: SoccerPSAction) => {
    const current = runRef.current;
    if (!current || syncStoredRun(current)) return false;
    const next = applySoccerAction(current, action);
    if (!next) return false;
    apply(next);
    return true;
  };

  const advance = (all: boolean) => {
    const current = runRef.current;
    if (!current || current.revealed === SOCCER_PS_GAMES || syncStoredRun(current)) return false;
    const draftPicks = current.actions.filter(action => action.type === 'pick').length;
    if (draftPicks !== SOCCER_PS_SLOTS.length) return false;
    const revealed = all ? SOCCER_PS_GAMES : current.revealed + 1;
    const completionRecorded = revealed === SOCCER_PS_GAMES;
    const next = { ...current, revealed, completionRecorded };
    if (completionRecorded) persistFinish(next);
    else apply(next);
    return true;
  };

  return {
    run, view,
    savedDaily: { run: saved.daily.run, invalid: saved.daily.invalid },
    savedUnlimited: { run: saved.unlimited.run, invalid: saved.unlimited.invalid },
    storageNotice: run ? Boolean(saved[run.mode].refused) : Boolean(saved.daily.refused || saved.unlimited.refused),
    canRetrySave: run ? Boolean(pendingFinish(saved[run.mode])) : hasPendingFinish,
    pendingDaily, pendingUnlimited, retrySave: () => retryFinishes(runRef.current?.mode),
    startDaily, startUnlimited, resumeDaily: () => resume('daily'), resumeUnlimited: () => resume('unlimited'),
    backToMenu: () => activate(null),
    choosePlayer: (playerId: string, slot: SoccerPSSlot) => draft({ type: 'pick', playerId, slot }),
    reroll: () => draft({ type: 'reroll' }),
    revealNext: () => advance(false), finishSeason: () => advance(true),
  };
}
