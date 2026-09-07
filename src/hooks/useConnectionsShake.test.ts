/**
 * A wrong guess's shake timer dies with the component.
 *
 * Round 503. The four Connections hooks (NHL, NBA, NFL, Baseball) answered a
 * wrong guess with setShakeWrong(true) and a bare
 * setTimeout(() => setShakeWrong(false), 600) that nothing ever cleared. An
 * unmount inside that window (a route change, a test teardown) then set
 * state on a component that no longer existed, and the full vitest run
 * printed "window is not defined" whenever the callback landed after jsdom
 * had been torn down: 8 errors on one run, 0 on the next two, identical
 * code. It never failed the run, which is exactly why it went unfixed.
 *
 * The timer is held in a ref now, cleared on unmount and replaced by the
 * next miss. This file measures that directly with fake timers, which is
 * the strongest signal there is: the count of live timers after unmount.
 *
 * scripts/simConnectionsShake.mjs runs this file and carries the negative
 * control: CONNECTIONS_HOOK_NHL points the NHL row at a copy of the hook
 * with the bare timer put back, and the NHL row's two tests must then fail
 * while the other three rows stay green.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/fetchNhlConnectionsPuzzles', () => ({ fetchNhlConnectionsPuzzles: () => Promise.resolve([]) }));
vi.mock('@/lib/fetchNbaConnectionsPuzzles', () => ({ fetchNbaConnectionsPuzzles: () => Promise.resolve([]) }));
vi.mock('@/lib/fetchNflConnectionsPuzzles', () => ({ fetchNflConnectionsPuzzles: () => Promise.resolve([]) }));
vi.mock('@/lib/fetchBaseballConnectionsPuzzles', () => ({ fetchBaseballConnectionsPuzzles: () => Promise.resolve([]) }));

import { useNbaConnections } from '@/hooks/useNbaConnections';
import { useNflConnections } from '@/hooks/useNflConnections';
import { useBaseballConnections } from '@/hooks/useBaseballConnections';

const nhlPath = process.env.CONNECTIONS_HOOK_NHL;
const { useNhlConnections } = nhlPath
  ? await import(/* @vite-ignore */ nhlPath)
  : await import('@/hooks/useNhlConnections');

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyHook = () => any;
const HOOKS: Array<[string, AnyHook]> = [
  ['NHL', useNhlConnections],
  ['NBA', useNbaConnections],
  ['NFL', useNflConnections],
  ['Baseball', useBaseballConnections],
];

/* Only the two timer functions are faked. Promises, microtasks and Date stay
   real so the hooks' puzzle load settles the way it does in a browser. */
const FAKE: Parameters<typeof vi.useFakeTimers>[0] = { toFake: ['setTimeout', 'clearTimeout'] };

async function settle() {
  await act(async () => { await Promise.resolve(); });
}

/** All but one player from one group plus one from another: never a group. */
function wrongSet(puzzle: any) {
  const size = puzzle.groups[0].players.length;
  return [...puzzle.groups[0].players.slice(0, size - 1), puzzle.groups[1].players[0]];
}

async function miss(result: { current: any }) {
  await act(async () => { result.current.deselectAll(); });
  await act(async () => { for (const n of wrongSet(result.current.puzzle)) result.current.togglePlayer(n); });
  await act(async () => { result.current.submitSelection(); });
  /* jsdom's localStorage.setItem schedules a 0ms timer of its own when the
     daily record is written. Flush it, so every count below is only what the
     hook holds. Measured: without this the count after one miss reads 2. */
  act(() => { vi.advanceTimersByTime(0); });
}

describe.each(HOOKS)('%s Connections: the shake timer', (_label, useHook) => {
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers(FAKE); });
  afterEach(() => { vi.useRealTimers(); });

  it('a second miss replaces the first timer, and the shake ends 600ms after the last miss', async () => {
    const h = renderHook(() => useHook());
    await settle();
    expect(h.result.current.puzzle).toBeTruthy();
    const base = vi.getTimerCount();
    console.log(`SHAKE| live timers before any miss: ${base}`);
    expect(base).toBe(0);

    await miss(h.result);
    expect(h.result.current.shakeWrong).toBe(true);
    expect(vi.getTimerCount()).toBe(1);

    await miss(h.result);
    expect(h.result.current.shakeWrong).toBe(true);
    // One live timer, not two: the second miss cleared the first.
    expect(vi.getTimerCount()).toBe(1);

    act(() => { vi.advanceTimersByTime(599); });
    expect(h.result.current.shakeWrong).toBe(true);
    act(() => { vi.advanceTimersByTime(1); });
    expect(h.result.current.shakeWrong).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    console.log(`SHAKE| after 600ms: shake off, ${vi.getTimerCount()} live timer(s)`);
    h.unmount();
  });

  it('an unmount mid shake leaves no live timer behind', async () => {
    const h = renderHook(() => useHook());
    await settle();
    await miss(h.result);
    expect(h.result.current.shakeWrong).toBe(true);
    expect(vi.getTimerCount()).toBe(1);

    h.unmount();
    const left = vi.getTimerCount();
    console.log(`SHAKE| after unmount mid shake: ${left} live timer(s)`);
    expect(left).toBe(0);
    // And nothing fires into a dead component when the window would have closed.
    expect(() => vi.advanceTimersByTime(600)).not.toThrow();
  });
});
