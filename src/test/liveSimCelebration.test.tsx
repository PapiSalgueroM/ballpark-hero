import { cleanup, render, renderHook } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { actionFrame, LivePitchPlayer, useLiveSimMotion } from '@/components/club-manager/LiveSimMotion';
import type { MotionEvent } from '@/components/club-manager/LiveSimMotion';
import { ACTION_SPAN, NET_AT } from '@/components/pitch-motion/contract';
import type { PitchEvent, PitchFigure } from '@/components/pitch-motion/contract';
import { goalWindow } from '@/components/pitch-motion/motion';
import { PitchMotion } from '@/components/pitch-motion/PitchMotion';

// Invented render fixtures. Match outcomes still come from the committed feed.
const scene = {
  mine: [
    { key: 'm0', name: 'Home keeper', keeper: true, x: 50, y: 90 },
    { key: 'm9', name: 'Home scorer', keeper: false, x: 40, y: 35 },
    { key: 'm8', name: 'Home near', keeper: false, x: 48, y: 40 },
    { key: 'm7', name: 'Home next', keeper: false, x: 30, y: 48 },
    { key: 'm4', name: 'Home far', keeper: false, x: 60, y: 70 },
  ],
  theirs: [
    { key: 'o0', name: 'Away keeper', keeper: true, x: 50, y: 10 },
    { key: 'o9', name: 'Away scorer', keeper: false, x: 60, y: 65 },
    { key: 'o8', name: 'Away near', keeper: false, x: 52, y: 60 },
    { key: 'o7', name: 'Away next', keeper: false, x: 70, y: 52 },
    { key: 'o4', name: 'Away far', keeper: false, x: 40, y: 30 },
  ],
  ball: { x: 40, y: 35 }, holderKey: 'm9',
};
const event = (side: 'me' | 'opp', kind: 'goal' | 'save' | 'shot' = 'goal'): MotionEvent => ({
  key: `${side}:${kind}:5`, at: 5, event: { side, kind, minute: 5, text: side === 'me' ? 'Home scorer' : 'Away scorer' },
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Committed Club Manager goal celebrations', () => {
  it('raises only the scorer and two nearest outfield teammates after net contact', () => {
    for (const side of ['me', 'opp'] as const) {
      const prefix = side === 'me' ? 'm' : 'o';
      expect(Object.values(actionFrame(scene, event(side), .7).poses).some(pose => pose.celebrate)).toBe(false);
      const frame = actionFrame(scene, event(side), .95);
      expect(Object.keys(frame.poses).filter(key => frame.poses[key].celebrate).sort()).toEqual([`${prefix}7`, `${prefix}8`, `${prefix}9`]);
      expect(frame.poses[`${prefix}9`].hop).toBeGreaterThan(0);
      expect(frame.poses[`${prefix}9`].celebrate).toBeGreaterThan(.9);
      const players = side === 'me' ? frame.mine : frame.theirs;
      expect(players.find(p => p.key === `${prefix}8`)!.y).not.toBe((side === 'me' ? scene.mine : scene.theirs).find(p => p.key === `${prefix}8`)!.y);
      expect(frame.poses[`${prefix}0`]?.celebrate).toBeUndefined();
    }
  });

  it('keeps original goal, save and miss destinations without mutation or random draws', () => {
    const before = structuredClone(scene);
    const random = vi.spyOn(Math, 'random');
    for (const side of ['me', 'opp'] as const) for (const kind of ['goal', 'save', 'shot'] as const) {
      const frame = actionFrame(scene, event(side, kind), 1.05);
      expect(frame.ball).toEqual({ x: kind === 'shot' ? 74 : 57, y: side === 'me' ? kind === 'save' ? 8 : 1 : kind === 'save' ? 92 : 99 });
      expect(frame.net).toBe(kind === 'goal' ? side === 'me' ? 'opp' : 'me' : null);
      if (kind !== 'goal') expect(Object.values(frame.poses).some(pose => pose.celebrate)).toBe(false);
    }
    expect(scene).toEqual(before);
    expect(random).not.toHaveBeenCalled();
  });

  it('draws raised arms on the actual scorer figure', () => {
    const frame = actionFrame(scene, event('me'), 1.05);
    const { container } = render(<LivePitchPlayer color="#85bcf0" keeper={false} pose={frame.poses.m9} />);
    expect(container.querySelector('svg')).toHaveAttribute('data-cm-actor-pose', 'celebrate');
    const hands = [...container.querySelectorAll('circle')];
    expect(hands.map(hand => Number(hand.getAttribute('cy')))).toEqual([-22, -22]);
  });

  it('freezes with the viewer clock and expires at the existing action boundary', () => {
    const action = event('me');
    const { result, rerender } = renderHook(({ clock, active }) => useLiveSimMotion(scene, action, clock, active), { initialProps: { clock: 5.95, active: true } });
    expect(result.current.poses.m9.celebrate).toBeGreaterThan(0);
    const frozen = structuredClone(result.current);
    rerender({ clock: 5.95, active: true });
    expect(result.current).toEqual(frozen);
    rerender({ clock: 6.06, active: true });
    expect(result.current.poses).toEqual({});
    rerender({ clock: 5.95, active: false });
    expect(result.current.poses).toEqual({});
  });

  it('uses a static raised-arm finish under reduced motion', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as MediaQueryList);
    const action = event('me');
    const { result, rerender } = renderHook(({ clock }) => useLiveSimMotion(scene, action, clock, true), { initialProps: { clock: 5.2 } });
    const frozen = structuredClone(result.current);
    expect(frozen.poses.m9.celebrate).toBe(1);
    expect(frozen.poses.m9.hop).toBeCloseTo(0);
    rerender({ clock: 5.9 });
    expect(result.current).toEqual(frozen);
  });
});

/* Round 1101, the record. Written on the untouched base BEFORE any code moved into
   src/components/pitch-motion, so the lift can be proven to draw the same frames.
   A small FNV-1a hash over JSON with numbers rounded to four places. It reads a NAMED
   list of today's frame fields, so an optional field added later can never move it. */
const fnv = (text: string) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 0x01000193); }
  return (hash >>> 0).toString(16).padStart(8, '0');
};
const FRAME_FIELDS = ['mine', 'theirs', 'ball', 'holderKey', 'poses', 'action', 'net', 'netPulse', 'phase'] as const;
const digest = (value: unknown) => fnv(JSON.stringify(value, (_key, v) => typeof v === 'number' ? Math.round(v * 1e4) / 1e4 : v));
const SAMPLES = Array.from({ length: 22 }, (_unused, i) => i * .05);
type Flags = Partial<Pick<MotionEvent['event'], 'penalty' | 'freeKick' | 'flank'>>;
function grid(flags: Flags) {
  const frames: unknown[] = [];
  for (const side of ['me', 'opp'] as const) for (const kind of ['goal', 'save', 'shot'] as const) for (const elapsed of SAMPLES) {
    const base = event(side, kind);
    const frame = actionFrame(scene, { ...base, event: { ...base.event, ...flags } }, elapsed) as unknown as Record<string, unknown>;
    frames.push(Object.fromEntries(FRAME_FIELDS.map(field => [field, frame[field]])));
  }
  return frames;
}
/* Recorded on origin/release-al-int at 8fe82a4d, 2026-10-07. PLAIN and FIGURE must never
   change in Round 1101. FLAGGED is re-recorded once, in the commit that moves the penalty
   spot and stands the free kick wall, and that commit's message says so. */
const PLAIN_DIGEST = '2e5a23e4';
/* Re-recorded once, in the step 4 commit that moves the penalty spot to 12, lines both sides up outside the
   area, puts the keeper on his line and stands the free kick wall. It was 41b9e02c on the base. */
const FLAGGED_DIGEST = 'ae7ebea0';
const FIGURE_DIGEST = '443c524e';

describe('The lift keeps every frame', () => {
  it('PLAIN: every goal, save and miss frame with no flags is the recorded one', () => {
    const frames = grid({});
    expect(frames).toHaveLength(2 * 3 * 22);
    expect(digest(frames)).toBe(PLAIN_DIGEST);
  });

  it('FLAGGED: penalty, free kick and both flanks draw the recorded frames', () => {
    const variants: Flags[] = [{ penalty: true }, { freeKick: true }, { flank: 'left' }, { flank: 'right' }];
    const frames = variants.flatMap(flags => grid(flags));
    expect(frames).toHaveLength(4 * 2 * 3 * 22);
    expect(digest(frames)).toBe(FLAGGED_DIGEST);
  });

  it('FIGURE: the drawn figure is the recorded one in every pose', () => {
    const poses = [
      { keeper: false, pose: undefined, selected: false },
      { keeper: false, pose: { kick: 1 }, selected: false },
      { keeper: true, pose: { dive: 68 }, selected: false },
      { keeper: true, pose: { dive: -68, catching: 1 }, selected: false },
      { keeper: false, pose: { celebrate: 1, hop: 4 }, selected: false },
      { keeper: false, pose: undefined, selected: true },
    ];
    const markup = poses.map(p => renderToStaticMarkup(<LivePitchPlayer color="#85bcf0" keeper={p.keeper} pose={p.pose} selected={p.selected} />));
    expect(new Set(markup).size).toBe(poses.length);
    expect(fnv(markup.join('\n'))).toBe(FIGURE_DIGEST);
  });
});

/* Round 1101: the part behind its contract. Invented render fixtures again: one goal of mine at
   the fifth minute, five a side, and the binder's clock handed in from outside. */
const FIVE = {
  mine: [
    { key: 'm0', line: 'keeper', slot: { x: 50, y: 90 }, name: 'Home keeper' },
    { key: 'm4', line: 'defence', slot: { x: 30, y: 70 }, name: 'Home far' },
    { key: 'm7', line: 'midfield', slot: { x: 62, y: 52 }, name: 'Home next' },
    { key: 'm8', line: 'midfield', slot: { x: 38, y: 48 }, name: 'Home near' },
    { key: 'm9', line: 'attack', slot: { x: 50, y: 26 }, name: 'Home scorer' },
  ] satisfies PitchFigure[],
  theirs: [
    { key: 'o0', line: 'keeper', slot: { x: 50, y: 90 }, name: 'Away keeper' },
    { key: 'o4', line: 'defence', slot: { x: 30, y: 70 }, name: 'Away far' },
    { key: 'o7', line: 'midfield', slot: { x: 62, y: 52 }, name: 'Away next' },
    { key: 'o8', line: 'midfield', slot: { x: 38, y: 48 }, name: 'Away near' },
    { key: 'o9', line: 'attack', slot: { x: 50, y: 26 }, name: 'Away scorer' },
  ] satisfies PitchFigure[],
  feed: [{ minute: 5, side: 'me', kind: 'goal', text: 'Home scorer' }] satisfies PitchEvent[],
  span: { from: 0, to: 45 },
  seed: 1101,
  colors: { mine: '#85bcf0', theirs: '#d6e6ed' },
};
const percent = (value: string) => Number(value.replace('%', ''));
const spots = (root: Element) => [...root.querySelectorAll<HTMLElement>('.pm-figure')].map(node => ({ left: percent(node.style.left), top: percent(node.style.top), figure: node.innerHTML }));

describe('The pitch part behind its contract', () => {
  it("PitchMotion renders a five a side scene in portrait and in landscape with today's attributes", () => {
    const random = vi.spyOn(Math, 'random');
    const portrait = render(<PitchMotion {...FIVE} clock={5.45} playing />).container;
    const landscape = render(<PitchMotion {...FIVE} clock={5.45} playing orientation="landscape" />).container;
    for (const root of [portrait, landscape]) {
      const pitch = root.querySelector('[data-cm-live-pitch="1"]')!;
      expect(pitch.getAttribute('data-cm-motion')).toBe('goal');
      expect(pitch.getAttribute('data-cm-motion-phase')).toBe('flight');
      expect(pitch.querySelectorAll('[data-cm-ball="1"]')).toHaveLength(1);
      expect(pitch.querySelectorAll('.cm-pitch-player')).toHaveLength(10);
      expect(pitch.querySelector('[data-cm-actor-pose="dive"]')).not.toBeNull();
      expect(pitch.querySelectorAll('[data-cm-net="goal"]')).toHaveLength(0);
    }
    expect(portrait.querySelector('[data-cm-live-pitch]')!.getAttribute('data-pm-orient')).toBe('portrait');
    expect(landscape.querySelector('[data-cm-live-pitch]')!.getAttribute('data-pm-orient')).toBe('landscape');
    /* Landscape as the contract writes it: a point (x, y) is drawn at left (100 - y)%, top x%, and every
       figure is drawn upright exactly as in portrait, the diving keeper included. */
    const up = spots(portrait), across = spots(landscape);
    expect(up).toHaveLength(10);
    up.forEach((spot, i) => {
      expect(across[i].left).toBeCloseTo(100 - spot.top, 6);
      expect(across[i].top).toBeCloseTo(spot.left, 6);
      expect(across[i].figure).toBe(spot.figure);
    });
    const ball = (root: Element) => root.querySelector<HTMLElement>('[data-cm-ball]')!.style;
    expect(percent(ball(landscape).left)).toBeCloseTo(100 - percent(ball(portrait).top), 6);
    expect(percent(ball(landscape).top)).toBeCloseTo(percent(ball(portrait).left), 6);
    cleanup();
    /* The ball in the net: the net I attack, top in portrait and right in landscape. */
    for (const orientation of ['portrait', 'landscape'] as const) {
      const root = render(<PitchMotion {...FIVE} clock={5.9} playing orientation={orientation} />).container;
      const nets = root.querySelectorAll<HTMLElement>('[data-cm-net="goal"]');
      expect(nets).toHaveLength(1);
      expect(nets[0].className).toContain('cm-live-net--top');
      expect(nets[0].style.transform.startsWith(orientation === 'portrait' ? 'scaleY(' : 'scaleX(')).toBe(true);
      cleanup();
    }
    expect(random).not.toHaveBeenCalled();
  });

  it("reducedMotion true shows a goal's last frame at once", () => {
    const moments: string[] = [];
    const props = { ...FIVE, playing: true, reducedMotion: true, onMoment: (moment: string) => { moments.push(moment); } };
    const mounted = render(<PitchMotion {...props} clock={5.02} />);
    const pitch = mounted.container.querySelector('[data-cm-live-pitch]')!;
    expect(pitch.getAttribute('data-cm-motion-phase')).toBe('net');
    expect(pitch.querySelectorAll('[data-cm-net="goal"]')).toHaveLength(1);
    expect(pitch.querySelectorAll('[data-cm-actor-pose="celebrate"]')).toHaveLength(3);
    const still = pitch.innerHTML;
    mounted.rerender(<PitchMotion {...props} clock={5.6} />);
    expect(pitch.innerHTML).toBe(still);
    expect(moments).toEqual(['strike', 'net']);
    /* And false keeps it moving whatever the device prefers. */
    cleanup();
    vi.spyOn(window, 'matchMedia').mockImplementation(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as MediaQueryList);
    const moving = render(<PitchMotion {...FIVE} playing reducedMotion={false} clock={5.45} />).container;
    expect(moving.querySelector('[data-cm-live-pitch]')!.getAttribute('data-cm-motion-phase')).toBe('flight');
  });

  it("goalWindow says windup, net and over at the contract's instants", () => {
    const goal = event('me');
    expect(goalWindow(null, 5.5)).toBeNull();
    expect(goalWindow(event('me', 'save'), 5.5)).toBeNull();
    expect(goalWindow(goal, 5)).toBe('windup');
    expect(goalWindow(goal, 5 + NET_AT - .01)).toBe('windup');
    expect(goalWindow(goal, 5 + NET_AT)).toBe('net');
    expect(goalWindow(goal, 5 + ACTION_SPAN)).toBe('net');
    expect(goalWindow(goal, 5 + ACTION_SPAN + .01)).toBe('over');
    /* 0 under reduced motion: the last frame shows the instant the line fires. */
    expect(goalWindow(goal, 5, true)).toBe('net');
    expect(goalWindow(goal, 4.99, true)).toBe('windup');
    /* The constants are the lifted body's own instants, not numbers beside it. */
    expect(actionFrame(scene, goal, NET_AT).phase).toBe('net');
    expect(actionFrame(scene, goal, NET_AT - .01).phase).toBe('flight');
    const { result, rerender } = renderHook(({ clock }) => useLiveSimMotion(scene, goal, clock, true), { initialProps: { clock: 5 + ACTION_SPAN } });
    expect(result.current.action).toBe('goal');
    rerender({ clock: 5 + ACTION_SPAN + .01 });
    expect(result.current.action).toBe('pass');
  });
});

/* Round 1101, dead balls inside an action. An invented scene again, crowded on purpose: both sides have men
   in my attacking area, so the line up and the wall have somebody to move. */
const crowded = {
  mine: [
    { key: 'm0', name: 'Home keeper', keeper: true, x: 50, y: 90 },
    { key: 'm9', name: 'Home scorer', keeper: false, x: 48.7, y: 13 },
    { key: 'm8', name: 'Home near', keeper: false, x: 40, y: 10 },
    { key: 'm7', name: 'Home next', keeper: false, x: 62, y: 16 },
    { key: 'm4', name: 'Home far', keeper: false, x: 30, y: 40 },
  ],
  theirs: [
    { key: 'o0', name: 'Away keeper', keeper: true, x: 52, y: 8 },
    { key: 'o2', name: 'Away left', keeper: false, x: 44, y: 9 },
    { key: 'o3', name: 'Away right', keeper: false, x: 57, y: 14 },
    { key: 'o5', name: 'Away mid', keeper: false, x: 50, y: 24 },
    { key: 'o9', name: 'Away scorer', keeper: false, x: 55, y: 60 },
  ],
  ball: { x: 50, y: 12 }, holderKey: 'm9',
};
type Crowd = typeof crowded;
/** The same scene seen from the other end: the sides swapped and the pitch turned top to bottom. */
const turned = (s: Crowd): Crowd => ({
  mine: s.theirs.map(p => ({ ...p, y: 100 - p.y })), theirs: s.mine.map(p => ({ ...p, y: 100 - p.y })),
  ball: { x: s.ball.x, y: 100 - s.ball.y }, holderKey: s.holderKey,
});

describe('Dead balls inside an action', () => {
  it('a penalty lines both sides up outside the area', () => {
    const random = vi.spyOn(Math, 'random');
    for (const side of ['me', 'opp'] as const) {
      const from = side === 'me' ? crowded : turned(crowded);
      const before = structuredClone(from);
      const line = side === 'me' ? 0 : 100;
      const penalty: MotionEvent = { key: `pen:${side}`, at: 5, event: { side, kind: 'goal', minute: 5, text: 'Home scorer', penalty: true } };
      /* The ball starts on the spot, 12 from the goal line, and the taker steps up to it. */
      expect(actionFrame(from, penalty, 0).ball.x).toBeCloseTo(50, 6);
      expect(Math.abs(actionFrame(from, penalty, 0).ball.y - line)).toBeCloseTo(12, 6);
      const frame = actionFrame(from, penalty, .3);
      const all = [...frame.mine, ...frame.theirs];
      const was = [...from.mine, ...from.theirs];
      const taker = all.find(p => p.key === 'm9')!;
      expect(taker.x).toBeCloseTo(50, 6);
      expect(Math.abs(taker.y - line)).toBeCloseTo(12, 6);
      const moved: string[] = [];
      for (const p of all) {
        if (p.keeper || p.key === 'm9') continue;
        expect(Math.abs(p.y - line), `${p.key} is outside the area`).toBeGreaterThanOrEqual(18 - 1e-9);
        const old = was.find(o => o.key === p.key)!;
        expect(p.x).toBe(old.x);
        if (p.y !== old.y) moved.push(p.key);
      }
      /* Exactly the four who stood inside it moved, and nobody who was already out. */
      expect(moved.sort()).toEqual(['m7', 'm8', 'o2', 'o3']);
      /* The keeper facing it is on his line, 3 out, before he goes; the other keeper has not moved. */
      const facing = (side === 'me' ? frame.theirs : frame.mine).find(p => p.keeper)!;
      expect(facing.x).toBeCloseTo(50, 6);
      expect(Math.abs(facing.y - line)).toBeCloseTo(3, 6);
      const far = (side === 'me' ? frame.mine : frame.theirs).find(p => p.keeper)!;
      expect(far.y).toBe((side === 'me' ? from.mine : from.theirs).find(p => p.keeper)!.y);
      expect(from).toEqual(before);
    }
    expect(random).not.toHaveBeenCalled();
  });

  it('a direct free kick stands a wall of three', () => {
    for (const side of ['me', 'opp'] as const) {
      const base = side === 'me' ? crowded : turned(crowded);
      /* The taker a step behind a ball 30 from the goal line, at x 40. */
      const move = (list: Crowd['mine']) => list.map(p => (p.key === 'm9' ? { ...p, x: 38.7, y: side === 'me' ? 31 : 69 } : p));
      const from: Crowd = { ...base, mine: move(base.mine), theirs: move(base.theirs), ball: { x: 40, y: side === 'me' ? 30 : 70 } };
      const before = structuredClone(from);
      const kick: MotionEvent = { key: `fk:${side}`, at: 5, event: { side, kind: 'goal', minute: 5, text: 'Home scorer', freeKick: true } };
      expect(actionFrame(from, kick, 0).ball.x).toBeCloseTo(40, 6);
      expect(actionFrame(from, kick, 0).ball.y).toBeCloseTo(side === 'me' ? 30 : 70, 6);
      const frame = actionFrame(from, kick, .3);
      const defenders = side === 'me' ? frame.theirs : frame.mine;
      const wallY = side === 'me' ? 21 : 79;
      /* The three defenders nearest the ball, 9 goal side of it, 3.5 apart, in the order they stood across the pitch. */
      const wall = ['o2', 'o5', 'o3'].map(key => defenders.find(p => p.key === key)!);
      expect(wall.map(p => Number(p.x.toFixed(6)))).toEqual([36.5, 40, 43.5]);
      for (const p of wall) expect(p.y).toBeCloseTo(wallY, 6);
      const stood = side === 'me' ? from.theirs : from.mine;
      /* The keeper and the man who was far away stay where they were. */
      for (const key of ['o0', 'o9']) {
        const now = defenders.find(p => p.key === key)!, then = stood.find(p => p.key === key)!;
        expect({ x: now.x, y: now.y }).toEqual({ x: then.x, y: then.y });
      }
      /* The ball still bends on its way and still ends in the net. */
      expect(actionFrame(from, kick, 1.05).net).toBe(side === 'me' ? 'opp' : 'me');
      expect(from).toEqual(before);
    }
  });
});
