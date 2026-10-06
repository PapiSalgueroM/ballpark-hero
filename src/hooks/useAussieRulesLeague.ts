import { useRef, useState } from 'react';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { createLeague, LEGACY_SAVE_KEY, readLeagueSave, reduceLeague, SAVE_KEY, SLUG, type LeagueAction, type LeagueState } from '@/lib/aussieRulesLeague';

/** Round 1014: the full season's state lives in memory and the whole of it is the save. */
function load(): { loaded: LeagueState | null; notice: string | null } {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const loaded = readLeagueSave(raw);
    return { loaded, notice: raw && !loaded ? 'This save could not be read. Start a new career below; the old save is left where it is.' : null };
  } catch { return { loaded: null, notice: 'This browser could not load your save. You can still play.' }; }
}

export function useAussieRulesLeague() {
  const [initial] = useState(load);
  const [state, setState] = useState<LeagueState | null>(initial.loaded);
  const [storageNotice, setStorageNotice] = useState<string | null>(initial.notice);
  const stateRef = useRef(state);
  // One record per season: the hook only counts a finish it watched happen, so a restore stays quiet.
  useGameCompletion(SLUG, state?.phase === 'seasonOver', undefined);

  const write = (next: LeagueState) => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(next)); setStorageNotice(null); }
    catch { setStorageNotice('Your season is running here, but this browser could not save it.'); }
  };
  const start = (seed: number, clubId: string): boolean => {
    const next = createLeague(seed, clubId);
    if (!next) return false;
    stateRef.current = next; setState(next); write(next);
    try { localStorage.removeItem(LEGACY_SAVE_KEY); } catch { /* the legacy save stays; the league save wins on the next visit */ }
    return true;
  };
  const dispatch = (action: LeagueAction): boolean => {
    const current = stateRef.current;
    if (!current) return false;
    const next = reduceLeague(current, action);
    if (next === current) return false;
    stateRef.current = next; setState(next); write(next);
    return true;
  };
  const reset = () => {
    stateRef.current = null; setState(null);
    try { localStorage.removeItem(SAVE_KEY); setStorageNotice(null); }
    catch { setStorageNotice('This browser could not remove your old save.'); }
  };
  return { state, start, dispatch, reset, storageNotice };
}
