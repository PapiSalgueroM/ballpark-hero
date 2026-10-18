import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import TrainingPanel from '@/components/soccer-career/TrainingPanel';
import type { CareerState, TrainingDrill } from '@/lib/soccerCareerEngine';
import type { DrillKind } from '@/lib/careerDrills';

// This is a component fixture, without the site's route, stylesheet or network fixtures.
// Native Chromium inputs are real. Only the declared drill clock is controlled.
const kind = new URL(location.href).searchParams.get('kind');
if (!['wallshot', 'tackle', 'gloves'].includes(kind ?? '')) throw new Error('Unknown fixture kind');
const position = kind === 'wallshot' ? 'ST' : kind === 'tackle' ? 'CB' : 'GK';
const deepFreeze = <T,>(value: T): T => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};
const career = deepFreeze({
  name: 'Fixture Guest', position, overall: 60, potential: 90, potentialEarned: 0,
  seasons: [{ year: 2026 }], trainingSeasonYear: 2025,
  statBoostNextSeason: {}, morale: 50, events: [],
}) as unknown as CareerState;
const inputJSON = JSON.stringify(career);
const callbacks = { close: [] as unknown[][], complete: [] as unknown[][], drill: [] as unknown[][] };
const draws: number[] = [];
const requests: Array<{ url: string; method: string }> = [];
const events: Array<Record<string, unknown>> = [];
let parentMounts = 0;
let parentUnmounts = 0;
let clock = 0;
let sequence = 0;
const clockSteps: number[] = [0];
const timers = new Map<number, { at: number; every: number; run: () => void }>();
const epoch = Date.parse('2026-10-18T16:00:00Z');
const RealDate = Date;
Object.defineProperty(window, 'Date', { value: class extends RealDate {
  constructor(value?: string | number | Date) { super(value === undefined ? epoch + clock : value as string); }
  static now() { return epoch + clock; }
} });
Object.defineProperty(performance, 'now', { value: () => clock });
const nativeFrame = window.requestAnimationFrame.bind(window);
window.requestAnimationFrame = callback => nativeFrame(() => callback(clock));
window.setTimeout = ((handler: TimerHandler, delay = 0, ...args: unknown[]) => {
  if (typeof handler !== 'function') throw new Error('Fixture clock only accepts function timers');
  timers.set(++sequence, { at: clock + Number(delay), every: 0, run: () => handler(...args) });
  return sequence;
}) as typeof window.setTimeout;
window.setInterval = ((handler: TimerHandler, delay = 0, ...args: unknown[]) => {
  if (typeof handler !== 'function') throw new Error('Fixture clock only accepts function timers');
  timers.set(++sequence, { at: clock + Number(delay), every: Math.max(1, Number(delay)), run: () => handler(...args) });
  return sequence;
}) as typeof window.setInterval;
window.clearTimeout = window.clearInterval = id => { timers.delete(Number(id)); };
Math.random = () => { draws.push(0.625); return 0.625; };
const nativeFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  requests.push({ url: input instanceof Request ? input.url : String(input), method: init?.method ?? 'GET' });
  return nativeFetch(input, init);
};
const identify = (target: EventTarget | null) => {
  const element = target instanceof Element ? target : null;
  return element ? {
    tag: element.tagName, text: (element.textContent ?? '').trim(),
    label: element.getAttribute('aria-label'), type: element.getAttribute('type'),
  } : null;
};
for (const type of ['keydown', 'keyup', 'click'] as const) {
  window.addEventListener(type, event => {
    const row: Record<string, unknown> = {
      type, key: event instanceof KeyboardEvent ? event.key : null,
      code: event instanceof KeyboardEvent ? event.code : null,
      trusted: event.isTrusted, target: identify(event.target), defaultPrevented: null,
    };
    events.push(row);
    // Observe after every bubble listener, including the real DrillBoard listener.
    queueMicrotask(() => { row.defaultPrevented = event.defaultPrevented; });
  });
}
const stores = (storage: Storage) => Object.fromEntries(
  Array.from({ length: storage.length }, (_, index) => storage.key(index)!)
    .sort().map(key => [key, storage.getItem(key)]),
);
function Fixture() {
  const [open, setOpen] = useState(true);
  useEffect(() => { parentMounts++; return () => { parentUnmounts++; }; }, []);
  return open ? <TrainingPanel career={career} available
    onComplete={(drill: TrainingDrill, score: number) => { callbacks.complete.push([drill, score]); }}
    onDrill={(drill: DrillKind, count: number) => { callbacks.drill.push([drill, count]); }}
    onClose={() => { callbacks.close.push([]); setOpen(false); }} /> : null;
}
const read = () => {
  const svg = document.querySelector('[data-drill-board]');
  const range = document.querySelector<HTMLInputElement>('input[type="range"]');
  const aim = svg?.querySelector('circle[r="7"][stroke="hsl(var(--primary))"]');
  return JSON.parse(JSON.stringify({
    version: 1, kind, position, inputJSON, careerJSON: JSON.stringify(career),
    frozenInput: Object.isFrozen(career) && Object.isFrozen(career.seasons) && Object.isFrozen(career.events),
    parentMounts, parentUnmounts, panelPresent: !!document.querySelector('[aria-label="Training ground"]'),
    screen: document.querySelector('[data-soccer-practice-screen]')?.getAttribute('data-soccer-practice-screen') ?? null,
    phase: svg?.getAttribute('data-drill-phase') ?? null,
    intro: Array.from(document.querySelectorAll('button')).some(button => button.textContent?.trim() === "Today's ten"),
    power: range ? Number(range.value) : null,
    aim: aim ? { x: Number(aim.getAttribute('cx')), y: Number(aim.getAttribute('cy')) } : null,
    active: identify(document.activeElement), local: stores(localStorage), session: stores(sessionStorage),
    callbacks, draws, requests, events, clock, clockSteps,
    pendingTimers: Array.from(timers, ([id, timer]) => ({ id, at: timer.at, every: timer.every })),
    html: document.getElementById('root')!.innerHTML,
  }));
};
Object.defineProperty(window, '__DRILL_KEYBOARD__', { value: Object.freeze({ read }) });
Object.defineProperty(window, '__DRILL_KEYBOARD_CLOCK__', { value: Object.freeze({
  advance(to: number) {
    if (to !== 200 || clock !== 0) throw new Error('Only the declared 0 to 200ms advance is permitted');
    clock = to;
    clockSteps.push(to);
    flushSync(() => {
      for (const [id, timer] of [...timers]) {
        if (timer.at > clock) continue;
        if (timer.every) timer.at += timer.every; else timers.delete(id);
        timer.run();
      }
    });
  },
}) });
flushSync(() => createRoot(document.getElementById('root')!).render(<Fixture />));
