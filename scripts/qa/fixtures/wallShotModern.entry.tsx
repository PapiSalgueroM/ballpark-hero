import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import TrainingPanel from '@/components/soccer-career/TrainingPanel';
import DrillBoard from '@/components/soccer-career/DrillBoard';
import { buildWallShotRun, lehmer, takeWallShot, wallShotGeometry } from '@/lib/careerDrills';
import type { CareerState } from '@/lib/soccerCareerEngine';
import '@/index.css';

// Real components and CSS. Only this declared fixture clock is controlled.
const query = new URL(location.href).searchParams;
const mode = query.get('mode'), theme = query.get('theme');
if (!['training', 'match'].includes(mode ?? '') || !['light', 'dark'].includes(theme ?? '')) throw new Error('Unknown wall fixture');
document.documentElement.classList.toggle('light', theme === 'light');
let clock = 0, sequence = 0;
const steps = [0], epoch = Date.parse('2026-10-23T16:00:00Z'), NativeDate = Date;
const nativeFrame = window.requestAnimationFrame.bind(window);
const timers = new Map<number, { at: number; every: number; run: () => void }>();
Object.defineProperty(window, 'Date', { value: class extends NativeDate {
  constructor(value?: string | number | Date) { super(value === undefined ? epoch + clock : value as string); }
  static now() { return epoch + clock; }
} });
Object.defineProperty(performance, 'now', { value: () => clock });
window.requestAnimationFrame = run => nativeFrame(() => run(clock));
window.setTimeout = ((handler: TimerHandler, delay = 0, ...args: unknown[]) => {
  if (typeof handler !== 'function') throw new Error('Only function timers in fixture');
  timers.set(++sequence, { at: clock + Number(delay), every: 0, run: () => handler(...args) });
  return sequence;
}) as typeof window.setTimeout;
window.setInterval = ((handler: TimerHandler, delay = 0, ...args: unknown[]) => {
  if (typeof handler !== 'function') throw new Error('Only function timers in fixture');
  timers.set(++sequence, { at: clock + Number(delay), every: Math.max(1, Number(delay)), run: () => handler(...args) });
  return sequence;
}) as typeof window.setInterval;
window.clearTimeout = window.clearInterval = id => { timers.delete(Number(id)); };
const events: Array<Record<string, unknown>> = [], eventRefs = new WeakMap<object, Event>();
for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture', 'keydown', 'keyup', 'click']) {
  document.addEventListener(type, event => {
    if (events.length >= 2048) throw new Error('Wall fixture event ceiling');
    const target = event.target instanceof Element ? event.target.closest('button,input,svg') : null;
    const row = { type, trusted: event.isTrusted, key: event instanceof KeyboardEvent ? event.key : null,
      pointerId: event instanceof PointerEvent ? event.pointerId : null,
      target: target ? { tag: target.tagName, label: target.getAttribute('aria-label'), text: target.tagName === 'BUTTON' ? target.textContent?.trim() : null } : null };
    events.push(row); eventRefs.set(row, event);
  }, true);
}
const freeze = <T,>(v: T): T => { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
function model() {
  const career = freeze({ name: 'Fixture Guest', position: 'ST', overall: 70, potential: 80, potentialEarned: 0,
    seasons: [{ year: 2026 }], trainingSeasonYear: 2025, statBoostNextSeason: {}, morale: 60, events: [] }) as unknown as CareerState;
  // Select a real dealt first round with space on both sides, without changing its geometry.
  for (let index = 1; index <= 256; index += 1) {
    const seed = index * 7919 + 1454;
    const raw = buildWallShotRun(seed)[0], wall = wallShotGeometry(raw);
    if (Math.abs((wall.lo + wall.hi) / 2) <= 0.08) return { career, seed, round: 0, setup: freeze({ ...raw, wallShotRules: 2 as const }), streamSeed: seed ^ 0x5eed1234 };
  }
  throw new Error('No declared two-sided seeded fixture');
}
let held: ReturnType<typeof model> | null = null;
const calls = { bank: [] as unknown[][], complete: [] as unknown[][], back: 0, factories: 0, draws: [] as number[],
  results: [] as Array<{ callback: unknown; replay: ReturnType<typeof takeWallShot>; replayDraws: number[] }> };
function Fixture() {
  const [value] = useState(model), [open, setOpen] = useState(true);
  held = value;
  const close = () => { calls.back += 1; setOpen(false); };
  if (!open) return null;
  if (mode === 'training') return <TrainingPanel career={value.career} available
    onComplete={(...args) => { calls.complete.push(args); }} onDrill={(...args) => { calls.bank.push(args); }} onClose={close} />;
  return <main style={{ maxWidth: 448, padding: 12, margin: '0 auto' }} data-wall-match-fixture>
    <DrillBoard career={value.career} canBank={false} onBank={(...args) => { calls.bank.push(args); }} onBack={close}
      match={{ kind: 'wallshot', seed: value.seed, round: value.round, wallShotRules: 2,
        rng: () => { calls.factories += 1; const next = lehmer(value.streamSeed); return () => { const n = next(); calls.draws.push(n); return n; }; },
        onResult: callback => {
          const [x, y, power, press] = callback.input;
          const replayDraws: number[] = [], next = lehmer(value.streamSeed);
          const replay = takeWallShot({ x, y, power, press }, value.setup, () => { const n = next(); replayDraws.push(n); return n; });
          calls.results.push({ callback, replay, replayDraws });
        } }} />
  </main>;
}
const stores = (s: Storage) => Object.fromEntries(Array.from({ length: s.length }, (_, i) => s.key(i)!).sort().map(k => [k, s.getItem(k)]));
const read = () => {
  if (!held) throw new Error('Fixture not mounted');
  const svg = document.querySelector('[data-drill-board]');
  return JSON.parse(JSON.stringify({ version: 1, mode, theme, clock, steps, seed: mode === 'match' ? held.seed : null, round: mode === 'match' ? held.round : null, setup: mode === 'match' ? held.setup : null,
    geometry: mode === 'match' ? wallShotGeometry(held.setup) : null, career: held.career, frozen: Object.isFrozen(held.career) && Object.isFrozen(held.career.seasons),
    phase: svg?.getAttribute('data-drill-phase') ?? null, rules: svg?.getAttribute('data-wall-shot-rules') ?? null,
    motion: svg?.getAttribute('data-drill-motion') ?? null, calls, local: stores(localStorage), session: stores(sessionStorage),
    events: events.map(row => ({ ...row, prevented: eventRefs.get(row)!.defaultPrevented })),
    timers: Array.from(timers, ([id, t]) => ({ id, at: t.at, every: t.every })) }));
};
Object.defineProperty(window, '__WALL_SHOT_FIXTURE__', { value: Object.freeze({
  read,
  advance(delta: number) {
    if (![0, 315, 385, 60].includes(delta) || clock + delta > 760) throw new Error('Undeclared wall clock advance');
    clock += delta; steps.push(clock);
    flushSync(() => { for (const [id, timer] of [...timers]) {
      if (timer.at > clock) continue;
      if (timer.every) timer.at += timer.every; else timers.delete(id);
      timer.run();
    } });
  },
}) });
flushSync(() => createRoot(document.getElementById('root')!).render(<Fixture />));
