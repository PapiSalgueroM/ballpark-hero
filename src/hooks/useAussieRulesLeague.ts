import { useRef, useState } from 'react';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { createLeague, CURRENT_CLUB_SET, LEGACY_SAVE_KEY, readLeagueSave, reduceLeague, SAVE_KEY, SLUG, switchClubSet, type LeagueAction, type LeagueState } from '@/lib/aussieRulesLeague';

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
    // Round 1572: a new career runs the real AFL clubs; a saved career keeps the set it was started with.
    const next = createLeague(seed, clubId, CURRENT_CLUB_SET);
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
  /** Round 1572: an invented league career plays on under the real AFL names; nothing else changes. */
  const switchNames = (): boolean => {
    const current = stateRef.current;
    if (!current || current.clubSet) return false;
    const next = switchClubSet(current);
    stateRef.current = next; setState(next); write(next);
    return true;
  };
  return { state, start, dispatch, reset, switchNames, storageNotice };
}
