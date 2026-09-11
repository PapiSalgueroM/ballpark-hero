/** Round 538: the four original-map cases from the preserved NBA disposal audit.
 * Real hook actions and seed 530 drive real simulations. No game state is injected.
 * Every backend touch, transport attempt and storage write is denied and recorded.
 */
import assert from 'node:assert/strict';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, it, vi } from 'vitest';
import { useConquestNba } from '@/hooks/useConquestNba';

const boundary = vi.hoisted(() => ({ faults: [] as string[] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: new Proxy({}, { get() {
  boundary.faults.push('backend'); throw new Error('Unexpected NBA disposal backend access');
} }) }));
type Game = ReturnType<typeof useConquestNba>;
type View = ReturnType<typeof renderHook<Game, unknown>>;
function check(value: unknown, message: string): void { assert.ok(value, message); }
function rng(seed: number) { return () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
  return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
}; }
function snapshot(game: Game) { return JSON.stringify({ rosters: game.rosters, turn: game.turn,
  log: game.gameLog, eliminated: game.eliminated, territories: game.territories,
  cooldown: game.conquestsSinceSign, rankings: game.powerRankings(), pending: game.pendingBattleApply,
  phase: game.phase, confirmed: game.playerConfirmed }); }
function begin(view: View) {
  check(view.result.current.phase === 'ready', 'SETUP: ready before actual battle');
  act(() => view.result.current.startBattle()); act(() => vi.advanceTimersByTime(10000));
  check(view.result.current.battleResult?.simulation, 'SETUP: original-map actual simulator result');
  act(() => view.result.current.skipToResult());
  const result = view.result.current.battleResult!;
  check(view.result.current.pendingBattleApply, 'SETUP: real unsettled result');
  const player = view.result.current.rosters[result.loser].find(name => !view.result.current.rosters[result.winner].includes(name))!;
  check(player, 'SETUP: real eligible loser player');
  return { result, player };
}
function ready(view: View) {
  if (view.result.current.phase === 'powerup_received') act(() => view.result.current.savePowerupForLater());
  check(view.result.current.phase === 'ready', 'SETUP: earned reward saved or defender repelled');
}
function trackConfirmation() {
  const schedule = window.setTimeout; let executed = 0;
  vi.spyOn(window, 'setTimeout').mockImplementation(((callback: () => void, delay?: number) => schedule(() => {
    if (delay === 1200) executed++; callback();
  }, delay)) as typeof window.setTimeout);
  return () => executed;
}
beforeEach(() => {
  vi.useFakeTimers(); vi.spyOn(Math, 'random').mockImplementation(rng(530));
  const deny = (name: string): never => { boundary.faults.push(name); throw new Error(name); };
  vi.stubGlobal('fetch', () => deny('fetch'));
  vi.stubGlobal('XMLHttpRequest', class { constructor() { deny('xhr'); } });
  vi.stubGlobal('WebSocket', class { constructor() { deny('socket'); } });
  for (const method of ['setItem', 'removeItem', 'clear'] as const) vi.spyOn(Storage.prototype, method).mockImplementation(() => deny('storage'));
  vi.spyOn(console, 'error').mockImplementation((...args) => boundary.faults.push(args.map(String).join(' ')));
});
afterEach(() => {
  cleanup(); vi.clearAllTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  check(boundary.faults.length === 0, 'BOUNDARY: no runtime transport storage or backend faults');
});

it('settles one repeated choice and rejects the prior callbacks in the next actual battle', () => {
  const view = renderHook(() => useConquestNba()), first = begin(view);
  const oldSteal = view.result.current.stealPlayer, oldSkip = view.result.current.skipSteal;
  act(() => { oldSteal(first.player); oldSteal(first.player); oldSkip(); }); act(() => vi.advanceTimersByTime(1200));
  check(view.result.current.turn === 1 && view.result.current.gameLog.length === 1
    && view.result.current.rosters[first.result.winner].filter(name => name === first.player).length === 1,
  'ONCE: one actual transfer and settlement');
  ready(view); const second = begin(view), before = snapshot(view.result.current);
  act(() => { oldSteal(first.player); oldSteal(second.player); oldSkip(); }); act(() => vi.advanceTimersByTime(1200));
  check(snapshot(view.result.current) === before && vi.getTimerCount() === 0,
    'STALE BATTLE: earlier callbacks cannot touch the next result');
  act(() => view.result.current.stealPlayer(second.player)); act(() => vi.advanceTimersByTime(1200));
  check(view.result.current.turn === 2 && view.result.current.gameLog.length === 2,
    'FRESH BATTLE: current callbacks remain valid');
});

it('cancels an accepted confirmation on reset and rejects old work after a fresh actual battle', () => {
  const view = renderHook(() => useConquestNba()), first = begin(view);
  const oldSteal = view.result.current.stealPlayer, oldSkip = view.result.current.skipSteal;
  act(() => oldSteal(first.player)); check(vi.getTimerCount() === 1, 'SETUP: one accepted confirmation is pending');
  act(() => view.result.current.reset()); const afterReset = vi.getTimerCount(), fresh = snapshot(view.result.current);
  act(() => { oldSteal(first.player); oldSkip(); vi.advanceTimersByTime(1200); });
  check(snapshot(view.result.current) === fresh && afterReset === 0, 'RESET: scheduled and stale work cannot change reset');
  vi.mocked(Math.random).mockImplementation(rng(530)); const second = begin(view), before = snapshot(view.result.current);
  act(() => { oldSteal(first.player); oldSkip(); vi.advanceTimersByTime(1200); });
  check(snapshot(view.result.current) === before, 'RESET NEW BATTLE: old identity remains invalid');
  act(() => view.result.current.stealPlayer(second.player)); act(() => vi.advanceTimersByTime(1200));
  check(view.result.current.turn === 1, 'FRESH RESET: new actual result settles once');
});

it('cancels an already accepted confirmation on unmount', () => {
  const view = renderHook(() => useConquestNba()), { player } = begin(view), executed = trackConfirmation();
  act(() => view.result.current.stealPlayer(player));
  check(vi.getTimerCount() === 1, 'SETUP: one actual confirmation timer is scheduled');
  view.unmount(); const afterUnmount = vi.getTimerCount(); act(() => vi.advanceTimersByTime(1200));
  check(afterUnmount === 0 && executed() === 0, 'ACCEPTED UNMOUNT: pending work is canceled');
});

it('rejects an unused captured valid choice after unmount before it schedules new work', () => {
  const view = renderHook(() => useConquestNba()), { player, result } = begin(view);
  const oldSteal = view.result.current.stealPlayer, executed = trackConfirmation();
  view.unmount(); const before = vi.getTimerCount(); act(() => oldSteal(player));
  const scheduled = vi.getTimerCount(); act(() => vi.advanceTimersByTime(1200));
  console.log('UNUSED UNMOUNT', JSON.stringify({ winner: result.winner, loser: result.loser, player, before, scheduled, executed: executed() }));
  check(scheduled === 0 && executed() === 0,
    'UNUSED UNMOUNT: disposed action must not schedule or execute a new settlement');
});
