import { useMemo, useRef, useState } from 'react';
import { recordCompletion } from '@/lib/completions';
import { getTodayET } from '@/lib/dateUtils';
import { randomSeed } from '@/lib/perfectSeason';
import {
  SOCCER_PS_GAMES, SOCCER_PS_SLOTS, SOCCER_PS_VERSION,
  applySoccerAction, createSoccerRun, deriveSoccerRun, restoreSoccerRun,
  type SoccerPSAction, type SoccerPSMode, type SoccerPSRun, type SoccerPSSlot,
} from '@/lib/soccerPerfectSeason';

export const SOCCER_PS_PATH = '/soccer-perfect-season';
const saveKey = (mode: SoccerPSMode) => `dukb-soccer-perfect-season-${SOCCER_PS_VERSION}-${mode}`;
type Saved = { run: SoccerPSRun | null; invalid: boolean };

function readSaved(mode: SoccerPSMode): Saved {
  try {
    const raw = localStorage.getItem(saveKey(mode));
    if (raw !== null) {
      const run = restoreSoccerRun(raw);
      return run?.mode === mode ? { run, invalid: false } : { run: null, invalid: true };
    }
  } catch {
    // Play can continue for this visit when storage is unavailable.
  }
  return { run: null, invalid: false };
}

export function useSoccerPerfectSeason() {
  const [saved, setSaved] = useState(() => ({ daily: readSaved('daily'), unlimited: readSaved('unlimited') }));
  const [run, setRun] = useState<SoccerPSRun | null>(null);
  const [storageNotice, setStorageNotice] = useState(false);
  const runRef = useRef<SoccerPSRun | null>(null);
  const savedRef = useRef(saved);
  const unsaved = useRef(new Set<SoccerPSMode>());
  const view = useMemo(() => run ? deriveSoccerRun(run) : null, [run]);

  const activate = (next: SoccerPSRun | null) => {
    runRef.current = next;
    setRun(next);
    setStorageNotice(next ? unsaved.current.has(next.mode) : unsaved.current.size > 0);
  };

  const remember = (next: SoccerPSRun) => {
    savedRef.current = { ...savedRef.current, [next.mode]: { run: next, invalid: false } };
    setSaved(savedRef.current);
  };

  const apply = (next: SoccerPSRun) => {
    activate(next);
    remember(next);
    try {
      localStorage.setItem(saveKey(next.mode), JSON.stringify(next));
      unsaved.current.delete(next.mode);
      setStorageNotice(false);
    } catch {
      unsaved.current.add(next.mode);
      setStorageNotice(true);
    }
  };

  const latest = (mode: SoccerPSMode) => {
    const inMemory = savedRef.current[mode].run;
    return unsaved.current.has(mode) ? inMemory : readSaved(mode).run ?? inMemory;
  };

  const startDaily = () => {
    const date = getTodayET();
    const previous = latest('daily');
    if (previous?.date === date) {
      remember(previous);
      activate(previous);
    } else apply(createSoccerRun('daily', date));
  };

  const startUnlimited = () => apply(createSoccerRun('unlimited', null, randomSeed()));
  const resume = (mode: SoccerPSMode) => {
    const previous = latest(mode);
    if (!previous) return false;
    remember(previous);
    activate(previous);
    return true;
  };

  const syncStoredRun = (current: SoccerPSRun) => {
    if (unsaved.current.has(current.mode)) return false;
    try {
      const raw = localStorage.getItem(saveKey(current.mode));
      if (!raw || raw === JSON.stringify(current)) return false;
      const persisted = restoreSoccerRun(raw);
      if (persisted?.mode !== current.mode) return false;
      // A stale action belongs to the old board. Show the latest board first.
      remember(persisted);
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
    // Persist the completed season before submitting its score.
    apply(next);
    if (completionRecorded) recordCompletion('/soccer-perfect-season', deriveSoccerRun(next).record.score);
    return true;
  };

  return {
    run, view, savedDaily: saved.daily, savedUnlimited: saved.unlimited, storageNotice,
    startDaily, startUnlimited, resumeDaily: () => resume('daily'), resumeUnlimited: () => resume('unlimited'),
    backToMenu: () => activate(null),
    choosePlayer: (playerId: string, slot: SoccerPSSlot) => draft({ type: 'pick', playerId, slot }),
    reroll: () => draft({ type: 'reroll' }),
    revealNext: () => advance(false), finishSeason: () => advance(true),
  };
}
