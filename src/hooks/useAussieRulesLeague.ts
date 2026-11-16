import { useRef, useState } from 'react';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { createLeague, CURRENT_CLUB_SET, LEGACY_SAVE_KEY, readLeagueSave, reduceLeague, SAVE_KEY, SLUG, switchClubSet, type LeagueAction, type LeagueState } from '@/lib/aussieRulesLeague';
import { markRestoredFinish } from '@/lib/restoredFinish';

const unreadableSave = 'This save could not be read. Start a new career below; the old save is left where it is.';

function readBytes(): string | null | undefined {
  try { return localStorage.getItem(SAVE_KEY); }
  catch { return undefined; }
}

function load() {
  const raw = readBytes();
  const loaded = readLeagueSave(raw ?? null);
  const notice = raw === undefined ? 'This browser could not load your save. You can still play.' : raw && !loaded ? unreadableSave : null;
  return { raw, loaded, notice };
}

export function useAussieRulesLeague() {
  const [initial] = useState(load);
  const [state, setState] = useState<LeagueState | null>(initial.loaded);
  const [storageNotice, setStorageNotice] = useState<string | null>(initial.notice);
  const stateRef = useRef(state);
  const savedBytes = useRef(initial.raw);
  // One record per season: the hook only counts a finish it watched happen, so a restore stays quiet.
  useGameCompletion(SLUG, state?.phase === 'seasonOver', undefined);

  const activate = (next: LeagueState | null) => {
    stateRef.current = next;
    setState(next);
  };

  const adoptNewSave = (raw: string | null | undefined): boolean => {
    if (raw === undefined || raw === (savedBytes.current ?? null)) return false;
    const loaded = readLeagueSave(raw);
    if (loaded?.phase === 'seasonOver' && stateRef.current?.phase !== 'seasonOver') markRestoredFinish(SLUG);
    savedBytes.current = raw;
    activate(loaded);
    setStorageNotice(loaded ? 'This career changed in another tab. The latest save is open.'
      : raw === null ? 'This career was cleared in another tab.' : unreadableSave);
    return true;
  };

  const write = (next: LeagueState | null, replaceLegacy = false): boolean => {
    const bytes = next ? JSON.stringify(next) : null;
    const stored = readBytes();
    // Check again here in case another tab wrote while this tab was playing a match.
    if (adoptNewSave(stored)) return false;
    let notice: string | null = next ? 'Your season is running here, but this browser could not save it.'
      : 'This browser could not remove your old save.';
    if (stored !== undefined) {
      try {
        if (bytes === null) localStorage.removeItem(SAVE_KEY);
        else localStorage.setItem(SAVE_KEY, bytes);
        savedBytes.current = bytes;
        notice = null;
      } catch { /* Keep the last accepted bytes as the comparison point for the next action. */ }
    }
    if (replaceLegacy && notice === null) {
      try { localStorage.removeItem(LEGACY_SAVE_KEY); } catch { /* The saved full season opens first on the next visit. */ }
    }
    activate(next);
    setStorageNotice(notice);
    return true;
  };

  const start = (seed: number, clubId: string): boolean => {
    // Round 1572: a new career runs the real AFL clubs; a saved career keeps the set it was started with.
    const next = createLeague(seed, clubId, CURRENT_CLUB_SET, true);
    return next ? write(next, true) : false;
  };
  const dispatch = (action: LeagueAction): boolean => {
    if (adoptNewSave(readBytes())) return false;
    const current = stateRef.current;
    if (!current) return false;
    const next = reduceLeague(current, action);
    return next !== current && write(next);
  };
  const reset = () => write(null);
  /** Round 1572: an invented league career plays on under the real AFL names; nothing else changes. */
  const switchNames = (): boolean => {
    const current = stateRef.current;
    return current && !current.clubSet ? write(switchClubSet(current)) : false;
  };
  return { state, start, dispatch, reset, switchNames, storageNotice };
}
