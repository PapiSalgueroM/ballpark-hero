import { useRef, useState } from 'react';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { createLeague, CURRENT_CLUB_SET, LEGACY_SAVE_KEY, readLeagueSave, reduceLeague, SAVE_KEY, SLUG, switchClubSet, type LeagueAction, type LeagueState } from '@/lib/aussieRulesLeague';
import { markRestoredFinish } from '@/lib/restoredFinish';
import { backupKeysOf, copyAside, routeSaveEntry } from '@/lib/brokenSaveRecovery';

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
  const nameSwitch = useRef<{ before: string; from: LeagueState; next: LeagueState; bytes: string; attempted: boolean } | null>(null);
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
    const before = savedBytes.current;
    if (!current || current.clubSet) return false;
    const refuse = () => {
      setStorageNotice('Could not save the club name change. Your saved career is still available. Try Switch again.');
      return false;
    };
    if (!before) return refuse();
    let pending = nameSwitch.current;
    if (!pending || pending.before !== before || pending.from !== current) {
      const next = switchClubSet(current);
      const bytes = JSON.stringify(next);
      if (!readLeagueSave(bytes)) return refuse();
      pending = { before, from: current, next, bytes, attempted: false };
      nameSwitch.current = pending;
    }
    const { bytes } = pending;
    const owns = (raw: string | null) => raw === before || (pending.attempted && raw === bytes);
    const moved = (raw: string | null) => {
      // A write that landed without a receipt can face the same unreadable response on retry.
      if (pending.attempted && raw !== null && !readLeagueSave(raw)) return refuse();
      nameSwitch.current = null;
      adoptNewSave(raw);
      return false;
    };
    try {
      const stored = localStorage.getItem(SAVE_KEY);
      if (!owns(stored)) return moved(stored);
      const entry = routeSaveEntry('/aussie-rules-manager');
      if (!entry) return refuse();
      let backup = backupKeysOf(entry, localStorage).find(key => localStorage.getItem(key) === before);
      if (backup === undefined && stored === before) {
        const copy = copyAside(entry, localStorage, undefined, false, { raw: before, slot: 1 });
        if (copy.ok && copy.backupKey) backup = copy.backupKey;
      }
      const kept = backup !== undefined && localStorage.getItem(backup) === before;
      const active = localStorage.getItem(SAVE_KEY);
      if (!owns(active)) return moved(active);
      if (!kept) return refuse();
      if (active === before) {
        pending.attempted = true;
        localStorage.setItem(SAVE_KEY, bytes);
      }
      if (localStorage.getItem(SAVE_KEY) !== bytes) return refuse();
      savedBytes.current = bytes;
      nameSwitch.current = null;
      activate(pending.next);
      setStorageNotice(null);
      return true;
    } catch { return refuse(); }
  };
  return { state, start, dispatch, reset, switchNames, storageNotice };
}
