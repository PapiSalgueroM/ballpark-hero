import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useStadiumTycoon } from '@/hooks/useStadiumTycoon';

type PrerenderWindow = Window & { __DUKB_PRERENDER__?: boolean };

describe('useStadiumTycoon prerender loop', () => {
  const frames: FrameRequestCallback[] = [];

  beforeEach(() => {
    localStorage.clear();
    frames.length = 0;
    vi.spyOn(performance, 'now').mockReturnValue(100);
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    delete (window as PrerenderWindow).__DUKB_PRERENDER__;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('does not schedule or consume the live simulation under prerender', () => {
    (window as PrerenderWindow).__DUKB_PRERENDER__ = true;
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.99);

    const rendered = renderHook(() => useStadiumTycoon());

    expect(frames).toHaveLength(0);
    expect(random).not.toHaveBeenCalled();
    rendered.unmount();
  });

  it('keeps the live simulation active for a normal visitor', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.99);

    const rendered = renderHook(() => useStadiumTycoon());
    expect(frames).toHaveLength(1);

    act(() => frames.shift()?.(301));

    expect(random).toHaveBeenCalledTimes(1);
    expect(frames).toHaveLength(1);
    rendered.unmount();
  });
});
