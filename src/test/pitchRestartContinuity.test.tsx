import { useLayoutEffect, useMemo } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appendFileSync } from 'node:fs';
import type { PitchEvent, PitchInput } from '@/components/pitch-motion/contract';
import type { MotionEvent, MotionFrame } from '@/components/pitch-motion/motion';
import type { PitchPlaced } from '@/components/pitch-motion/scene';

const motion = process.env.PITCH_RESTART_MOTION;
const scenes = process.env.PITCH_RESTART_SCENE;
const contract = process.env.PITCH_RESTART_CONTRACT;
const { useLiveSimMotion } = motion ? await import(/* @vite-ignore */ motion) : await import('@/components/pitch-motion/motion');
const { pitchPlan, pitchScene, pitchSceneKey, pitchBeatAt } = scenes ? await import(/* @vite-ignore */ scenes) : await import('@/components/pitch-motion/scene');
const { ACTION_SPAN } = contract ? await import(/* @vite-ignore */ contract) : await import('@/components/pitch-motion/contract');

type Frame = MotionFrame<PitchPlaced>;
type Commit = { clock: number; sceneKey: string; beat: string; frame: Frame; target: Frame['ball'] };
let tape: Commit[] = [];
let heldInputs: { source: PitchInput; bytes: string }[] = [];
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const figures = (prefix: string) => [
  { key: prefix + '0', name: prefix + ' keeper', line: 'keeper' as const, slot: { x: 50, y: 90 } },
  { key: prefix + '5', name: prefix + ' defender', line: 'defence' as const, slot: { x: 38, y: 72 } },
  { key: prefix + '9', name: prefix + ' striker', line: 'attack' as const, slot: { x: 40, y: 28 } },
];
function input(kind: 'goal' | 'shot' | 'save', extra: Partial<PitchEvent> = {}): PitchInput {
  return { mine: figures('m'), theirs: figures('o'), feed: [{ minute: 10, side: 'me', kind, text: 'm striker', flank: 'left', ...extra }], span: { from: 0, to: 20 }, seed: 1366, possession: .5 };
}
function Probe({ source, clock, reduced = false, withdrawn = false }: { source: PitchInput; clock: number; reduced?: boolean; withdrawn?: boolean }) {
  const plan = useMemo(() => pitchPlan(source), [source]);
  // A redraw keeps the committed line object; a new feed starts new actions.
  const events: MotionEvent[] = useMemo(() => plan.actions.map((a: { event: PitchEvent; at: number }, i: number) => ({ ...a, key: 'committed-' + i })), [source.feed]);
  const sceneKey = pitchSceneKey(plan, clock);
  const scene = useMemo(() => pitchScene(plan, clock), [plan, sceneKey]);
  const event = withdrawn ? null : events.find(a => a.at <= clock && clock < a.at + ACTION_SPAN) ?? null;
  const frame: Frame = useLiveSimMotion(scene, event, clock, true, reduced);
  useLayoutEffect(() => { tape.push({ clock, sceneKey, beat: pitchBeatAt(plan, clock).state, frame: copy(frame), target: copy(scene.ball) }); });
  return <output data-phase={frame.phase} data-action={frame.action} />;
}
function mount(source: PitchInput, clock = 9.9, reduced = false) {
  const before = JSON.stringify(source);
  heldInputs.push({ source, bytes: before });
  const view = render(<Probe source={source} clock={clock} reduced={reduced} />);
  return {
    at(next: number, options: { source?: PitchInput; withdrawn?: boolean } = {}) {
      const start = tape.length;
      view.rerender(<Probe source={options.source ?? source} clock={next} reduced={reduced} withdrawn={options.withdrawn} />);
      const commits = tape.slice(start);
      expect(commits.length).toBeGreaterThan(0);
      return commits;
    },
    held() { expect(JSON.stringify(source)).toBe(before); },
  };
}
const last = () => tape[tape.length - 1];
const coordinates = (frame: Frame) => ({ ball: frame.ball, mine: frame.mine.map(p => ({ key: p.key, name: p.name, x: p.x, y: p.y })), theirs: frame.theirs.map(p => ({ key: p.key, name: p.name, x: p.x, y: p.y })) });
const sameCoordinates = (a: Frame, b: Frame) => JSON.stringify(coordinates(a)) === JSON.stringify(coordinates(b));
const distance = (a: Frame['ball'], b: Frame['ball']) => Math.hypot(a.x - b.x, a.y - b.y);

beforeEach(() => { tape = []; heldInputs = []; vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('pitch presentation consumed match RNG'); }); });
afterEach(({ task }) => {
  if (process.env.PITCH_RESTART_TAPES) appendFileSync(process.env.PITCH_RESTART_TAPES, JSON.stringify({ title: task.name, commits: tape, inputs: heldInputs.map(row => ({ before: JSON.parse(row.bytes), after: copy(row.source) })), inputsHeld: heldInputs.every(row => JSON.stringify(row.source) === row.bytes), randomDraws: vi.mocked(Math.random).mock.calls.length }) + '\n');
  try {
    expect(Math.random).not.toHaveBeenCalled();
    for (const row of heldInputs) expect(JSON.stringify(row.source)).toBe(row.bytes);
  } finally { cleanup(); vi.restoreAllMocks(); }
});

describe('Pitch restart committed coordinates', () => {
  for (const row of [
    { kind: 'goal' as const, restart: 'kickoff', phase: 'net', terminal: { x: 43, y: 1 }, target: { x: 50, y: 50 } },
    { kind: 'shot' as const, restart: 'goalkick', phase: 'wide', terminal: { x: 26, y: 1 }, target: { x: 44, y: 5.5 } },
    { kind: 'save' as const, restart: 'keeper', phase: 'caught', terminal: { x: 43, y: 8 }, target: { x: 50, y: 10 } },
  ]) it(`restart continuity missing: ${row.kind} to ${row.restart} keeps its last committed coordinates`, () => {
    const source = input(row.kind);
    const view = mount(source);
    view.at(10);
    view.at(10.8);
    view.at(10 + ACTION_SPAN - .001);
    const terminal = copy(last().frame);
    expect(terminal.phase).toBe(row.phase);
    expect(terminal.ball).toEqual(row.terminal);
    const first = view.at(10 + ACTION_SPAN + .001)[0];
    expect(first.beat).toBe(row.restart);
    expect(first.frame.phase).toBe('pass');
    expect(first.target).toEqual(row.target);
    expect(sameCoordinates(first.frame, terminal), 'first post-action frame lost the committed terminal coordinates').toBe(true);
    view.at(10 + ACTION_SPAN + .151);
    const middle = last().frame;
    expect(distance(middle.ball, row.target)).toBeLessThan(distance(terminal.ball, row.target));
    expect(distance(middle.ball, row.target)).toBeGreaterThan(0);
    view.at(10 + ACTION_SPAN + .311);
    expect(last().frame.ball).toEqual(row.target);
    expect(last().frame.net).toBeNull();
    view.held();
  });

  it('restart preserves: a held caller clock freezes the frame and resumed clock advances it', () => {
    const source = input('save'); const view = mount(source);
    view.at(10); view.at(10.4);
    const held = copy(last().frame);
    for (let i = 0; i < 3; i++) expect(view.at(10.4).every(c => JSON.stringify(c.frame) === JSON.stringify(held))).toBe(true);
    view.at(10.6); expect(distance(last().frame.ball, held.ball)).toBeGreaterThan(0);
    view.at(10.9); expect(last().frame.phase).toBe('caught');
    expect(last().frame.ball).toEqual({ x: 43, y: 8 }); view.held();
  });
  it('restart preserves: reduced motion reaches the actual action and restart without a tween', () => {
    const source = input('goal'); const view = mount(source, 9.9, true);
    view.at(10); expect(last().frame.phase).toBe('net'); expect(last().frame.ball).toEqual({ x: 43, y: 1 });
    const commits = view.at(10 + ACTION_SPAN + .001);
    expect(commits.every(c => c.frame.phase === 'pass' && c.frame.ball.x === 50 && c.frame.ball.y === 50)).toBe(true); view.held();
  });
  it('restart preserves: a new committed action replaces the previous goal', () => {
    const source = input('goal'); source.feed.push({ minute: 12, side: 'opp', kind: 'save', text: 'o striker', flank: 'right' });
    const nextAt: number = pitchPlan(source).actions[1].at;
    expect(nextAt).toBeGreaterThanOrEqual(12); expect(nextAt).toBeLessThan(13);
    const view = mount(source); view.at(10); view.at(10.9); expect(last().frame.net).toBe('opp');
    view.at(11.1); view.at(11.5); view.at(nextAt); view.at(nextAt + .4);
    expect(last().frame.action).toBe('save'); expect(last().frame.phase).toBe('flight'); expect(last().frame.net).toBeNull();
    view.at(nextAt + .9); expect(last().frame.phase).toBe('caught'); expect(last().frame.ball).toEqual({ x: 57, y: 92 }); view.held();
  });
  it('restart preserves: a withdrawn action stays withdrawn after clock rewind', () => {
    const source = input('goal'); const view = mount(source); view.at(10); view.at(10.4);
    expect(last().frame.action).toBe('goal');
    for (const clock of [9, 9.5, 10, 10.4, 11]) {
      const commits = view.at(clock, { withdrawn: true });
      expect(commits.every(c => c.frame.action === 'pass' && c.frame.net === null && Object.keys(c.frame.poses).length === 0)).toBe(true);
    } view.held();
  });
  it('restart preserves: a substitution cancels the old action and a new action uses the new figure', () => {
    const source = input('goal'); const view = mount(source); view.at(10); view.at(10.4);
    const changed = copy(source); changed.feed = source.feed; changed.mine[2].name = 'm substitute';
    const changedBefore = JSON.stringify(changed);
    view.at(10.5, { source: changed });
    expect(last().frame.action).toBe('pass'); expect(last().frame.mine.map(p => p.name)).toContain('m substitute');
    const next = copy(changed); next.feed = [{ minute: 12, side: 'me', kind: 'save', text: 'm substitute', flank: 'left' }];
    const nextBefore = JSON.stringify(next);
    view.at(11.7, { source: next }); view.at(12, { source: next }); view.at(12.4, { source: next });
    expect(last().frame.action).toBe('save'); expect(last().frame.poses.m9?.kick).toBeDefined();
    expect(JSON.stringify(changed)).toBe(changedBefore); expect(JSON.stringify(next)).toBe(nextBefore); view.held();
  });
  it('restart preserves: an own goal retains its intentional defender touch and rue pose', () => {
    const source = input('goal', { og: true, ogBy: 'o5', text: 'o defender' }); const view = mount(source);
    view.at(10); view.at(10.53);
    const touch = copy(last().frame); const defender = touch.theirs.find(p => p.key === 'o5')!;
    expect(touch.ownGoalBy).toBe('o5'); expect(defender.y).toBeGreaterThanOrEqual(13); expect(defender.y).toBeLessThanOrEqual(18);
    view.at(10.99); const terminal = last().frame;
    expect(terminal.ownGoalBy).toBe('o5'); expect(terminal.net).toBe('opp'); expect(terminal.poses.o5.rue).toBeGreaterThan(0);
    expect(Object.values(terminal.poses).every(p => p.hop === undefined)).toBe(true);
    expect(distance(touch.ball, terminal.ball)).toBeGreaterThan(0); view.held();
  });
});
