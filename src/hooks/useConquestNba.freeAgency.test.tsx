/** Round 530: actual NBA hook, map, rosters, and seeded battle simulator.
 * Only reward selection is controlled for upgrade and legend scenarios.
 * Storage, backend, and transport boundaries fail closed.
 */
import assert from 'node:assert/strict';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { useConquestNba } from '@/hooks/useConquestNba';
import { CONQUEST_FREE_AGENCY_POOL_NBA, NBA_TEAM_MAP, TEAM_LEGENDS_NBA } from '@/data/conquestDataNba';
import { PowerupId } from '@/data/conquestPowerups';
import { getNbaRosterPlayer } from '@/lib/conquestBattleNba';

const fixture = vi.hoisted(() => ({ power: null as string | null, backendTouches: [] as string[] }));
vi.mock('@/data/conquestPowerups', async importOriginal => {
  const actual = await importOriginal<typeof import('@/data/conquestPowerups')>();
  return { ...actual, getRandomPowerup: () => {
    const drawn = actual.getRandomPowerup();
    return fixture.power ? actual.POWERUPS.find(power => power.id === fixture.power)! : drawn;
  } };
});
vi.mock('@/integrations/supabase/client', () => ({ supabase: new Proxy({}, { get() {
  fixture.backendTouches.push('Unexpected free-agency backend access');
  throw new Error('Unexpected free-agency backend access');
} }) }));

type Game = ReturnType<typeof useConquestNba>;
type View = ReturnType<typeof renderHook<Game, unknown>>;
function check(condition: unknown, message: string) { assert.ok(condition, message); }
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
function seeded(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
const candidate = (name: string) => {
  const found = CONQUEST_FREE_AGENCY_POOL_NBA.find(player => player.name === name);
  check(found, 'SETUP: canonical candidate exists'); return found!;
};
function snapshot(game: Game) {
  return JSON.stringify({ rosters: game.rosters, favorite: game.favoriteTeam, signed: game.signedFreeAgents,
    log: game.gameLog, cooldown: game.conquestsSinceSign, rankings: game.powerRankings(), upgrades: game.teamUpgrades });
}
function mount() { return renderHook(() => useConquestNba()); }
function begin(view: View, owner?: string, seed = 530) {
  check(view.result.current.phase === 'ready', 'SETUP: real battle starts from ready');
  if (owner) {
    const alive = view.result.current.aliveTeams(), index = alive.indexOf(owner);
    check(index >= 0, 'SETUP: requested attacker is alive');
    const random = seeded(seed); let first = true;
    vi.mocked(Math.random).mockImplementation(() => { if (first) { first = false; return (index + 0.25) / alive.length; } return random(); });
  }
  act(() => view.result.current.startBattle());
  act(() => vi.advanceTimersByTime(10000));
  check(view.result.current.battleResult?.simulation && view.result.current.attackingTeam && view.result.current.defendingTeam, 'SETUP: actual simulator produced a battle');
  act(() => view.result.current.skipToResult());
}
function finish(view: View, save = true) {
  const turn = view.result.current.turn;
  act(() => view.result.current.skipSteal());
  check(view.result.current.turn === turn + 1, 'SETUP: exactly one actual battle settled');
  if (save && view.result.current.phase === 'powerup_received') act(() => view.result.current.savePowerupForLater());
}
function advance(view: View, count = 3, avoid?: string) {
  for (let i = 0; i < count; i += 1) {
    const owner = avoid && ['BKN', 'BOS', 'NYK', 'PHI', 'TOR', 'ATL', 'MIA', 'ORL', 'CHI', 'DET', 'CLE'].find(id => view.result.current.aliveTeams().includes(id));
    begin(view, owner || undefined, 530 + view.result.current.turn);
    if (avoid) check(view.result.current.attackingTeam !== avoid && view.result.current.defendingTeam !== avoid, 'SETUP: other teams battle while the recipient waits');
    finish(view);
  }
}
function select(view: View, id = 'DEN') { act(() => view.result.current.setFavoriteTeam(id)); }
function sign(view: View, name: string) { act(() => view.result.current.signFreeAgencyCandidate(candidate(name))); }
function reward(view: View, power: PowerupId, owner = 'DEN') {
  fixture.power = power;
  for (let seed = 0; seed < 40; seed += 1) {
    begin(view, owner, seed); finish(view, false);
    if (view.result.current.phase === 'powerup_received') {
      check(view.result.current.pendingPowerup?.teamId === owner, 'SETUP: attacker owns the actual conquest reward');
      return;
    }
  }
  throw new Error('Seeded reward setup did not produce an attacker conquest');
}
let faults: string[];
beforeEach(() => {
  fixture.power = null; faults = []; vi.useFakeTimers(); vi.spyOn(Math, 'random').mockImplementation(seeded(530));
  const deny = (what: string): never => { faults.push(what); throw new Error(what); };
  vi.stubGlobal('fetch', () => deny('Unexpected fetch'));
  vi.spyOn(XMLHttpRequest.prototype, 'open').mockImplementation(() => deny('Unexpected XMLHttpRequest'));
  vi.stubGlobal('WebSocket', class { constructor() { deny('Unexpected WebSocket'); } });
  for (const key of ['setItem', 'removeItem', 'clear'] as const) vi.spyOn(Storage.prototype, key).mockImplementation(() => deny('Unexpected storage ' + key));
  vi.spyOn(console, 'error').mockImplementation((...args) => { faults.push(args.map(String).join(' ')); });
});
afterEach(() => {
  cleanup(); vi.clearAllTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  check(faults.length === 0 && fixture.backendTouches.length === 0, `BOUNDARY: no transport, storage, backend, or runtime faults (${[...faults, ...fixture.backendTouches].join('; ')})`);
});

describe('NBA free agency outcomes', () => {
  it('selects only living favorites between resolved battles', () => {
    const view = mount(); select(view);
    select(view, 'Synthetic unknown team');
    check(view.result.current.favoriteTeam === 'DEN', 'FAVORITE: invalid teams cannot replace a living selection');
    const before = snapshot(view.result.current); begin(view);
    const during = snapshot(view.result.current);
    select(view, 'LAL'); sign(view, 'Russell Westbrook');
    check(snapshot(view.result.current) === during && !view.result.current.canSignFreeAgent(), 'PHASE: active battles reject team changes and signings');
    finish(view); advance(view, 2);
    const eliminated = view.result.current.eliminated[0];
    check(eliminated && before !== snapshot(view.result.current), 'SETUP: real battles eliminated a team');
    select(view, eliminated);
    check(view.result.current.favoriteTeam === 'DEN', 'ALIVE: eliminated teams cannot become the signing recipient');
    select(view, 'LAL');
    check(view.result.current.favoriteTeam === 'LAL' && view.result.current.canSignFreeAgent(), 'RESELECT: another living team can receive the next signing');
    view.unmount(); vi.clearAllTimers(); vi.mocked(Math.random).mockImplementation(seeded(530));
    const lost = mount(); select(lost, 'CLE'); advance(lost);
    check(!lost.result.current.aliveTeams().includes('CLE') && !lost.result.current.canSignFreeAgent(), 'LOST FAVORITE: an eliminated recipient cannot use a replenished signing');
    select(lost, 'DEN');
    check(lost.result.current.canSignFreeAgent(), 'RECOVER: selecting a living team restores signing after elimination');
  });

  it('offers only canonical candidates absent from every active roster', () => {
    const view = mount(); advance(view); select(view, 'LAL');
    const before = snapshot(view.result.current);
    act(() => view.result.current.signFreeAgencyCandidate({ name: 'Synthetic invented candidate', position: 'G', overall: 99 }));
    check(snapshot(view.result.current) === before, 'CANONICAL: unknown candidates cannot spend a signing');
    sign(view, 'Russell Westbrook');
    const active = new Set(view.result.current.aliveTeams().flatMap(id => view.result.current.rosters[id] || []));
    const expected = CONQUEST_FREE_AGENCY_POOL_NBA.filter(player => !active.has(player.name));
    check(same(view.result.current.availableFreeAgencyCandidates, expected) && !view.result.current.availableFreeAgencyCandidates.some(player => player.name === 'Russell Westbrook'), 'POOL: every active roster removes its players from the advertised pool');
    advance(view); select(view);
    const occupied = snapshot(view.result.current); sign(view, 'Russell Westbrook');
    check(snapshot(view.result.current) === occupied, 'OCCUPIED: an active player cannot sign for a second team');
    sign(view, 'LeBron James');
    check(view.result.current.rosters.DEN.includes('LeBron James'), 'INVALID RETRY: a rejected request leaves the valid signing available');
  });

  it('unlocks exactly after three settled battles and counts no reward actions', () => {
    const view = mount(); select(view);
    for (let count = 0; count < 3; count += 1) {
      check(view.result.current.conquestsSinceSign === count && view.result.current.freeAgencyCooldownRemaining === 3 - count && !view.result.current.canSignFreeAgent(), 'COOLDOWN: fewer than three settled battles cannot unlock signing');
      begin(view);
      check(view.result.current.conquestsSinceSign === count, 'UNSETTLED: a simulated result does not advance the signing cooldown');
      const settle = view.result.current.skipSteal;
      act(() => { settle(); settle(); });
      if (view.result.current.phase === 'powerup_received') {
        const unresolved = snapshot(view.result.current); sign(view, 'Russell Westbrook'); select(view, 'LAL');
        check(snapshot(view.result.current) === unresolved && !view.result.current.canSignFreeAgent(), 'REWARD PHASE: unresolved rewards block signing and team changes');
        const oldRewardSign = view.result.current.signFreeAgencyCandidate;
        act(() => { view.result.current.savePowerupForLater(); oldRewardSign(candidate('Russell Westbrook')); });
        check(view.result.current.signedFreeAgents.length === 0 && view.result.current.conquestsSinceSign === count + 1, 'READY TRANSITION: resolving a reward cannot revive its earlier signing callback');
      }
      check(view.result.current.conquestsSinceSign === count + 1 && view.result.current.turn === count + 1, 'SETTLED: one completed battle adds one cooldown step despite replayed settlement');
    }
    check(view.result.current.canSignFreeAgent() && view.result.current.freeAgencyCooldownRemaining === 0, 'UNLOCK: the third completed battle unlocks signing');
  });

  it('signs once with one rating bump and never revives a spent callback', () => {
    const view = mount(); advance(view); select(view, 'LAL');
    const before = view.result.current, roster = [...before.rosters.LAL], logs = before.gameLog.length, ranking = before.powerRankings().find(team => team.id === 'LAL')!;
    const stale = before.signFreeAgencyCandidate;
    act(() => { stale(candidate('Russell Westbrook')); stale(candidate('Russell Westbrook')); });
    const after = view.result.current, updated = after.powerRankings().find(team => team.id === 'LAL')!;
    check(after.rosters.LAL.length === roster.length && after.rosters.LAL.filter(name => name === 'Russell Westbrook').length === 1
      && after.gameLog.length === logs + 1 && same(after.signedFreeAgents, ['Russell Westbrook']) && after.conquestsSinceSign === 0,
    'ONCE: repeated same-tick signing adds one player and one audit entry');
    check(updated.offense - ranking.offense === 2 && updated.defense - ranking.defense === 2, 'BUMP: one accepted signing adds exactly two rating points');
    advance(view);
    const later = snapshot(view.result.current);
    act(() => stale(candidate('LeBron James')));
    check(snapshot(view.result.current) === later, 'STALE COOLDOWN: a spent callback cannot revive after three more battles');
    sign(view, 'LeBron James');
    check(view.result.current.rosters.LAL.includes('LeBron James'), 'FRESH: the current callback can use the replenished signing');
  });

  it('invalidates old signing callbacks on team change reset and unmount', () => {
    const view = mount(); advance(view); select(view, 'LAL');
    const old = view.result.current.signFreeAgencyCandidate;
    act(() => { view.result.current.setFavoriteTeam('DEN'); old(candidate('Russell Westbrook')); });
    check(view.result.current.favoriteTeam === 'DEN' && view.result.current.signedFreeAgents.length === 0 && view.result.current.conquestsSinceSign === 3, 'TEAM TOKEN: selecting another team invalidates a same-tick old signing');
    select(view, 'LAL');
    const returned = snapshot(view.result.current); act(() => old(candidate('Russell Westbrook')));
    check(snapshot(view.result.current) === returned, 'TEAM RETURN: switching back cannot revive an old signing callback');
    const resetStale = view.result.current.signFreeAgencyCandidate;
    act(() => { view.result.current.reset(); resetStale(candidate('Russell Westbrook')); });
    check(view.result.current.favoriteTeam === null && view.result.current.turn === 0 && view.result.current.signedFreeAgents.length === 0 && view.result.current.gameLog.length === 0, 'RESET: reset invalidates same-tick signing work');
    advance(view); select(view, 'LAL');
    const fresh = snapshot(view.result.current); act(() => resetStale(candidate('Russell Westbrook')));
    check(snapshot(view.result.current) === fresh, 'RESET RETURN: a fresh game cannot revive an old signing callback');
    const unmounted = view.result.current.signFreeAgencyCandidate; let inspected = false;
    const probe = new Proxy(candidate('Russell Westbrook'), { get(target, key, receiver) { inspected = true; return Reflect.get(target, key, receiver); } });
    view.unmount(); act(() => unmounted(probe));
    check(!inspected, 'UNMOUNT: disposed callbacks reject before inspecting a candidate');
  });

  it('keeps a highly rated acquired player when replacing the actual weakest player', () => {
    const view = mount(); advance(view); select(view);
    sign(view, 'LeBron James');
    check(view.result.current.rosters.DEN.includes('LeBron James') && !view.result.current.rosters.DEN.includes('Bruce Brown'), 'FIRST WAIVER: the initial weakest player leaves for the recruit');
    advance(view);
    const before = [...view.result.current.rosters.DEN]; sign(view, 'Russell Westbrook');
    check(same(before.filter(name => !view.result.current.rosters.DEN.includes(name)), ['Zeke Nnaji']) && view.result.current.rosters.DEN.includes('LeBron James'), 'ACQUIRED RATING: the 94-rated recruit stays while the original 77-rated player is waived');
  });

  it('returns a released candidate to the pool and allows a later signing', () => {
    const view = mount(); advance(view); select(view);
    sign(view, 'Robin Lopez'); advance(view, 3, 'DEN'); sign(view, 'Russell Westbrook');
    check(!view.result.current.rosters.DEN.includes('Robin Lopez') && view.result.current.availableFreeAgencyCandidates.some(player => player.name === 'Robin Lopez') && view.result.current.signedFreeAgents.includes('Robin Lopez'), 'RELEASED: a waived candidate returns despite signing history');
    advance(view, 3, 'DEN'); sign(view, 'Robin Lopez');
    const copies = view.result.current.aliveTeams().flatMap(id => view.result.current.rosters[id]).filter(name => name === 'Robin Lopez');
    check(copies.length === 1 && view.result.current.signedFreeAgents.filter(name => name === 'Robin Lopez').length === 2, 'RESIGN: a released candidate can sign again without an active duplicate');
  });

  it('preserves an activated legend when choosing the weakest roster player', () => {
    const view = mount(); reward(view, 'legend'); act(() => view.result.current.usePowerupNow());
    const legend = TEAM_LEGENDS_NBA.DEN.name;
    check(view.result.current.legendPlayers.has(legend) && getNbaRosterPlayer(legend, 'DEN', view.result.current.legendPlayers)?.overall === 99, 'SETUP: a real earned legend was activated at 99');
    while (view.result.current.conquestsSinceSign < 3) advance(view, 1, 'DEN');
    select(view); sign(view, 'LeBron James'); advance(view, 3, 'DEN');
    const before = [...view.result.current.rosters.DEN]; sign(view, 'Russell Westbrook');
    check(view.result.current.rosters.DEN.includes(legend) && view.result.current.rosters.DEN.includes('LeBron James')
      && same(before.filter(name => !view.result.current.rosters.DEN.includes(name)), ['Zeke Nnaji']), 'LEGEND RATING: an activated 99-rated legend cannot be mistaken for an unknown weak player');
  });

  it('clears a queued upgrade when signing waives its selected player', () => {
    const view = mount(); reward(view, 'upgrade'); act(() => view.result.current.usePowerupNow());
    act(() => view.result.current.chooseUpgradePlayer('Bruce Brown'));
    check(view.result.current.teamUpgrades.DEN === 'Bruce Brown' && NBA_TEAM_MAP.get('DEN')?.players.some(player => player.name === 'Bruce Brown'), 'SETUP: a real earned upgrade selected the weakest player');
    while (view.result.current.conquestsSinceSign < 3) advance(view, 1, 'DEN');
    select(view); sign(view, 'Russell Westbrook');
    check(!view.result.current.rosters.DEN.includes('Bruce Brown') && !view.result.current.teamUpgrades.DEN && view.result.current.rosters.DEN.includes('Russell Westbrook'), 'WAIVED UPGRADE: replacing the selected player clears its queued upgrade');
  });
});
