/* Real board and engines, with a controllable browser clock for motion checks. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import DrillBoard from '@/components/soccer-career/DrillBoard';
import * as engine from '@/lib/careerDrills';
import type { CareerState } from '@/lib/soccerCareerEngine';

const DATE = '2026-09-15';
const EPOCH = Date.parse(`${DATE}T16:00:00Z`);
const RealDate = Date;
let clock = 0;
let reduce = false;
let seq = 0;
const frames = new Map<number, FrameRequestCallback>();
const timers = new Map<number, { at: number; every: number; run: () => void }>();
const listeners = new Set<() => void>();
Object.defineProperty(window, 'Date', { value: class extends RealDate {
  constructor(value?: string | number | Date) { super(value === undefined ? EPOCH + clock : value as string); }
  static now() { return EPOCH + clock; }
} });
Object.defineProperty(performance, 'now', { value: () => clock });
window.requestAnimationFrame = run => { frames.set(++seq, run); return seq; };
window.cancelAnimationFrame = id => { frames.delete(id); };
window.setTimeout = ((run: () => void, ms = 0) => { timers.set(++seq, { at: clock + ms, every: 0, run }); return seq; }) as typeof window.setTimeout;
window.setInterval = ((run: () => void, ms = 0) => { timers.set(++seq, { at: clock + ms, every: ms, run }); return seq; }) as typeof window.setInterval;
window.clearTimeout = window.clearInterval = id => { timers.delete(id); };
window.matchMedia = ((media: string) => ({
  get matches() { return reduce && media.includes('reduced-motion'); }, media, onchange: null,
  addEventListener: (_: string, run: () => void) => { listeners.add(run); },
  removeEventListener: (_: string, run: () => void) => { listeners.delete(run); },
  addListener() {}, removeListener() {}, dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

const root = createRoot(document.getElementById('root')!);
let career: CareerState;
let bankCalls = 0;
let selected: engine.DrillKind = 'wallshot';
let plans: { input: any; result: any; setup: any }[] = [];
let roundStart = 0;
const button = (text: string) => {
  const found = [...document.querySelectorAll('button')].find(el => el.textContent?.trim() === text);
  if (!found) throw new Error(`Button missing: ${text}`);
  flushSync(() => found.click());
};
function advance(ms: number, draw = true) {
  const end = clock + ms;
  while (clock < end) {
    clock = Math.min(end, clock + 16);
    flushSync(() => {
      for (const [id, timer] of [...timers]) if (timer.at <= clock) {
        if (timer.every) timer.at += timer.every; else timers.delete(id);
        timer.run();
      }
      if (draw) {
        const due = [...frames.values()]; frames.clear();
        due.forEach(run => run(clock));
      }
    });
  }
}
function pointer(type: string, x: number, y: number) {
  const board = document.querySelector('[data-drill-board]')!;
  const rect = board.getBoundingClientRect();
  flushSync(() => board.dispatchEvent(new PointerEvent(type, {
    bubbles: true, clientX: rect.left + x * rect.width / 360, clientY: rect.top + y * rect.height / 210, pointerId: 1,
  })));
}
function buildPlans(kind: engine.DrillKind) {
  const seed = engine.drillSeed(kind, DATE);
  const run = kind === 'wallshot' ? engine.buildWallShotRun(seed) : kind === 'tackle' ? engine.buildTackleRun(seed) : engine.buildGloveRun(seed);
  const made: typeof plans = [];
  for (const setup of run) {
    if (kind === 'wallshot') {
      const w = setup as engine.WallShotSetup;
      let best: typeof plans[number] | null = null;
      for (const power of [0.4, 0.55, 0.7, 0.85]) for (const y of [0.35, 0.55, 0.75, 0.95]) for (const dx of [-0.08, 0, 0.08]) {
        const input = { x: w.gapCentre + dx, y, power, press: engine.wallNextPeak(w, engine.wallTravel(power) + 0.05) - engine.wallTravel(power) };
        const rng = engine.lehmer(seed ^ 0x5eed1234);
        made.forEach(old => engine.takeWallShot(old.input, old.setup, rng));
        const result = engine.takeWallShot(input, w, rng);
        if (!best || result.points > best.result.points) best = { setup, input, result };
      }
      made.push(best!);
    } else if (kind === 'tackle') {
      const t = setup as engine.TackleSetup;
      let found = false;
      for (let press = 0.2; press < engine.tackleDeadline(t); press += 0.025) {
        const ball = engine.tackleBallAt(t, press);
        const input = { ...ball, press };
        const result = engine.makeTackle(input, t);
        if (result.won) { made.push({ setup, input, result }); found = true; break; }
      }
      if (!found) throw new Error('Tackle fixture has no winning input');
    } else {
      const g = setup as engine.GloveSetup;
      const dx = g.target.x - engine.GLOVE_ORIGIN.x;
      const dy = g.target.y - engine.GLOVE_ORIGIN.y;
      const input = { dx, dy, release: Math.max(0.05, engine.gloveDeadline(g) - engine.diveTime(Math.hypot(dx, dy) / engine.GLOVE_MAX_REACH) - 0.1) };
      made.push({ setup, input, result: engine.makeSave(input, g) });
    }
  }
  return made;
}
function mount(kind: engine.DrillKind, reduced = false) {
  flushSync(() => root.render(null));
  clock = 0; frames.clear(); timers.clear(); listeners.clear(); localStorage.clear(); reduce = reduced;
  selected = kind;
  career = { position: kind === 'wallshot' ? 'ST' : kind === 'tackle' ? 'CB' : 'GK', overall: 60, potential: 90, potentialEarned: 0, seasons: [{ year: 2026 }], statBoostNextSeason: {}, morale: 50, events: [] } as unknown as CareerState;
  bankCalls = 0;
  plans = buildPlans(kind);
  flushSync(() => root.render(<DrillBoard career={career} canBank onBack={() => {}} onBank={(kind, count) => { bankCalls += 1; career = engine.applyDrillResult(career, kind, count); }} />));
  button("Today's ten");
}
async function resolve(index: number, miss = false, wallInput?: engine.WallShotInput) {
  let plan = plans[index];
  if (wallInput && selected === 'wallshot') {
    const rng = engine.lehmer(engine.drillSeed('wallshot', DATE) ^ 0x5eed1234);
    plans.slice(0, index).forEach(old => engine.takeWallShot(old.input, old.setup, rng));
    plan = { ...plan, input: wallInput, result: engine.takeWallShot(wallInput, plan.setup, rng) };
  }
  if (miss && selected === 'gloves') {
    const input = { ...plan.input, dx: -plan.input.dx, dy: -plan.input.dy };
    plan = { ...plan, input, result: engine.makeSave(input, plan.setup) };
  }
  button(index === 0 ? 'Start' : 'Next one');
  roundStart = clock;
  advance((plan.input.press ?? plan.input.release) * 1000);
  const before = document.querySelector('[data-drill-ball]');
  const ball = { x: Number(before?.getAttribute('cx')), y: Number(before?.getAttribute('cy')) };
  const drawnTime = Number(document.querySelector('[data-drill-board]')?.getAttribute('data-drill-time'));
  const target = selected === 'tackle' ? engine.tackleBallAt(plan.setup, drawnTime) : null;
  let dragRead = '';
  if (selected === 'wallshot') {
    const range = document.querySelector('input[type="range"]')!;
    flushSync(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(range, String(plan.input.power));
      range.dispatchEvent(new Event('change', { bubbles: true }));
    });
    pointer('pointerdown', 60 + ((plan.input.x + 1) / 2) * 240, 150 - plan.input.y * 116);
    pointer('pointerup', 60 + ((plan.input.x + 1) / 2) * 240, 150 - plan.input.y * 116);
  } else if (selected === 'tackle') {
    pointer('pointerdown', plan.input.x * 360, plan.input.y * 210);
  } else {
    pointer('pointerdown', 180, 110);
    pointer('pointermove', 180 + plan.input.dx * (240 / 7.32), 110 - plan.input.dy * (116 / 2.44));
    /* Continuous pointer updates commit between real browser input tasks. */
    await new Promise<void>(done => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => { channel.port1.close(); channel.port2.close(); done(); };
      channel.port2.postMessage(null);
    });
    dragRead = document.getElementById('root')?.textContent ?? '';
    pointer('pointerup', 180, 110);
  }
  return { expected: plan.result, input: plan.input, ball, target, setup: plan.setup, dragRead };
}
function reduced(value: boolean) { reduce = value; flushSync(() => listeners.forEach(run => run())); }
function state() {
  const svg = document.querySelector('[data-drill-board]');
  const keeper = document.querySelector('[data-drill-keeper]');
  const ball = document.querySelector('[data-drill-ball]');
  return {
    phase: svg?.getAttribute('data-drill-phase'), time: clock, sinceRound: clock - roundStart, drawTime: Number(svg?.getAttribute('data-drill-time')),
    text: document.getElementById('root')?.textContent,
    pose: [...document.querySelectorAll('[data-drill-player], [data-drill-keeper]')].map(el => el.outerHTML).join(''),
    keeper: keeper ? { x: Number(keeper.getAttribute('data-glove-x')), y: Number(keeper.getAttribute('data-glove-y')), catching: keeper.getAttribute('data-catching') } : null,
    ball: ball ? { x: Number(ball.getAttribute('cx')), y: Number(ball.getAttribute('cy')) } : null,
    records: { ...localStorage }, bankCalls, career,
  };
}
function wallCases() {
  const seed = engine.drillSeed('wallshot', DATE);
  const found: Record<string, { index: number; input: engine.WallShotInput; result: engine.WallShotResult }> = {};
  for (let index = 0; index < plans.length; index++) {
    const setup = plans[index].setup as engine.WallShotSetup;
    for (const power of [0.3, 0.4, 0.7, 1]) for (const y of [0.2, 0.6, 0.9, 1.1]) for (let step = 0; step <= 92; step++) {
      const input = { x: -1.15 + step * 0.025, y, power, press: engine.wallNextPeak(setup, engine.wallTravel(power) + 0.05) - engine.wallTravel(power) };
      const rng = engine.lehmer(seed ^ 0x5eed1234);
      plans.slice(0, index).forEach(old => engine.takeWallShot(old.input, old.setup, rng));
      const result = engine.takeWallShot(input, setup, rng);
      const weak = power < 0.36 + (setup.distance - 16) * 0.014;
      const tag = result.hitWall ? 'wall' : result.hitPost ? 'post' : weak ? 'weak' : result.won ? 'goal' : result.saved ? 'save' : 'wide';
      if (!found[tag] && (tag !== 'weak' || (Math.abs(result.x) < 1 && result.y > 0 && result.y < 1))) found[tag] = { index, input, result };
      if (Object.keys(found).length === 6) return found;
    }
  }
  throw new Error(`Missing wall fixtures: ${Object.keys(found).join(', ')}`);
}
(window as any).drillRig = { mount, resolve, advance, reduced, state, button, plans: () => plans, wallCases };
