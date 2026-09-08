/** Round 536: original NFL map, original rosters and real seeded simulations.
 * Seed 29 begins with CLE losing away to CIN, 21-10. No game state is injected.
 * Backend, transport and storage writes are denied and recorded, including imports.
 */
import assert from 'node:assert/strict';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { useConquest } from '@/hooks/useConquest';

const boundary = vi.hoisted(() => ({ faults: [] as string[] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: new Proxy({}, { get() {
  boundary.faults.push('backend'); throw new Error('Unexpected NFL steal backend access');
} }) }));
type Game = ReturnType<typeof useConquest>;
type View = ReturnType<typeof renderHook<Game, unknown>>;
function check(value: unknown, message: string): void { assert.ok(value, message); }
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function rng(seed: number) { return () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
  return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
}; }
function snapshot(game: Game) { return JSON.stringify({ phase: game.phase, rosters: game.rosters,
  territories: game.territories, eliminated: game.eliminated, turn: game.turn, log: game.gameLog,
  rankings: game.powerRankings(), cooldown: game.conquestsSinceSign, modal: game.stealModalOpen,
  pending: game.pendingBattleApply, confirmed: game.playerConfirmed, box: game.boxScore }); }
function reveal(view: View) {
  act(() => view.result.current.startBattle()); act(() => vi.advanceTimersByTime(10000));
  check(view.result.current.battleResult?.simulation, 'SETUP: the original-map turn produced a real battle simulation');
}
function battle(natural = false) {
  const view = renderHook(() => useConquest()); reveal(view);
  const result = view.result.current.battleResult!;
  check(result.winner === 'CIN' && result.loser === 'CLE' && result.winScore === 21 && result.loseScore === 10,
    'SETUP: seed 29 reproduces the recorded real away defeat');
  if (natural) act(() => vi.advanceTimersByTime(60000));
  else act(() => view.result.current.skipToResult());
  return { view, result, player: view.result.current.rosters[result.loser][0] };
}
function settled(view: View, stolen: string | undefined, label: string) {
  const game = view.result.current, log = game.gameLog;
  const winner = game.powerRankings().find(team => team.id === 'CIN');
  const loser = game.powerRankings().find(team => team.id === 'CLE');
  check(game.turn === 1 && log.length === 1 && log[0].attacker === 'CLE' && log[0].defender === 'CIN'
    && log[0].winner === 'CIN' && log[0].score === '21-10 · away raid repelled'
    && log[0].stolenPlayer === stolen && game.conquestsSinceSign === 1 && game.eliminated.length === 0
    && winner?.wins === 1 && winner.losses === 0 && loser?.wins === 0 && loser.losses === 1,
  `${label}: one actual score log turn and cooldown settle`);
}
beforeEach(() => {
  vi.useFakeTimers(); vi.spyOn(Math, 'random').mockImplementation(rng(29));
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

describe('NFL battle steal settlement', () => {
  it('rejects unknown and non-loser names while preserving a legal retry', () => {
    const { view, player } = battle(), before = snapshot(view.result.current);
    for (const name of ['Unknown Fixture Player', "Ja'Marr Chase", 'Patrick Mahomes']) {
      check(!view.result.current.canStealPlayer(name), 'ELIGIBILITY: only a current losing-roster player is offered');
      act(() => view.result.current.stealPlayer(name));
      check(snapshot(view.result.current) === before && vi.getTimerCount() === 0,
        'INVALID: an ineligible input changes no state and schedules no confirmation');
    }
    act(() => view.result.current.stealPlayer(player)); act(() => vi.advanceTimersByTime(1200));
    settled(view, player, 'RETRY');
  });

  it('settles a direct legal choice after the confirmation delay with the real score', () => {
    const { view, result, player } = battle(), before = view.result.current;
    check(before.stealActionReady && before.canSkipSteal && before.canStealPlayer(player) && !before.stealModalOpen,
      'SKIP INSTALL: Skip to Result creates an actionable decision without opening a modal');
    act(() => view.result.current.stealPlayer(player));
    check(!view.result.current.stealActionReady && !view.result.current.canSkipSteal
      && !view.result.current.canStealPlayer(player) && view.result.current.playerConfirmed === player,
    'CONFIRM LOCK: an accepted transfer immediately closes every settlement action');
    act(() => vi.advanceTimersByTime(1199));
    check(same(view.result.current.rosters, before.rosters) && view.result.current.turn === 0,
      'DELAY: the real roster and result remain unchanged until 1200 milliseconds');
    act(() => vi.advanceTimersByTime(1));
    check(view.result.current.rosters[result.winner].filter(name => name === player).length === 1
      && !view.result.current.rosters[result.loser].includes(player)
      && same(view.result.current.territories, before.territories),
    'TRANSFER: one legal player moves from loser to winner while an away loss keeps territory');
    settled(view, player, 'DIRECT');
    check(view.result.current.phase === 'ready' && !view.result.current.pendingBattleApply
      && !view.result.current.playerConfirmed && !view.result.current.boxScore && view.result.current.visiblePlays.length === 0,
    'CLEAR: completed confirmation leaves a clean ready state');
  });

  it('installs an actionable decision after the entire natural play reveal', () => {
    const { view, player } = battle(true);
    check(view.result.current.stealActionReady && view.result.current.canStealPlayer(player)
      && !view.result.current.canSkipBattle && !!view.result.current.boxScore && vi.getTimerCount() === 0,
    'NATURAL INSTALL: finishing the real reveal creates an actionable final decision');
    act(() => view.result.current.stealPlayer(player)); act(() => vi.advanceTimersByTime(1200));
    settled(view, player, 'NATURAL');
  });

  it('consumes repeated choices once without letting Skip to Result revive them', () => {
    const { view, player } = battle(), steal = view.result.current.stealPlayer;
    const skipResult = view.result.current.skipToResult;
    act(() => { steal(player); steal(player); skipResult(); });
    act(() => view.result.current.stealPlayer(player)); act(() => vi.advanceTimersByTime(1200));
    check(view.result.current.rosters.CIN.filter(name => name === player).length === 1 && view.result.current.turn === 1
      && view.result.current.gameLog.length === 1 && view.result.current.conquestsSinceSign === 1,
    'ONCE: repeated and refreshed callbacks move one player and settle exactly once');
    const before = snapshot(view.result.current);
    act(() => { steal(player); skipResult(); }); act(() => vi.advanceTimersByTime(1200));
    check(snapshot(view.result.current) === before && vi.getTimerCount() === 0,
      'REPLAY: a completed decision cannot schedule another transfer');
  });

  it('shares one decision between steal and skip in either action order', () => {
    for (const first of ['steal', 'skip']) {
      vi.mocked(Math.random).mockImplementation(rng(29));
      const { view, player } = battle(), actions = view.result.current;
      act(() => {
        if (first === 'steal') { actions.stealPlayer(player); actions.skipSteal(); }
        else { actions.skipSteal(); actions.skipSteal(); actions.stealPlayer(player); }
      });
      act(() => vi.advanceTimersByTime(1200));
      check(view.result.current.turn === 1 && view.result.current.gameLog.length === 1
        && view.result.current.conquestsSinceSign === 1
        && view.result.current.rosters.CIN.filter(name => name === player).length === (first === 'steal' ? 1 : 0),
      'RACE: the first accepted action alone transfers or skips and settles once');
      settled(view, first === 'steal' ? player : undefined, 'RACE LOG');
      view.unmount(); vi.clearAllTimers();
    }
  });

  it('preserves the pending decision across closing and reopening the picker', () => {
    const view = renderHook(() => useConquest()), idle = view.result.current;
    act(() => { idle.openStealModal(); idle.closeStealModal(); idle.skipSteal(); idle.stealPlayer('Myles Garrett'); });
    check(!view.result.current.stealModalOpen && view.result.current.turn === 0 && vi.getTimerCount() === 0,
      'IDLE: picker actions before a battle leave the game idle');
    reveal(view); act(() => view.result.current.skipToResult());
    const pending = view.result.current.pendingBattleApply;
    act(() => view.result.current.openStealModal());
    check(view.result.current.stealModalOpen, 'OPEN: an actionable decision opens its picker');
    act(() => view.result.current.closeStealModal());
    check(!view.result.current.stealModalOpen && view.result.current.pendingBattleApply === pending
      && view.result.current.stealActionReady && view.result.current.turn === 0,
    'CLOSE: closing the picker preserves the unsettled decision');
    act(() => view.result.current.openStealModal()); act(() => view.result.current.skipSteal());
    check(!view.result.current.stealModalOpen && !view.result.current.pendingBattleApply,
      'SKIP CLEAR: skipping a nonempty roster closes and clears the picker');
    settled(view, undefined, 'SKIP');
  });

  it('rejects captured callbacks when another real battle has a pending decision', () => {
    const { view, player } = battle(), old = view.result.current;
    act(() => old.skipSteal()); reveal(view); act(() => view.result.current.skipToResult());
    check(view.result.current.pendingBattleApply && view.result.current.stealActionReady,
      'SETUP: the next actual battle is awaiting a separate decision');
    act(() => view.result.current.openStealModal()); const before = snapshot(view.result.current);
    act(() => { old.stealPlayer(player); old.skipSteal(); old.closeStealModal(); old.openStealModal(); });
    check(snapshot(view.result.current) === before && vi.getTimerCount() === 0,
      'STALE: callbacks from the previous battle cannot touch the current decision');
    act(() => view.result.current.skipSteal());
    check(view.result.current.turn === 2 && view.result.current.gameLog.length === 2 && view.result.current.conquestsSinceSign === 2,
      'FRESH: the current callback still settles its real battle once');
  });

  it('cancels pending confirmation on reset and never revives the prior run', () => {
    const { view, player } = battle(), old = view.result.current;
    act(() => old.stealPlayer(player)); check(vi.getTimerCount() === 1, 'SETUP: legal transfer has one pending confirmation');
    vi.mocked(Math.random).mockImplementation(rng(29));
    act(() => view.result.current.reset()); const before = snapshot(view.result.current);
    check(vi.getTimerCount() === 0, 'RESET TIMER: resetting cancels the actual confirmation timer');
    act(() => { old.stealPlayer(player); old.skipSteal(); old.openStealModal(); }); act(() => vi.advanceTimersByTime(1200));
    check(snapshot(view.result.current) === before && vi.getTimerCount() === 0,
      'RESET STATE: a previous-run callback cannot alter fresh rosters or results');
    reveal(view); act(() => view.result.current.skipToResult()); const untouched = snapshot(view.result.current);
    act(() => { old.stealPlayer(player); old.skipSteal(); }); act(() => vi.advanceTimersByTime(1200));
    check(snapshot(view.result.current) === untouched,
      'NEW RUN: an old callback cannot settle the fresh run actual battle');
  });

  it('cancels confirmation work and rejects retained actions after unmount', () => {
    const { view, player } = battle(), schedule = window.setTimeout; let callbacks = 0;
    vi.spyOn(window, 'setTimeout').mockImplementation(((callback: () => void, delay?: number) => schedule(() => {
      if (delay === 1200) callbacks++; callback();
    }, delay)) as typeof window.setTimeout);
    act(() => view.result.current.stealPlayer(player)); check(vi.getTimerCount() === 1, 'SETUP: confirmation uses a real scheduled timer');
    view.unmount(); const pending = vi.getTimerCount(); act(() => vi.advanceTimersByTime(1200));
    check(pending === 0 && callbacks === 0, 'UNMOUNT TIMER: no retired confirmation timer remains or fires');
    vi.mocked(Math.random).mockImplementation(rng(29)); const next = battle(), old = next.view.result.current;
    next.view.unmount(); act(() => { old.stealPlayer(next.player); old.skipSteal(); old.openStealModal(); });
    check(vi.getTimerCount() === 0, 'UNMOUNT ACTION: retained unsettled actions cannot schedule work after disposal');
  });
});
