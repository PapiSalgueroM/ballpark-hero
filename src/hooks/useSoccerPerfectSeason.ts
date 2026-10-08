import { useMemo, useRef, useState } from 'react';
import { recordCompletion } from '@/lib/completions';
import { getTodayET } from '@/lib/dateUtils';
import { randomSeed } from '@/lib/perfectSeason';
import {
  SOCCER_PS_GAMES, SOCCER_PS_SLOTS,
  canDraftSoccerCard, createSoccerRun, dealSoccerXI, deriveSoccerRun, restoreSoccerRun,
  type SoccerPSMode, type SoccerPSRun,
} from '@/lib/soccerPerfectSeason';

export const SOCCER_PS_DAILY_SAVE_KEY = 'dukb-soccer-perfect-season-soccer-ps-v1-daily';
export const SOCCER_PS_UNLIMITED_SAVE_KEY = 'dukb-soccer-perfect-season-soccer-ps-v1-unlimited';
export interface SoccerPSSaved { run: SoccerPSRun | null; invalid: boolean }

const saveKey = (mode: SoccerPSMode) => mode === 'daily' ? SOCCER_PS_DAILY_SAVE_KEY : SOCCER_PS_UNLIMITED_SAVE_KEY;
function readSaved(mode: SoccerPSMode): { saved: SoccerPSSaved; notice: string | null } {
  try {
    const raw = localStorage.getItem(saveKey(mode));
    if (raw === null) return { saved: { run: null, invalid: false }, notice: null };
    const run = restoreSoccerRun(raw);
    return { saved: run?.mode === mode ? { run, invalid: false } : { run: null, invalid: true }, notice: null };
  } catch {
    return { saved: { run: null, invalid: false }, notice: 'This browser could not load your saved season. You can still play here.' };
  }
}

export function useSoccerPerfectSeason() {
  const [initial] = useState(() => ({ daily: readSaved('daily'), unlimited: readSaved('unlimited') }));
  const [run, setRun] = useState<SoccerPSRun | null>(null);
  const [savedDaily, setSavedDaily] = useState<SoccerPSSaved>(initial.daily.saved);
  const [savedUnlimited, setSavedUnlimited] = useState<SoccerPSSaved>(initial.unlimited.saved);
  const [storageNotice, setStorageNotice] = useState<string | null>(initial.daily.notice ?? initial.unlimited.notice);
  const runRef = useRef<SoccerPSRun | null>(null);
  const savedRef = useRef({ daily: initial.daily.saved, unlimited: initial.unlimited.saved });
  const view = useMemo(() => run ? deriveSoccerRun(run) : null, [run]);

  const activate = (next: SoccerPSRun | null) => {
    runRef.current = next;
    setRun(next);
  };
  const persist = (next: SoccerPSRun) => {
    const saved = { run: next, invalid: false };
    savedRef.current[next.mode] = saved;
    if (next.mode === 'daily') setSavedDaily(saved);
    else setSavedUnlimited(saved);
    try {
      localStorage.setItem(saveKey(next.mode), JSON.stringify(next));
      setStorageNotice(null);
    } catch {
      setStorageNotice('This season is running here, but this browser could not save it.');
    }
  };
  const apply = (next: SoccerPSRun) => { activate(next); persist(next); };

  const startDaily = (): boolean => {
    const date = getTodayET();
    const saved = savedRef.current.daily.run;
    if (saved?.date === date) activate(saved);
    else apply(createSoccerRun('daily', date));
    return true;
  };
  const startUnlimited = (): boolean => {
    apply(createSoccerRun('unlimited', null, randomSeed()));
    return true;
  };
  const resumeDaily = (): boolean => {
    const saved = savedRef.current.daily.run;
    if (!saved) return false;
    activate(saved);
    return true;
  };
  const resumeUnlimited = (): boolean => {
    const saved = savedRef.current.unlimited.run;
    if (!saved) return false;
    activate(saved);
    return true;
  };
  const backToMenu = () => activate(null);
  const chooseCard = (index: number): boolean => {
    const current = runRef.current;
    if (!current || !canDraftSoccerCard(dealSoccerXI(current.seed, current.version), current.choices, index)) return false;
    apply({ ...current, choices: [...current.choices, index] });
    return true;
  };
  const advance = (all: boolean): boolean => {
    const current = runRef.current;
    if (!current || current.choices.length !== SOCCER_PS_SLOTS.length || current.revealed >= SOCCER_PS_GAMES) return false;
    const revealed = all ? SOCCER_PS_GAMES : current.revealed + 1;
    const completed = revealed === SOCCER_PS_GAMES && !current.completionRecorded;
    const next = { ...current, revealed, completionRecorded: current.completionRecorded || completed };
    // Save the completion marker before submitting a live finish.
    apply(next);
    if (completed) recordCompletion('/soccer-perfect-season', deriveSoccerRun(next).record.score);
    return true;
  };

  return { run, view, savedDaily, savedUnlimited, storageNotice, startDaily, startUnlimited,
    resumeDaily, resumeUnlimited, backToMenu, chooseCard,
    revealNext: () => advance(false), finishSeason: () => advance(true) };
}
