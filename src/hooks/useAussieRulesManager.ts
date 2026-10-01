import { useRef, useState } from 'react';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { createManager, readManagerSave, reduceManager, replayManager, SAVE_KEY, SLUG, type ManagerAction, type ManagerSave, type ManagerState } from '@/lib/aussieRulesManager';

function load() {
  try { return { loaded: readManagerSave(localStorage.getItem(SAVE_KEY)), notice: null as string | null }; }
  catch { return { loaded: null, notice: 'This browser could not load your save. You can still play.' }; }
}

export function useAussieRulesManager() {
  const [initial] = useState(load);
  const [state, setState] = useState<ManagerState | null>(initial.loaded?.state ?? null);
  const [storageNotice, setStorageNotice] = useState<string | null>(initial.notice);
  const stateRef = useRef(state);
  const saveRef = useRef<ManagerSave | null>(initial.loaded?.save ?? null);
  useGameCompletion(SLUG, state?.phase === 'complete', undefined);

  const write = (save: ManagerSave) => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); setStorageNotice(null); }
    catch { setStorageNotice('Your season is running here, but this browser could not save it.'); }
  };
  const start = (seed: number, clubId: string): boolean => {
    const next = createManager(seed, clubId);
    if (!next) return false;
    const save: ManagerSave = { version: 1, seed, clubId, actions: [] };
    stateRef.current = next; saveRef.current = save; setState(next); write(save);
    return true;
  };
  const dispatch = (action: ManagerAction): boolean => {
    const current = stateRef.current;
    const save = saveRef.current;
    if (!current || !save) return false;
    const next = reduceManager(current, action);
    if (next === current) return false;
    const actions = [...save.actions];
    // Only the final pre-match lineup affects replay; consecutive edits replace it.
    if (action.type === 'lineup') {
      if (actions[actions.length - 1]?.type === 'lineup') actions.pop();
      const beforeLineup = replayManager(save.seed, save.clubId, actions)!;
      const isOriginal = action.starters.every((id, index) => id === beforeLineup.starters[index]) && action.bench.every((id, index) => id === beforeLineup.bench[index]);
      if (!isOriginal) actions.push({ ...action, starters: [...action.starters], bench: [...action.bench] });
    } else actions.push({ ...action });
    const nextSave: ManagerSave = { ...save, actions };
    stateRef.current = next; saveRef.current = nextSave; setState(next); write(nextSave);
    return true;
  };
  const reset = () => {
    stateRef.current = null; saveRef.current = null; setState(null);
    try { localStorage.removeItem(SAVE_KEY); setStorageNotice(null); }
    catch { setStorageNotice('This browser could not remove your old save.'); }
  };
  return { state, start, dispatch, reset, storageNotice };
}
