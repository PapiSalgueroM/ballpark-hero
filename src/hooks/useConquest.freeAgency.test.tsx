/** Round 531: real NFL map, rosters, hook and seeded battle simulator.
 * Only the kind of randomly earned neutral-region reward is controlled.
 */
import assert from 'node:assert/strict';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { useConquest } from '@/hooks/useConquest';
import { CONQUEST_FREE_AGENCY_POOL, NFL_TEAMS } from '@/data/conquestData';
import { FREE_AGENTS, TEAM_LEGENDS, PowerupId } from '@/data/conquestPowerups';
const fixture = vi.hoisted(() => ({ power: null as string | null, backend: [] as string[] }));
vi.mock('@/data/conquestPowerups', async importOriginal => {
  const actual = await importOriginal<typeof import('@/data/conquestPowerups')>();
  return { ...actual, getRandomPowerup: () => {
    const drawn = actual.getRandomPowerup();
    return fixture.power ? actual.POWERUPS.find(power => power.id === fixture.power)! : drawn;
  } };
});
vi.mock('@/integrations/supabase/client', () => ({ supabase: new Proxy({}, { get() {
  fixture.backend.push('Unexpected NFL free-agency backend access');
  throw new Error('Unexpected NFL free-agency backend access');
} }) }));
type Game = ReturnType<typeof useConquest>;
type View = ReturnType<typeof renderHook<Game, unknown>>;
function check(value: unknown, message: string) { assert.ok(value, message); }
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
function seeded(seed: number) { return () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
  return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
}; }
function mount() { return renderHook(() => useConquest()); }
function snapshot(game: Game) { return JSON.stringify({ favorite: game.favoriteTeam, rosters: game.rosters,
  signed: game.signedFreeAgents, log: game.gameLog, cooldown: game.conquestsSinceSign, rankings: game.powerRankings(),
  teamUpgrades: game.teamUpgrades, battleUpgrades: game.battleUpgrades }); }
function select(view: View, id: string | null = 'BUF') { act(() => view.result.current.setFavoriteTeam(id)); }
function offered(view: View, index = 0) {
  const player = view.result.current.freeAgencyPool()[index]; check(player, 'SETUP: a canonical player is available'); return player;
}
function finish(view: View, save = true) {
  if (view.result.current.battleResult?.simulation) {
    act(() => view.result.current.skipToResult());
    check(view.result.current.pendingBattleApply, 'SETUP: real battle is ready to settle');
    act(() => view.result.current.skipSteal());
  }
  if (save && view.result.current.pendingPowerup) act(() => view.result.current.savePowerupForLater());
}
function step(view: View, save = true) {
  check(view.result.current.phase === 'ready' && !view.result.current.pendingPowerup, 'SETUP: next map turn starts ready');
  const turn = view.result.current.turn, cooldown = view.result.current.conquestsSinceSign;
  act(() => view.result.current.startBattle()); act(() => vi.advanceTimersByTime(10000));
  const isBattle = !!view.result.current.battleResult?.simulation;
  finish(view, save);
  check(view.result.current.turn === turn + 1, 'SETUP: one real map turn settled');
  if (!isBattle) check(view.result.current.conquestsSinceSign === cooldown, 'NEUTRAL: neutral claims do not advance the signing cooldown');
}
function advance(view: View, count = 3) {
  const target = view.result.current.conquestsSinceSign + count;
  for (let attempts = 0; attempts < 40 && view.result.current.conquestsSinceSign < target; attempts += 1) step(view);
  check(view.result.current.conquestsSinceSign === target, 'SETUP: the requested number of actual battles settled');
}
function reward(view: View, power: PowerupId) {
  fixture.power = power;
  for (let attempts = 0; attempts < 40; attempts += 1) {
    step(view, false);
    if (view.result.current.pendingPowerup) {
      check(view.result.current.pendingPowerup.powerup.id === power, 'SETUP: a real neutral claim earned the selected reward'); return;
    }
  }
  throw new Error('Real map turns did not encounter a reward');
}
function rating(name: string) {
  const player = [...NFL_TEAMS.flatMap(team => team.players || []), ...FREE_AGENTS, ...CONQUEST_FREE_AGENCY_POOL, ...Object.values(TEAM_LEGENDS)].find(item => item.name === name);
  check(player, 'SETUP: roster player has shipped metadata'); return player!.overall;
}
function weakest(game: Game, owner: string) { return [...game.rosters[owner]].sort((a, b) => rating(a) - rating(b))[0]; }
let faults: string[];
beforeEach(() => {
  fixture.power = null; faults = []; vi.useFakeTimers(); vi.spyOn(Math, 'random').mockImplementation(seeded(531));
  const deny = (message: string): never => { faults.push(message); throw new Error(message); };
  vi.stubGlobal('fetch', () => deny('Unexpected fetch'));
  vi.stubGlobal('XMLHttpRequest', class { constructor() { deny('Unexpected XMLHttpRequest'); } });
  vi.stubGlobal('WebSocket', class { constructor() { deny('Unexpected WebSocket'); } });
  for (const key of ['setItem', 'removeItem', 'clear'] as const) vi.spyOn(Storage.prototype, key).mockImplementation(() => deny('Unexpected storage ' + key));
  vi.spyOn(console, 'error').mockImplementation((...args) => { faults.push(args.map(String).join(' ')); });
});
afterEach(() => {
  cleanup(); vi.clearAllTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  check(faults.length === 0 && fixture.backend.length === 0, `BOUNDARY: no transport, storage, backend, or runtime faults (${[...faults, ...fixture.backend].join('; ')})`);
});

describe('NFL free agency outcomes', () => {
  it('selects only living favorites and allows clearing or replacing the selection', () => {
    const view = mount(); select(view); select(view, 'Synthetic unknown team');
    check(view.result.current.favoriteTeam === 'BUF', 'FAVORITE: unknown teams cannot replace the selected recipient');
    advance(view); check(view.result.current.eliminated.includes('CHI'), 'SETUP: three actual battles eliminated Chicago');
    select(view, 'CHI');
    check(view.result.current.favoriteTeam === 'BUF', 'ALIVE: eliminated teams cannot become the signing recipient');
    select(view, null);
    check(view.result.current.favoriteTeam === null && !view.result.current.canSignFreeAgent(), 'CLEAR: clearing the selection disables signing without spending the cooldown');
    select(view, 'DEN');
    check(view.result.current.favoriteTeam === 'DEN' && view.result.current.canSignFreeAgent(), 'RESELECT: a living replacement retains the earned cooldown');
    view.unmount(); vi.clearAllTimers(); vi.mocked(Math.random).mockImplementation(seeded(531));
    const lost = mount(); select(lost, 'CHI'); advance(lost);
    check(!lost.result.current.aliveTeams().includes('CHI') && !lost.result.current.canSignFreeAgent(), 'LOST FAVORITE: an eliminated recipient cannot spend a signing');
  });

  it('accepts only the current dynamic pool and preserves a valid retry', () => {
    const view = mount(); advance(view); select(view);
    const pool = view.result.current.freeAgencyPool(), active = new Set(view.result.current.aliveTeams().flatMap(id => view.result.current.rosters[id]));
    const expected = new Set([...CONQUEST_FREE_AGENCY_POOL.map(player => player.name), ...view.result.current.eliminated.flatMap(id => view.result.current.rosters[id])].filter(name => !active.has(name)));
    check(pool.length === expected.size && pool.every(player => expected.has(player.name)) && pool.some(player => player.name === 'Montez Sweat'), 'DYNAMIC POOL: eliminated final rosters join curated players without active names or duplicates');
    const before = snapshot(view.result.current), eligible = offered(view);
    act(() => view.result.current.signFreeAgencyCandidate({ name: 'Synthetic invented candidate', overall: 99, position: 'QB' }));
    check(snapshot(view.result.current) === before, 'CANONICAL: unknown candidates cannot spend the signing');
    act(() => view.result.current.signFreeAgencyCandidate(eligible));
    check(view.result.current.rosters.BUF.includes(eligible.name) && !view.result.current.freeAgencyPool().some(player => player.name === eligible.name), 'POOL SIGN: an eligible eliminated player joins once and leaves the available pool');
    advance(view); select(view, 'DEN');
    const occupied = snapshot(view.result.current); act(() => view.result.current.signFreeAgencyCandidate(eligible));
    check(snapshot(view.result.current) === occupied, 'OCCUPIED: a player on another active roster cannot be signed again');
    const next = offered(view); act(() => view.result.current.signFreeAgencyCandidate(next));
    check(view.result.current.rosters.DEN.includes(next.name), 'RETRY: rejected requests preserve the valid signing opportunity');
  });

  it('unlocks after exactly three settled battles and blocks unresolved turns', () => {
    const view = mount(); select(view);
    for (let count = 0; count < 3; count += 1) {
      check(view.result.current.conquestsSinceSign === count && view.result.current.freeAgencyCooldownRemaining === 3 - count && !view.result.current.canSignFreeAgent(), 'COOLDOWN: fewer than three settled battles cannot unlock signing');
      act(() => view.result.current.startBattle()); act(() => vi.advanceTimersByTime(10000));
      check(view.result.current.battleResult?.simulation && view.result.current.conquestsSinceSign === count, 'UNSETTLED: a real simulated result cannot advance the cooldown before settlement');
      finish(view);
      check(view.result.current.conquestsSinceSign === count + 1, 'SETTLED: one completed battle adds one cooldown step');
    }
    check(view.result.current.canSignFreeAgent() && view.result.current.freeAgencyCooldownRemaining === 0, 'UNLOCK: the third settled battle unlocks signing');
    const player = offered(view), old = view.result.current.signFreeAgencyCandidate;
    act(() => { view.result.current.startBattle(); old(player); });
    check(view.result.current.signedFreeAgents.length === 0 && !view.result.current.canSignFreeAgent(), 'START TOKEN: starting a turn invalidates a same-tick signing callback');
    const busy = snapshot(view.result.current); select(view, 'DEN'); act(() => view.result.current.signFreeAgencyCandidate(player));
    check(snapshot(view.result.current) === busy && !view.result.current.freeAgencyActionReady, 'PHASE: an unresolved turn blocks team changes and signing');
  });

  it('signs once with one rating bump and never revives a spent callback', () => {
    const view = mount(); advance(view); select(view);
    const before = view.result.current, player = offered(view), laterPlayer = offered(view, 1), roster = [...before.rosters.BUF];
    const ranks = before.powerRankings().find(team => team.id === 'BUF')!, old = before.signFreeAgencyCandidate;
    act(() => { old(player); old(player); });
    const after = view.result.current, updated = after.powerRankings().find(team => team.id === 'BUF')!;
    check(after.rosters.BUF.length === roster.length && after.rosters.BUF.filter(name => name === player.name).length === 1 && after.gameLog.length === before.gameLog.length + 1
      && same(after.signedFreeAgents, [player.name]) && after.conquestsSinceSign === 0, 'ONCE: same-tick signing replaces one player and records one transaction');
    check(updated.offense - ranks.offense === 2 && updated.defense - ranks.defense === 2, 'BUMP: one accepted signing adds exactly two rating points');
    advance(view); const replenished = snapshot(view.result.current); act(() => old(laterPlayer));
    check(snapshot(view.result.current) === replenished, 'STALE: a spent callback cannot revive after three more battles');
    act(() => view.result.current.signFreeAgencyCandidate(laterPlayer));
    check(view.result.current.rosters.BUF.includes(laterPlayer.name), 'FRESH: a current callback can spend the replenished signing');
  });

  it('invalidates old callbacks on team changes reset and unmount', () => {
    const view = mount(); advance(view); select(view);
    const player = offered(view), old = view.result.current.signFreeAgencyCandidate;
    act(() => { view.result.current.setFavoriteTeam('DEN'); old(player); });
    check(view.result.current.favoriteTeam === 'DEN' && view.result.current.signedFreeAgents.length === 0 && view.result.current.conquestsSinceSign === 3, 'TEAM TOKEN: a same-tick team change invalidates the prior signing');
    select(view); const returned = snapshot(view.result.current); act(() => old(player));
    check(snapshot(view.result.current) === returned, 'TEAM RETURN: switching back cannot revive an older signing');
    const resetOld = view.result.current.signFreeAgencyCandidate;
    act(() => { view.result.current.reset(); resetOld(player); });
    check(view.result.current.favoriteTeam === null && view.result.current.turn === 0 && view.result.current.signedFreeAgents.length === 0 && view.result.current.gameLog.length === 0, 'RESET: reset rejects old signing work and clears the transaction state');
    advance(view); select(view); const resetReturn = snapshot(view.result.current); act(() => resetOld(player));
    check(snapshot(view.result.current) === resetReturn, 'RESET RETURN: a new game cannot revive an old signing');
    const disposed = view.result.current.signFreeAgencyCandidate; let inspected = false;
    const probe = new Proxy(offered(view), { get(target, key, receiver) { inspected = true; return Reflect.get(target, key, receiver); } });
    view.unmount(); act(() => disposed(probe));
    check(!inspected, 'UNMOUNT: disposed callbacks reject before reading the candidate');
  });

  it('uses shipped acquired-player ratings instead of caller supplied metadata', () => {
    const view = mount(); advance(view); select(view);
    const player = offered(view); check(player.name === 'Montez Sweat' && player.overall === 89, 'SETUP: eliminated Chicago offers its real 89-rated player');
    act(() => view.result.current.signFreeAgencyCandidate({ ...player, overall: 1, position: 'Synthetic position', blurb: 'Synthetic caller text' }));
    advance(view); const before = [...view.result.current.rosters.BUF], waived = weakest(view.result.current, 'BUF');
    check(waived !== player.name, 'SETUP: the acquired player is stronger than an original roster player');
    act(() => view.result.current.signFreeAgencyCandidate(offered(view)));
    check(view.result.current.rosters.BUF.includes(player.name) && same(before.filter(name => !view.result.current.rosters.BUF.includes(name)), [waived])
      && !view.result.current.gameLog.some(row => row.score.includes('Synthetic')), 'ACQUIRED: canonical global metadata keeps the strong recruit and waives the actual weakest player');
  });

  it('returns a waived curated candidate to the current pool', () => {
    const view = mount(); advance(view); select(view);
    const low = view.result.current.freeAgencyPool().find(player => player.name === 'Duke Johnson'); check(low, 'SETUP: the curated low-rated player is available');
    act(() => view.result.current.signFreeAgencyCandidate(low!)); advance(view);
    act(() => view.result.current.signFreeAgencyCandidate(offered(view)));
    check(!view.result.current.rosters.BUF.includes(low!.name) && view.result.current.freeAgencyPool().some(player => player.name === low!.name) && view.result.current.signedFreeAgents.includes(low!.name), 'RELEASED: signing history does not hide a candidate who was waived');
  });

  it('blocks signing while a saved reward is reopened for a decision', () => {
    const view = mount(); advance(view); reward(view, 'invincibility');
    const owner = view.result.current.pendingPowerup!.teamId;
    act(() => view.result.current.savePowerupForLater()); select(view, owner);
    const index = view.result.current.teamSavedPowerups[owner].length - 1, player = offered(view), old = view.result.current.signFreeAgencyCandidate;
    act(() => { view.result.current.useSavedPowerup(owner, index); old(player); });
    check(view.result.current.phase === 'powerup_received' && !!view.result.current.pendingPowerup && view.result.current.signedFreeAgents.length === 0, 'SAVED CARD: reopening a saved card displays its decision before further signing');
    const card = snapshot(view.result.current); act(() => view.result.current.signFreeAgencyCandidate(player)); select(view, null);
    check(!view.result.current.freeAgencyActionReady && !view.result.current.canSignFreeAgent() && snapshot(view.result.current) === card, 'PENDING: a received power card blocks both docked actions');
    const cardOld = view.result.current.signFreeAgencyCandidate;
    act(() => { view.result.current.usePowerupNow(); cardOld(player); });
    check(view.result.current.signedFreeAgents.length === 0 && view.result.current.canSignFreeAgent(), 'READY TRANSITION: resolving a card cannot revive its earlier signing callback');
    act(() => view.result.current.signFreeAgencyCandidate(player));
    check(view.result.current.rosters[owner].includes(player.name), 'AFTER CARD: signing works once the reward is resolved');
  });

  it('clears only the queued upgrade of the player being waived', () => {
    for (const upgradeWeakest of [true, false]) {
      vi.mocked(Math.random).mockImplementation(seeded(531)); const view = mount(); advance(view); reward(view, 'upgrade');
      const owner = view.result.current.pendingPowerup!.teamId, waived = weakest(view.result.current, owner);
      const upgraded = upgradeWeakest ? waived : [...view.result.current.rosters[owner]].sort((a, b) => rating(b) - rating(a))[0];
      check(upgradeWeakest || upgraded !== waived, 'SETUP: the preserved upgrade is on a stronger player');
      act(() => view.result.current.usePowerupNow()); act(() => view.result.current.chooseUpgradePlayer(upgraded)); select(view, owner);
      check(view.result.current.teamUpgrades[owner] === upgraded, 'SETUP: an actual earned Upgrade is queued');
      act(() => view.result.current.signFreeAgencyCandidate(offered(view)));
      check(!view.result.current.rosters[owner].includes(waived), 'WAIVER: signing replaces the expected weakest player');
      check(upgradeWeakest ? !view.result.current.teamUpgrades[owner]
        : view.result.current.teamUpgrades[owner] === upgraded,
      upgradeWeakest ? 'WAIVED UPGRADE: the outgoing player loses its queued upgrade' : 'KEPT UPGRADE: a retained player keeps its queued upgrade');
      view.unmount(); vi.clearAllTimers();
    }
  });
});
