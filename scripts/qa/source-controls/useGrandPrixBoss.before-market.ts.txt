import { useCallback, useEffect, useRef, useState } from 'react';
import { applyAction, createCareer, validateSavedCareer, type GrandPrixAction, type GrandPrixCareer } from '@/lib/grandPrixBoss';
import { saveFence } from '@/lib/saveFence';
import { useSaveFenceWatch } from '@/hooks/useSaveFenceWatch';
import { recordCompletion } from '@/lib/completions';

const KEY = 'grand-prix-boss-save-v1';
type Status = 'empty' | 'ready' | 'unreadable' | 'unsupported' | 'invalid';
interface SavedTeam { schemaVersion: 1; career: GrandPrixCareer; completedSeasons: number[] }
interface View { career: GrandPrixCareer | null; status: Status; message: string }
const UNREADABLE = 'Your browser could not read the saved team. Reload to try again.';
const INVALID = 'This saved team could not be read safely. Your data is still here. Reload to try again.';
const UNSUPPORTED = 'This saved team uses a newer version. Your data is still here.';
const MOVED = 'Your saved team changed in another tab. Reload it before making another decision.';
const FAILED = 'Your browser could not save that change. Your team has not advanced. Free some space and try again.';
const UNCERTAIN = 'The save may have landed, but your browser could not confirm it. Reload your saved team before continuing.';

function decode(raw: string | null): { saved: SavedTeam | null; status: Status; message: string } {
  if (raw === null) return { saved: null, status: 'empty', message: '' };
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { saved: null, status: 'invalid', message: INVALID };
    if (Number.isSafeInteger(value.schemaVersion) && value.schemaVersion > 1) return { saved: null, status: 'unsupported', message: UNSUPPORTED };
    if (value.schemaVersion !== 1) return { saved: null, status: 'invalid', message: INVALID };
    const read = validateSavedCareer(value.career);
    if (read.ok === false) return { saved: null, status: read.reason, message: read.reason === 'unsupported' ? UNSUPPORTED : INVALID };
    const claims = value.completedSeasons;
    if (!Array.isArray(claims) || claims.length > 12 || !claims.every((season, index) => Number.isSafeInteger(season) && season > 0
      && (index === 0 || season > claims[index - 1])
      && (season < read.state.season || season === read.state.season && read.state.phase === 'seasonReview'))) {
      return { saved: null, status: 'invalid', message: INVALID };
    }
    return { saved: { schemaVersion: 1, career: read.state, completedSeasons: [...claims] }, status: 'ready', message: '' };
  } catch {
    return { saved: null, status: 'invalid', message: INVALID };
  }
}

function savedMessage(career: GrandPrixCareer, action: GrandPrixAction): string {
  if (action.type === 'upgrade') {
    const value = career.teams.find(team => team.id === career.teamId)!.car[action.area];
    return action.area.charAt(0).toUpperCase() + action.area.slice(1) + ' upgraded to ' + value + '. Team saved.';
  }
  if (action.type === 'qualify') return 'Round ' + (career.round + 1) + ' grid saved. Choose tyres and pace.';
  if (action.type === 'startRace') return 'Race start saved. Make your first race call.';
  if (action.type === 'continue') return 'Round ' + (career.round + 1) + ' is ready. Team saved.';
  if (career.phase === 'seasonReview') return 'Season ' + career.season + ' saved.';
  if (career.phase === 'raceResult') return 'Round ' + (career.round + 1) + ' result saved.';
  return 'Lap ' + career.race!.lap + ' saved. Make your next race call.';
}

export function useGrandPrixBoss() {
  const [view, setView] = useState<View>({ career: null, status: 'empty', message: '' });
  const [locallyMoved, setLocallyMoved] = useState(false);
  const current = useRef<SavedTeam | null>(null);
  const raw = useRef<string | null>(null);
  const status = useRef<Status>('empty');
  const loaded = useRef(false);
  const locked = useRef(false);
  const watch = useSaveFenceWatch(KEY);
  const present = useCallback((saved: SavedTeam | null, nextStatus: Status, message: string) => {
    current.current = saved;
    status.current = nextStatus;
    setView({ career: saved?.career ?? null, status: nextStatus, message });
  }, []);
  const moved = useCallback(() => {
    locked.current = true;
    setLocallyMoved(true);
    watch.check();
    setView(old => ({ ...old, message: MOVED }));
  }, [watch.check]);
  const stale = useCallback(() => {
    if (!locked.current && !saveFence.moved(KEY)) return false;
    moved();
    return true;
  }, [moved]);

  useEffect(() => {
    saveFence.adopt(KEY);
    try {
      raw.current = localStorage.getItem(KEY);
      const read = decode(raw.current);
      present(read.saved, read.status, read.message);
    } catch {
      present(null, 'unreadable', UNREADABLE);
    }
    loaded.current = true;
    return () => { loaded.current = false; saveFence.release(KEY); };
  }, [present]);
  useEffect(() => { if (watch.moved) moved(); }, [watch.moved, moved]);

  const persist = useCallback((saved: SavedTeam, message: string): boolean => {
    const bytes = JSON.stringify(saved);
    const confirmation = { ok: false };
    const outcome = saveFence.write(KEY, () => {
      try { localStorage.setItem(KEY, bytes); } catch { return false; }
      try {
        const stored = localStorage.getItem(KEY);
        if (stored === bytes) { confirmation.ok = true; return true; }
        if (stored === raw.current) return false;
      } catch { /* A landed but unreadable save keeps its new fence generation. */ }
      return true;
    });
    if (outcome === 'moved') { moved(); return false; }
    if (outcome === 'failed') { setView(old => ({ ...old, message: FAILED })); return false; }
    if (!confirmation.ok) { present(current.current, 'unreadable', UNCERTAIN); return false; }
    raw.current = bytes;
    present(saved, 'ready', message);
    return true;
  }, [moved, present]);

  const start = useCallback((seed: number): boolean => {
    if (!loaded.current || stale()) return false;
    if (status.current !== 'empty' || current.current) return false;
    let existing: string | null;
    try { existing = localStorage.getItem(KEY); }
    catch { present(null, 'unreadable', UNREADABLE); return false; }
    if (existing !== null) {
      const read = decode(existing);
      if (read.status === 'ready') moved();
      else present(null, read.status, read.message);
      return false;
    }
    return persist({ schemaVersion: 1, career: createCareer(seed), completedSeasons: [] }, 'Your new team is saved.');
  }, [stale, present, moved, persist]);

  const dispatch = useCallback((action: GrandPrixAction): boolean => {
    if (!loaded.current || stale() || status.current !== 'ready' || !current.current) return false;
    const before = current.current;
    const result = applyAction(before.career, action);
    if (result.ok === false) {
      setView(old => ({ ...old, message: result.reason === 'stale' ? 'That decision was already used. Choose from your current team.' : 'That decision is not available. Your team has not changed.' }));
      return false;
    }
    const completed = result.state.phase === 'seasonReview' && !before.completedSeasons.includes(result.state.season);
    const completedSeasons = completed ? [...before.completedSeasons, result.state.season].slice(-12) : before.completedSeasons;
    if (!persist({ schemaVersion: 1, career: result.state, completedSeasons }, savedMessage(result.state, action))) return false;
    if (completed) recordCompletion('/grand-prix-boss');
    return true;
  }, [stale, persist]);
  const reload = useCallback(() => { window.location.reload(); }, []);
  return { ...view, moved: watch.moved || locallyMoved, start, dispatch, reload };
}
