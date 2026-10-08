import { useCallback, useEffect, useRef, useState } from 'react';
import { CAGE_TICK_MS, cageClashScore, continueCageRound, createCageFight, stepCageFight, type CageAction, type CageFight, type CageInput, type CageStyle } from '@/lib/cageClash';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { createCagePractice, nextCageDrill, stepCagePractice, type CageDrill, type CagePractice } from '@/lib/cagePractice';
import { advanceCageCircuit, cageCircuitScore, createCageCircuit, isCageCircuitComplete, stepCageCircuit, type CageCircuit } from '@/lib/cageCircuit';

export type CageControl = 'left' | 'right' | 'guard' | CageAction;
const keyControls: Record<string, CageControl> = { ArrowLeft: 'left', ArrowRight: 'right', a: 'left', d: 'right', ' ': 'guard', j: 'jab', k: 'power', l: 'kick', u: 'grapple', i: 'submit', o: 'escape' };

export function useCageClash(helpOpen = false) {
  const [fight, setFight] = useState<CageFight | null>(null);
  const [paused, setPaused] = useState(false);
  const [practice, setPractice] = useState<CagePractice | null>(null);
  const [circuit, setCircuit] = useState<CageCircuit | null>(null);
  const circuitRef = useRef<CageCircuit | null>(null);
  const practiceRef = useRef<CagePractice | null>(null);
  const fightRef = useRef<CageFight | null>(null);
  const pausedRef = useRef(false);
  const helpRef = useRef(helpOpen);
  const controls = useRef(new Map<string, CageControl>());
  const tapRef = useRef<CageAction | null>(null);
  const drawRef = useRef<(state: CageFight | null) => void>(() => {});
  const clockRef = useRef({ last: 0, debt: 0, hud: 0 });
  helpRef.current = helpOpen;

  const clearInput = useCallback(() => {
    controls.current.clear();
    tapRef.current = null;
    clockRef.current.last = 0;
    clockRef.current.debt = 0;
  }, []);
  const pause = useCallback(() => {
    clearInput();
    if (fightRef.current?.phase !== 'fight') return;
    pausedRef.current = true;
    setFight(fightRef.current);
    setPractice(practiceRef.current);
    setPaused(true);
  }, [clearInput]);
  const resume = useCallback(() => {
    clearInput();
    if (helpRef.current || document.hidden || !document.hasFocus()) return;
    pausedRef.current = false;
    setPaused(false);
  }, [clearInput]);
  const start = useCallback((style: CageStyle, opponent: CageStyle) => {
    clearInput();
    circuitRef.current = null;
    setCircuit(null);
    practiceRef.current = null;
    setPractice(null);
    const next = createCageFight(style, opponent, crypto.getRandomValues(new Uint32Array(1))[0]);
    fightRef.current = next;
    pausedRef.current = false;
    setPaused(false);
    setFight(next);
    drawRef.current(next);
  }, [clearInput]);
  const startPractice = useCallback((drill: CageDrill, style: CageStyle) => {
    clearInput();
    circuitRef.current = null;
    setCircuit(null);
    const lesson = createCagePractice(drill, style, crypto.getRandomValues(new Uint32Array(1))[0]);
    practiceRef.current = lesson;
    fightRef.current = lesson.fight;
    pausedRef.current = false;
    setPractice(lesson);
    setPaused(false);
    setFight(lesson.fight);
    drawRef.current(lesson.fight);
  }, [clearInput]);
  const nextDrill = useCallback(() => {
    const lesson = practiceRef.current;
    if (!lesson?.complete) return;
    const next = nextCageDrill(lesson.drill);
    if (next) startPractice(next, lesson.fight.player.style);
  }, [startPractice]);
  const startCircuit = useCallback((style: CageStyle) => {
    clearInput();
    practiceRef.current = null;
    setPractice(null);
    const next = createCageCircuit(style, crypto.getRandomValues(new Uint32Array(1))[0]);
    circuitRef.current = next;
    fightRef.current = next.fight;
    pausedRef.current = false;
    setCircuit(next);
    setPaused(false);
    setFight(next.fight);
    drawRef.current(next.fight);
  }, [clearInput]);
  const nextCircuitFight = useCallback(() => {
    const current = circuitRef.current;
    if (!current) return;
    const next = advanceCageCircuit(current);
    if (next === current) return;
    clearInput();
    circuitRef.current = next;
    fightRef.current = next.fight;
    pausedRef.current = false;
    setCircuit(next);
    setPaused(false);
    setFight(next.fight);
    drawRef.current(next.fight);
  }, [clearInput]);
  const reset = useCallback(() => {
    clearInput();
    circuitRef.current = null;
    setCircuit(null);
    practiceRef.current = null;
    setPractice(null);
    fightRef.current = null;
    pausedRef.current = false;
    setPaused(false);
    setFight(null);
    drawRef.current(null);
  }, [clearInput]);
  const nextRound = useCallback(() => {
    if (practiceRef.current || !fightRef.current || fightRef.current.phase !== 'break') return;
    clearInput();
    fightRef.current = continueCageRound(fightRef.current);
    if (circuitRef.current) {
      circuitRef.current = { ...circuitRef.current, fight: fightRef.current };
      setCircuit(circuitRef.current);
    }
    setFight(fightRef.current);
    drawRef.current(fightRef.current);
  }, [clearInput]);
  const press = useCallback((source: string, control: CageControl) => {
    if (practiceRef.current?.complete || pausedRef.current || helpRef.current || fightRef.current?.phase !== 'fight') return;
    if (!controls.current.has(source) && control !== 'left' && control !== 'right' && control !== 'guard') tapRef.current = control;
    controls.current.set(source, control);
  }, []);
  const release = useCallback((source: string) => { controls.current.delete(source); }, []);
  const tap = useCallback((action: CageAction) => {
    if (!practiceRef.current?.complete && !pausedRef.current && !helpRef.current && fightRef.current?.phase === 'fight') tapRef.current = action;
  }, []);

  useEffect(() => { if (helpOpen) pause(); }, [helpOpen, pause]);
  useEffect(() => {
    let handle = 0;
    const frame = (now: number) => {
      const clock = clockRef.current;
      const current = fightRef.current;
      if (!practiceRef.current?.complete && !pausedRef.current && !helpRef.current && !document.hidden && current?.phase === 'fight') {
        // A delayed frame is discarded rather than replaying unseen combat.
        const elapsed = clock.last ? now - clock.last : 0;
        clock.debt += elapsed > 150 ? 0 : elapsed;
        clock.last = now;
        let next = current;
        while (clock.debt >= CAGE_TICK_MS && next.phase === 'fight' && !practiceRef.current?.complete) {
          const held = Array.from(controls.current.values());
          const action = tapRef.current ?? [...held].reverse().find(value => value !== 'left' && value !== 'right' && value !== 'guard') as CageAction | null | undefined;
          const input: CageInput = { move: (Number(held.includes('right')) - Number(held.includes('left'))) as -1 | 0 | 1, guard: held.includes('guard'), action: action ?? null };
          tapRef.current = null;
          if (practiceRef.current) {
            const lesson = stepCagePractice(practiceRef.current, input);
            practiceRef.current = lesson;
            next = lesson.fight;
          } else if (circuitRef.current) {
            const run = stepCageCircuit(circuitRef.current, input);
            circuitRef.current = run;
            next = run.fight;
          } else next = stepCageFight(next, input);
          clock.debt -= CAGE_TICK_MS;
        }
        fightRef.current = next;
        if (next.phase !== 'fight' || practiceRef.current?.complete) clearInput();
        if (now - clock.hud >= 100 || next.phase !== current.phase || practiceRef.current?.complete) {
          clock.hud = now;
          setFight(next);
          setPractice(practiceRef.current);
          setCircuit(circuitRef.current);
        }
      } else { clock.last = 0; clock.debt = 0; }
      drawRef.current(fightRef.current);
      handle = requestAnimationFrame(frame);
    };
    const keyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, select, textarea, [role="dialog"]') || event.ctrlKey || event.metaKey || event.altKey || helpRef.current) return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (key === ' ' && target?.closest('button')) return;
      if ((key === 'p' || key === 'Escape') && fightRef.current?.phase === 'fight') {
        event.preventDefault();
        if (!event.repeat) { if (pausedRef.current) resume(); else pause(); }
      }
      const control = keyControls[key];
      if (control && fightRef.current?.phase === 'fight') { event.preventDefault(); press(`key:${key}`, control); }
    };
    const keyUp = (event: KeyboardEvent) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      release(`key:${key}`);
      if (key === ' ' || key === 'Enter') {
        for (const source of controls.current.keys()) if (source.startsWith('button:')) controls.current.delete(source);
      }
    };
    const hidden = () => { if (document.hidden) pause(); };
    const pointerUp = (event: PointerEvent) => release(`pointer:${event.pointerId}`);
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', pause);
    window.addEventListener('pointerup', pointerUp);
    window.addEventListener('pointercancel', pointerUp);
    document.addEventListener('visibilitychange', hidden);
    handle = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(handle);
      clearInput();
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', pause);
      window.removeEventListener('pointerup', pointerUp);
      window.removeEventListener('pointercancel', pointerUp);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [clearInput, pause, press, release, resume]);

  const isComplete = !practice && (circuit ? isCageCircuitComplete(circuit) : fight?.phase === 'finished');
  const finalScore = !practice && fight ? circuit ? cageCircuitScore(circuit) : cageClashScore(fight) : 0;
  useGameCompletion('cage-clash', isComplete, finalScore);
  return { fight, fightRef, drawRef, practice, circuit, paused, start, startPractice, startCircuit, nextCircuitFight, nextDrill, reset, pause, resume, nextRound, press, release, tap, finalScore };
}
