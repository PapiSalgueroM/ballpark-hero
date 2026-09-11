/** Round 534: actual earned NFL upgrades on the real map and real battle engine.
 * Reward kind and documented RNG draws are controlled, never React state.
 * The engine wrapper records calls and returns the real result unchanged.
 */
import assert from 'node:assert/strict';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { useConquest } from '@/hooks/useConquest';
import { getNflRosterPlayer } from '@/lib/conquestRosterNfl';
import { STATE_POSITIONS } from '@/data/conquestData';
import { TERRITORY_ADJACENCY } from '@/lib/conquestMapGeometry';
import type { simulateDetailedBattle } from '@/lib/conquestBattle';

type EngineCall = { args: Parameters<typeof simulateDetailedBattle>; result: ReturnType<typeof simulateDetailedBattle> };
const fixture = vi.hoisted(() => ({ faults: [] as string[], calls: [] as EngineCall[],
  power: 'upgrade', initial: null as Record<string, string | null> | null }));
vi.mock('@/data/conquestData', async importOriginal => {
  const actual = await importOriginal<typeof import('@/data/conquestData')>();
  return { ...actual, get INITIAL_TERRITORIES() { return fixture.initial ?? actual.INITIAL_TERRITORIES; } };
});
vi.mock('@/data/conquestPowerups', async importOriginal => {
  const actual = await importOriginal<typeof import('@/data/conquestPowerups')>();
  return { ...actual, getRandomPowerup: () => {
    actual.getRandomPowerup(); return actual.POWERUPS.find(power => power.id === fixture.power)!;
  } };
});
vi.mock('@/lib/conquestBattle', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/conquestBattle')>();
  return { ...actual, simulateDetailedBattle: (...args: Parameters<typeof simulateDetailedBattle>) => {
    const result = actual.simulateDetailedBattle(...args);
    fixture.calls.push({ args, result }); return result;
  } };
});
vi.mock('@/integrations/supabase/client', () => ({ supabase: new Proxy({}, { get() {
  fixture.faults.push('backend'); throw new Error('Unexpected NFL upgrades backend access');
} }) }));
type Game = ReturnType<typeof useConquest>;
type View = ReturnType<typeof renderHook<Game, unknown>>;
function check(value: unknown, message: string) { assert.ok(value, message); }
function same(a: unknown, b: unknown) { return JSON.stringify(a) === JSON.stringify(b); }
function seeded(seed: number) { return () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
  return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
}; }
function snapshot(game: Game) { return JSON.stringify({ phase: game.phase, turn: game.turn,
  territories: game.territories, rosters: game.rosters, queued: game.teamUpgrades, battle: game.battleUpgrades,
  pending: game.pendingPowerup, saved: game.teamSavedPowerups, logs: game.gameLog }); }
function direct(view: View, team: string, seed?: number) {
  const alive = view.result.current.aliveTeams(); check(alive.includes(team), 'SETUP: selected map attacker is alive');
  if (seed !== undefined) vi.mocked(Math.random).mockImplementation(seeded(seed));
  vi.mocked(Math.random).mockReturnValueOnce((alive.indexOf(team) + .5) / alive.length);
}
function start(view: View) {
  check(view.result.current.phase === 'ready' && !view.result.current.pendingPowerup, 'SETUP: the real map turn starts idle');
  act(() => view.result.current.startBattle()); act(() => vi.advanceTimersByTime(10000));
}
function settle(view: View) {
  if (view.result.current.battleResult?.simulation) {
    act(() => view.result.current.skipToResult());
    check(view.result.current.pendingBattleApply, 'SETUP: the real battle reached its result');
    act(() => view.result.current.skipSteal());
  }
}
function step(view: View) { start(view); settle(view); }
function earnFirst() {
  const view = renderHook(() => useConquest());
  for (let turns = 0; turns < 8 && !view.result.current.pendingPowerup; turns++) step(view);
  check(view.result.current.turn === 5 && fixture.calls.length === 4
    && view.result.current.pendingPowerup?.teamId === 'CIN', 'SETUP: four real battles and one claim earn Cincinnati its first reward');
  return view;
}
function arm(view: View, player: string) {
  const owner = view.result.current.pendingPowerup!.teamId;
  check((getNflRosterPlayer(player, owner)?.overall ?? 99) < 99, 'SETUP: the chosen shipped player can benefit from 99 OVR');
  act(() => view.result.current.usePowerupNow()); const choose = view.result.current.chooseUpgradePlayer;
  act(() => choose(player));
  check(view.result.current.teamUpgrades[owner] === player, 'ARM: an earned choice queues its current roster player for its owner');
  return choose;
}
function firstQueue() { const view = earnFirst(); arm(view, 'Chase Brown'); return view; }
function twoQueues() {
  const view = firstQueue(); direct(view, 'KC'); step(view);
  check(!view.result.current.battleResult && view.result.current.pendingPowerup?.teamId === 'KC', 'SETUP: Kansas City earns its own reward by claiming Iowa');
  arm(view, 'Kenneth Walker'); return view;
}
function declaredInitialMap() {
  return Object.fromEntries(STATE_POSITIONS.map(state => [state.id,
    !(state.id in TERRITORY_ADJACENCY) || ['KY', 'IA', 'KS', 'NE'].includes(state.id) ? null
      : state.id === 'OH_SW' ? 'CIN' : 'KC']));
}
beforeEach(() => {
  fixture.calls.length = 0; fixture.power = 'upgrade'; fixture.initial = null;
  vi.useFakeTimers(); vi.spyOn(Math, 'random').mockImplementation(seeded(29));
  const deny = (label: string): never => { fixture.faults.push(label); throw new Error(`Forbidden NFL upgrade boundary: ${label}`); };
  vi.stubGlobal('fetch', () => deny('fetch'));
  vi.stubGlobal('XMLHttpRequest', class { constructor() { deny('xhr'); } });
  vi.stubGlobal('WebSocket', class { constructor() { deny('socket'); } });
  for (const method of ['setItem', 'removeItem', 'clear'] as const) vi.spyOn(Storage.prototype, method).mockImplementation(() => deny('storage'));
  vi.spyOn(console, 'error').mockImplementation((...args) => fixture.faults.push(args.map(String).join(' ')));
});
afterEach(() => {
  cleanup(); vi.clearAllTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  check(fixture.faults.length === 0, 'BOUNDARY: no runtime transport storage or backend faults');
});

describe('NFL earned upgrade lifetime', () => {
  it('preserves an earned queue through unrelated and owner neutral claims', () => {
    const view = firstQueue(), before = fixture.calls.length;
    direct(view, 'SEA'); step(view);
    check(!view.result.current.battleResult && view.result.current.attackingTeam === 'SEA'
      && fixture.calls.length === before, 'SETUP: Seattle makes an actual neutral claim without a simulation');
    check(view.result.current.teamUpgrades.CIN === 'Chase Brown' && same(view.result.current.battleUpgrades, {}),
      'NEUTRAL: another team claiming a neutral state preserves the queued upgrade');
    direct(view, 'CIN', 0); step(view);
    check(!view.result.current.battleResult && view.result.current.pendingPowerup?.teamId === 'CIN'
      && fixture.calls.length === before, 'SETUP: Cincinnati earns Kentucky through its own neutral claim');
    check(view.result.current.teamUpgrades.CIN === 'Chase Brown' && same(view.result.current.battleUpgrades, {}),
      'OWNER NEUTRAL: an owner neutral claim does not spend its next battle upgrade');
  });

  it('preserves a queued owner while unrelated teams fight a real battle', () => {
    const view = firstQueue(); start(view);
    check(view.result.current.attackingTeam === 'MIA' && view.result.current.defendingTeam === 'TB'
      && view.result.current.battleResult?.simulation, 'SETUP: the next seeded turn is Miami against Tampa Bay');
    check(view.result.current.teamUpgrades.CIN === 'Chase Brown', 'UNRELATED: an unrelated real battle does not consume Cincinnati upgrade');
    check(same(view.result.current.battleUpgrades, {}) && same(fixture.calls[fixture.calls.length - 1].args[7], {}),
      'UNRELATED SNAPSHOT: a third team upgrade never enters the current simulation');
    settle(view);
    check(view.result.current.teamUpgrades.CIN === 'Chase Brown', 'SETTLED QUEUE: settlement preserves an unrelated queued owner');
  });

  it('uses and consumes the attacker upgrade while retaining its real battle snapshot', () => {
    const view = firstQueue(), before = fixture.calls.length; direct(view, 'CIN', 8); start(view);
    const game = view.result.current, call = fixture.calls[fixture.calls.length - 1];
    check(game.attackingTeam === 'CIN' && game.defendingTeam && call.args[0] === 'CIN' && fixture.calls.length === before + 1,
      'SETUP: the earned owner attacks in exactly one actual simulation');
    check(same(call.args[7], { CIN: 'Chase Brown' }) && call.args[4] === null && call.args[5] === null,
      'ATTACK CALL: the hook forwards the attacker queue through the authoritative engine map');
    check(!game.teamUpgrades.CIN && same(game.battleUpgrades, { CIN: 'Chase Brown' }),
      'ATTACK CONSUME: the participating queue moves into the current battle snapshot');
    check(same(game.battleResult?.simulation, call.result), 'REAL RESULT: the hook reveals the real engine result without replacing it');
    act(() => view.result.current.skipToResult());
    check(same(view.result.current.boxScore, call.result.boxScore) && same(view.result.current.battleUpgrades, { CIN: 'Chase Brown' }),
      'RESULT SNAPSHOT: the result table keeps the upgrade used by its actual box score');
    act(() => view.result.current.skipSteal());
    check(same(view.result.current.battleUpgrades, { CIN: 'Chase Brown' }), 'SETTLED SNAPSHOT: settlement retains the displayed battle upgrade');
    direct(view, 'SEA', 0); act(() => view.result.current.startBattle());
    check(view.result.current.attackingTeam === 'SEA' && view.result.current.targetState,
      'SETUP: the following accepted turn is a neutral claim with no new battle snapshot');
    check(same(view.result.current.battleUpgrades, {}), 'NEXT SNAPSHOT: the next accepted turn clears the previous battle upgrade');
  });

  it('uses and consumes the defender upgrade when another team attacks its owner', () => {
    const view = firstQueue(); direct(view, 'CLE'); start(view);
    const game = view.result.current, call = fixture.calls[fixture.calls.length - 1];
    check(game.attackingTeam === 'CLE' && game.defendingTeam === 'CIN', 'SETUP: Cleveland attacks the earned upgrade owner');
    check(same(call.args[7], { CIN: 'Chase Brown' }) && call.args[1] === 'CIN', 'DEFEND CALL: the defender owned queue reaches the actual engine');
    check(!game.teamUpgrades.CIN && same(game.battleUpgrades, { CIN: 'Chase Brown' }), 'DEFEND CONSUME: defending spends only that owner next battle upgrade');
    settle(view);
    check(!view.result.current.teamUpgrades.CIN && same(view.result.current.battleUpgrades, { CIN: 'Chase Brown' }),
      'DEFEND SETTLED: the defender upgrade remains spent after the real battle settles');
  });

  it('keeps independent earned queues and consumes only actual battle participants', () => {
    const view = twoQueues();
    check(same(view.result.current.teamUpgrades, { CIN: 'Chase Brown', KC: 'Kenneth Walker' }),
      'TWO OWNERS: a second earned upgrade cannot overwrite another team queue');
    direct(view, 'CIN', 8); start(view);
    check(view.result.current.defendingTeam !== 'KC' && view.result.current.attackingTeam === 'CIN', 'SETUP: Kansas City is outside the next real battle');
    check(same(view.result.current.teamUpgrades, { KC: 'Kenneth Walker' }) && same(view.result.current.battleUpgrades, { CIN: 'Chase Brown' }),
      'PARTICIPANTS: spending Cincinnati upgrade preserves Kansas City queued player');
    check(same(fixture.calls[fixture.calls.length - 1].args[7], { CIN: 'Chase Brown' }),
      'PARTICIPANT CALL: the simulator receives only upgrades for its actual two teams');
  });

  it('keeps a second same-owner reward unspent until the queued battle is played', () => {
    const view = firstQueue(); direct(view, 'CIN', 0); step(view);
    check(view.result.current.pendingPowerup?.teamId === 'CIN', 'SETUP: Cincinnati actually earns a second Upgrade from Kentucky');
    check(view.result.current.powerupUnavailableReason === 'This team already has an upgrade waiting for its next battle. Save this one for later.',
      'DUPLICATE REASON: the earned second card explains why its owner cannot replace the queue');
    const before = snapshot(view.result.current); act(() => view.result.current.usePowerupNow());
    check(snapshot(view.result.current) === before && view.result.current.phase === 'powerup_received',
      'DUPLICATE CARD: using a second upgrade preserves the pending reward and first queued player');
    act(() => view.result.current.savePowerupForLater());
    check(view.result.current.teamSavedPowerups.CIN?.length === 1 && view.result.current.teamUpgrades.CIN === 'Chase Brown',
      'DUPLICATE SAVE: the blocked earned card can be saved without replacing the queue');
    direct(view, 'CIN', 8); step(view);
    check(!view.result.current.teamUpgrades.CIN && view.result.current.aliveTeams().includes('CIN'), 'SETUP: Cincinnati spends its queued upgrade in a real battle and survives');
    act(() => view.result.current.useSavedPowerup('CIN', 0));
    check(!view.result.current.powerupUnavailableReason, 'AVAILABLE AGAIN: after the owner battle its saved upgrade becomes usable');
    arm(view, 'Chase Brown');
    check(!view.result.current.teamSavedPowerups.CIN.length && !view.result.current.pendingPowerup,
      'SAVED REARM: a saved earned upgrade can queue again after the prior one was consumed');
  });

  it('clears queued and battle upgrades on reset and rejects stale disposed choices', () => {
    const view = twoQueues(); direct(view, 'CIN', 8); start(view); settle(view);
    check(view.result.current.teamUpgrades.KC && view.result.current.battleUpgrades.CIN, 'SETUP: both a future queue and completed battle snapshot exist');
    act(() => view.result.current.reset());
    check(same(view.result.current.teamUpgrades, {}) && same(view.result.current.battleUpgrades, {}),
      'RESET MAPS: a new run clears both upgrade lifetimes');
    view.unmount(); fixture.calls.length = 0; vi.mocked(Math.random).mockImplementation(seeded(29));
    const other = earnFirst(); act(() => other.result.current.usePowerupNow());
    const old = other.result.current.chooseUpgradePlayer; act(() => other.result.current.reset());
    const reset = snapshot(other.result.current); act(() => old('Chase Brown'));
    check(snapshot(other.result.current) === reset, 'STALE RESET: a prior picker cannot restore an upgrade after reset');
    other.unmount(); fixture.calls.length = 0; vi.mocked(Math.random).mockImplementation(seeded(29));
    const disposed = earnFirst(); act(() => disposed.result.current.usePowerupNow());
    const choose = disposed.result.current.chooseUpgradePlayer; disposed.unmount();
    const draws = vi.mocked(Math.random).mock.calls.length; act(() => choose());
    check(vi.mocked(Math.random).mock.calls.length === draws && vi.getTimerCount() === 0,
      'DISPOSED PICKER: an unmounted random choice cannot consume work or schedule callbacks');
  });

  it('clears an eliminated owner queue while retaining another in a declared initial-map fixture', () => {
    // Fixture-only legal starting ownership, not a naturally reached campaign.
    // Real geometry and all original player rosters remain unchanged. Four real
    // neutral claims earn both upgrades and both steals before any elimination.
    fixture.initial = declaredInitialMap();
    const view = renderHook(() => useConquest());
    direct(view, 'CIN', 0); step(view);
    check(view.result.current.pendingPowerup?.teamId === 'CIN' && !view.result.current.battleResult,
      'FIXTURE EARN: Cincinnati earns its Upgrade from a real neutral claim');
    arm(view, 'Chase Brown');
    direct(view, 'KC', 0); step(view);
    check(view.result.current.pendingPowerup?.teamId === 'KC' && !view.result.current.battleResult,
      'FIXTURE EARN: Kansas City earns its Upgrade from a real neutral claim');
    arm(view, 'Kenneth Walker');
    fixture.power = 'territory_steal';
    for (const seed of [1, 7]) {
      direct(view, 'KC', seed); step(view);
      check(view.result.current.pendingPowerup?.powerup.id === 'territory_steal' && !view.result.current.battleResult,
        'FIXTURE STEALS: two further neutral claims earn the two real territory powers');
      act(() => view.result.current.savePowerupForLater());
    }
    check(same(view.result.current.teamUpgrades, { CIN: 'Chase Brown', KC: 'Kenneth Walker' })
      && Object.values(view.result.current.territories).filter(owner => owner === 'CIN').length === 2,
      'FIXTURE QUEUES: two earned queues and two enemy states exist before the saved steals');
    for (let count = 0; count < 2; count++) {
      act(() => view.result.current.useSavedPowerup('KC', 0)); act(() => view.result.current.usePowerupNow());
      const target = view.result.current.stealCandidates.find(state => state.ownerId === 'CIN');
      check(target, 'FIXTURE BORDER: the saved power has a real adjacent Cincinnati state');
      act(() => view.result.current.stealTerritoryTarget(target!.stateId));
      if (count === 0) check(view.result.current.teamUpgrades.CIN === 'Chase Brown',
        'PARTIAL CLAIM: losing one territory does not clear a still-living owner queue');
    }
    check(view.result.current.eliminated.filter(id => id === 'CIN').length === 1 && view.result.current.phase === 'gameover',
      'FIXTURE ELIMINATION: the second real power removes the final Cincinnati state');
    check(!view.result.current.teamUpgrades.CIN && view.result.current.teamUpgrades.KC === 'Kenneth Walker',
      'ELIMINATED QUEUE: the removed owner loses its queued upgrade while the other owner retains theirs');
  });

  it('forwards both earned owner upgrades into one real battle in a declared initial-map fixture', () => {
    // Same declared legal starting ownership as the elimination fixture.
    // Both teams earn their cards through real claims before fighting.
    fixture.initial = declaredInitialMap();
    const view = renderHook(() => useConquest());
    direct(view, 'CIN', 0); step(view);
    check(view.result.current.pendingPowerup?.teamId === 'CIN' && !view.result.current.battleResult,
      'FIXTURE EARN: Cincinnati earns its Upgrade from a real neutral claim');
    arm(view, 'Chase Brown'); direct(view, 'KC', 0); step(view);
    check(view.result.current.pendingPowerup?.teamId === 'KC' && !view.result.current.battleResult,
      'FIXTURE EARN: Kansas City earns its Upgrade from a real neutral claim');
    arm(view, 'Kenneth Walker');
    const upgrades = { CIN: 'Chase Brown', KC: 'Kenneth Walker' };
    check(same(view.result.current.teamUpgrades, upgrades) && fixture.calls.length === 0,
      'FIXTURE BOTH: the two queued owners earned their cards without an intervening battle');
    direct(view, 'CIN', 1); const battle = view.result.current.startBattle;
    act(() => { battle(); battle(); }); act(() => vi.advanceTimersByTime(10000));
    const call = fixture.calls[0];
    check(view.result.current.attackingTeam === 'CIN' && view.result.current.defendingTeam === 'KC' && fixture.calls.length === 1,
      'BOTH ONCE: the two earned owners fight in one actual simulation despite a repeated start');
    check(same(call.args[7], upgrades), 'BOTH CALL: one real engine invocation receives both earned owner upgrades');
    check(same(view.result.current.teamUpgrades, {}) && same(view.result.current.battleUpgrades, upgrades),
      'BOTH CONSUME: both participating queues move into the same current battle snapshot');
    settle(view);
    check(same(view.result.current.teamUpgrades, {}) && same(view.result.current.battleUpgrades, upgrades),
      'BOTH SETTLED: both earned upgrades stay spent while the completed battle retains both cards');
  });
});
