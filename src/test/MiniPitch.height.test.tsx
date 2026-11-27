import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MiniPitch, { goalFrame, goalsOf, type MiniPitchProps } from '@/components/season-centre/MiniPitch';
import type { SeasonEvent } from '@/lib/season/core';

let pending: Map<number, FrameRequestCallback>;
let nextId: number;
let elapsed: number;
function advance(frames: number) {
  for (let i = 0; i < frames; i++) {
    elapsed += 100;
    const callbacks = [...pending.values()];
    pending.clear();
    expect(callbacks.length, 'MINI_HEIGHT_REAL_FRAME_FOUNDATION').toBeGreaterThan(0);
    act(() => { for (const callback of callbacks) callback(elapsed); });
  }
}
function fixture(side: 'us' | 'them' = 'us'): MiniPitchProps {
  const events: SeasonEvent[] = [{ min: 10, kind: 'goal', side, pts: 1, mine: side === 'us' }];
  return { md: 7, events, shown: 9, paused: false, instant: false, usColor: '#79baff',
    role: 'ATT', onFrom: 1, onTo: 90, boxClass: 'fixture-pitch-box' };
}
function ball(container: HTMLElement): HTMLElement {
  const found = container.querySelector<HTMLElement>('[data-cm-ball="1"]');
  expect(found, 'MINI_HEIGHT_ACTUAL_BALL_FOUNDATION').not.toBeNull();
  return found!;
}
beforeEach(() => {
  pending = new Map(); nextId = 0; elapsed = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { pending.set(++nextId, callback); return nextId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { pending.delete(id); });
  vi.spyOn(performance, 'now').mockImplementation(() => elapsed);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Career pitch consumed simulation RNG'); });
});
afterEach(() => {
  try { expect(Math.random).not.toHaveBeenCalled(); }
  finally { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); }
});

describe('Career mini pitch ball height', () => {
  it('draws the actual flight height and ground shadow for goals at either end', () => {
    for (const side of ['us', 'them'] as const) {
      const props = fixture(side), input = JSON.stringify(props);
      const view = render(<MiniPitch {...props} />);
      view.rerender(<MiniPitch {...props} shown={10} />);
      advance(6);
      const expected = goalFrame(goalsOf(props.md, props.events)[0], props.role, props.onFrom, props.onTo, 0.6);
      expect(expected.phase, 'MINI_HEIGHT_AIRBORNE_FRAME_FOUNDATION').toBe('flight');
      expect(expected.lift).toBeGreaterThan(0.05);
      const shown = ball(view.container);
      expect(shown.getAttribute('data-cm-ball-lift'), 'MINI_REAL_FLIGHT_HEIGHT_VISIBLE').toBe(expected.lift!.toFixed(2));
      expect([Number.parseFloat(shown.style.left), Number.parseFloat(shown.style.top)]).toEqual([expected.ball.x, expected.ball.y]);
      expect(shown.querySelector('.cm-live-ball-shadow'), 'MINI_REAL_GROUND_SHADOW_VISIBLE').not.toBeNull();
      expect(shown.querySelector('.cm-live-ball-air')).not.toBeNull();
      expect(JSON.stringify(props)).toBe(input);
      view.unmount(); pending.clear(); elapsed = 0;
    }
  });

  it('keeps instant results and goals already present at mount on a flat terminal frame', () => {
    for (const instant of [false, true]) {
      const props = { ...fixture(), shown: 10, instant };
      const view = render(<MiniPitch {...props} />);
      const shown = ball(view.container);
      const expected = goalFrame(goalsOf(props.md, props.events)[0], props.role, props.onFrom, props.onTo, 1.05);
      expect(view.container.querySelector('[data-mini-pitch]')).toHaveAttribute('data-pitch-phase', 'net');
      expect(shown).not.toHaveAttribute('data-cm-ball-lift');
      expect(shown.children).toHaveLength(0);
      expect([Number.parseFloat(shown.style.left), Number.parseFloat(shown.style.top)]).toEqual([expected.ball.x, expected.ball.y]);
      expect(pending.size).toBe(0);
      view.unmount();
    }
  });

  it('holds the exact displayed goal frame while paused and resumes that committed goal', () => {
    const props = fixture(), events = JSON.stringify(props.events);
    const view = render(<MiniPitch {...props} />);
    view.rerender(<MiniPitch {...props} shown={10} />);
    advance(5);
    const original = ball(view.container).outerHTML;
    view.rerender(<MiniPitch {...props} shown={10} paused />);
    expect(pending.size).toBe(0);
    expect(ball(view.container).outerHTML, 'MINI_HEIGHT_PAUSE_EXACT_FRAME').toBe(original);
    view.rerender(<MiniPitch {...props} shown={10} />);
    advance(1);
    expect(ball(view.container).outerHTML).not.toBe(original);
    expect(view.container.querySelector('[data-mini-pitch]')).toHaveAttribute('data-pitch-goal', '7|10|us|0');
    expect(JSON.stringify(props.events)).toBe(events);
  });
});
