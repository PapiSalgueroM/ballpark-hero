import { useCallback, useEffect, useRef, useState } from 'react';
import { COURT_TICK_MS, continueCourtPeriod, neutralCourtInput, neutralizeCourtMatch, stepCourtMatch, type CourtInput, type CourtMatch } from '@/lib/courtLife';
import { COURT_CAREER_SAVE_KEY, applyCareerAction, chooseLifeDecision, claimCourtSeasonScore, completeCareerMatch, createCourtLifeCareer, decodeCourtLifeSave, encodeCourtLifeSave, nextCareerSeason, startCareerMatch, updateCareerMatch, type CourtCareer, type CourtCareerAction } from '@/lib/courtLifeCareer';
import { useGameCompletion } from '@/hooks/useGameCompletion';

export type CourtControlSlot = 'primary' | 'secondary' | 'effort';
type Action = 'shoot' | 'jump' | 'pass' | 'call' | 'steal' | 'sprint' | 'guard';
type Recovery = { status: 'invalid' | 'unsupported'; raw: string; reason: string };
function loadCareer(): { career: CourtCareer | null; recovery: Recovery | null; error: string | null } {
  try {
    const raw = localStorage.getItem(COURT_CAREER_SAVE_KEY);
    if (!raw) return { career: null, recovery: null, error: null };
    const decoded = decodeCourtLifeSave(raw);
    return decoded.status === 'valid' ? { career: decoded.career, recovery: null, error: null }
      : { career: null, recovery: { ...decoded, raw }, error: null };
  } catch { return { career: null, recovery: null, error: 'Storage is unavailable. You can play, but this browser is not saving progress.' }; }
}
export function courtControlActions(match: CourtMatch | null): Record<CourtControlSlot, Action> {
  const player = match?.players.find(row => row.id === match.controlledPlayerId);
  const offense = Boolean(player && match?.possession === player.side);
  const owns = Boolean(player && match?.ball.ownerId === player.id);
  return { primary: owns ? 'shoot' : 'jump', secondary: offense ? owns ? 'pass' : 'call' : 'steal', effort: offense ? 'sprint' : 'guard' };
}

export function useCourtLife(helpOpen = false) {
  const [loaded] = useState(loadCareer);
  const [career, setCareer] = useState(loaded.career);
  const careerRef = useRef(career);
  const [match, setMatch] = useState(career?.activeMatch?.match ?? null);
  const matchRef = useRef(match);
  const drawRef = useRef<(() => void) | null>(null);
  const [paused, setPaused] = useState(true);
  const pausedRef = useRef(true);
  const [storageError, setStorageError] = useState(loaded.error);
  const [completion, setCompletion] = useState<{ id: string; score: number; wins: number } | null>(null);
  const pendingCompletion = useRef<typeof completion>(null);
  const [scorePending, setScorePending] = useState(false);
  const [recovery, setRecovery] = useState(loaded.recovery);
  const protectRecovery = useRef(Boolean(loaded.recovery));
  const helpRef = useRef(helpOpen); helpRef.current = helpOpen;
  const held = useRef(new Map<string, Action>());
  const movement = useRef(new Map<string, { x: number; y: number }>());
  const edges = useRef<Partial<CourtInput>[]>([]);
  const clock = useRef({ last: null as number | null, debt: 0, hud: 0, savedTick: 0 });
  useGameCompletion('court-life', completion !== null, completion?.score, completion?.wins ?? 0);

  const persist = useCallback((next: CourtCareer, replaceProtected = false) => {
    if (protectRecovery.current && !replaceProtected) { setStorageError('Your original save is kept. This new career is running without saving.'); return false; }
    try { localStorage.setItem(COURT_CAREER_SAVE_KEY, encodeCourtLifeSave(next)); setStorageError(null); return true; }
    catch { setStorageError('Could not save this career. You can keep playing and retry saving.'); return false; }
  }, []);
  const releaseCompletion = useCallback((saved: boolean) => {
    if (!saved || !pendingCompletion.current) return;
    setCompletion(pendingCompletion.current); pendingCompletion.current = null; setScorePending(false);
  }, []);
  const clearInput = useCallback(() => {
    held.current.clear(); movement.current.clear(); edges.current = [];
    clock.current.last = null; clock.current.debt = 0;
  }, []);
  const publish = useCallback((next: CourtCareer) => {
    careerRef.current = next; setCareer(next);
    matchRef.current = next.activeMatch?.match ?? null; setMatch(matchRef.current);
    pausedRef.current = next.activeMatch?.paused ?? true; setPaused(pausedRef.current);
    return persist(next);
  }, [persist]);
  const checkpoint = useCallback((next: CourtMatch, stopped: boolean) => {
    if (!careerRef.current) return false;
    const saved = updateCareerMatch(careerRef.current, next, stopped);
    careerRef.current = saved; setCareer(saved); const written = persist(saved);
    clock.current.savedTick = next.tick;
    return written;
  }, [persist]);
  const pause = useCallback(() => {
    clearInput(); pausedRef.current = true; setPaused(true);
    if (!matchRef.current) return;
    const next = neutralizeCourtMatch(matchRef.current);
    matchRef.current = next; setMatch(next); checkpoint(next, true);
  }, [checkpoint, clearInput]);
  const resume = useCallback(() => {
    clearInput();
    const current = matchRef.current;
    if (!current || !['playing', 'inbound'].includes(current.phase) || helpRef.current || document.hidden || !document.hasFocus()) return;
    pausedRef.current = false; setPaused(false); checkpoint(current, false);
  }, [checkpoint, clearInput]);
  const create = useCallback((options: { name: string; crewId: string; archetypeId: string }) => {
    clearInput(); setCompletion(null); pendingCompletion.current = null; setScorePending(false);
    publish(createCourtLifeCareer({ ...options, id: crypto.randomUUID(), seed: crypto.getRandomValues(new Uint32Array(1))[0] % 2147483646 + 1 }));
  }, [clearInput, publish]);
  const prepare = useCallback((action: CourtCareerAction) => { if (careerRef.current) publish(applyCareerAction(careerRef.current, action)); }, [publish]);
  const decide = useCallback((optionId: string) => { if (careerRef.current) publish(chooseLifeDecision(careerRef.current, optionId)); }, [publish]);
  const start = useCallback(() => { if (careerRef.current) { clearInput(); publish(startCareerMatch(careerRef.current)); } }, [clearInput, publish]);
  const continuePeriod = useCallback(() => {
    if (matchRef.current?.phase !== 'halftime') return;
    clearInput(); const next = continueCourtPeriod(matchRef.current);
    matchRef.current = next; setMatch(next); pausedRef.current = true; setPaused(true); checkpoint(next, true);
  }, [checkpoint, clearInput]);
  const finish = useCallback(() => {
    if (!careerRef.current || matchRef.current?.phase !== 'finished') return;
    const next = completeCareerMatch(careerRef.current, matchRef.current);
    if (next === careerRef.current) return;
    clearInput();
    if (next.phase === 'seasonComplete') {
      const claimed = claimCourtSeasonScore(next); pendingCompletion.current = claimed.completion;
      const saved = publish(claimed.career); setScorePending(!saved && Boolean(claimed.completion)); releaseCompletion(saved);
    } else publish(next);
  }, [clearInput, publish, releaseCompletion]);
  const nextSeason = useCallback(() => {
    if (pendingCompletion.current) { setStorageError('Save your finished season first so its score is recorded once. Use Retry saving before starting the next season.'); return; }
    if (careerRef.current?.phase === 'seasonComplete') { clearInput(); setCompletion(null); publish(nextCareerSeason(careerRef.current)); }
  }, [clearInput, publish]);
  const retrySave = useCallback(() => {
    const saved = matchRef.current ? checkpoint(matchRef.current, pausedRef.current) : careerRef.current ? persist(careerRef.current) : false;
    releaseCompletion(saved);
  }, [checkpoint, persist, releaseCompletion]);
  const replaceRecovery = useCallback(() => {
    if (!careerRef.current) return;
    if (persist(careerRef.current, true)) {
      protectRecovery.current = false; setRecovery(null); releaseCompletion(true);
    }
  }, [persist, releaseCompletion]);
  const acceptsInput = () => !pausedRef.current && !helpRef.current && !document.hidden && matchRef.current?.phase === 'playing';
  const press = useCallback((source: string, slot: CourtControlSlot) => {
    if (!acceptsInput() || held.current.has(source)) return;
    const action = courtControlActions(matchRef.current)[slot];
    const alreadyHeld = [...held.current.values()].includes(action);
    held.current.set(source, action);
    if (alreadyHeld) return;
    if (action === 'shoot') edges.current.push({ shoot: 'press' });
    else if (action === 'pass' || action === 'call') edges.current.push({ pass: true });
    else if (action === 'jump') edges.current.push({ jump: true });
    else if (action === 'steal') edges.current.push({ steal: true });
    else if (action === 'sprint') edges.current.push({ sprint: true });
    else edges.current.push({ guard: true });
  }, []);
  const release = useCallback((source: string, cancelled = false) => {
    const action = held.current.get(source);
    held.current.delete(source); movement.current.delete(source);
    if (action === 'shoot' && ![...held.current.values()].includes('shoot') && acceptsInput()) {
      if (cancelled) {
        edges.current = edges.current.filter(edge => edge.shoot === undefined);
        matchRef.current = neutralizeCourtMatch(matchRef.current!); setMatch(matchRef.current);
      } else edges.current.push({ shoot: 'release' });
    }
  }, []);
  const move = useCallback((source: string, screenX: number, screenY: number) => {
    if (!acceptsInput()) return;
    const length = Math.max(1, Math.hypot(screenX, screenY));
    movement.current.set(source, { x: screenX / length, y: screenY / length });
  }, []);
  const tap = useCallback((slot: CourtControlSlot) => { const source = `assistive:${slot}`; press(source, slot); release(source); }, [press, release]);

  useEffect(() => { if (helpOpen) pause(); }, [helpOpen, pause]);
  useEffect(() => {
    let handle = 0;
    const frame = (now: number) => {
      const timer = clock.current, current = matchRef.current;
      if (current && !pausedRef.current && !helpRef.current && !document.hidden && ['playing', 'inbound'].includes(current.phase)) {
        const elapsed = timer.last === null ? 0 : now - timer.last; timer.last = now;
        timer.debt = Math.min(COURT_TICK_MS * 4, timer.debt + (elapsed > 150 ? 0 : elapsed));
        let next = current;
        while (timer.debt + 1e-7 >= COURT_TICK_MS && ['playing', 'inbound'].includes(next.phase)) {
          const vectors = [...movement.current.values()];
          const screenX = vectors.reduce((sum, vector) => sum + vector.x, 0), screenY = vectors.reduce((sum, vector) => sum + vector.y, 0);
          const length = Math.max(1, Math.hypot(screenX, screenY)), actions = [...held.current.values()];
          const input: CourtInput = { ...neutralCourtInput(), moveX: screenY / length, moveY: screenX ? -screenX / length : 0,
            sprint: actions.includes('sprint'), guard: actions.includes('guard'), ...edges.current.shift() };
          next = stepCourtMatch(next, input); timer.debt -= COURT_TICK_MS;
        }
        matchRef.current = next;
        const stopped = next.phase === 'halftime' || next.phase === 'finished';
        if (stopped) { next = neutralizeCourtMatch(next); matchRef.current = next; clearInput(); pausedRef.current = true; setPaused(true); }
        if (stopped || next.phase !== current.phase || next.tick - timer.savedTick >= 150) checkpoint(next, stopped);
        if (stopped || next.phase !== current.phase || now - timer.hud >= 100) { timer.hud = now; setMatch(next); }
      } else { timer.last = null; timer.debt = 0; }
      drawRef.current?.(); handle = requestAnimationFrame(frame);
    };
    const directions: Record<string, [number, number]> = { ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0], ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1] };
    const slots: Record<string, CourtControlSlot> = { j: 'primary', k: 'secondary', l: 'effort' };
    const down = (event: KeyboardEvent) => {
      if (!(event.target instanceof HTMLCanvasElement) || !event.target.hasAttribute('data-court-canvas') || event.ctrlKey || event.altKey || event.metaKey) return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (directions[key]) { event.preventDefault(); move(`key:${key}`, ...directions[key]); }
      else if (slots[key]) { event.preventDefault(); if (!event.repeat) press(`key:${key}`, slots[key]); }
      else if (key === 'Escape' && !helpRef.current) { event.preventDefault(); pause(); }
    };
    const up = (event: KeyboardEvent) => release(`key:${event.key.length === 1 ? event.key.toLowerCase() : event.key}`);
    const pointerUp = (event: PointerEvent) => release(`pointer:${event.pointerId}`, event.type === 'pointercancel');
    const hidden = () => { if (document.hidden) pause(); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    window.addEventListener('pointerup', pointerUp); window.addEventListener('pointercancel', pointerUp);
    window.addEventListener('blur', pause); document.addEventListener('visibilitychange', hidden);
    handle = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(handle); clearInput();
      const current = matchRef.current;
      if (current && careerRef.current) persist(updateCareerMatch(careerRef.current, current, true));
      window.removeEventListener('keydown', down); window.removeEventListener('keyup', up);
      window.removeEventListener('pointerup', pointerUp); window.removeEventListener('pointercancel', pointerUp);
      window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', hidden);
    };
  }, [checkpoint, clearInput, move, pause, persist, press, release]);
  return { career, match, matchRef, drawRef, paused, recovery, storageError, scorePending, create, prepare, decide, start, pause, resume, continuePeriod, finish, nextSeason, retrySave, replaceRecovery, press, release, move, tap };
}
