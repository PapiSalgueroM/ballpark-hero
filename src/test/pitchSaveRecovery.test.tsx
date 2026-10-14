import { useLayoutEffect, useMemo, useRef } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appendFileSync } from 'node:fs';
import type { PitchEvent, PitchInput, PitchMoment } from '@/components/pitch-motion/contract';
import type { MotionEvent, MotionFrame } from '@/components/pitch-motion/motion';
import type { PitchPlaced } from '@/components/pitch-motion/scene';

type Motion = typeof import('@/components/pitch-motion/motion');
type Shared = typeof import('@/components/pitch-motion/PitchMotion');
type Frame = MotionFrame<PitchPlaced>;
type Commit = { arm: string; clock: number; event: MotionEvent | null; active: boolean; reduced: boolean; frame: Frame; svgs: Record<string, string> };
let candidate: Motion, parent: Motion, shared: Shared, parentShared: Shared;
let scenes: typeof import('@/components/pitch-motion/scene');
let contract: typeof import('@/components/pitch-motion/contract');
let tape: Commit[], inputs: { source: PitchInput; bytes: string }[], callbacks: { arm: string; moment: PitchMoment; event: PitchEvent | null }[];
let sharedFrames: { clock: number; playing: boolean; candidate: string; parent: string }[];
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const figures = (prefix: string) => [
  { key: prefix + '0', name: prefix + ' keeper', line: 'keeper' as const, slot: { x: 50, y: 90 } },
  { key: prefix + '5', name: prefix + ' defender', line: 'defence' as const, slot: { x: 38, y: 72 } },
  { key: prefix + '9', name: prefix + ' striker', line: 'attack' as const, slot: { x: 40, y: 28 } },
];
function source(kind: 'save' | 'goal' | 'shot' = 'save', side: 'me' | 'opp' = 'me'): PitchInput {
  return { mine: figures('m'), theirs: figures('o'), feed: [{ minute: 10, side, kind, text: (side === 'me' ? 'm' : 'o') + ' striker', flank: side === 'me' ? 'left' : 'right' }], span: { from: 0, to: 20 }, seed: 1366, possession: .5 };
}
type Options = { retained?: boolean; withdrawn?: boolean; active?: boolean; reduced?: boolean; source?: PitchInput };
function Probe({ arm, input, clock, options }: { arm: string; input: PitchInput; clock: number; options: Options }) {
  const mod = arm === 'candidate' ? candidate : parent;
  const host = useRef<HTMLDivElement>(null);
  const plan = useMemo(() => scenes.pitchPlan(input), [input]);
  const events: MotionEvent[] = useMemo(() => plan.actions.map((action, index) => ({ ...action, key: 'save-proof-' + index })), [input.feed]);
  const key = scenes.pitchSceneKey(plan, clock);
  const scene = useMemo(() => scenes.pitchScene(plan, clock), [plan, key]);
  const eligible = events.filter(action => action.at <= clock && (options.retained || clock < action.at + contract.ACTION_SPAN));
  const event = options.withdrawn ? null : eligible[eligible.length - 1] ?? null;
  const frame: Frame = mod.useLiveSimMotion(scene, event, clock, options.active ?? true, options.reduced ?? false);
  useLayoutEffect(() => {
    const svgs = Object.fromEntries([...host.current!.querySelectorAll<HTMLElement>('[data-figure]')].map(node => [node.dataset.figure!, node.querySelector('svg')!.outerHTML]));
    tape.push({ arm, clock, event: copy(event), active: options.active ?? true, reduced: options.reduced ?? false, frame: copy(frame), svgs });
  });
  const Actor = mod.LivePitchPlayer;
  return <div ref={host}>{[...frame.mine, ...frame.theirs].map(player => <span key={player.key} data-figure={player.key}><Actor color="#86bced" keeper={player.keeper} pose={frame.poses[player.key]} /></span>)}</div>;
}
function watch(input: PitchInput, options: Options = {}) {
  inputs.push({ source: input, bytes: JSON.stringify(input) });
  const pair = (clock: number, next: Options) => <><Probe arm="candidate" input={next.source ?? input} clock={clock} options={next} /><Probe arm="parent" input={next.source ?? input} clock={clock} options={next} /></>;
  const view = render(pair(9.9, options));
  return { at(clock: number, next: Options = options) {
    if (next.source && !inputs.some(row => row.source === next.source)) inputs.push({ source: next.source, bytes: JSON.stringify(next.source) });
    const from = tape.length; view.rerender(pair(clock, next));
    const commits = tape.slice(from), current = commits.filter(row => row.arm === 'candidate'), original = commits.filter(row => row.arm === 'parent');
    expect(current.length).toBeGreaterThan(0); expect(current.length).toBe(original.length);
    return { current, original };
  }, unmount: view.unmount };
}
function withoutRecovery(frame: Frame, keeper?: string) {
  const result = copy(frame);
  if (keeper && result.poses[keeper]) {
    delete result.poses[keeper].dive; delete result.poses[keeper].catching; delete result.poses[keeper].recovery;
    if (Object.keys(result.poses[keeper]).length === 0) delete result.poses[keeper];
  }
  return result;
}
function held(pair: ReturnType<ReturnType<typeof watch>['at']>, keeper?: string) {
  pair.current.forEach((row, index) => {
    const original = pair.original[index];
    expect(withoutRecovery(row.frame, keeper), 'save recovery changed another complete frame field').toEqual(withoutRecovery(original.frame, keeper));
    expect({ clock: row.clock, event: row.event, active: row.active, reduced: row.reduced }).toEqual({ clock: original.clock, event: original.event, active: original.active, reduced: original.reduced });
    for (const key of Object.keys(row.svgs)) if (key !== keeper) expect(row.svgs[key]).toBe(original.svgs[key]);
    if (!keeper) expect(row.svgs).toEqual(original.svgs);
  });
}
function sharedWatch(input: PitchInput) {
  inputs.push({ source: input, bytes: JSON.stringify(input) });
  const renderPair = (clock: number, playing: boolean) => {
    const Current = shared.PitchMotion, Original = parentShared.PitchMotion;
    const colors = { mine: '#86bced', theirs: '#f0b34b' };
    return <><div data-shared="candidate"><Current {...input} colors={colors} clock={clock} playing={playing} reducedMotion={false} onMoment={(moment, event) => callbacks.push({ arm: 'candidate', moment, event: copy(event) })} /></div>
      <div data-shared="parent"><Original {...input} colors={colors} clock={clock} playing={playing} reducedMotion={false} onMoment={(moment, event) => callbacks.push({ arm: 'parent', moment, event: copy(event) })} /></div></>;
  };
  const view = render(renderPair(9.9, true));
  return { at(clock: number, playing = true) { view.rerender(renderPair(clock, playing)); const pair = [...view.container.querySelectorAll('[data-shared]')].map(node => node.innerHTML); sharedFrames.push({ clock, playing, candidate: pair[0], parent: pair[1] }); return pair; }, unmount: view.unmount };
}
beforeEach(async () => {
  tape = []; inputs = []; callbacks = []; sharedFrames = [];
  candidate = process.env.PITCH_SAVE_MOTION ? await import(/* @vite-ignore */ process.env.PITCH_SAVE_MOTION) : await import('@/components/pitch-motion/motion');
  parent = process.env.PITCH_SAVE_PARENT_MOTION ? await import(/* @vite-ignore */ process.env.PITCH_SAVE_PARENT_MOTION) : candidate;
  shared = process.env.PITCH_SAVE_SHARED ? await import(/* @vite-ignore */ process.env.PITCH_SAVE_SHARED) : await import('@/components/pitch-motion/PitchMotion');
  parentShared = process.env.PITCH_SAVE_PARENT_SHARED ? await import(/* @vite-ignore */ process.env.PITCH_SAVE_PARENT_SHARED) : shared;
  scenes = process.env.PITCH_SAVE_SCENE ? await import(/* @vite-ignore */ process.env.PITCH_SAVE_SCENE) : await import('@/components/pitch-motion/scene');
  contract = process.env.PITCH_SAVE_CONTRACT ? await import(/* @vite-ignore */ process.env.PITCH_SAVE_CONTRACT) : await import('@/components/pitch-motion/contract');
  vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('save presentation consumed match RNG'); });
});
afterEach(({ task }) => {
  if (process.env.PITCH_SAVE_TAPES) appendFileSync(process.env.PITCH_SAVE_TAPES, JSON.stringify({ title: task.name, commits: tape, sharedFrames, callbacks, inputs: inputs.map(row => ({ before: JSON.parse(row.bytes), after: copy(row.source) })), inputsHeld: inputs.every(row => JSON.stringify(row.source) === row.bytes), randomDraws: vi.mocked(Math.random).mock.calls.length }) + '\n');
  try { expect(Math.random).not.toHaveBeenCalled(); inputs.forEach(row => expect(JSON.stringify(row.source)).toBe(row.bytes)); }
  finally { cleanup(); vi.restoreAllMocks(); }
});

describe('Pitch save keeper recovery', () => {
  for (const side of ['me', 'opp'] as const) it(`save recovery missing: ${side} save keeps the defending keeper pose`, () => {
    const keeper = side === 'me' ? 'o0' : 'm0', dive = side === 'me' ? -68 : 68;
    // Both actual binders are observed before the causal Boolean: shared drops the completed event, Manager retains it.
    const journeys = [false, true].map(retained => {
      const view = watch(source('save', side), { retained });
      view.at(10); view.at(10.8);
      const terminal = view.at(11.049), first = view.at(11.051);
      const middle = [11.126, 11.201, 11.276].map(clock => view.at(clock));
      const end = view.at(11.351); view.unmount();
      [terminal, first, ...middle, end].forEach(pair => held(pair, keeper));
      return { terminal: terminal.current[terminal.current.length - 1], first: first.current, middle: middle.map(pair => pair.current[pair.current.length - 1]), end: end.current };
    });
    journeys.forEach(row => { expect(row.terminal.frame.phase).toBe('caught'); expect(row.terminal.frame.poses[keeper]).toEqual({ dive, catching: 1 }); });
    expect(journeys.every(row => row.first.every(commit => JSON.stringify(commit.frame.poses[keeper]) === JSON.stringify(row.terminal.frame.poses[keeper]) && commit.svgs[keeper] === row.terminal.svgs[keeper])), 'first save recovery frame lost the committed keeper pose').toBe(true);
    journeys.forEach(row => {
      let priorDive = Math.abs(dive), priorCatch = 1;
      row.middle.forEach(commit => {
        const pose = commit.frame.poses[keeper]; expect(pose).toBeDefined();
        expect(Math.sign(pose.dive!)).toBe(Math.sign(dive)); expect(Math.abs(pose.dive!)).toBeGreaterThan(0); expect(Math.abs(pose.dive!)).toBeLessThan(priorDive);
        expect(pose.catching!).toBeGreaterThan(0); expect(pose.catching!).toBeLessThan(priorCatch);
        priorDive = Math.abs(pose.dive!); priorCatch = pose.catching!;
      });
      row.end.forEach(commit => { expect(commit.frame.poses[keeper]?.dive ?? 0).toBe(0); expect(commit.frame.poses[keeper]?.catching ?? 0).toBe(0); expect(commit.svgs[keeper]).toContain('data-cm-actor-pose="stand"'); });
    });
  });
  it('save recovery preserves: reduced motion keeps the original still restart', () => {
    const view = watch(source(), { reduced: true });
    [10, 10.8, 11.049, 11.051, 11.201, 11.351].forEach(clock => held(view.at(clock))); view.unmount();
  });
  it('save recovery preserves: the actual paused pitch holds its SVG and callbacks', () => {
    const view = sharedWatch(source()); view.at(10); const stopped = view.at(10.5);
    const before = copy(callbacks);
    [10.8, 11.051, 12].forEach(clock => expect(view.at(clock, false)).toEqual(stopped));
    expect(callbacks).toEqual(before); const resumed = view.at(10.6); expect(resumed[0]).not.toBe(stopped[0]); expect(resumed[0]).toBe(resumed[1]);
    view.at(10.8); view.at(11.049); view.at(11.051); const recovering = view.at(11.201), caughtCallbacks = copy(callbacks);
    [11.3, 12].forEach(clock => expect(view.at(clock, false)).toEqual(recovering)); expect(callbacks).toEqual(caughtCallbacks);
    expect(view.at(11.251)[0]).not.toBe(recovering[0]);
    expect(callbacks.filter(row => row.arm === 'candidate').map(({ arm, ...row }) => row)).toEqual(callbacks.filter(row => row.arm === 'parent').map(({ arm, ...row }) => row)); view.unmount();
  });
  it('save recovery preserves: an inactive hook cancels the original action', () => {
    const view = watch(source()); view.at(10); view.at(10.8);
    [11.049, 11.051, 11.201].forEach(clock => held(view.at(clock, { active: false }))); view.unmount();
  });
  it('save recovery preserves: withdrawal and rewind do not revive a saved pose', () => {
    const view = watch(source()); view.at(10); view.at(10.8); view.at(11.049);
    [9, 9.5, 10, 10.8, 11.051, 11.201].forEach(clock => held(view.at(clock, { withdrawn: true }))); view.unmount();
  });
  it('save recovery preserves: a changed cast cancels the old keeper recovery', () => {
    for (const kind of ['name', 'role'] as const) {
      const input = source(); const view = watch(input); view.at(10); view.at(10.8); view.at(11.049);
      const changed = copy(input); changed.feed = input.feed;
      if (kind === 'name') changed.theirs[0].name = 'o substitute keeper'; else changed.theirs[0].line = 'defence';
      [11.051, 11.201, 11.351].forEach(clock => held(view.at(clock, { source: changed }))); view.unmount();
    }
  });
  it('save recovery preserves: a new action replaces the old save pose', () => {
    const input = source(); input.feed.push({ minute: 12, side: 'opp', kind: 'goal', text: 'o striker', flank: 'right' });
    const view = watch(input, { retained: true }); view.at(10); view.at(10.8); view.at(11.049); view.at(11.151);
    const nextAt = scenes.pitchPlan(input).actions[1].at; expect(nextAt).toBeGreaterThanOrEqual(12); expect(nextAt).toBeLessThan(13);
    [nextAt, nextAt + .3, nextAt + .9, nextAt + 1.051].forEach(clock => held(view.at(clock, { retained: true })));
    expect(tape.some(row => row.arm === 'candidate' && row.clock === nextAt + .3 && row.frame.action === 'goal')).toBe(true); view.unmount();
  });
  it('save recovery preserves: other actions and their actual moment callbacks stay identical', () => {
    for (const kind of ['goal', 'shot'] as const) {
      const input = source(kind), view = watch(input);
      [10, 10.8, 11.049, 11.051, 11.201, 11.351].forEach(clock => held(view.at(clock))); view.unmount();
      const ready = sharedWatch(input);
      [10, 10.8, 11.049, 11.051, 11.201, 11.351].forEach(clock => { const pair = ready.at(clock); expect(pair[0]).toBe(pair[1]); }); ready.unmount();
    }
    expect(callbacks.filter(row => row.arm === 'candidate').map(({ arm, ...row }) => row)).toEqual(callbacks.filter(row => row.arm === 'parent').map(({ arm, ...row }) => row));
    expect(callbacks.filter(row => row.arm === 'candidate').map(row => row.moment)).toContain('strike');
  });
  it('save recovery geometry: keeper arms blend from caught to standing', () => {
    const stages = [
      { name: 'terminal', clock: 11.049, recovery: null, handY: -20, handX: 5, armX: 5 },
      { name: 'first', clock: 11.051, recovery: null, handY: -20, handX: 5, armX: 5 },
      { name: 'quarter', clock: 11.126, recovery: .15625, handY: -17.34375, handX: 5.9375, armX: 5.78125 },
      { name: 'middle', clock: 11.201, recovery: .5, handY: -11.5, handX: 8, armX: 7.5 },
      { name: 'three-quarter', clock: 11.276, recovery: .84375, handY: -5.65625, handX: 10.0625, armX: 9.21875 },
      { name: 'neutral', clock: 11.351, recovery: null, handY: -3, handX: 11, armX: 10 },
    ];
    const observe = (commit: Commit, keeper: string, stage: typeof stages[number]) => {
      const host = document.createElement('div'); host.innerHTML = commit.svgs[keeper];
      const group = host.querySelector('svg g')!;
      const circles = [...group.querySelectorAll('circle')].map(node => ({ cx: Number(node.getAttribute('cx')), cy: Number(node.getAttribute('cy')) }));
      const paths = [...group.querySelectorAll('path')], armsD = paths[3].getAttribute('d')!;
      const armNumbers = armsD.match(/^M-5-12 ([^ ]+) ([^M ]+)M5-12 ([^ ]+) ([^ ]+)$/);
      const geometry = { stage: stage.name, expected: stage, circles, groupCircleCount: circles.length, groupPathCount: paths.length,
        armsD, arms: armNumbers ? armNumbers.slice(1).map(Number) : [],
        metadataPresent: Object.prototype.hasOwnProperty.call(commit.frame.poses[keeper] ?? {}, 'recovery'),
        recovery: (commit.frame.poses[keeper] as { recovery?: number } | undefined)?.recovery ?? null };
      Object.assign(commit, { recoveryGeometry: geometry });
      return geometry;
    };
    // All four actual hook journeys and raw SVG observations are retained before the causal Boolean.
    const journeys = (['me', 'opp'] as const).flatMap(side => [false, true].map(retained => {
      const keeper = side === 'me' ? 'o0' : 'm0', view = watch(source('save', side), { retained });
      view.at(10); view.at(10.8);
      const samples = stages.map(stage => {
        const pair = view.at(stage.clock);
        const current = pair.current.map(commit => observe(commit, keeper, stage));
        const original = pair.original.map(commit => observe(commit, keeper, stage));
        return { stage, pair, current, original };
      });
      view.unmount(); return { side, retained, keeper, samples };
    }));
    journeys.forEach(journey => journey.samples.forEach(sample => held(sample.pair, journey.keeper)));
    // Decimal clock subtraction and SVG serialization can differ at IEEE rounding precision.
    const equalNumber = (actual: number, expected: number) => Number.isFinite(actual) && Math.abs(actual - expected) <= 1e-9;
    const matched = journeys.every(journey => journey.samples.every(({ stage, current }) => current.every(row =>
      row.groupCircleCount === 2 && row.groupPathCount === 5
      && row.circles.every((circle, index) => equalNumber(circle.cx, index === 0 ? -stage.handX : stage.handX) && equalNumber(circle.cy, stage.handY))
      && row.arms.length === 4 && row.arms.every((value, index) => equalNumber(value, [-stage.armX, stage.handY, stage.armX, stage.handY][index]))
      && (stage.recovery === null ? !row.metadataPresent && row.recovery === null
        : row.metadataPresent && row.recovery !== null && equalNumber(row.recovery, stage.recovery))
    )));
    expect(matched, 'keeper recovery arms kept the old binary stance').toBe(true);
  });
});
