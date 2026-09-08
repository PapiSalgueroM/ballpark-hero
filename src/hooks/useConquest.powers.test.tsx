/** Round 533: real NFL hook, map, rosters and seeded battle outcomes.
 * Only the earned reward kind is controlled, after consuming its normal draw.
 */
import assert from 'node:assert/strict';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { useConquest } from '@/hooks/useConquest';
import { PowerupId } from '@/data/conquestPowerups';

const fixture = vi.hoisted(() => ({ power: 'invincibility' as string, faults: [] as string[] }));
vi.mock('@/data/conquestPowerups', async importOriginal => {
  const actual = await importOriginal<typeof import('@/data/conquestPowerups')>();
  return { ...actual, getRandomPowerup: () => {
    actual.getRandomPowerup(); return actual.POWERUPS.find(power => power.id === fixture.power)!;
  } };
});
vi.mock('@/integrations/supabase/client', () => ({ supabase: new Proxy({}, { get() {
  fixture.faults.push('backend'); throw new Error('Unexpected NFL powers backend access');
} }) }));
type Game = ReturnType<typeof useConquest>;
type View = ReturnType<typeof renderHook<Game, unknown>>;
function check(value: unknown, message: string) { assert.ok(value, message); }
function seeded(seed: number) { return () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
  return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
}; }
function mount(power: PowerupId = 'invincibility') {
  fixture.power = power; return renderHook(() => useConquest());
}
function snapshot(game: Game) { return JSON.stringify({ phase: game.phase, turn: game.turn,
  territories: game.territories, rosters: game.rosters, log: game.gameLog, eliminated: game.eliminated,
  saved: game.teamSavedPowerups, pending: game.pendingPowerup, type: game.powerupUseType,
  owner: game.powerupTeam, shield: [...game.invincibleTeams], upgrade: [game.upgradeActiveTeam, game.upgradedPlayer],
  candidates: game.stealCandidates, agents: game.freeAgentList, highlight: game.territoryStolenState,
  attacking: game.attackingTeam, defending: game.defendingTeam }); }
function step(view: View) {
  check(view.result.current.phase === 'ready' && !view.result.current.pendingPowerup, 'SETUP: the next real map turn is idle');
  act(() => view.result.current.startBattle()); act(() => vi.advanceTimersByTime(10000));
  const battle = !!view.result.current.battleResult?.simulation;
  if (battle) {
    act(() => view.result.current.skipToResult());
    check(view.result.current.pendingBattleApply, 'SETUP: an actual simulated battle reached its result');
    act(() => view.result.current.skipSteal());
  }
  return battle;
}
function earn(view: View, power: PowerupId = 'invincibility') {
  fixture.power = power; let battles = 0;
  for (let turns = 1; turns <= 64; turns++) {
    battles += Number(step(view));
    if (view.result.current.pendingPowerup) {
      check(view.result.current.pendingPowerup.powerup.id === power, 'SETUP: a real map claim earned the requested reward');
      console.log(`Earned ${power}: ${turns} map turns, ${battles} settled battles, owner ${view.result.current.pendingPowerup.teamId}`);
      return view.result.current.pendingPowerup.teamId;
    }
  }
  throw new Error('A real reward was not reached within 64 map turns');
}
function picker(view: View, power: PowerupId) {
  const owner = earn(view, power); act(() => view.result.current.usePowerupNow()); return owner;
}
function cancel(view: View) {
  const action = (view.result.current as Game & { cancelPowerupUse?: () => void }).cancelPowerupUse;
  check(typeof action === 'function', 'CANCEL: a picker can return to the same earned card'); act(() => action!());
}
beforeEach(() => {
  vi.useFakeTimers(); vi.spyOn(Math, 'random').mockImplementation(seeded(29));
  const deny = (label: string): never => { fixture.faults.push(label); throw new Error(`Forbidden NFL power boundary: ${label}`); };
  vi.stubGlobal('fetch', () => deny('fetch'));
  vi.stubGlobal('XMLHttpRequest', class { constructor() { deny('xhr'); } });
  vi.stubGlobal('WebSocket', class { constructor() { deny('socket'); } });
  for (const method of ['setItem', 'removeItem', 'clear'] as const) vi.spyOn(Storage.prototype, method).mockImplementation(() => deny('storage'));
  vi.spyOn(console, 'error').mockImplementation((...args) => { fixture.faults.push(args.map(String).join(' ')); });
});
afterEach(() => {
  cleanup(); vi.clearAllTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  check(fixture.faults.length === 0, 'BOUNDARY: no runtime transport storage or backend faults');
});

describe('NFL earned power actions', () => {
  it('makes one decision for an earned card across repeated use and save callbacks', () => {
    const view = mount(), owner = earn(view), before = view.result.current.gameLog.length;
    const use = view.result.current.usePowerupNow, save = view.result.current.savePowerupForLater;
    act(() => { use(); use(); save(); });
    check(view.result.current.invincibleTeams.has(owner) && view.result.current.gameLog.length === before + 1
      && !(view.result.current.teamSavedPowerups[owner]?.length) && !view.result.current.pendingPowerup,
    'DECISION: one earned card activates once and cannot also be saved');
    const done = snapshot(view.result.current); act(() => { use(); save(); });
    check(snapshot(view.result.current) === done, 'SPENT CARD: old decisions stay spent after the next render');
  });

  it('saves once and opens only one live saved card into its visible decision phase', () => {
    const view = mount(), first = earn(view), save = view.result.current.savePowerupForLater;
    act(() => { save(); save(); });
    check(view.result.current.teamSavedPowerups[first]?.length === 1, 'SAVE ONCE: one earned card creates one saved entry');
    const second = earn(view, 'upgrade'); act(() => view.result.current.savePowerupForLater());
    const owners = view.result.current.aliveTeams().filter(id => view.result.current.teamSavedPowerups[id]?.length);
    check(owners.includes(first) && owners.includes(second), 'SETUP: both actually earned saved rewards still have living owners');
    const open = view.result.current.useSavedPowerup, before = JSON.stringify(view.result.current.teamSavedPowerups);
    act(() => { open('Synthetic absent owner', 0); open(first, -1); open(first, 1.5); });
    check(JSON.stringify(view.result.current.teamSavedPowerups) === before && !view.result.current.pendingPowerup, 'SAVED INPUT: invalid owners or indices leave the inventory untouched');
    act(() => { open(first, 0); open(second, first === second ? 1 : 0); });
    const remaining = Object.values(view.result.current.teamSavedPowerups).reduce((total, cards) => total + cards.length, 0);
    check(view.result.current.phase === 'powerup_received' && view.result.current.pendingPowerup?.teamId === first
      && view.result.current.pendingPowerup.powerup.id === 'invincibility' && remaining === 1,
      'SAVED OPEN: one click exposes one card and preserves the other saved reward');
    act(() => view.result.current.savePowerupForLater());
    check(Object.values(view.result.current.teamSavedPowerups).reduce((total, cards) => total + cards.length, 0) === 2,
      'RESAVE: an opened earned card can be banked again');
    let deadOwner: string | undefined;
    for (let turns = 0; turns < 64 && !deadOwner && view.result.current.aliveTeams().length > 1; turns++) {
      step(view);
      if (view.result.current.pendingPowerup) act(() => view.result.current.savePowerupForLater());
      deadOwner = Object.keys(view.result.current.teamSavedPowerups).find(id => view.result.current.teamSavedPowerups[id].length
        && !view.result.current.aliveTeams().includes(id));
    }
    check(deadOwner && view.result.current.phase === 'ready', 'SETUP: a real battle eliminated a team that retained a saved card');
    const deadCard = snapshot(view.result.current); act(() => view.result.current.useSavedPowerup(deadOwner!, 0));
    check(snapshot(view.result.current) === deadCard, 'DEAD OWNER: an eliminated team cannot open its old saved reward');
  });

  it('signs one canonical inactive player only from the current free-agent picker', () => {
    const view = mount('free_agent'); act(() => view.result.current.startBattle());
    const during = snapshot(view.result.current); act(() => view.result.current.signFreeAgent('Synthetic unoffered reward player'));
    check(snapshot(view.result.current) === during, 'SIGN PHASE: a map animation cannot grant an unearned player');
    act(() => view.result.current.reset()); vi.spyOn(Math, 'random').mockImplementation(seeded(29));
    const owner = picker(view, 'free_agent'), offer = view.result.current.freeAgentList[0];
    check(offer && view.result.current.pendingPowerup?.teamId === owner && view.result.current.powerupTeam === owner,
      'PICKER OWNER: the earned card remains attached to its recipient');
    const active = view.result.current.rosters[owner][0], before = snapshot(view.result.current);
    act(() => { view.result.current.signFreeAgent('Synthetic unoffered reward player'); view.result.current.signFreeAgent(active); });
    check(snapshot(view.result.current) === before, 'CANONICAL SIGN: unknown and already-active names preserve the open reward');
    const sign = view.result.current.signFreeAgent, logs = view.result.current.gameLog.length, size = view.result.current.rosters[owner].length;
    act(() => { sign(offer.name); sign(offer.name); });
    check(view.result.current.rosters[owner].length === size + 1 && view.result.current.rosters[owner].filter(name => name === offer.name).length === 1
      && view.result.current.gameLog.length === logs + 1 && view.result.current.phase === 'ready' && !view.result.current.pendingPowerup,
    'SIGN ONCE: the canonical offer joins its recipient exactly once');
    const done = snapshot(view.result.current); act(() => sign(offer.name));
    check(snapshot(view.result.current) === done, 'SPENT SIGN: a spent picker callback cannot add another player');
  });

  it('rejects invalid upgrade choices and applies the current roster choice once', () => {
    const view = mount('upgrade'), owner = picker(view, 'upgrade'), before = snapshot(view.result.current);
    act(() => { view.result.current.chooseUpgradePlayer('Synthetic invalid player'); view.result.current.signFreeAgent('Synthetic wrong picker'); view.result.current.stealTerritoryTarget(); });
    check(snapshot(view.result.current) === before, 'UPGRADE INPUT: invalid names and other power actions preserve the picker');
    const choose = view.result.current.chooseUpgradePlayer, name = view.result.current.rosters[owner][0], logs = view.result.current.gameLog.length;
    act(() => { choose(name); choose(name); });
    check(view.result.current.upgradeActiveTeam === owner && view.result.current.upgradedPlayer === name && view.result.current.gameLog.length === logs + 1
      && view.result.current.phase === 'ready' && !view.result.current.pendingPowerup, 'UPGRADE ONCE: one roster choice creates one owned upgrade');
  });

  it('rejects invalid territory choices and records one power claim without a battle win', () => {
    const view = mount('territory_steal'), owner = picker(view, 'territory_steal'), before = snapshot(view.result.current);
    act(() => view.result.current.stealTerritoryTarget('Synthetic invalid state'));
    check(snapshot(view.result.current) === before, 'TERRITORY INPUT: an invalid explicit state preserves the picker');
    const candidate = view.result.current.stealCandidates[0]; check(candidate, 'SETUP: the real reward has a legal enemy border');
    const wins = view.result.current.powerRankings().find(team => team.id === owner)!.wins;
    const logs = view.result.current.gameLog.length, choose = view.result.current.stealTerritoryTarget;
    act(() => { choose(candidate.stateId); choose(candidate.stateId); });
    check(view.result.current.territories[candidate.stateId] === owner && view.result.current.gameLog.length === logs + 1 && !view.result.current.pendingPowerup
      && (view.result.current.phase === 'ready' || view.result.current.phase === 'gameover'), 'TERRITORY ONCE: one valid choice claims one state and resolves immediately');
    check(view.result.current.gameLog[logs].defender === 'powerup' && view.result.current.powerRankings().find(team => team.id === owner)!.wins === wins,
      'POWER CLAIM: stealing a state does not invent a battle win');
    act(() => view.result.current.startBattle()); act(() => vi.advanceTimersByTime(1500));
    check(view.result.current.territoryStolenState === null, 'START HIGHLIGHT: the next map turn clears the canceled claim highlight');
    check(view.result.current.phase === 'animating', 'NEXT MAP: the next real turn retains its animation phase');
    view.unmount(); vi.spyOn(Math, 'random').mockImplementation(seeded(29));
    const other = mount(), savedOwner = earn(other); act(() => other.result.current.savePowerupForLater());
    picker(other, 'territory_steal');
    act(() => other.result.current.stealTerritoryTarget(other.result.current.stealCandidates[0].stateId));
    act(() => other.result.current.useSavedPowerup(savedOwner, 0));
    check(other.result.current.phase === 'powerup_received' && other.result.current.pendingPowerup?.teamId === savedOwner,
      'SETUP: a previously earned saved card opens while the claim highlight is pending');
    act(() => vi.advanceTimersByTime(1500));
    check(other.result.current.territoryStolenState === null, 'HIGHLIGHT: the completed claim highlight clears');
    check(other.result.current.phase === 'powerup_received' && other.result.current.pendingPowerup?.teamId === savedOwner,
      'HIGHLIGHT PHASE: delayed cleanup cannot dismiss the next earned card');
  });

  it('preserves the optional random fallback for both valid power pickers', () => {
    const view = mount('upgrade'), owner = picker(view, 'upgrade'), logs = view.result.current.gameLog.length;
    act(() => view.result.current.chooseUpgradePlayer());
    check(view.result.current.upgradeActiveTeam === owner && view.result.current.rosters[owner].includes(view.result.current.upgradedPlayer!)
      && view.result.current.gameLog.length === logs + 1, 'RANDOM UPGRADE: omitted input chooses a real current roster player');
    view.unmount(); vi.spyOn(Math, 'random').mockImplementation(seeded(29));
    const other = mount('territory_steal'), recipient = picker(other, 'territory_steal'), choices = other.result.current.stealCandidates.map(item => item.stateId);
    act(() => other.result.current.stealTerritoryTarget());
    check(choices.includes(other.result.current.territoryStolenState!) && other.result.current.territories[other.result.current.territoryStolenState!] === recipient,
      'RANDOM TERRITORY: omitted input chooses a real current border enemy');
  });

  it('cancels a picker back to its earned card without reviving earlier callbacks', () => {
    const view = mount('free_agent'), owner = earn(view, 'free_agent'), use = view.result.current.usePowerupNow;
    act(() => use()); const oldSign = view.result.current.signFreeAgent, name = view.result.current.freeAgentList[0].name;
    cancel(view);
    check(view.result.current.phase === 'powerup_received' && view.result.current.pendingPowerup?.teamId === owner
      && !view.result.current.powerupUseType && !view.result.current.powerupTeam, 'CANCEL CARD: cancellation preserves the reward and closes the picker');
    const before = snapshot(view.result.current); act(() => { use(); oldSign(name); });
    check(snapshot(view.result.current) === before, 'CANCEL STALE: returning to a card does not revive its earlier use or picker callbacks');
    act(() => view.result.current.savePowerupForLater());
    check(view.result.current.teamSavedPowerups[owner]?.length === 1 && view.result.current.phase === 'ready', 'CANCEL SAVE: the returned card can still be saved');
  });

  it('invalidates reward callbacks and pending highlight work on reset and unmount', () => {
    const view = mount(), owner = earn(view), use = view.result.current.usePowerupNow, save = view.result.current.savePowerupForLater;
    act(() => view.result.current.reset()); const reset = snapshot(view.result.current);
    act(() => { use(); save(); });
    check(snapshot(view.result.current) === reset, 'RESET CARD: old earned-card callbacks cannot alter a fresh run');
    view.unmount(); vi.spyOn(Math, 'random').mockImplementation(seeded(29));
    const other = mount('territory_steal'); picker(other, 'territory_steal'); const choose = other.result.current.stealTerritoryTarget;
    act(() => choose(other.result.current.stealCandidates[0].stateId)); act(() => other.result.current.reset());
    const fresh = snapshot(other.result.current); act(() => { choose(); vi.advanceTimersByTime(2000); });
    check(snapshot(other.result.current) === fresh && vi.getTimerCount() === 0, 'RESET PICKER: old target choices and delayed highlight work cannot alter a fresh run');
    other.unmount(); vi.spyOn(Math, 'random').mockImplementation(seeded(29));
    const disposed = mount('upgrade'); picker(disposed, 'upgrade'); const oldChoose = disposed.result.current.chooseUpgradePlayer;
    disposed.unmount(); const random = vi.spyOn(Math, 'random'); random.mockClear(); act(() => oldChoose());
    check(random.mock.calls.length === 0 && vi.getTimerCount() === 0, 'UNMOUNT: disposed random choices stop before consuming RNG or scheduling work');
    check(owner, 'SETUP: the reset witness used a real recipient');
  });

  it('blocks new map turns during a received card picker or existing animation', () => {
    const view = mount('upgrade'), owner = earn(view, 'upgrade');
    const received = snapshot(view.result.current); act(() => view.result.current.startBattle());
    check(snapshot(view.result.current) === received, 'START CARD: an unresolved earned card blocks the next map turn');
    act(() => view.result.current.usePowerupNow()); const open = snapshot(view.result.current); act(() => view.result.current.startBattle());
    check(snapshot(view.result.current) === open, 'START PICKER: an unresolved target picker blocks the next map turn');
    act(() => view.result.current.chooseUpgradePlayer());
    act(() => view.result.current.setFavoriteTeam(owner));
    const offer = view.result.current.freeAgencyPool()[0], start = view.result.current.startBattle, turn = view.result.current.turn;
    check(offer && view.result.current.canSignFreeAgent(), 'SETUP: settled real battles unlocked a docked signing');
    act(() => { view.result.current.signFreeAgencyCandidate(offer); start(); });
    check(view.result.current.phase === 'ready' && view.result.current.turn === turn && view.result.current.rosters[owner].includes(offer.name),
      'CROSS ACTION: a docked signing invalidates a same-tick start using its old roster');
    act(() => view.result.current.startBattle()); const animation = snapshot(view.result.current); act(() => view.result.current.startBattle());
    check(snapshot(view.result.current) === animation, 'START ANIMATION: a second start cannot replace an in-flight map turn');
  });
});
