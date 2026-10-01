import { cleanup, render, renderHook } from '@testing-library/react';
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
