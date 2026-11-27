import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PitchMotion } from '@/components/pitch-motion/PitchMotion';
import { ACTION_SPAN, BEAT_SPAN } from '@/components/pitch-motion/contract';
import type { PitchFigure, PitchInput, PitchMotionProps } from '@/components/pitch-motion/contract';
import { actionFrame } from '@/components/pitch-motion/motion';
import { pitchPlan, pitchScene } from '@/components/pitch-motion/scene';
import type { PitchPlaced } from '@/components/pitch-motion/scene';

type Picture = { ball: { x: number; y: number }; figures: { side: string; x: number; y: number }[] };
const held: { input: PitchInput; before: string }[] = [];
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
function figures(prefix: string): PitchFigure[] {
  return [
    { key: prefix + '0', name: prefix + ' keeper', line: 'keeper', slot: { x: 50, y: 90 } },
    ...[20, 40, 60, 80].map((x, i) => ({ key: prefix + (i + 1), name: prefix + ' back ' + i, line: 'defence' as const, slot: { x, y: 72 } })),
    ...[18, 39, 61, 82].map((x, i) => ({ key: prefix + (i + 5), name: prefix + ' middle ' + i, line: 'midfield' as const, slot: { x, y: 52 } })),
    { key: prefix + '9', name: prefix + ' striker', line: 'attack', slot: { x: 37, y: 27 } },
    { key: prefix + '10', name: prefix + ' second striker', line: 'attack', slot: { x: 65, y: 29 } },
  ];
}
function input(feed: PitchInput['feed'] = []): PitchInput {
  const value = freeze({ mine: figures('home'), theirs: figures('away'), feed, span: { from: 0, to: 30 }, possession: 0.63, seed: 1521 });
  held.push({ input: value, before: JSON.stringify(value) });
  return value;
}
function props(source: PitchInput, clock: number, extra: Partial<PitchMotionProps> = {}): PitchMotionProps {
  return { ...source, colors: { mine: '#79baff', theirs: '#edb073' }, clock, playing: true, reducedMotion: true, ...extra };
}
function point(node: HTMLElement) { return { x: Number.parseFloat(node.style.left), y: Number.parseFloat(node.style.top) }; }
function picture(container: HTMLElement): Picture {
  const ball = container.querySelector<HTMLElement>('[data-cm-ball="1"]');
  expect(ball, 'PITCH_ROOT_REAL_BALL_PRESENT').not.toBeNull();
  return {
    ball: point(ball!),
    figures: [...container.querySelectorAll<HTMLElement>('[data-pm-figure]')].map(node => ({ side: node.dataset.pmFigure!, ...point(node) })),
  };
}
function expected(source: PitchInput, clock: number): Picture {
  const scene = pitchScene(pitchPlan(source), clock);
  const side = (players: PitchPlaced[], name: string) => players.map(player => ({ side: name, x: player.x, y: player.y }));
  return { ball: scene.ball, figures: [...side(scene.theirs, 'opp'), ...side(scene.mine, 'me')] };
}
function apart(a: Picture, b: Picture): boolean {
  return Math.hypot(a.ball.x - b.ball.x, a.ball.y - b.ball.y) > 1
    && a.figures.some((p, i) => Math.hypot(p.x - b.figures[i].x, p.y - b.figures[i].y) > 1);
}
function witness(source: PitchInput) {
  const left = freeze({ me: -1, opp: 1 });
  const right = freeze({ me: 1, opp: -1 });
  const sources = [source, { ...source, build: left }, { ...source, build: right }];
  const plans = sources.map(value => pitchPlan(value));
  for (let i = 1; i < 78; i++) {
    const clock = (i + 0.5) * BEAT_SPAN;
    const snapshots = plans.map(plan => {
      const scene = pitchScene(plan, clock);
      return { ball: scene.ball, figures: [...scene.theirs.map(p => ({ side: 'opp', x: p.x, y: p.y })), ...scene.mine.map(p => ({ side: 'me', x: p.x, y: p.y }))] };
    });
    if (apart(snapshots[0], snapshots[1]) && apart(snapshots[1], snapshots[2])) return { clock, left, right, snapshots };
  }
  throw new Error('PITCH_ROOT_FIXTURE_REQUIRES_DISTINCT_REAL_PLANS');
}
function freeKick() {
  const source = input([{ minute: 10, side: 'me', kind: 'goal', text: 'home striker', flank: 'left', freeKick: true }]);
  const built = { ...source, build: freeze({ me: 0.4, opp: -0.2 }) };
  const plan = pitchPlan(built);
  expect(plan.actions).toHaveLength(1);
  return { source, built, plan, at: plan.actions[0].at, event: source.feed[0] };
}

beforeEach(() => {
  held.length = 0;
  vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Pitch presentation consumed match RNG'); });
});
afterEach(() => {
  try {
    expect(Math.random).not.toHaveBeenCalled();
    for (const row of held) expect(JSON.stringify(row.input)).toBe(row.before);
  } finally { cleanup(); vi.restoreAllMocks(); }
});

describe('Generic PitchMotion optional build wiring', () => {
  it('renders the supplied build plan in actual ball and figure positions', () => {
    const source = input();
    const row = witness(source);
    const legacy = render(<PitchMotion {...props(source, row.clock)} />);
    const built = render(<PitchMotion {...props(source, row.clock, { build: row.left })} />);
    expect(picture(legacy.container)).toEqual(row.snapshots[0]);
    expect(picture(built.container).ball, 'PITCH_ROOT_BUILD_REACHES_BALL').not.toEqual(picture(legacy.container).ball);
    expect(picture(built.container).figures, 'PITCH_ROOT_BUILD_REACHES_FIGURES').not.toEqual(picture(legacy.container).figures);
    expect(picture(built.container), 'PITCH_ROOT_BUILD_EXACT_REAL_SCENE').toEqual(row.snapshots[1]);
  });

  it('replans when only build changes while all other prop references and the clock stay held', () => {
    const source = input();
    const row = witness(source);
    const original = props(source, row.clock, { build: row.left });
    const view = render(<PitchMotion {...original} />);
    const before = picture(view.container);
    view.rerender(<PitchMotion {...original} build={row.right} />);
    const after = picture(view.container);
    expect(after, 'PITCH_ROOT_BUILD_ONLY_INVALIDATES_MEMO').not.toEqual(before);
    expect(after, 'PITCH_ROOT_BUILD_ONLY_MATCHES_REAL_PLAN').toEqual(row.snapshots[2]);
  });

  it('draws the real full-motion free-kick lift when build is supplied', () => {
    const row = freeKick();
    const initial = props(row.built, row.at, { reducedMotion: false });
    const view = render(<PitchMotion {...initial} />);
    view.rerender(<PitchMotion {...initial} clock={row.at + 0.55} />);
    const oracle = actionFrame(pitchScene(row.plan, row.at), { event: row.event, key: 'real-free-kick', at: row.at }, 0.55);
    expect(oracle.phase).toBe('flight');
    expect(oracle.lift).toBeGreaterThan(0.05);
    expect(view.container.querySelector('[data-cm-live-pitch]')).toHaveAttribute('data-cm-motion-phase', 'flight');
    const ball = view.container.querySelector<HTMLElement>('[data-cm-ball="1"]')!;
    expect(ball.getAttribute('data-cm-ball-lift'), 'PITCH_ROOT_BUILD_FLIGHT_LIFT').toBe(oracle.lift!.toFixed(2));
    // CSSOM serializes percentages. Twelve decimals bound this check within 0.0000000000005 percentage points.
    const actual = point(ball);
    expect(actual.x, 'PITCH_ROOT_FLIGHT_X_CSS_SERIALIZATION').toBeCloseTo(oracle.ball.x, 12);
    expect(actual.y, 'PITCH_ROOT_FLIGHT_Y_CSS_SERIALIZATION').toBeCloseTo(oracle.ball.y, 12);
    expect(ball.querySelector('.cm-live-ball-shadow')).not.toBeNull();
    expect(ball.querySelector('.cm-live-ball-air')).not.toBeNull();
    expect(ball.style.transform).toBe('');
  });

  it('keeps a full-motion legacy free kick and a reduced-motion built free kick flat', () => {
    const row = freeKick();
    for (const mode of [{ source: row.source, reduced: false }, { source: row.built, reduced: true }]) {
      const initial = props(mode.source, row.at, { reducedMotion: mode.reduced });
      const view = render(<PitchMotion {...initial} />);
      view.rerender(<PitchMotion {...initial} clock={row.at + 0.55} />);
      const ball = view.container.querySelector('[data-cm-ball="1"]')!;
      expect(ball).not.toHaveAttribute('data-cm-ball-lift');
      expect(ball.children).toHaveLength(0);
      if (mode.reduced) {
        const terminal = actionFrame(pitchScene(row.plan, row.at), { event: row.event, key: 'still-free-kick', at: row.at }, ACTION_SPAN);
        expect(terminal.lift).toBe(0);
        expect(point(ball as HTMLElement)).toEqual(terminal.ball);
      }
      view.unmount();
    }
  });

  it('preserves omitted-build legacy positions across multiple real scene changes', () => {
    const source = input();
    const original = props(source, 2.1);
    const view = render(<PitchMotion {...original} />);
    for (const clock of [2.1, 12.2, 23.8]) {
      view.rerender(<PitchMotion {...original} clock={clock} />);
      expect(picture(view.container)).toEqual(expected(source, clock));
    }
  });

  it('freezes the displayed frame while stopped and resumes on the supplied clock without changing inputs or drawing RNG', () => {
    const source = input();
    const original = props(source, 4.13);
    const view = render(<PitchMotion {...original} />);
    const before = picture(view.container);
    const equalArrays = JSON.parse(JSON.stringify(source)) as PitchInput;
    view.rerender(<PitchMotion {...props(equalArrays, 18, { playing: false })} />);
    expect(picture(view.container)).toEqual(before);
    view.rerender(<PitchMotion {...props(equalArrays, 18)} />);
    expect(picture(view.container)).toEqual(expected(source, 18));
  });
});

