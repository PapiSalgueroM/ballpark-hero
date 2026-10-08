import { cleanup, render, renderHook } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { actionFrame, LivePitchPlayer, useLiveSimMotion } from '@/components/club-manager/LiveSimMotion';
import type { MotionEvent } from '@/components/club-manager/LiveSimMotion';

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
const FLAGGED_DIGEST = '41b9e02c';
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
