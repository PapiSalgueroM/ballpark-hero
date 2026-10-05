import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { VISIBLE_CATEGORIES } from '@/data/gameRegistry';

export const GAME_PICKS_KEY = 'dukb-game-picks-v1';
export const GAME_PICKS_STORAGE_WARNING = 'Picks last for this visit. This browser could not save them.';

type PicksState = { paths: string[]; storageFailed: boolean };

// Keep unsaved picks through route changes for the rest of this visit.
let visitPicks: string[] | null = null;

function isGamePath(path: string): boolean {
  return VISIBLE_CATEGORIES.some(category => category.games.some(game => game.path === path));
}

function readPaths(raw: string | null): string[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]');
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((path): path is string => typeof path === 'string' && isGamePath(path)))];
  } catch {
    return [];
  }
}

function storedPicks(raw: string | null): PicksState {
  if (visitPicks !== null) {
    return { paths: visitPicks, storageFailed: true };
  }
  return { paths: readPaths(raw), storageFailed: false };
}

function initialPicks(): PicksState {
  if (typeof window === 'undefined') return { paths: [], storageFailed: false };
  try {
    return storedPicks(window.localStorage.getItem(GAME_PICKS_KEY));
  } catch {
    return { paths: visitPicks ?? [], storageFailed: true };
  }
}

export function useGamePicks() {
  const [state, setState] = useState<PicksState>(initialPicks);
  const current = useRef(state);

  const update = useCallback((next: PicksState) => {
    current.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key !== GAME_PICKS_KEY && event.key !== null) return;
      try {
        if (event.storageArea && event.storageArea !== window.localStorage) return;
        // A queued event may describe older bytes than a local pick just saved.
        update(storedPicks(window.localStorage.getItem(GAME_PICKS_KEY)));
      } catch {
        update({ paths: current.current.paths, storageFailed: true });
      }
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, [update]);

  const toggle = useCallback((path: string) => {
    if (!isGamePath(path)) return;
    let held = current.current.paths;
    try {
      held = storedPicks(window.localStorage.getItem(GAME_PICKS_KEY)).paths;
    } catch { /* keep the current visit's picks when reading is blocked */ }
    const paths = held.includes(path) ? held.filter(item => item !== path) : [...held, path];
    let storageFailed = false;
    try {
      window.localStorage.setItem(GAME_PICKS_KEY, JSON.stringify(paths));
      visitPicks = null;
    } catch {
      storageFailed = true;
      visitPicks = paths;
      toast.warning(GAME_PICKS_STORAGE_WARNING, { id: 'game-picks-storage' });
    }
    update({ paths, storageFailed });
  }, [update]);

  return { ...state, toggle };
}
