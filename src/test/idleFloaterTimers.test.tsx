/**
 * Round 657: an idle game's floater clean up timer dies with the page.
 *
 * Every tap in the idle games pushes a floating "+$1.2K" and a timer that
 * takes it down again. The timers were never cleared, so leaving the page
 * inside that window left them running against an unmounted hook, and in the
 * test suite they fired after jsdom was torn down: that is the "window is not
 * defined" error that made full Vitest runs exit 1 while every test passed.
 *
 * The check is deterministic rather than waiting for the error, because the
 * error only surfaced when a slow run let a timer outlive its file. For each
 * game it watches the timers started with that game's floater delay, taps
 * three times, unmounts, and requires every one of them to have been cleared.
 * It first requires that three such timers were started at all, so a changed
 * delay fails loudly instead of passing on nothing. A first draft compared the
 * total of pending timers and was misled by React's own scheduler timers,
 * which have nothing to do with the page.
 *
 * Driven by scripts/simIdleTimers.mjs, which also points this file at a copy
 * of useOwnedTimeouts that never clears, and requires both cases to go red.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { useStadiumTycoon } from '@/hooks/useStadiumTycoon';
import { useIdleArena } from '@/hooks/useIdleArena';

const EPOCH = 1767225600000;

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(Date, 'now').mockImplementation(() => EPOCH);
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Mounts a hook, taps it three times, unmounts, and counts the floater timers still running. */
function leakedAfterThreeTaps(useHook: () => { doTap: (x: number, y: number) => void }, floaterMs: number) {
  const started = new Set<unknown>();
  const cleared = new Set<unknown>();
  const realSet = globalThis.setTimeout;
  const realClear = globalThis.clearTimeout;
  vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: () => void, ms?: number, ...rest: unknown[]) => {
    const id = realSet(fn, ms, ...rest);
    if (ms === floaterMs) started.add(id);
    return id;
  }) as unknown as typeof setTimeout);
  vi.spyOn(globalThis, 'clearTimeout').mockImplementation(((id?: unknown) => {
    cleared.add(id);
    return realClear(id as ReturnType<typeof setTimeout>);
  }) as unknown as typeof clearTimeout);

  let api: { doTap: (x: number, y: number) => void } | null = null;
  function Probe() {
    api = useHook();
    return null;
  }
  const view = render(<Probe />);
  if (!api) throw new Error('the hook did not mount');
  for (let i = 0; i < 3; i += 1) act(() => { api!.doTap(50, 50); });
  const startedCount = started.size;
  view.unmount();
  const leaked = [...started].filter(id => !cleared.has(id)).length;
  return { startedCount, leaked };
}

describe('idle game floaters', () => {
  it('Stadium Tycoon clears every floater timer when the page goes away', () => {
    const { startedCount, leaked } = leakedAfterThreeTaps(useStadiumTycoon, 1900);
    expect(startedCount, 'three taps started no floater timers, so this check would prove nothing').toBe(3);
    expect(leaked, `${leaked} Stadium Tycoon floater timers kept running after the page unmounted`).toBe(0);
  });

  it('Idle Arena clears every floater timer when the page goes away', () => {
    const { startedCount, leaked } = leakedAfterThreeTaps(useIdleArena, 700);
    expect(startedCount, 'three taps started no floater timers, so this check would prove nothing').toBeGreaterThanOrEqual(3);
    expect(leaked, `${leaked} Idle Arena floater timers kept running after the page unmounted`).toBe(0);
  });
});
